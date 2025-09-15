import { supabase } from '@/integrations/supabase/client';

export async function insertTurn(payload: {
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

export async function upsertTurnMetrics(turnId: number, metrics: {
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

export async function upsertTurnSafety(turnId: number, safety: {
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