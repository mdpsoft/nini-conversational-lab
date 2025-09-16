import { resolveRunsRepo } from './resolvers';

// Global repository instance - will be updated when data source changes
let runsRepo = resolveRunsRepo('local');

// Listen for data source changes
if (typeof window !== 'undefined') {
  window.addEventListener('data-source-changed', (e) => {
    const { source } = (e as CustomEvent).detail;
    runsRepo = resolveRunsRepo(source);
  });
}

export async function createRun(payload: {
  scenarioId?: string;
  profileId?: string | null;
  storyMode: boolean;
  maxTurns: number;
}): Promise<{ runId: string }> {
  return runsRepo.createRun(payload);
}

export async function finishRun(runId: string): Promise<void> {
  return runsRepo.finishRun(runId);
}