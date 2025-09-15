import { z } from "zod";

// Core Types
export interface Turn {
  agent: 'user' | 'nini';
  text: string;
  meta?: {
    phase?: 'recap' | 'questioning' | 'insight' | 'move' | 'reflection' | 'crisis';
    chars?: number;
    emoji_count?: number;
    ctas?: string[];
    crisis_active?: boolean;
    features_used?: string[];
    rule_violations?: string[];
  };
}

export interface Knobs {
  empathy: number; // [0..1]
  mirroring_intensity: number; // [0..1]
  humor?: number; // [0..1]
  probing_rate: number; // [0..1]
  ask_rate_min_turns: number; // int ≥0
  ask_rate_max_turns: number; // int ≥ min
  max_chars_per_message: number; // e.g., 900
  uncertainty_threshold: number; // [0..1]
  clarification_threshold: number; // [0..1]
  bias_confirmation_soft: number; // [0..1]
  directiveness: number; // [0..1]
  gentleness: number; // [0..1]
  colloquiality: number; // [0..1]
  emoji_bias: number; // [0..1]
  crisis_mode_enabled: boolean;
  language_strictness?: number; // [0..1]
  prefer_locale?: 'es' | 'en' | 'auto';
  affection_level: number; // [0..1]
}

export interface Scenario {
  id: string;
  name: string;
  language: 'es' | 'en' | 'mix';
  topic: string;
  attachment_style: 'anxious' | 'avoidant' | 'secure';
  emotional_intensity: number; // [0..1]
  cognitive_noise: number; // [0..1]
  crisis_signals: 'none' | 'ambiguous' | 'clear';
  goals: string[];
  constraints?: string[];
  seed_turns: string[];
  success_criteria: {
    must: string[];
    nice_to_have?: string[];
  };
}

export interface LintFinding {
  pass: boolean;
  code: string;
  details?: string;
}

export interface TurnLintResult {
  turnIndex: number;
  findings: LintFinding[];
}

export interface Conversation {
  id: string;
  scenarioId: string;
  knobs: Partial<Knobs>;
  turns: Turn[];
  lints: TurnLintResult[];
  scores?: {
    structural: number; // [0..100]
    safety: number; // [0..100]
    qualitative: number; // [0..100]
    total: number; // [0..100]
  };
}

export interface RunOptions {
  conversationsPerScenario: number; // [1..100]
  maxTurns: number; // [1..50]
  knobVariants?: {
    label: string;
    knobs: Partial<Knobs>;
  }[];
}

export interface RunResult {
  scenarioId: string;
  conversations: Conversation[];
}

export type RunStatus = 'completed' | 'aborted' | 'failed';

export interface RunRepoMeta {
  tags: string[];
  notes?: string;
  pinned?: boolean;   // baseline
  archived?: boolean;
}

export interface RunSummaryMetrics {
  avgTotal: number;
  avgSafety: number;
  avgStructural: number;
  avgQualitative: number;
  approvalRate: number;          // 0..1
  approvedCount: number;
  totalConversations: number;
  criticalIssues: number;        // count of critical lint incidents
  avgTurns?: number;
  avgChars?: number;
  avgLatencyMs?: number;
  errorCount?: number;
  tokensPrompt?: number;
  tokensCompletion?: number;
  costUsd?: number;
}

export interface RunRow {
  runId: string;
  createdAt: string;        // ISO
  createdBy?: string;

  // Context/config snapshot
  promptHash?: string;
  xmlVersion?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  simulationMode?: boolean;
  deviceLocale?: string;
  scenarioIds?: string[];
  scenarioCount?: number;
  conversationsPerScenario?: number;
  maxTurns?: number;
  knobVariants?: { label: string }[];

  // Aggregates
  status: RunStatus;
  metrics: RunSummaryMetrics;

  // Artifacts
  summaryMD?: string;
  resultsJson?: any;
  promptRendered?: string;
  guardsApplied?: string[];
  logs?: string[];

  // Repo meta
  repo: RunRepoMeta;
}

export interface RunSummary {
  runId: string;
  createdAt: string; // ISO string
  results: RunResult[];
}

// Zod Schemas for validation
export const KnobsSchema = z.object({
  empathy: z.number().min(0).max(1),
  mirroring_intensity: z.number().min(0).max(1),
  humor: z.number().min(0).max(1).optional(),
  probing_rate: z.number().min(0).max(1),
  ask_rate_min_turns: z.number().int().min(0),
  ask_rate_max_turns: z.number().int(),
  max_chars_per_message: z.number().int().positive(),
  uncertainty_threshold: z.number().min(0).max(1),
  clarification_threshold: z.number().min(0).max(1),
  bias_confirmation_soft: z.number().min(0).max(1),
  directiveness: z.number().min(0).max(1),
  gentleness: z.number().min(0).max(1),
  colloquiality: z.number().min(0).max(1),
  emoji_bias: z.number().min(0).max(1),
  crisis_mode_enabled: z.boolean(),
  language_strictness: z.number().min(0).max(1).optional(),
  prefer_locale: z.enum(['es', 'en', 'auto']).optional(),
  affection_level: z.number().min(0).max(1).default(0.5),
});

export const ScenarioSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(120),
  language: z.enum(['es', 'en', 'mix']),
  topic: z.string(),
  attachment_style: z.enum(['anxious', 'avoidant', 'secure']),
  emotional_intensity: z.number().min(0).max(1),
  cognitive_noise: z.number().min(0).max(1),
  crisis_signals: z.enum(['none', 'ambiguous', 'clear']),
  goals: z.array(z.string()).min(1),
  constraints: z.array(z.string()).optional(),
  seed_turns: z.array(z.string().min(1).max(500)).min(1).max(10),
  success_criteria: z.object({
    must: z.array(z.string()).min(1).max(10),
    nice_to_have: z.array(z.string()).max(10).optional(),
  }),
});

export const RunSummarySchema = z.object({
  runId: z.string(),
  createdAt: z.string(),
  results: z.array(z.object({
    scenarioId: z.string(),
    conversations: z.array(z.any()), // More detailed validation can be added later
  })),
});

// Default knobs
export const DEFAULT_KNOBS: Knobs = {
  empathy: 0.7,
  mirroring_intensity: 0.6,
  humor: 0.3,
  probing_rate: 0.4,
  ask_rate_min_turns: 2,
  ask_rate_max_turns: 5,
  max_chars_per_message: 900,
  uncertainty_threshold: 0.3,
  clarification_threshold: 0.2,
  bias_confirmation_soft: 0.4,
  directiveness: 0.5,
  gentleness: 0.6,
  colloquiality: 0.5,
  emoji_bias: 0.3,
  crisis_mode_enabled: true,
  language_strictness: 0.9,
  prefer_locale: 'auto',
  affection_level: 0.5,
};