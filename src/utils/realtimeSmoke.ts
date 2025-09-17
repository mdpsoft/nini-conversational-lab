import { SupabaseClient } from '@supabase/supabase-js';

export interface RealtimeSmokeResult {
  handshake: 'PASS' | 'FAIL';
  subscribe: 'PASS' | 'FAIL';
  roundtrip: 'PASS' | 'FAIL';
  publication: 'PASS' | 'FAIL';
  ok: boolean;
  error?: string;
  subscribeMode?: 'with_ack' | 'without_ack';
  publicationExists?: boolean;
}

export async function checkRealtimePublication(supabase: SupabaseClient): Promise<{ exists: boolean; status?: string; message?: string; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('check_realtime_publication_status');
    if (error) {
      console.error('Publication check error:', error);
      return { exists: false, error: error.message };
    }
    return { 
      exists: data?.exists || false, 
      status: data?.status || 'unknown',
      message: data?.message || 'Unknown status'
    };
  } catch (error) {
    return { exists: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function ensureRealtimePublication(supabase: SupabaseClient): Promise<{ success: boolean; error?: string; details?: any }> {
  try {
    const { data, error } = await supabase.rpc('ensure_realtime_publication');
    if (error) {
      return { success: false, error: error.message };
    }
    if (data?.status === 'error') {
      return { success: false, error: data.error || data.message };
    }
    return { success: true, details: data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Legacy function for backwards compatibility - now uses ensureRealtimePublication
export async function createRealtimePublication(supabase: SupabaseClient): Promise<{ success: boolean; error?: string }> {
  const result = await ensureRealtimePublication(supabase);
  return { success: result.success, error: result.error };
}

export async function runRealtimeSmokeTest(supabase: SupabaseClient): Promise<RealtimeSmokeResult> {
  const result: RealtimeSmokeResult = {
    handshake: 'FAIL',
    subscribe: 'FAIL',
    roundtrip: 'FAIL',
    publication: 'FAIL',
    ok: false
  };

  let testChannel: any = null;

  try {
    // Step 0: Check Publication - verify supabase_realtime publication exists
    const publicationCheck = await checkRealtimePublication(supabase);
    if (publicationCheck.exists && publicationCheck.status === 'complete') {
      result.publication = 'PASS';
      result.publicationExists = true;
    } else {
      result.publication = 'FAIL';
      result.publicationExists = publicationCheck.exists;
      result.error = publicationCheck.error || publicationCheck.message || 'supabase_realtime publication incomplete or missing';
      // Don't return early - continue testing to get full diagnostic picture
    }

    // Step 1: Handshake - test basic connection
    testChannel = supabase.channel('handshake_test');
    
    const handshakePromise = new Promise<boolean>((resolve) => {
      const timeout = setTimeout(() => resolve(false), 5000);
      
      testChannel.subscribe((status: string) => {
        clearTimeout(timeout);
        resolve(status === 'SUBSCRIBED');
      });
    });

    const handshakeSuccess = await handshakePromise;
    if (handshakeSuccess) {
      result.handshake = 'PASS';
    } else {
      result.error = 'WebSocket handshake failed - timeout after 5s';
      return result;
    }

    // Clean up handshake channel
    supabase.removeChannel(testChannel);
    
    // Step 2: Subscribe - test broadcast channel subscription (with fallback)
    let subscribeSuccess = false;
    let subscribeMode: 'with_ack' | 'without_ack' = 'with_ack';
    
    // First try with ack enabled
    testChannel = supabase.channel('diag_test', { 
      config: { 
        broadcast: { ack: true, self: true } 
      } 
    });

    const subscribeWithAckPromise = new Promise<boolean>((resolve) => {
      const timeout = setTimeout(() => resolve(false), 5000);
      
      testChannel.subscribe((status: string) => {
        clearTimeout(timeout);
        resolve(status === 'SUBSCRIBED');
      });
    });

    subscribeSuccess = await subscribeWithAckPromise;
    
    if (!subscribeSuccess) {
      // Fallback: try without ack
      supabase.removeChannel(testChannel);
      subscribeMode = 'without_ack';
      
      testChannel = supabase.channel('diag_test_fallback', { 
        config: { 
          broadcast: { ack: false, self: true } 
        } 
      });

      const subscribeWithoutAckPromise = new Promise<boolean>((resolve) => {
        const timeout = setTimeout(() => resolve(false), 5000);
        
        testChannel.subscribe((status: string) => {
          clearTimeout(timeout);
          resolve(status === 'SUBSCRIBED');
        });
      });

      subscribeSuccess = await subscribeWithoutAckPromise;
    }

    if (subscribeSuccess) {
      result.subscribe = 'PASS';
      result.subscribeMode = subscribeMode;
    } else {
      result.error = 'Channel subscription failed - timeout after 5s (both with and without ack)';
      return result;
    }

    // Step 3: Round-trip - test broadcast send/receive
    const testId = `smoke_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`[ROUNDTRIP] Starting round-trip test with testId: ${testId}`);
    
    const roundtripPromise = new Promise<boolean>((resolve) => {
      const timeout = setTimeout(() => {
        console.log('[ROUNDTRIP] No echo received after 10s');
        resolve(false);
      }, 10000);
      
      testChannel.on('broadcast', { event: 'ping' }, (payload: any) => {
        console.log(`[ROUNDTRIP] Broadcast echo received: testId=${payload.testId}, who=${payload.who}`);
        if (payload.testId === testId && payload.who === 'health') {
          clearTimeout(timeout);
          resolve(true);
        }
      });

      // Send the broadcast event after setting up the listener
      setTimeout(() => {
        console.log('[ROUNDTRIP] Broadcast sent → waiting for echo');
        const sendResult = testChannel.send({
          type: 'broadcast',
          event: 'ping',
          payload: { testId, who: 'health', timestamp: Date.now() }
        });
        
        console.log(`[ROUNDTRIP] Send result: ${sendResult}`);
        if (sendResult !== 'ok') {
          console.log(`[ROUNDTRIP] Send failed with result: ${sendResult}`);
          clearTimeout(timeout);
          resolve(false);
        }
      }, 100);
    });

    const roundtripSuccess = await roundtripPromise;
    if (roundtripSuccess) {
      result.roundtrip = 'PASS';
      console.log('[ROUNDTRIP] Test passed');
    } else {
      result.error = 'Broadcast round-trip failed - event not received within 10s or send failed';
      console.log('[ROUNDTRIP] Test failed');
    }

    // Overall success: all tests pass (publication check is a warning, not a failure)
    result.ok = result.handshake === 'PASS' && result.subscribe === 'PASS' && result.roundtrip === 'PASS';

  } catch (error) {
    result.error = `Realtime test error: ${error instanceof Error ? error.message : String(error)}`;
  } finally {
    // Always cleanup
    if (testChannel) {
      try {
        supabase.removeChannel(testChannel);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }

  return result;
}