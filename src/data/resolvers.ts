import { DataSource } from '@/state/dataSource';
import { supabase } from '@/integrations/supabase/client';
import { isGuestModeEnabled } from '@/hooks/useGuestMode';

// Profile repos
import { 
  ProfilesRepo, 
  SupabaseProfilesRepo, 
  LocalProfilesRepo 
} from './useraiProfiles';

// Abstract interfaces for other repos
export interface RunsRepo {
  createRun(payload: {
    scenarioId?: string;
    profileId?: string | null;
    storyMode: boolean;
    maxTurns: number;
  }): Promise<{ runId: string }>;
  finishRun(runId: string): Promise<void>;
}

export interface TurnsRepo {
  insertTurn(payload: {
    runId: string;
    turnIndex: number;
    speaker: "Nini" | "USERAI";
    text: string;
    beat?: any;
    shortMemory?: any;
  }): Promise<{ turnId: number }>;
  upsertTurnMetrics(turnId: number, metrics: {
    chars?: number;
    paragraphs?: number;
    questions?: number;
    emotions?: string[];
    needs?: string[];
    boundaries?: string[];
  }): Promise<void>;
  upsertTurnSafety(turnId: number, safety: {
    matched?: string[];
    escalated?: boolean;
  }): Promise<void>;
}

export interface EventsRepo {
  logEvent(evt: {
    level: "INFO" | "WARN" | "ERROR" | "DEBUG";
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
  }): Promise<void>;
}

// Supabase implementations
class SupabaseRunsRepo implements RunsRepo {
  async createRun(payload: {
    scenarioId?: string;
    profileId?: string | null;
    storyMode: boolean;
    maxTurns: number;
  }): Promise<{ runId: string }> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to create a run');
    }

    const { data, error } = await (supabase as any)
      .from('runs')
      .insert({
        owner: user.id,
        scenario_id: payload.scenarioId,
        profile_id: payload.profileId,
        story_mode: payload.storyMode,
        max_turns: payload.maxTurns,
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to create run: ${error.message}`);
    }

    return { runId: data?.id };
  }

  async finishRun(runId: string): Promise<void> {
    const { error } = await (supabase as any)
      .from('runs')
      .update({ finished_at: new Date().toISOString() })
      .eq('id', runId);

    if (error) {
      throw new Error(`Failed to finish run: ${error.message}`);
    }
  }
}

class SupabaseTurnsRepo implements TurnsRepo {
  async insertTurn(payload: {
    runId: string;
    turnIndex: number;
    speaker: "Nini" | "USERAI";
    text: string;
    beat?: any;
    shortMemory?: any;
  }): Promise<{ turnId: number }> {
    const { data, error } = await (supabase as any)
      .from('turns')
      .insert({
        run_id: payload.runId,
        turn_index: payload.turnIndex,
        speaker: payload.speaker,
        text: payload.text,
        beat: payload.beat,
        short_memory: payload.shortMemory,
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to insert turn: ${error.message}`);
    }

    return { turnId: data?.id };
  }

  async upsertTurnMetrics(turnId: number, metrics: {
    chars?: number;
    paragraphs?: number;
    questions?: number;
    emotions?: string[];
    needs?: string[];
    boundaries?: string[];
  }): Promise<void> {
    const { error } = await (supabase as any)
      .from('turn_metrics')
      .upsert({
        turn_id: turnId,
        chars: metrics.chars,
        paragraphs: metrics.paragraphs,
        questions: metrics.questions,
        emotions: metrics.emotions,
        needs: metrics.needs,
        boundaries: metrics.boundaries,
      });

    if (error) {
      throw new Error(`Failed to upsert turn metrics: ${error.message}`);
    }
  }

  async upsertTurnSafety(turnId: number, safety: {
    matched?: string[];
    escalated?: boolean;
  }): Promise<void> {
    const { error } = await (supabase as any)
      .from('turn_safety')
      .upsert({
        turn_id: turnId,
        matched: safety.matched,
        escalated: safety.escalated,
      });

    if (error) {
      throw new Error(`Failed to upsert turn safety: ${error.message}`);
    }
  }
}

class SupabaseEventsRepo implements EventsRepo {
  async logEvent(evt: {
    level: "INFO" | "WARN" | "ERROR" | "DEBUG";
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
      console.warn('Event not logged to Supabase (not authenticated):', evt);
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
}

// Local/Guest implementations
class LocalRunsRepo implements RunsRepo {
  async createRun(payload: {
    scenarioId?: string;
    profileId?: string | null;
    storyMode: boolean;
    maxTurns: number;
  }): Promise<{ runId: string }> {
    const runId = `local-run-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    console.log('Local/Guest mode: Created local run ID:', runId);
    return { runId };
  }

  async finishRun(runId: string): Promise<void> {
    console.log('Local/Guest mode: Run finished:', runId);
  }
}

class LocalTurnsRepo implements TurnsRepo {
  async insertTurn(payload: {
    runId: string;
    turnIndex: number;
    speaker: "Nini" | "USERAI";
    text: string;
    beat?: any;
    shortMemory?: any;
  }): Promise<{ turnId: number }> {
    const turnId = Date.now() + payload.turnIndex;
    console.log('Local/Guest mode: Created local turn ID:', turnId);
    return { turnId };
  }

  async upsertTurnMetrics(turnId: number, metrics: {
    chars?: number;
    paragraphs?: number;
    questions?: number;
    emotions?: string[];
    needs?: string[];
    boundaries?: string[];
  }): Promise<void> {
    console.log('Local/Guest mode: Turn metrics:', { turnId, metrics });
  }

  async upsertTurnSafety(turnId: number, safety: {
    matched?: string[];
    escalated?: boolean;
  }): Promise<void> {
    console.log('Local/Guest mode: Turn safety:', { turnId, safety });
  }
}

class LocalEventsRepo implements EventsRepo {
  async logEvent(evt: {
    level: "INFO" | "WARN" | "ERROR" | "DEBUG";
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
    console.log('Local/Guest mode event:', evt);
  }
}

// Repository resolvers
export function resolveProfilesRepo(source: DataSource): { repo: ProfilesRepo; source: DataSource } {
  // Guest mode always uses local storage
  if (isGuestModeEnabled() || source === 'guest') {
    return { repo: new LocalProfilesRepo(), source: 'local' };
  }

  switch (source) {
    case 'supabase':
      return { repo: new SupabaseProfilesRepo(), source: 'supabase' };
    case 'local':
    default:
      return { repo: new LocalProfilesRepo(), source: 'local' };
  }
}

export function resolveRunsRepo(source: DataSource): RunsRepo {
  if (isGuestModeEnabled() || source === 'guest' || source === 'local') {
    return new LocalRunsRepo();
  }
  return new SupabaseRunsRepo();
}

export function resolveTurnsRepo(source: DataSource): TurnsRepo {
  if (isGuestModeEnabled() || source === 'guest' || source === 'local') {
    return new LocalTurnsRepo();
  }
  return new SupabaseTurnsRepo();
}

export function resolveEventsRepo(source: DataSource): EventsRepo {
  if (isGuestModeEnabled() || source === 'guest' || source === 'local') {
    return new LocalEventsRepo();
  }
  return new SupabaseEventsRepo();
}