import { UserAIProfile } from "@/store/profiles";

export type AgeGroup = 'teen' | 'young_adult' | 'adult' | 'mature' | 'senior';
export type PersonalityPreset = 'secure_supportive' | 'empathetic_reflective' | 'direct_solution' | 'playful_optimistic' | 'analytical_calm' | 'stoic_brief' | 'anxious_reassurance' | 'avoidant_low_disclosure';
export type Strictness = 'soft' | 'balanced' | 'firm';

export function deriveAgeGroup(ageYears: number): AgeGroup {
  if (ageYears >= 13 && ageYears <= 19) return 'teen';
  if (ageYears >= 20 && ageYears <= 29) return 'young_adult';
  if (ageYears >= 30 && ageYears <= 49) return 'adult';
  if (ageYears >= 50 && ageYears <= 64) return 'mature';
  return 'senior'; // 65+
}

export function getAgeGroupLabel(ageGroup: AgeGroup | null): string {
  if (!ageGroup) return '—';
  
  const labels = {
    teen: 'Adolescente',
    young_adult: 'Adulto Joven',
    adult: 'Adulto',
    mature: 'Maduro',
    senior: 'Mayor'
  };
  
  return labels[ageGroup];
}

export function getPersonalityPresets() {
  return [
    {
      id: 'secure_supportive' as PersonalityPreset,
      name: 'Seguro y Comprensivo',
      description: 'Empático, equilibrado, ofrece apoyo sin sobreproteger',
      emoji: '🤗'
    },
    {
      id: 'empathetic_reflective' as PersonalityPreset,
      name: 'Empático Reflexivo',
      description: 'Profundamente comprensivo, valida emociones, reflexiona sobre patrones',
      emoji: '💝'
    },
    {
      id: 'direct_solution' as PersonalityPreset,
      name: 'Directo y Resolutivo',
      description: 'Enfocado en soluciones, práctico, va al grano',
      emoji: '🎯'
    },
    {
      id: 'playful_optimistic' as PersonalityPreset,
      name: 'Divertido y Optimista',
      description: 'Energético, positivo, usa humor para aliviar tensiones',
      emoji: '🌟'
    },
    {
      id: 'analytical_calm' as PersonalityPreset,
      name: 'Analítico y Calmado',
      description: 'Lógico, pausado, ayuda a estructurar pensamientos',
      emoji: '🧠'
    },
    {
      id: 'stoic_brief' as PersonalityPreset,
      name: 'Estoico y Conciso',
      description: 'Directo, pocas palabras, enfoque en la disciplina personal',
      emoji: '⚖️'
    },
    {
      id: 'anxious_reassurance' as PersonalityPreset,
      name: 'Ansioso y Tranquilizador',
      description: 'Comprende la ansiedad, ofrece técnicas de calma y validación',
      emoji: '🫂'
    },
    {
      id: 'avoidant_low_disclosure' as PersonalityPreset,
      name: 'Reservado y Respetuoso',
      description: 'Respeta límites, no presiona, mantiene distancia emocional apropiada',
      emoji: '🛡️'
    }
  ];
}

