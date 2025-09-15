import { UserAIProfile } from '@/store/profiles';

export interface UserAISeed {
  text: string;
}

export interface UserAIBeat {
  name: 'setup' | 'incident' | 'tension' | 'midpoint' | 'obstacle' | 'progress' | 'preclose' | 'close';
  index: number;
  total: number;
}

export interface UserAIMemory {
  facts: string[];
}

export interface UserAIPromptOptions {
  allowSoftLimit?: boolean;
  defaultSoftLimit?: number;
}

// Helper functions
export function renderBulletList(arr: string[]): string {
  if (!arr || arr.length === 0) return '';
  return arr.map(item => `  • ${item}`).join('\n');
}

export function joinCSV(arr: string[]): string {
  if (!arr || arr.length === 0) return '';
  return arr.join(', ');
}

// Beat name translations
const BEAT_TRANSLATIONS: Record<string, string> = {
  'setup': 'setup',
  'incident': 'incidente', 
  'tension': 'tensión',
  'midpoint': 'punto medio',
  'obstacle': 'obstáculo',
  'progress': 'progreso',
  'preclose': 'pre-cierre',
  'close': 'cierre'
};

export function buildUserAIPrompt(
  profile: UserAIProfile,
  seed: UserAISeed,
  beat: UserAIBeat,
  memory: UserAIMemory,
  options: UserAIPromptOptions = {}
): string {
  const { allowSoftLimit = true, defaultSoftLimit = 1000 } = options;
  
  // Determine language
  const language = profile.lang;
  const isSpanish = language === 'es';
  
  // Base prompt structure
  const sections: string[] = [];

  // Header
  sections.push(isSpanish ? 'Actúa como USERAI.' : 'Act as USERAI.');
  sections.push('');

  // Profile section
  const profileTitle = isSpanish ? 'Perfil:' : 'Profile:';
  sections.push(profileTitle);
  
  const profileLines = [
    isSpanish ? `- Nombre: ${profile.name}` : `- Name: ${profile.name}`,
    isSpanish ? `- Idioma: ${profile.lang}` : `- Language: ${profile.lang}`,
    isSpanish ? `- Tono: ${profile.tone}` : `- Tone: ${profile.tone}`,
    isSpanish ? `- Estilo de apego: ${profile.attachment_style}` : `- Attachment style: ${profile.attachment_style}`,
    isSpanish ? `- Estilo de conflicto: ${profile.conflict_style}` : `- Conflict style: ${profile.conflict_style}`
  ];

  if (profile.traits.length > 0) {
    profileLines.push(
      isSpanish 
        ? `- Rasgos: ${joinCSV(profile.traits)}`
        : `- Traits: ${joinCSV(profile.traits)}`
    );
  }

  if (profile.emotions_focus.length > 0) {
    profileLines.push(
      isSpanish 
        ? `- Enfoque emocional: ${joinCSV(profile.emotions_focus)}`
        : `- Emotional focus: ${joinCSV(profile.emotions_focus)}`
    );
  }

  if (profile.needs_focus.length > 0) {
    profileLines.push(
      isSpanish 
        ? `- Necesidades clave: ${joinCSV(profile.needs_focus)}`
        : `- Key needs: ${joinCSV(profile.needs_focus)}`
    );
  }

  if (profile.boundaries_focus.length > 0) {
    profileLines.push(
      isSpanish 
        ? `- Límites: ${joinCSV(profile.boundaries_focus)}`
        : `- Boundaries: ${joinCSV(profile.boundaries_focus)}`
    );
  }

  if (profile.example_lines.length > 0) {
    const exampleTitle = isSpanish ? '- Ejemplos de líneas:' : '- Example lines:';
    profileLines.push(exampleTitle);
    profileLines.push(renderBulletList(profile.example_lines));
  }

  sections.push(profileLines.join('\n'));
  sections.push('');

  // Rules section
  const rulesTitle = isSpanish ? 'Reglas:' : 'Rules:';
  sections.push(rulesTitle);
  
  const ruleLines = [
    isSpanish 
      ? `- Responde en ${profile.lang}.`
      : `- Respond in ${profile.lang}.`,
    isSpanish
      ? '- **Sin límite de párrafos**. Usa los que necesites para expresar capas emocionales y cognitivas.'
      : '- **No paragraph limit**. Use as many as needed to express emotional and cognitive layers.',
    isSpanish
      ? `- Preguntas por turno: entre ${profile.question_rate.min} y ${profile.question_rate.max}.`
      : `- Questions per turn: between ${profile.question_rate.min} and ${profile.question_rate.max}.`,
    isSpanish
      ? '- Evita frases de cierre antes del último turno.'
      : '- Avoid closing phrases before the final turn.'
  ];

  // Safety rules
  if (profile.safety.ban_phrases.length > 0) {
    const bannedPhrasesText = joinCSV(profile.safety.ban_phrases);
    let escalationText = profile.safety.escalation;
    
    // Handle predefined escalation options
    if (escalationText === 'remind_safety_protocol') {
      escalationText = isSpanish 
        ? 'recordar protocolo de seguridad'
        : 'remind safety protocol';
    } else if (escalationText === 'escalate_specialist') {
      escalationText = isSpanish 
        ? 'escalar a especialista'
        : 'escalate to specialist';
    }
    
    ruleLines.push(
      isSpanish
        ? `- Si se presenta contenido prohibido (${bannedPhrasesText}), aplica: ${escalationText}.`
        : `- If prohibited content appears (${bannedPhrasesText}), apply: ${escalationText}.`
    );
  }

  // Soft character limit
  if (allowSoftLimit) {
    const softLimit = profile.verbosity.soft_char_limit || defaultSoftLimit;
    ruleLines.push(
      isSpanish
        ? `- Sugerencia de longitud (no estricta): ~${softLimit} caracteres. Si la claridad requiere más, podés excederte.`
        : `- Length suggestion (not strict): ~${softLimit} characters. If clarity requires more, you can exceed it.`
    );
  }

  sections.push(ruleLines.join('\n'));
  sections.push('');

  // Context section
  const contextTitle = isSpanish ? 'Contexto:' : 'Context:';
  sections.push(contextTitle);
  
  const beatNameTranslated = BEAT_TRANSLATIONS[beat.name] || beat.name;
  
  const contextLines = [
    isSpanish ? `- Seed: ${seed.text}` : `- Seed: ${seed.text}`,
    isSpanish 
      ? `- Beat actual (${beat.index}/${beat.total}): ${beatNameTranslated}`
      : `- Current beat (${beat.index}/${beat.total}): ${beatNameTranslated}`,
  ];

  // Memory section
  const memoryTitle = isSpanish ? '- Memoria breve:' : '- Brief memory:';
  if (memory.facts.length > 0) {
    contextLines.push(memoryTitle);
    contextLines.push(renderBulletList(memory.facts));
  } else {
    contextLines.push(
      isSpanish 
        ? memoryTitle + ' (sin datos relevantes)'
        : memoryTitle + ' (no relevant data)'
    );
  }

  sections.push(contextLines.join('\n'));
  sections.push('');

  // Narrative instruction section
  const instructionTitle = isSpanish ? 'Instrucción narrativa:' : 'Narrative instruction:';
  sections.push(instructionTitle);
  
  const instructionLines = [
    isSpanish
      ? '- Sigue el beat indicado con coherencia. Da ejemplos concretos (frases, chats, situaciones).'
      : '- Follow the indicated beat coherently. Give concrete examples (phrases, chats, situations).',
    isSpanish
      ? '- Integra emociones en capas (primaria + secundaria), necesidades y límites.'
      : '- Integrate emotions in layers (primary + secondary), needs and boundaries.',
    isSpanish
      ? '- Mantené el estilo de conflicto del perfil.'
      : '- Maintain the conflict style of the profile.',
  ];

  if (profile.question_rate.max > 0) {
    instructionLines.push(
      isSpanish
        ? `- Formula ${profile.question_rate.min}–${profile.question_rate.max} preguntas al final, si corresponde.`
        : `- Ask ${profile.question_rate.min}–${profile.question_rate.max} questions at the end, if appropriate.`
    );
  }

  sections.push(instructionLines.join('\n'));

  return sections.join('\n');
}