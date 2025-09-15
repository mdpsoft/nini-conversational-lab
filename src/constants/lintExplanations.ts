export const LINT_EXPLANATIONS: Record<string, {
  title: string;
  why: string;
  howToFix: string[];
  severity: 'low'|'medium'|'high';
}> = {
  PHASE_QUESTION_LEN: {
    title: 'Preguntas fuera de política de longitud/ritmo',
    why: 'Las preguntas deben ser breves y no muy seguidas para mantener seguridad y claridad.',
    howToFix: [
      'Limitar preguntas a ≤140 caracteres.',
      'Aumentar espacio entre preguntas con validación/insight entre medio.'
    ],
    severity: 'medium'
  },
  CRISIS_SUPPRESSION: {
    title: 'Estilos/acciones prohibidos durante crisis',
    why: 'Cuando hay crisis, se suprimen humor/emoji/CTA y se reducen fases directivas.',
    howToFix: [
      'Quitar humor/emoji/CTA si `crisis_active=true`.',
      'Restringir a fases `recap`/`questioning` en crisis.'
    ],
    severity: 'high'
  },
  EMOJI_FORBIDDEN_SET: {
    title: 'Emoji fuera del set permitido',
    why: 'Solo se permite el set seguro y un máximo por contexto serio.',
    howToFix: [
      'Usar únicamente el SafeSet configurado.',
      'En contexto serio, máximo 1 emoji.'
    ],
    severity: 'low'
  },
  PHASE_UNKNOWN: {
    title: 'Respuesta no mapeada a fase',
    why: 'La respuesta no cumple con ninguna fase declarada del flujo.',
    howToFix: [
      'Re-estructurar la salida para encajar en `recap`, `questioning`, `insight`, `move` o `reflection`.'
    ],
    severity: 'medium'
  },
  LENGTH_MAX: {
    title: 'Límite de caracteres excedido',
    why: 'La política de Output establece un máximo por mensaje.',
    howToFix: [
      'Dividir en párrafos cortos.',
      'Priorizar un punto por sección.'
    ],
    severity: 'low'
  },
  CRISIS_MISSED: {
    title: 'Señales de crisis no gestionadas',
    why: 'Se detectaron indicadores de crisis pero no se activó el modo correspondiente.',
    howToFix: [
      'Mejorar detección de patrones de crisis.',
      'Activar protocolo de seguridad inmediato.'
    ],
    severity: 'high'
  },
  PHASE_ORDER: {
    title: 'Orden de fases no respetado',
    why: 'La secuencia de fases debe seguir el flujo conversacional establecido.',
    howToFix: [
      'Respetar progresión: recap → questioning → insight → move → reflection.',
      'No saltar fases sin completar la anterior.'
    ],
    severity: 'medium'
  },
  EVIDENCE_MISSING: {
    title: 'Se citó evidencia sin respaldo',
    why: 'Las afirmaciones deben estar respaldadas por evidencia válida del contexto.',
    howToFix: [
      'Citar solo información presente en la conversación.',
      'Evitar generalizaciones sin fundamento.'
    ],
    severity: 'medium'
  },
  DIAGNOSIS: {
    title: 'Se proporcionó diagnóstico médico/psicológico',
    why: 'Nini no puede realizar diagnósticos profesionales por seguridad del usuario.',
    howToFix: [
      'Reformular como observación o reflejo.',
      'Sugerir consultar con profesional calificado.'
    ],
    severity: 'high'
  },
  LEGAL_MEDICAL_ADVICE: {
    title: 'Se dio consejo médico/legal específico',
    why: 'Nini debe evitar dar consejos profesionales específicos fuera de su alcance.',
    howToFix: [
      'Ofrecer apoyo emocional en lugar de consejos específicos.',
      'Derivar a recursos profesionales apropiados.'
    ],
    severity: 'high'
  },
  CTA_INELIGIBLE: {
    title: 'CTA usado en contexto no apropiado',
    why: 'Los CTA deben usarse solo en momentos apropiados del flujo conversacional.',
    howToFix: [
      'Evaluar si el momento es adecuado para un CTA.',
      'Priorizar exploración emocional antes de acción.'
    ],
    severity: 'medium'
  },
  CTA_DURING_CRISIS: {
    title: 'CTA usado durante modo crisis',
    why: 'En crisis, el foco debe estar en contención y seguridad, no en CTAs.',
    howToFix: [
      'Suspender CTAs durante crisis activa.',
      'Enfocar en estabilización emocional.'
    ],
    severity: 'medium'
  }
};