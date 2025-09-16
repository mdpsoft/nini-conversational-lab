import { resolveEventsRepo } from './resolvers';

export type EventLevel = "INFO" | "WARN" | "ERROR" | "DEBUG";

// Global repository instance - will be updated when data source changes
let eventsRepo = resolveEventsRepo('local');

// Listen for data source changes
if (typeof window !== 'undefined') {
  window.addEventListener('data-source-changed', (e) => {
    const { source } = (e as CustomEvent).detail;
    eventsRepo = resolveEventsRepo(source);
  });
}

export async function logEvent(evt: {
  level: EventLevel;
  type: string;
  severity?: "LOW" | "MEDIUM" | "HIGH";
  traceId?: string;
  runId?: string;
  turnIndex?: number;
  scenarioId?: string;
  profileId?: string | null;
  meta?: any;
  state?: "OPEN" | "ACK" | "RESOLVED";
  tags?: string[];
}): Promise<void> {
  return eventsRepo.logEvent(evt);
}