import { SupabaseClient } from '@supabase/supabase-js';

export interface RealtimeSmokeResult {
  handshake: 'PASS' | 'FAIL';
  subscribe: 'PASS' | 'FAIL';
  roundtrip: 'PASS' | 'FAIL';
  ok: boolean;
  error?: string;
}

export async function runRealtimeSmokeTest(supabase: SupabaseClient): Promise<RealtimeSmokeResult> {
  const result: RealtimeSmokeResult = {
    handshake: 'FAIL',
    subscribe: 'FAIL',
    roundtrip: 'FAIL',
    ok: false
  };

  let testChannel: any = null;

  try {
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
    testChannel = supabase.channel('diag_test', { 
      config: { 
        broadcast: { ack: true } 
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

    // Step 3: Round-trip - test broadcast send/receive
    const testId = `smoke_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const roundtripPromise = new Promise<boolean>((resolve) => {
      const timeout = setTimeout(() => resolve(false), 5000);
      
      testChannel.on('broadcast', { event: 'ping' }, (payload: any) => {
        if (payload.testId === testId && payload.who === 'health') {
          clearTimeout(timeout);
          resolve(true);
        }
      });

      // Send the broadcast event after setting up the listener
      setTimeout(() => {
        testChannel.send({
          type: 'broadcast',
          event: 'ping',
          payload: { testId, who: 'health', timestamp: Date.now() }
        });
      }, 100);
    });

    const roundtripSuccess = await roundtripPromise;
    if (roundtripSuccess) {
      result.roundtrip = 'PASS';
      result.ok = true;
    } else {
      result.error = 'Broadcast round-trip failed - event not received within 5s';
    }

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