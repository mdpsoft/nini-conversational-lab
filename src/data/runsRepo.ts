import { supabase } from '@/integrations/supabase/client';

export async function createRun(payload: {
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

export async function finishRun(runId: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('runs')
    .update({ finished_at: new Date().toISOString() })
    .eq('id', runId);

  if (error) {
    throw new Error(`Failed to finish run: ${error.message}`);
  }
}