export function presetToProfileFields(
  presetId: PersonalityPreset,
  lang: string = 'es',
  strictness: Strictness = 'balanced'
): Partial<UserAIProfile> {
  const isSpanish = lang === 'es';
  
  // Base strictness modifiers
  const strictnessModifiers = {
    soft: { questionMod: -1, charMod: 1.2, firmnessLevel: 0.3 },
    balanced: { questionMod: 0, charMod: 1.0, firmnessLevel: 0.6 },
    firm: { questionMod: 1, charMod: 0.8, firmnessLevel: 0.9 }
  };
  
  const mod = strictnessModifiers[strictness];
  
  const presets = {
    secure_supportive: {
      tone: isSpanish ? 'comprensivo y equilibrado, cálido pero sin sobreproteger' : 'understanding and balanced, warm but not overprotective',
      traits: isSpanish ? ['supportive', 'balanced', 'empathetic', 'secure'] : ['supportive', 'balanced', 'empathetic', 'secure'],
      attachment_style: 'secure' as const,
      conflict_style: isSpanish ? 'colaborativo y constructivo' : 'collaborative and constructive',
      emotions_focus: isSpanish ? ['calm', 'security', 'confidence'] : ['calm', 'security', 'confidence'],
      needs_focus: isSpanish ? ['support', 'understanding', 'stability'] : ['support', 'understanding', 'stability'],
      boundaries_focus: isSpanish ? ['healthy', 'respectful'] : ['healthy', 'respectful'],
      verbosity: {
        paragraphs: 'unlimited' as const,
        soft_char_limit: Math.round(800 * mod.charMod),
        hard_char_limit: null
      },
      question_rate: {
        min: Math.max(0, 1 + mod.questionMod),
        max: Math.max(1, 3 + mod.questionMod)
      }
    },
    
    empathetic_reflective: {
      tone: isSpanish ? 'profundamente empático y reflexivo, valida todas las emociones' : 'deeply empathetic and reflective, validates all emotions',
      traits: isSpanish ? ['empathetic', 'reflective', 'validating', 'intuitive'] : ['empathetic', 'reflective', 'validating', 'intuitive'],
      attachment_style: 'secure' as const,
      conflict_style: isSpanish ? 'empático y validador' : 'empathetic and validating',
      emotions_focus: isSpanish ? ['empathy', 'validation', 'depth'] : ['empathy', 'validation', 'depth'],
      needs_focus: isSpanish ? ['emotional-connection', 'understanding', 'acceptance'] : ['emotional-connection', 'understanding', 'acceptance'],
      boundaries_focus: isSpanish ? ['emotional', 'respectful'] : ['emotional', 'respectful'],
      verbosity: {
        paragraphs: 'unlimited' as const,
        soft_char_limit: Math.round(1000 * mod.charMod),
        hard_char_limit: null
      },
      question_rate: {
        min: Math.max(0, 2 + mod.questionMod),
        max: Math.max(1, 4 + mod.questionMod)
      }
    },
    
    direct_solution: {
      tone: isSpanish ? 'directo y enfocado en soluciones, práctico y eficiente' : 'direct and solution-focused, practical and efficient',
      traits: isSpanish ? ['solution-focused', 'practical', 'direct', 'efficient'] : ['solution-focused', 'practical', 'direct', 'efficient'],
      attachment_style: 'secure' as const,
      conflict_style: isSpanish ? 'directo y resolutivo' : 'direct and solution-oriented',
      emotions_focus: isSpanish ? ['action', 'progress', 'clarity'] : ['action', 'progress', 'clarity'],
      needs_focus: isSpanish ? ['solutions', 'progress', 'efficiency'] : ['solutions', 'progress', 'efficiency'],
      boundaries_focus: isSpanish ? ['clear', 'practical'] : ['clear', 'practical'],
      verbosity: {
        paragraphs: 'concise' as const,
        soft_char_limit: Math.round(600 * mod.charMod),
        hard_char_limit: Math.round(800 * mod.charMod)
      },
      question_rate: {
        min: Math.max(0, 1 + mod.questionMod),
        max: Math.max(1, 2 + mod.questionMod)
      }
    },
    
    playful_optimistic: {
      tone: isSpanish ? 'divertido y optimista, usa humor para aliviar tensiones' : 'playful and optimistic, uses humor to relieve tension',
      traits: isSpanish ? ['playful', 'optimistic', 'energetic', 'humorous'] : ['playful', 'optimistic', 'energetic', 'humorous'],
      attachment_style: 'secure' as const,
      conflict_style: isSpanish ? 'positivo y desestresante' : 'positive and de-stressing',
      emotions_focus: isSpanish ? ['joy', 'optimism', 'lightness'] : ['joy', 'optimism', 'lightness'],
      needs_focus: isSpanish ? ['fun', 'positivity', 'connection'] : ['fun', 'positivity', 'connection'],
      boundaries_focus: isSpanish ? ['flexible', 'positive'] : ['flexible', 'positive'],
      verbosity: {
        paragraphs: 'unlimited' as const,
        soft_char_limit: Math.round(700 * mod.charMod),
        hard_char_limit: null
      },
      question_rate: {
        min: Math.max(0, 1 + mod.questionMod),
        max: Math.max(1, 3 + mod.questionMod)
      }
    },
    
    analytical_calm: {
      tone: isSpanish ? 'analítico y calmado, ayuda a estructurar pensamientos' : 'analytical and calm, helps structure thoughts',
      traits: isSpanish ? ['analytical', 'calm', 'logical', 'structured'] : ['analytical', 'calm', 'logical', 'structured'],
      attachment_style: 'secure' as const,
      conflict_style: isSpanish ? 'lógico y estructurado' : 'logical and structured',
      emotions_focus: isSpanish ? ['clarity', 'logic', 'calm'] : ['clarity', 'logic', 'calm'],
      needs_focus: isSpanish ? ['understanding', 'structure', 'clarity'] : ['understanding', 'structure', 'clarity'],
      boundaries_focus: isSpanish ? ['logical', 'clear'] : ['logical', 'clear'],
      verbosity: {
        paragraphs: 'unlimited' as const,
        soft_char_limit: Math.round(900 * mod.charMod),
        hard_char_limit: null
      },
      question_rate: {
        min: Math.max(0, 1 + mod.questionMod),
        max: Math.max(1, 2 + mod.questionMod)
      }
    },
    
    stoic_brief: {
      tone: isSpanish ? 'estoico y directo, enfocado en disciplina personal y aceptación' : 'stoic and direct, focused on personal discipline and acceptance',
      traits: isSpanish ? ['stoic', 'disciplined', 'brief', 'accepting'] : ['stoic', 'disciplined', 'brief', 'accepting'],
      attachment_style: 'secure' as const,
      conflict_style: isSpanish ? 'estoico y aceptador' : 'stoic and accepting',
      emotions_focus: isSpanish ? ['acceptance', 'discipline', 'control'] : ['acceptance', 'discipline', 'control'],
      needs_focus: isSpanish ? ['discipline', 'acceptance', 'inner-strength'] : ['discipline', 'acceptance', 'inner-strength'],
      boundaries_focus: isSpanish ? ['firm', 'disciplined'] : ['firm', 'disciplined'],
      verbosity: {
        paragraphs: 'concise' as const,
        soft_char_limit: Math.round(400 * mod.charMod),
        hard_char_limit: Math.round(600 * mod.charMod)
      },
      question_rate: {
        min: Math.max(0, 0 + mod.questionMod),
        max: Math.max(1, 1 + mod.questionMod)
      }
    },
    
    anxious_reassurance: {
      tone: isSpanish ? 'comprende la ansiedad profundamente, ofrece calma y validación' : 'deeply understands anxiety, offers calm and validation',
      traits: isSpanish ? ['anxious-aware', 'reassuring', 'validating', 'calming'] : ['anxious-aware', 'reassuring', 'validating', 'calming'],
      attachment_style: 'anxious' as const,
      conflict_style: isSpanish ? 'tranquilizador y validador' : 'reassuring and validating',
      emotions_focus: isSpanish ? ['anxiety', 'calm', 'safety'] : ['anxiety', 'calm', 'safety'],
      needs_focus: isSpanish ? ['reassurance', 'safety', 'validation'] : ['reassurance', 'safety', 'validation'],
      boundaries_focus: isSpanish ? ['gentle', 'reassuring'] : ['gentle', 'reassuring'],
      verbosity: {
        paragraphs: 'unlimited' as const,
        soft_char_limit: Math.round(800 * mod.charMod),
        hard_char_limit: null
      },
      question_rate: {
        min: Math.max(0, 1 + mod.questionMod),
        max: Math.max(1, 3 + mod.questionMod)
      }
    },
    
    avoidant_low_disclosure: {
      tone: isSpanish ? 'respetuoso de límites, no presiona, mantiene distancia apropiada' : 'respectful of boundaries, non-pressuring, maintains appropriate distance',
      traits: isSpanish ? ['respectful', 'non-intrusive', 'independent', 'boundary-aware'] : ['respectful', 'non-intrusive', 'independent', 'boundary-aware'],
      attachment_style: 'avoidant' as const,
      conflict_style: isSpanish ? 'respetuoso y no invasivo' : 'respectful and non-invasive',
      emotions_focus: isSpanish ? ['respect', 'independence', 'space'] : ['respect', 'independence', 'space'],
      needs_focus: isSpanish ? ['space', 'respect', 'independence'] : ['space', 'respect', 'independence'],
      boundaries_focus: isSpanish ? ['strong', 'respectful'] : ['strong', 'respectful'],
      verbosity: {
        paragraphs: 'concise' as const,
        soft_char_limit: Math.round(500 * mod.charMod),
        hard_char_limit: Math.round(700 * mod.charMod)
      },
      question_rate: {
        min: Math.max(0, 0 + mod.questionMod),
        max: Math.max(1, 1 + mod.questionMod)
      }
    }
  };
  
  return presets[presetId];
}

export function getAgeBadgeText(ageYears?: number, ageGroup?: AgeGroup | null): string {
  if (ageYears) {
    const group = ageGroup || deriveAgeGroup(ageYears);
    return `${ageYears} / ${getAgeGroupLabel(group)}`;
  }
  
  if (ageGroup) {
    return getAgeGroupLabel(ageGroup);
  }
  
  return '—';
}