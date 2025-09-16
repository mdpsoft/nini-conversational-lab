import { UserAIProfile } from "@/store/profiles";

export type UserAIPresetId =
  | 'anxious_dependent'
  | 'insecure_selfcritical'
  | 'sensitive_vulnerable'
  | 'jealous_controlling'
  | 'avoidant_distanced'
  | 'hurt_distrustful'
  | 'burned_out_overwhelmed'
  | 'resilient_in_progress';

export interface UserAIPreset {
  id: UserAIPresetId;
  icon: string;
  name: string;
  short: string;
  defaultQuestionRate: { min: number; max: number };
  defaultTraits: string[];
  defaultFocus: {
    emotions: string[];
    needs: string[];
    boundaries: string[];
  };
}

export const USERAI_PRESETS: Record<UserAIPresetId, UserAIPreset> = {
  anxious_dependent: {
    id: 'anxious_dependent',
    icon: '😰',
    name: 'Ansiosa y Dependiente',
    short: 'Busca validación, miedo al abandono.',
    defaultQuestionRate: { min: 0, max: 1 }, // menos preguntas, más contención
    defaultTraits: ['ansiedad alta', 'baja autoeficacia', 'necesidad de certeza'],
    defaultFocus: {
      emotions: ['ansiedad', 'inseguridad', 'apego'],
      needs: ['seguridad', 'validación', 'claridad'],
      boundaries: ['auto-cuidado', 'tiempos de respuesta'],
    },
  },
  insecure_selfcritical: {
    id: 'insecure_selfcritical',
    icon: '🤔',
    name: 'Insegura y Autocrítica',
    short: 'Se culpa, duda de cada paso.',
    defaultQuestionRate: { min: 0, max: 2 },
    defaultTraits: ['rumiación', 'perfeccionismo', 'miedo a equivocarse'],
    defaultFocus: {
      emotions: ['culpa', 'vergüenza', 'ansiedad'],
      needs: ['reaseguro', 'pasos pequeños', 'feedback concreto'],
      boundaries: ['autocompasión', 'ritmo propio'],
    },
  },
  sensitive_vulnerable: {
    id: 'sensitive_vulnerable',
    icon: '😓',
    name: 'Sensible y Vulnerable',
    short: 'Se hiere fácil, emociones intensas.',
    defaultQuestionRate: { min: 0, max: 2 },
    defaultTraits: ['hipersensibilidad', 'desborde', 'miedo al conflicto'],
    defaultFocus: {
      emotions: ['tristeza', 'ansiedad', 'temor'],
      needs: ['validación emocional', 'pausas', 'lenguaje suave'],
      boundaries: ['espacio seguro', 'no presionar'],
    },
  },
  jealous_controlling: {
    id: 'jealous_controlling',
    icon: '😡',
    name: 'Celosa y Controladora',
    short: 'Necesidad de control, miedo a perder.',
    defaultQuestionRate: { min: 1, max: 3 }, // más preguntas para explorar creencias
    defaultTraits: ['celos', 'hipervigilancia', 'sospecha'],
    defaultFocus: {
      emotions: ['enojo', 'ansiedad', 'frustración'],
      needs: ['seguridad', 'acuerdos claros', 'transparencia'],
      boundaries: ['privacidad', 'uso de dispositivos'],
    },
  },
  avoidant_distanced: {
    id: 'avoidant_distanced',
    icon: '🌀',
    name: 'Evitativa y Distante',
    short: 'Se aleja ante tensión, le cuesta pedir ayuda.',
    defaultQuestionRate: { min: 2, max: 3 }, // más preguntas suaves para abrir
    defaultTraits: ['evitación', 'desconexión', 'cierre'],
    defaultFocus: {
      emotions: ['apatía', 'ansiedad encubierta'],
      needs: ['autonomía respetada', 'formatos de baja fricción', 'tiempo'],
      boundaries: ['tiempos de pausa', 'no confrontar de golpe'],
    },
  },
  hurt_distrustful: {
    id: 'hurt_distrustful',
    icon: '💔',
    name: 'Herida y Desconfiada',
    short: 'Historia de vínculos tóxicos, cuesta confiar.',
    defaultQuestionRate: { min: 1, max: 2 },
    defaultTraits: ['hipersensibilidad a señales', 'flashbacks', 'hiperalerta'],
    defaultFocus: {
      emotions: ['tristeza', 'rabia', 'miedo'],
      needs: ['seguridad', 'pruebas de realidad', 'límites firmes'],
      boundaries: ['contacto cero', 'reglas de cuidado'],
    },
  },
  burned_out_overwhelmed: {
    id: 'burned_out_overwhelmed',
    icon: '😭',
    name: 'Emocionalmente Saturada',
    short: 'Abrumada, cansancio, mezcla de síntomas.',
    defaultQuestionRate: { min: 0, max: 1 },
    defaultTraits: ['fatiga', 'baja energía', 'evitación'],
    defaultFocus: {
      emotions: ['agotamiento', 'ansiedad', 'apatía'],
      needs: ['micro-pasos', 'descanso', 'priorización'],
      boundaries: ['no sobrecargar', 'expectativas realistas'],
    },
  },
  resilient_in_progress: {
    id: 'resilient_in_progress',
    icon: '🌱',
    name: 'Resiliente en Proceso',
    short: 'Quiere cambiar, aún con altibajos.',
    defaultQuestionRate: { min: 1, max: 2 },
    defaultTraits: ['motivación', 'autoconciencia inicial'],
    defaultFocus: {
      emotions: ['esperanza', 'ansiedad funcional'],
      needs: ['plan simple', 'tracking', 'refuerzo positivo'],
      boundaries: ['rutinas', 'tareas acotadas'],
    },
  },
};

