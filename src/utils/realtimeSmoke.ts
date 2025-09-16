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

export async function checkRealtimePublication(supabase: SupabaseClient): Promise<{ exists: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('check_realtime_publication');
    if (error) {
      console.error('Publication check error:', error);
      return { exists: false, error: error.message };
    }
    return { exists: data?.exists || false };
  } catch (error) {
    // Fallback: try to check via direct query (may not work with RLS)
    try {
      const response = await fetch(
        `https://rxufqnsliggxavpfckft.supabase.co/rest/v1/rpc/check_realtime_publication`,
        {
          method: 'POST',
          headers: {
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4dWZxbnNsaWdneGF2cGZja2Z0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5Njk1MzAsImV4cCI6MjA3MzU0NTUzMH0.Fq2--k7MY5MWy_E9_VEg-0p573TLzvufT8Ux0JD-6Pw',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({})
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        return { exists: data?.exists || false };
      }
    } catch (e) {
      console.warn('Publication check fallback failed:', e);
    }
    
    return { exists: false, error: 'Unable to check publication status' };
  }
}

export async function createRealtimePublication(supabase: SupabaseClient): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('create_realtime_publication');
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
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
    if (publicationCheck.exists) {
      result.publication = 'PASS';
    } else {
      result.publication = 'FAIL';
      result.publicationExists = false;
      result.error = publicationCheck.error || 'supabase_realtime publication not found';
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
        broadcast: { ack: true } 
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
          broadcast: { ack: false } 
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
    } else {
      result.error = 'Broadcast round-trip failed - event not received within 5s';
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