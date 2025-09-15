// Quick metrics computation for turns and runs
// Extracts emotions, needs, boundaries and basic stats

export interface TurnMetrics {
  chars: number;
  paragraphs: number;
  questions: number;
  emotions: string[];
  needs: string[];
  boundaries: string[];
}

export interface RunMetrics {
  avgChars: number;
  avgQuestions: number;
  emotionFreq: Record<string, number>;
  needFreq: Record<string, number>;
  boundaryFreq: Record<string, number>;
}

// Emotion lexicons by language
const EMOTION_LEXICONS = {
  es: [
    'miedo', 'ansiedad', 'tristeza', 'enojo', 'ira', 'frustración', 'alegría', 'felicidad',
    'amor', 'cariño', 'odio', 'resentimiento', 'culpa', 'vergüenza', 'orgullo', 'esperanza',
    'desesperación', 'confusión', 'claridad', 'paz', 'estrés', 'tensión', 'calma', 'nervios',
    'preocupación', 'tranquilidad', 'inseguridad', 'confianza', 'soledad', 'compañía'
  ],
  en: [
    'fear', 'anxiety', 'sadness', 'anger', 'rage', 'frustration', 'joy', 'happiness',
    'love', 'affection', 'hate', 'resentment', 'guilt', 'shame', 'pride', 'hope',
    'despair', 'confusion', 'clarity', 'peace', 'stress', 'tension', 'calm', 'nerves',
    'worry', 'tranquility', 'insecurity', 'confidence', 'loneliness', 'companionship'
  ]
};

const NEED_LEXICONS = {
  es: [
    'claridad', 'tiempo', 'espacio', 'afecto', 'comprensión', 'apoyo', 'ayuda', 'atención',
    'respeto', 'valoración', 'reconocimiento', 'seguridad', 'estabilidad', 'libertad',
    'autonomía', 'control', 'orden', 'rutina', 'flexibilidad', 'comunicación', 'diálogo',
    'escucha', 'paciencia', 'tolerancia', 'límites', 'estructura', 'organización'
  ],
  en: [
    'clarity', 'time', 'space', 'affection', 'understanding', 'support', 'help', 'attention',
    'respect', 'validation', 'recognition', 'security', 'stability', 'freedom',
    'autonomy', 'control', 'order', 'routine', 'flexibility', 'communication', 'dialogue',
    'listening', 'patience', 'tolerance', 'boundaries', 'structure', 'organization'
  ]
};

const BOUNDARY_PATTERNS = {
  es: [
    /no quiero/gi,
    /prefiero no/gi,
    /no me gusta/gi,
    /límite/gi,
    /hasta aquí/gi,
    /no más/gi,
    /necesito que pare/gi,
    /no acepto/gi,
    /respeta/gi,
    /mi espacio/gi
  ],
  en: [
    /i don't want/gi,
    /i prefer not/gi,
    /i don't like/gi,
    /boundary/gi,
    /that's enough/gi,
    /no more/gi,
    /i need it to stop/gi,
    /i don't accept/gi,
    /respect/gi,
    /my space/gi
  ]
};

/**
 * Extracts words matching a lexicon from text
 */
function extractMatches(text: string, lexicon: string[]): string[] {
  const normalizedText = text.toLowerCase();
  const matches: string[] = [];
  
  for (const word of lexicon) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    if (regex.test(normalizedText)) {
      matches.push(word);
    }
  }
  
  return [...new Set(matches)]; // Remove duplicates
}

/**
 * Detects boundary expressions in text
 */
function detectBoundaries(text: string, lang: 'es' | 'en'): string[] {
  const patterns = BOUNDARY_PATTERNS[lang] || BOUNDARY_PATTERNS.es;
  const boundaries: string[] = [];
  
  for (const pattern of patterns) {
    const matches = text.match(pattern);
    if (matches) {
      boundaries.push(...matches.map(m => m.toLowerCase()));
    }
  }
  
  return [...new Set(boundaries)];
}

/**
 * Counts real questions in text (excludes questions in quotes/links)
 */
function countQuestions(text: string): number {
  // Remove quoted text and links to avoid counting questions in them
  const cleanText = text
    .replace(/"[^"]*"/g, '')
    .replace(/'[^']*'/g, '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\([^)]*\)/g, '');
  
  // Count question marks
  return (cleanText.match(/\?/g) || []).length;
}

/**
 * Computes metrics for a single turn
 */
export function computeTurnMetrics(
  text: string, 
  speaker: "Nini" | "USERAI", 
  lang: 'es' | 'en' = 'es'
): TurnMetrics {
  const chars = text.length;
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim()).length;
  const questions = countQuestions(text);
  
  const emotionLexicon = EMOTION_LEXICONS[lang] || EMOTION_LEXICONS.es;
  const needLexicon = NEED_LEXICONS[lang] || NEED_LEXICONS.es;
  
  const emotions = extractMatches(text, emotionLexicon);
  const needs = extractMatches(text, needLexicon);
  const boundaries = detectBoundaries(text, lang);
  
  return {
    chars,
    paragraphs,
    questions,
    emotions,
    needs,
    boundaries
  };
}

/**
 * Aggregates metrics across all turns in a run
 */
export function aggregateRunMetrics(turns: Array<{ text: string; agent: string; meta?: any }>): RunMetrics {
  if (turns.length === 0) {
    return {
      avgChars: 0,
      avgQuestions: 0,
      emotionFreq: {},
      needFreq: {},
      boundaryFreq: {}
    };
  }
  
  let totalChars = 0;
  let totalQuestions = 0;
  const emotionFreq: Record<string, number> = {};
  const needFreq: Record<string, number> = {};
  const boundaryFreq: Record<string, number> = {};
  
  for (const turn of turns) {
    if (turn.meta?.metrics) {
      const metrics = turn.meta.metrics as TurnMetrics;
      totalChars += metrics.chars;
      totalQuestions += metrics.questions;
      
      // Count emotion frequencies
      for (const emotion of metrics.emotions) {
        emotionFreq[emotion] = (emotionFreq[emotion] || 0) + 1;
      }
      
      // Count need frequencies
      for (const need of metrics.needs) {
        needFreq[need] = (needFreq[need] || 0) + 1;
      }
      
      // Count boundary frequencies
      for (const boundary of metrics.boundaries) {
        boundaryFreq[boundary] = (boundaryFreq[boundary] || 0) + 1;
      }
    }
  }
  
  return {
    avgChars: Math.round(totalChars / turns.length),
    avgQuestions: Math.round((totalQuestions / turns.length) * 10) / 10,
    emotionFreq,
    needFreq,
    boundaryFreq
  };
}

/**
 * Gets top N items from a frequency map
 */
export function getTopItems(freqMap: Record<string, number>, n: number = 3): Array<{ item: string; count: number }> {
  return Object.entries(freqMap)
    .map(([item, count]) => ({ item, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}