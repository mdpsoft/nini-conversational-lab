-- Create utility functions for realtime publication management

-- Function to check if supabase_realtime publication exists
CREATE OR REPLACE FUNCTION public.check_realtime_publication()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
begin
  -- Check if publication exists
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    return jsonb_build_object('exists', true);
  else
    return jsonb_build_object('exists', false);
  end if;
end;
$function$;

-- Function to create supabase_realtime publication
CREATE OR REPLACE FUNCTION public.create_realtime_publication()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
begin
  -- Create publication if it doesn't exist
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    -- Create publication for all tables
    execute 'create publication supabase_realtime for all tables';
    
    return jsonb_build_object(
      'success', true,
      'message', 'supabase_realtime publication created successfully'
    );
  else
    return jsonb_build_object(
      'success', true,
      'message', 'supabase_realtime publication already exists'
    );
  end if;
exception
  when others then
    return jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
end;
$function$;