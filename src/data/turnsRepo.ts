import { resolveTurnsRepo } from './resolvers';

// Global repository instance - will be updated when data source changes
let turnsRepo = resolveTurnsRepo('local');

// Listen for data source changes
if (typeof window !== 'undefined') {
  window.addEventListener('data-source-changed', (e) => {
    const { source } = (e as CustomEvent).detail;
    turnsRepo = resolveTurnsRepo(source);
  });
}

export async function insertTurn(payload: {
  runId: string;
  turnIndex: number;
  speaker: "Nini" | "USERAI";
  text: string;
  beat?: any;
  shortMemory?: any;
}): Promise<{ turnId: number }> {
  return turnsRepo.insertTurn(payload);
}

export async function upsertTurnMetrics(turnId: number, metrics: {
  chars?: number;
  paragraphs?: number;
  questions?: number;
  emotions?: string[];
  needs?: string[];
  boundaries?: string[];
}): Promise<void> {
  return turnsRepo.upsertTurnMetrics(turnId, metrics);
}

export async function upsertTurnSafety(turnId: number, safety: {
  matched?: string[];
  escalated?: boolean;
}): Promise<void> {
  return turnsRepo.upsertTurnSafety(turnId, safety);
}