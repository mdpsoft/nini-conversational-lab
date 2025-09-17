import { supabase } from '@/integrations/supabase/client';

/**
 * Utility function to ensure realtime publication is properly configured
 * This is a convenience wrapper around the comprehensive RPC function
 */
export async function ensureRealtimePublication() {
  const { data, error } = await supabase.rpc('ensure_realtime_publication');
  if (error) throw error;
  return data;
}

/**
 * Check the status of the realtime publication
 */
export async function checkRealtimePublicationStatus() {
  const { data, error } = await supabase.rpc('check_realtime_publication_status');
  if (error) throw error;
  return data;
}