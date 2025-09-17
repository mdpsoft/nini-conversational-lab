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
  sendResult?: string;
  finalMode?: 'with_ack' | 'without_ack';
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
    
    // Step 2: Subscribe - test broadcast channel subscription
    testChannel = supabase.channel('diagnostic', { 
      config: { 
        broadcast: { self: true, ack: true } 
      } 
    });

    const subscribePromise = new Promise<boolean>((resolve) => {
      const timeout = setTimeout(() => resolve(false), 5000);
      
      testChannel.subscribe((status: string) => {
        clearTimeout(timeout);
        resolve(status === 'SUBSCRIBED');
      });
    });

    const subscribeSuccess = await subscribePromise;
    
    if (subscribeSuccess) {
      result.subscribe = 'PASS';
    } else {
      result.error = 'Channel subscription failed - timeout after 5s';
      return result;
    }

    // Step 3: Round-trip - test broadcast send/receive with awaitable sends
    const testId = `smoke_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`[ROUNDTRIP] Starting round-trip test with testId: ${testId}`);
    
    let roundtripSuccess = false;
    let finalSendResult = '';
    let finalMode: 'with_ack' | 'without_ack' = 'with_ack';
    
    // Set up broadcast listener immediately
    testChannel.on('broadcast', { event: 'ping' }, (payload: any) => {
      console.log(`[ROUNDTRIP] Broadcast echo received: testId=${payload.testId}, who=${payload.who}`);
      if (payload.testId === testId && payload.who === 'health') {
        roundtripSuccess = true;
      }
    });

    // Total test timeout of 10s with two 5s attempts
    const totalTimeout = setTimeout(() => {
      console.log('[ROUNDTRIP] Total timeout reached (10s)');
    }, 10000);

    try {
      // First attempt with ack: true
      console.log('[ROUNDTRIP] Attempting send with ack: true');
      const sendPromise = testChannel.send({
        type: 'broadcast',
        event: 'ping',
        payload: { testId, who: 'health', t: Date.now() }
      });
      
      const sendOk = await Promise.resolve(sendPromise);
      finalSendResult = sendOk;
      console.log(`[ROUNDTRIP] Send result (with_ack): ${sendOk}`);
      
      // Wait 5s for echo
      await new Promise<void>((resolve) => {
        const firstAttemptTimeout = setTimeout(() => resolve(), 5000);
        
        const checkSuccess = setInterval(() => {
          if (roundtripSuccess) {
            clearTimeout(firstAttemptTimeout);
            clearInterval(checkSuccess);
            resolve();
          }
        }, 100);
      });
      
      // If no success and we have time left, retry without ack
      if (!roundtripSuccess) {
        console.log('[ROUNDTRIP] No echo received after 5s, retrying without ack');
        finalMode = 'without_ack';
        
        const retryPromise = testChannel.send({
          type: 'broadcast',
          event: 'ping',
          payload: { testId, who: 'health', t: Date.now(), retry: true }
        }, { ack: false });
        
        const retryOk = await Promise.resolve(retryPromise);
        finalSendResult = retryOk;
        console.log(`[ROUNDTRIP] Send result (without_ack): ${retryOk}`);
        
        // Wait additional 5s for retry echo
        await new Promise<void>((resolve) => {
          const retryTimeout = setTimeout(() => resolve(), 5000);
          
          const checkRetrySuccess = setInterval(() => {
            if (roundtripSuccess) {
              clearTimeout(retryTimeout);
              clearInterval(checkRetrySuccess);
              resolve();
            }
          }, 100);
        });
      }
      
    } catch (error) {
      console.log(`[ROUNDTRIP] Send error: ${error}`);
      finalSendResult = `error: ${error}`;
    } finally {
      clearTimeout(totalTimeout);
    }

    result.sendResult = finalSendResult;
    result.finalMode = finalMode;
    
    if (roundtripSuccess) {
      result.roundtrip = 'PASS';
      result.subscribeMode = finalMode;
      console.log(`[ROUNDTRIP] Test passed with mode: ${finalMode}, sendResult: ${finalSendResult}`);
    } else {
      result.error = `Broadcast round-trip failed - no echo received (tried ${finalMode}, sendResult: ${finalSendResult})`;
      console.log(`[ROUNDTRIP] Test failed after trying ${finalMode}`);
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