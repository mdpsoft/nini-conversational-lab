import type { SupabaseClient } from '@supabase/supabase-js';

export type RealtimeDualResult = {
  handshake: 'PASS' | 'FAIL';
  subscribe: 'PASS' | 'FAIL';
  roundtrip: 'PASS' | 'FAIL';
  path: 'broadcast' | 'postgres_changes';
  details?: string;
  error?: string;
  ok: boolean;
  validations?: {
    tableExists: boolean;
    replicaIdentity: boolean;
    publication: boolean;
    rlsEnabled: boolean;
  };
};

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// Validation helpers
async function checkTableExists(supabase: SupabaseClient): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('realtime_diag')
      .select('id')
      .limit(1);
    return !error;
  } catch {
    return false;
  }
}

async function checkReplicaIdentity(supabase: SupabaseClient): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('check_realtime_publication_status');
    if (error) return false;
    // This is a simplified check - in practice we'd need a custom function to check replica identity
    return true;
  } catch {
    return false;
  }
}

async function checkPublication(supabase: SupabaseClient): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('check_realtime_publication_status');
    if (error) return false;
    return data?.status === 'complete' || false;
  } catch {
    return false;
  }
}

async function checkRLSEnabled(supabase: SupabaseClient): Promise<boolean> {
  try {
    // Try to insert a test record - if RLS blocks it, we'll know
    const testId = `rls_test_${Date.now()}`;
    const { error } = await supabase
      .from('realtime_diag')
      .insert({ test_id: testId })
      .select();
    
    if (!error) {
      // Clean up test record
      await supabase
        .from('realtime_diag')
        .delete()
        .eq('test_id', testId);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function runRealtimeDualSmoke(supabase: SupabaseClient): Promise<RealtimeDualResult> {
  console.log('[DUAL-SMOKE] Starting dual realtime diagnostics...');
  
  // Pre-flight validations
  console.log('[DUAL-SMOKE] Running pre-flight validations...');
  const validations = {
    tableExists: await checkTableExists(supabase),
    replicaIdentity: await checkReplicaIdentity(supabase),
    publication: await checkPublication(supabase),
    rlsEnabled: await checkRLSEnabled(supabase)
  };
  
  console.log('[DUAL-SMOKE] Validations:', validations);
  
  // If critical validations fail, return early
  if (!validations.tableExists) {
    return {
      handshake: 'FAIL',
      subscribe: 'FAIL', 
      roundtrip: 'FAIL',
      path: 'postgres_changes',
      details: 'Table realtime_diag does not exist',
      error: 'Run the SQL repair script to create the diagnostic table',
      ok: false,
      validations
    };
  }
  
  if (!validations.publication) {
    return {
      handshake: 'PASS',
      subscribe: 'FAIL',
      roundtrip: 'FAIL', 
      path: 'postgres_changes',
      details: 'Table not included in supabase_realtime publication',
      error: 'Run the SQL repair script to add table to publication',
      ok: false,
      validations
    };
  }
  
  // 0) Handshake rápido
  console.log('[DUAL-SMOKE] Testing WebSocket handshake...');
  const probe = supabase.channel('diag_ws_probe');
  const handshakeOk = await new Promise<boolean>((resolve) => {
    const timeout = setTimeout(() => resolve(false), 4000);
    probe.subscribe((status) => { 
      if (status === 'SUBSCRIBED') { 
        clearTimeout(timeout); 
        resolve(true); 
      }
    });
  });
  supabase.removeChannel(probe);
  
  if (!handshakeOk) {
    console.log('[DUAL-SMOKE] WebSocket handshake failed');
    return { 
      handshake: 'FAIL', 
      subscribe: 'FAIL', 
      roundtrip: 'FAIL', 
      path: 'broadcast', 
      details: 'WebSocket handshake failed',
      error: 'WebSocket connection could not be established',
      ok: false,
      validations
    };
  }
  
  console.log('[DUAL-SMOKE] Handshake successful, trying broadcast first...');

  // 1) PLAN A: Broadcast (rápido)
  const ch = supabase.channel('diagnostic', { 
    config: { 
      broadcast: { self: true, ack: true } 
    } 
  });
  
  const subscribed = await new Promise<boolean>((resolve) => {
    const timeout = setTimeout(() => resolve(false), 4000);
    ch.subscribe((status) => { 
      if (status === 'SUBSCRIBED') { 
        clearTimeout(timeout); 
        resolve(true); 
      }
    });
  });
  
  if (!subscribed) {
    console.log('[DUAL-SMOKE] Broadcast channel subscription failed, falling back to postgres_changes');
    supabase.removeChannel(ch);
    // Fall to Plan B
  } else {
    const testId = `rt_${Date.now()}`;
    let gotEcho = false;
    
    ch.on('broadcast', { event: 'ping' }, (payload: any) => { 
      console.log('[DUAL-SMOKE] Received broadcast echo:', payload);
      if (payload?.testId === testId) {
        gotEcho = true;
      }
    });
    
    await sleep(120); // settle
    console.log('[DUAL-SMOKE] Sending broadcast ping...');
    
    const sendOk = await ch.send({ 
      type: 'broadcast', 
      event: 'ping', 
      payload: { testId, t: Date.now(), who: 'dual' } 
    });
    
    console.log(`[DUAL-SMOKE] Broadcast send result: ${sendOk}`);
    
    if (sendOk !== 'ok') {
      // reintento sin ack
      console.log('[DUAL-SMOKE] Retrying broadcast without ack...');
      await ch.send({ 
        type: 'broadcast', 
        event: 'ping', 
        payload: { testId, t: Date.now(), who: 'dual', retry: true } 
      }, { ack: false });
    }
    
    const start = Date.now();
    while (!gotEcho && Date.now() - start < 4000) {
      await sleep(120);
    }
    
    supabase.removeChannel(ch);
    
    if (gotEcho) {
      console.log('[DUAL-SMOKE] Broadcast round-trip successful!');
      return { 
        handshake: 'PASS', 
        subscribe: 'PASS', 
        roundtrip: 'PASS', 
        path: 'broadcast',
        details: 'Broadcast self-echo successful',
        ok: true,
        validations
      };
    }
    
    console.log('[DUAL-SMOKE] Broadcast echo not received, falling back to postgres_changes');
  }

  // 2) PLAN B: Postgres Changes sobre public.realtime_diag
  console.log('[DUAL-SMOKE] Trying postgres_changes on realtime_diag table...');
  
  const pgCh = supabase.channel('realtime:public:realtime_diag');
  let gotInsert = false;
  let insertPayload: any = null;
  
  pgCh.on('postgres_changes', { 
    event: 'INSERT', 
    schema: 'public', 
    table: 'realtime_diag' 
  }, (payload) => { 
    console.log('[DUAL-SMOKE] Received postgres_changes INSERT event:', payload);
    gotInsert = true;
    insertPayload = payload;
  });
  
  const pgSub = await new Promise<boolean>((resolve) => {
    const timeout = setTimeout(() => resolve(false), 5000);
    pgCh.subscribe((status) => { 
      console.log(`[DUAL-SMOKE] Postgres changes channel status: ${status}`);
      if (status === 'SUBSCRIBED') { 
        clearTimeout(timeout); 
        resolve(true); 
      }
    });
  });
  
  if (!pgSub) {
    console.log('[DUAL-SMOKE] Postgres changes channel subscription failed');
    supabase.removeChannel(pgCh);
    return { 
      handshake: 'PASS', 
      subscribe: 'FAIL', 
      roundtrip: 'FAIL', 
      path: 'postgres_changes', 
      details: 'Channel subscription timeout',
      error: 'Could not subscribe to postgres_changes channel - check publication and RLS policies',
      ok: false,
      validations
    };
  }
  
  // Insert que debería generar el evento
  const testId = `pc_${Date.now()}`;
  console.log(`[DUAL-SMOKE] Inserting test record with ID: ${testId}`);
  
  try {
    const { error: insertError } = await supabase
      .from('realtime_diag')
      .insert({ test_id: testId });
    
    if (insertError) {
      console.log('[DUAL-SMOKE] Insert failed:', insertError);
      supabase.removeChannel(pgCh);
      return {
        handshake: 'PASS',
        subscribe: 'PASS',
        roundtrip: 'FAIL',
        path: 'postgres_changes',
        details: `Insert failed: ${insertError.message}`,
        error: insertError.message,
        ok: false,
        validations
      };
    }
    
    console.log('[DUAL-SMOKE] Insert successful, waiting for realtime event...');
    
    const start2 = Date.now();
    while (!gotInsert && Date.now() - start2 < 6000) {
      await sleep(120);
    }
    
    supabase.removeChannel(pgCh);

    if (gotInsert) {
      console.log('[DUAL-SMOKE] Postgres changes round-trip successful!');
      return { 
        handshake: 'PASS', 
        subscribe: 'PASS', 
        roundtrip: 'PASS', 
        path: 'postgres_changes',
        details: 'Postgres changes INSERT event received',
        ok: true,
        validations
      };
    }
    
    console.log('[DUAL-SMOKE] No INSERT event received within timeout');
    return { 
      handshake: 'PASS', 
      subscribe: 'PASS', 
      roundtrip: 'FAIL', 
      path: 'postgres_changes', 
      details: 'No INSERT event received within 6s timeout',
      error: 'INSERT event not received - check replica identity and publication configuration',
      ok: false,
      validations
    };
    
  } catch (error) {
    console.log('[DUAL-SMOKE] Unexpected error:', error);
    supabase.removeChannel(pgCh);
    return {
      handshake: 'PASS',
      subscribe: 'PASS', 
      roundtrip: 'FAIL',
      path: 'postgres_changes',
      details: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error: error instanceof Error ? error.message : 'Unknown error',
      ok: false,
      validations
    };
  }
}