export function getUserAIPresets(): UserAIPreset[] {
  return Object.values(USERAI_PRESETS);
}

export function presetToProfileFields(
  presetId: UserAIPresetId,
  lang: string = 'es'
): Partial<UserAIProfile> {
  const preset = USERAI_PRESETS[presetId];
  if (!preset) return {};

  const isSpanish = lang === 'es';
  
  return {
    traits: preset.defaultTraits,
    emotions_focus: preset.defaultFocus.emotions,
    needs_focus: preset.defaultFocus.needs,
    boundaries_focus: preset.defaultFocus.boundaries,
    question_rate: preset.defaultQuestionRate,
    // Set tone based on preset type
    tone: getToneForPreset(presetId, isSpanish),
    attachment_style: getAttachmentStyleForPreset(presetId),
    conflict_style: getConflictStyleForPreset(presetId, isSpanish),
  };
}

function getToneForPreset(presetId: UserAIPresetId, isSpanish: boolean): string {
  const tones = {
    anxious_dependent: isSpanish ? 'comprensivo y tranquilizador, validador' : 'understanding and reassuring, validating',
    insecure_selfcritical: isSpanish ? 'paciente y alentador, sin juzgar' : 'patient and encouraging, non-judgmental',
    sensitive_vulnerable: isSpanish ? 'suave y empático, muy cuidadoso' : 'gentle and empathetic, very careful',
    jealous_controlling: isSpanish ? 'firme pero comprensivo, explorador' : 'firm but understanding, exploratory',
    avoidant_distanced: isSpanish ? 'respetuoso y no invasivo, sutil' : 'respectful and non-invasive, subtle',
    hurt_distrustful: isSpanish ? 'cálido pero pausado, construye confianza' : 'warm but measured, builds trust',
    burned_out_overwhelmed: isSpanish ? 'muy suave, sin presionar, alentador' : 'very gentle, non-pressuring, encouraging',
    resilient_in_progress: isSpanish ? 'optimista y práctico, motivador' : 'optimistic and practical, motivating',
  };
  
  return tones[presetId];
}

function getAttachmentStyleForPreset(presetId: UserAIPresetId): 'anxious' | 'avoidant' | 'secure' | 'fearful' {
  const styles = {
    anxious_dependent: 'anxious',
    insecure_selfcritical: 'anxious',
    sensitive_vulnerable: 'anxious',
    jealous_controlling: 'anxious',
    avoidant_distanced: 'avoidant',
    hurt_distrustful: 'fearful',
    burned_out_overwhelmed: 'fearful',
    resilient_in_progress: 'secure',
  } as const;
  
  return styles[presetId];
}

function getConflictStyleForPreset(presetId: UserAIPresetId, isSpanish: boolean): string {
  const styles = {
    anxious_dependent: isSpanish ? 'evitativo y apaciguador' : 'avoiding and appeasing',
    insecure_selfcritical: isSpanish ? 'autocrítico y dubitativo' : 'self-critical and hesitant',
    sensitive_vulnerable: isSpanish ? 'retractivo y emocional' : 'withdrawing and emotional',
    jealous_controlling: isSpanish ? 'confrontativo y vigilante' : 'confrontational and vigilant',
    avoidant_distanced: isSpanish ? 'evasivo y distante' : 'evasive and distant',
    hurt_distrustful: isSpanish ? 'defensivo y cauteloso' : 'defensive and cautious',
    burned_out_overwhelmed: isSpanish ? 'abrumado y evasivo' : 'overwhelmed and avoiding',
    resilient_in_progress: isSpanish ? 'constructivo y abierto' : 'constructive and open',
  };
  
  return styles[presetId];
}