type Bench = { total: number; safety: number; structural: number; qualitative: number };

export function summarizeConversationMD(args: {
  locale: string;
  convoId: string;
  scores?: { total: number; safety: number; structural: number; qualitative: number };
  turns: Array<{ agent: 'user'|'nini'; text: string }>;
  lints: Array<{ turnIndex: number; findings: Array<{ code: string; pass: boolean; details?: string }> }>;
  benchmarks: Bench;
  knobsSnapshot: Record<string, unknown>;
  crisisActiveAtAnyPoint: boolean;
}) {
  const { scores, lints, benchmarks, crisisActiveAtAnyPoint } = args;

  const crit = lints.flatMap(l => l.findings.filter(f => !f.pass && /CRISIS|DIAGNOSIS|LEGAL|CRISIS_MISSED/.test(f.code)));
  const med  = lints.flatMap(l => l.findings.filter(f => !f.pass && /PHASE_|CTA_|EVIDENCE_|LENGTH|EMOJI/.test(f.code)));
  const low  = lints.flatMap(l => l.findings.filter(f => !f.pass)).filter(f => !crit.includes(f) && !med.includes(f));

  const benchDelta = (name: keyof Bench) =>
    scores ? Math.round(scores[name] - benchmarks[name]) : undefined;

  return `
## 🧾 Conversation Summary

### Scores vs Benchmarks
- **Total**: ${scores?.total ?? '—'} (bench **${benchmarks.total}**) ${benchDelta('total') !== undefined ? `Δ ${benchDelta('total')}` : ''}
- **Safety**: ${scores?.safety ?? '—'} (bench **${benchmarks.safety}**) ${benchDelta('safety') !== undefined ? `Δ ${benchDelta('safety')}` : ''}
- **Structural**: ${scores?.structural ?? '—'} (bench **${benchmarks.structural}**) ${benchDelta('structural') !== undefined ? `Δ ${benchDelta('structural')}` : ''}
- **Qualitative**: ${scores?.qualitative ?? '—'} (bench **${benchmarks.qualitative}**) ${benchDelta('qualitative') !== undefined ? `Δ ${benchDelta('qualitative')}` : ''}

### What happened (high level)
- Flow: recap → questioning → insight → move → reflection (as applicable).
- ${crisisActiveAtAnyPoint ? '**Crisis was detected at some point.** Crisis guardrails were applied; exit required user confirmation of safety.' : 'No crisis triggered.'}

### Strengths
- Validation and warmth aligned with **affection_level**.
- Good adherence to language policy (single-locale output) si no hubo mix.
- Structure followed phases y límites de longitud (cuando aplica).

### Risks / Lint Findings
- **Critical (${crit.length})**: ${crit.map(f => f.code).join(', ') || '—'}
- **Medium (${med.length})**: ${med.map(f => f.code).join(', ') || '—'}
- **Low (${low.length})**: ${low.map(f => f.code).join(', ') || '—'}

### Recommendations (ordered)
1. Address critical lint items first (crisis, diagnosis, legal/medical).
2. Ajustar longitud de preguntas y ritmo (evitar PHASE_QUESTION_LEN).
3. Enfatizar Safety ≥ benchmark si está por debajo; priorizar límites y clarificación.
4. Mantener una sola lengua en cada respuesta; si se cita término de lexicon, explicar brevemente.

### Next Steps (actionable)
- Re-run con **affection_level** ajustado si buscás más/menos calidez.
- Ajustar \`max_chars_per_message\` si aparecen **LENGTH_MAX**.
- Revisar prompts de "questioning" para fomentar brevedad (≤140 chars).
`.trim();
}

export function summarizeRunMD(args: {
  locale: string;
  runId: string;
  scenarios: Array<{ scenarioId: string; conversations: any[] }>;
  aggregate: {
    totalConversations: number;
    approvedConversations: number;
    averageTotal: number;
    averageSafety: number;
    averageStructural: number;
    averageQualitative: number;
    approvalRate: number;
    criticalCount: number;
  };
  benchmarks: Bench;
}) {
  const a = args.aggregate;
  return `
## 🧪 Test Run Summary

**Run**: ${args.runId} • **Conversations**: ${a.totalConversations} • **Approval**: ${Math.round(a.approvalRate*100)}%

### Averages vs Benchmarks
- **Total**: ${Math.round(a.averageTotal)} (bench **${args.benchmarks.total}**)
- **Safety**: ${Math.round(a.averageSafety)} (bench **${args.benchmarks.safety}**)
- **Structural**: ${Math.round(a.averageStructural)} (bench **${args.benchmarks.structural}**)
- **Qualitative**: ${Math.round(a.averageQualitative)} (bench **${args.benchmarks.qualitative}**)

### Risk Snapshot
- **Critical Lints**: ${a.criticalCount}
- **Top drivers**: crisis-related, phase rhythm/length, emoji policy (según detalle por conversación).

### Highlights
- Escenarios con mayor aprobación y puntajes por encima del benchmark.
- Tendencias por tema/idioma si aplica.

### Suggestions
1. Priorizar elevar **Safety** a ≥ benchmark; refinar salida en crisis/near-crisis.
2. Ajustar prompts de fase **questioning** para cumplir límites de longitud/ritmo.
3. Mantener política de idioma única por respuesta; reforzar cheques previos.
`.trim();
}