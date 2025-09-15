import { supabase } from '@/integrations/supabase/client';

export type RealtimeHandler = (row: any) => void;

export interface RealtimeHandlers {
  onEventInsert?: RealtimeHandler;
  onEventUpdate?: RealtimeHandler;
  onRunInsert?: RealtimeHandler;
  onRunUpdate?: RealtimeHandler;
  onTurnInsert?: RealtimeHandler;
}

// Cache for run ownership validation
const runOwnershipCache = new Map<string, string>();

export async function ensureRunBelongsToUser(runId: string, userId: string): Promise<boolean> {
  // Check cache first
  if (runOwnershipCache.has(runId)) {
    return runOwnershipCache.get(runId) === userId;
  }

  try {
    const { data, error } = await (supabase as any)
      .from('runs')
      .select('owner')
      .eq('id', runId)
      .single();

    if (error) {
      console.warn('Failed to verify run ownership:', error);
      return false;
    }

    // Cache the result
    runOwnershipCache.set(runId, data.owner);
    return data.owner === userId;
  } catch (error) {
    console.warn('Error checking run ownership:', error);
    return false;
  }
}

export function subscribeLogs(userId: string, handlers: RealtimeHandlers) {
  const channel = supabase.channel(`rt-${userId}`, { 
    config: { 
      presence: { key: userId } 
    } 
  });

  console.log('Setting up Realtime subscriptions for user:', userId);

  // Events inserts/updates (filtered by owner)
  if (handlers.onEventInsert) {
    channel.on(
      'postgres_changes',
      { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'events', 
        filter: `owner=eq.${userId}` 
      },
      (payload) => {
        console.log('Realtime event INSERT:', payload.new);
        handlers.onEventInsert?.(payload.new);
      }
    );
  }

  if (handlers.onEventUpdate) {
    channel.on(
      'postgres_changes',
      { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'events', 
        filter: `owner=eq.${userId}` 
      },
      (payload) => {
        console.log('Realtime event UPDATE:', payload.new);
        handlers.onEventUpdate?.(payload.new);
      }
    );
  }

  // Runs inserts/updates (filtered by owner)
  if (handlers.onRunInsert) {
    channel.on(
      'postgres_changes',
      { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'runs', 
        filter: `owner=eq.${userId}` 
      },
      (payload) => {
        console.log('Realtime run INSERT:', payload.new);
        handlers.onRunInsert?.(payload.new);
      }
    );
  }

  if (handlers.onRunUpdate) {
    channel.on(
      'postgres_changes',
      { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'runs', 
        filter: `owner=eq.${userId}` 
      },
      (payload) => {
        console.log('Realtime run UPDATE:', payload.new);
        handlers.onRunUpdate?.(payload.new);
      }
    );
  }

  // Turns inserts (no direct owner filter - validate in client)
  if (handlers.onTurnInsert) {
    channel.on(
      'postgres_changes',
      { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'turns' 
      },
      async (payload) => {
        console.log('Realtime turn INSERT:', payload.new);
        
        // Validate ownership through run_id
        if (payload.new.run_id) {
          const ownerOk = await ensureRunBelongsToUser(payload.new.run_id, userId);
          if (ownerOk) {
            handlers.onTurnInsert?.(payload.new);
          } else {
            console.log('Turn ignored - not owned by current user:', payload.new.run_id);
          }
        }
      }
    );
  }

  // Subscribe to channel
  channel.subscribe((status) => {
    console.log('Realtime subscription status:', status);
  });

  // Return cleanup function
  return () => {
    console.log('Cleaning up Realtime subscriptions');
    supabase.removeChannel(channel);
  };
}

// Test realtime connectivity by inserting a test event
export async function testRealtimeConnection(userId: string): Promise<boolean> {
  return new Promise((resolve) => {
    let resolved = false;
    const testId = `validator-rt-test-${Date.now()}`;

    // Set up temporary subscription
    const cleanup = subscribeLogs(userId, {
      onEventInsert: (row) => {
        if (row.type === 'VALIDATOR.RT_TEST' && row.meta?.testId === testId && !resolved) {
          resolved = true;
          resolve(true);
          
          // Clean up test event
          setTimeout(async () => {
            try {
              await (supabase as any)
                .from('events')
                .delete()
                .eq('type', 'VALIDATOR.RT_TEST')
                .eq('owner', userId)
                .like('meta->>testId', testId);
            } catch (error) {
              console.warn('Failed to clean up test event:', error);
            }
          }, 1000);
        }
      }
    });

    // Insert test event
    setTimeout(async () => {
      try {
        const { error } = await (supabase as any)
          .from('events')
          .insert({
            owner: userId,
            level: 'INFO',
            type: 'VALIDATOR.RT_TEST',
            meta: { testId, timestamp: Date.now() }
          });

        if (error) {
          console.error('Failed to insert test event:', error);
          resolved = true;
          resolve(false);
        }
      } catch (error) {
        console.error('Error in realtime test:', error);
        resolved = true;
        resolve(false);
      }
    }, 500);

    // Timeout after 5 seconds
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve(false);
      }
      cleanup();
    }, 5000);
  });
}