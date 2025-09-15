// Unified Safety Hook for Nini/USERAI output inspection
// Handles banned phrase detection and escalation strategies

export interface SafetyContext {
  speaker: "Nini" | "USERAI";
  lang: "es" | "en";
  profile?: any; // USERAIProfile with safety config
  globalSafety?: {
    ban_phrases?: string[];
    escalation?: "remind_safety_protocol" | "escalate_specialist" | string;
  };
}

export interface SafetyResult {
  text: string;
  flags: {
    matched: string[];
    escalated: boolean;
    positions?: Array<{ start: number; end: number; phrase: string }>;
  };
}

// Safety message templates
const SAFETY_TEMPLATES = {
  es: {
    remind_safety_protocol: "Entiendo tu situación. Es importante recordar que hay recursos profesionales disponibles si necesitas apoyo adicional. ¿Te gustaría que hablemos de estrategias concretas que puedas implementar paso a paso?",
    escalate_specialist: "Veo que esta situación requiere atención especializada. Te sugiero contactar con un profesional de salud mental o llamar a una línea de ayuda. Mientras tanto, ¿hay alguien de confianza con quien puedas hablar?"
  },
  en: {
    remind_safety_protocol: "I understand your situation. It's important to remember that professional resources are available if you need additional support. Would you like us to talk about concrete strategies you can implement step by step?",
    escalate_specialist: "I see this situation requires specialized attention. I suggest contacting a mental health professional or calling a helpline. In the meantime, is there someone you trust you can talk to?"
  }
};

/**
 * Normalizes text for robust phrase detection
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^\\w\\s]/g, ' ')
    .replace(/\\s+/g, ' ')
    .trim();
}

/**
 * Detects banned phrases in text with robust matching
 */
function detectBannedPhrases(
  text: string, 
  bannedPhrases: string[]
): Array<{ phrase: string; start: number; end: number }> {
  const matches: Array<{ phrase: string; start: number; end: number }> = [];
  const normalizedText = normalizeText(text);
  
  for (const phrase of bannedPhrases) {
    if (!phrase.trim()) continue;
    
    const normalizedPhrase = normalizeText(phrase);
    const regex = new RegExp(`\\\\b${normalizedPhrase.replace(/\\s+/g, '\\s+')}\\\\b`, 'gi');
    
    let match;
    while ((match = regex.exec(normalizedText)) !== null) {
      matches.push({
        phrase: phrase,
        start: match.index,
        end: match.index + match[0].length
      });
    }
  }
  
  return matches;
}

/**
 * Applies safety measures to text according to profile and global settings
 */
export function applySafety(text: string, ctx: SafetyContext): SafetyResult {
  // Combine banned phrases from profile and global settings
  const profileBanned = ctx.profile?.safety?.ban_phrases || [];
  const globalBanned = ctx.globalSafety?.ban_phrases || [];
  const allBannedPhrases = [...profileBanned, ...globalBanned];
  
  if (allBannedPhrases.length === 0) {
    return {
      text,
      flags: {
        matched: [],
        escalated: false
      }
    };
  }
  
  // Detect banned phrases
  const matches = detectBannedPhrases(text, allBannedPhrases);
  
  if (matches.length === 0) {
    return {
      text,
      flags: {
        matched: [],
        escalated: false
      }
    };
  }
  
  // Get escalation strategy (profile takes priority)
  const escalation = ctx.profile?.safety?.escalation || ctx.globalSafety?.escalation || "remind_safety_protocol";
  
  // Generate safety message
  let safetyMessage: string;
  const templates = SAFETY_TEMPLATES[ctx.lang] || SAFETY_TEMPLATES.es;
  
  if (escalation === "remind_safety_protocol") {
    safetyMessage = templates.remind_safety_protocol;
  } else if (escalation === "escalate_specialist") {
    safetyMessage = templates.escalate_specialist;
  } else {
    // Custom escalation message
    safetyMessage = escalation;
  }
  
  // Try to preserve non-problematic content if viable
  const sentences = text.split(/[.!?]+/).filter(s => s.trim());
  const safeSentences = sentences.filter(sentence => {
    return !detectBannedPhrases(sentence, allBannedPhrases).length;
  });
  
  let finalText: string;
  if (safeSentences.length > 0 && safeSentences.length > sentences.length * 0.3) {
    // Keep safe content and add safety message
    finalText = safeSentences.join('. ').trim() + '. ' + safetyMessage;
  } else {
    // Replace entirely with safety message
    finalText = safetyMessage;
  }
  
  return {
    text: finalText,
    flags: {
      matched: matches.map(m => m.phrase),
      escalated: true,
      positions: matches
    }
  };
}
