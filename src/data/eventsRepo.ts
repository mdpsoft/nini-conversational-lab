import { supabase } from '@/integrations/supabase/client';

export type EventLevel = "INFO" | "WARN" | "ERROR" | "DEBUG";

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
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    // If not authenticated, skip logging to Supabase
    console.log('Event not logged to Supabase (not authenticated):', evt);
    return;
  }

  const { error } = await (supabase as any)
    .from('events')
    .insert({
      owner: user.id,
      level: evt.level,
      type: evt.type,
      severity: evt.severity,
      trace_id: evt.traceId,
      run_id: evt.runId,
      turn_index: evt.turnIndex,
      scenario_id: evt.scenarioId,
      profile_id: evt.profileId,
      meta: evt.meta,
      state: evt.state || 'OPEN',
      tags: evt.tags,
    });

  if (error) {
    console.error(`Failed to log event: ${error.message}`, evt);
  }
}