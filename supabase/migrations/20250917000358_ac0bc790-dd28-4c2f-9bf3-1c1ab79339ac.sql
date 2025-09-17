-- Replace existing functions with comprehensive realtime publication management

-- Drop existing functions
DROP FUNCTION IF EXISTS public.check_realtime_publication();
DROP FUNCTION IF EXISTS public.create_realtime_publication();

-- Create comprehensive function to ensure realtime publication setup
CREATE OR REPLACE FUNCTION public.ensure_realtime_publication()
RETURNS jsonb
SECURITY DEFINER
SET search_path = 'public'
LANGUAGE plpgsql
AS $$
declare
  pub_exists boolean;
  added_tables int := 0;
  ensured_identity int := 0;
  t record;
begin
  -- 1) Create publication if it doesn't exist
  select exists(
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) into pub_exists;

  if not pub_exists then
    execute 'create publication supabase_realtime';
  end if;

  -- 2) Ensure REPLICA IDENTITY FULL and add tables to publication
  for t in
    select *
    from (values
      ('public.userai_profiles'),
      ('public.scenarios'),
      ('public.runs'),
      ('public.turns'),
      ('public.events')
    ) as v(tbl)
  loop
    -- Set replica identity full
    execute format('alter table %s replica identity full', t.tbl);
    ensured_identity := ensured_identity + 1;

    -- Add to publication if not already there
    perform 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = split_part(t.tbl, '.', 1)
      and tablename  = split_part(t.tbl, '.', 2);

    if not found then
      execute format('alter publication supabase_realtime add table %s', t.tbl);
      added_tables := added_tables + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'publication', 'supabase_realtime',
    'ensured_identity', ensured_identity,
    'added_tables', added_tables,
    'status', 'ok',
    'message', format('Publication configured successfully. Added %s tables, ensured %s replica identities.', added_tables, ensured_identity)
  );
exception
  when others then
    return jsonb_build_object(
      'status', 'error',
      'error', SQLERRM,
      'message', 'Failed to configure realtime publication'
    );
end;
$$;

-- Create check function for publication status
CREATE OR REPLACE FUNCTION public.check_realtime_publication_status()
RETURNS jsonb
SECURITY DEFINER
SET search_path = 'public'
LANGUAGE plpgsql
AS $$
declare
  pub_exists boolean;
  tables_count int := 0;
  expected_tables text[] := ARRAY['userai_profiles', 'scenarios', 'runs', 'turns', 'events'];
  missing_tables text[] := ARRAY[]::text[];
  t text;
begin
  -- Check if publication exists
  select exists(
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) into pub_exists;

  if not pub_exists then
    return jsonb_build_object(
      'exists', false,
      'status', 'missing',
      'message', 'supabase_realtime publication does not exist'
    );
  end if;

  -- Check which tables are in the publication
  select count(*)
  from pg_publication_tables
  where pubname = 'supabase_realtime'
    and schemaname = 'public'
    and tablename = ANY(expected_tables)
  into tables_count;

  -- Find missing tables
  foreach t in array expected_tables
  loop
    perform 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = t;
    
    if not found then
      missing_tables := array_append(missing_tables, t);
    end if;
  end loop;

  return jsonb_build_object(
    'exists', true,
    'status', case when tables_count = array_length(expected_tables, 1) then 'complete' else 'incomplete' end,
    'tables_count', tables_count,
    'expected_count', array_length(expected_tables, 1),
    'missing_tables', missing_tables,
    'message', case 
      when tables_count = array_length(expected_tables, 1) then 'All tables configured for realtime'
      else format('Missing %s tables in publication', array_length(missing_tables, 1))
    end
  );
end;
$$;

-- Set proper permissions
REVOKE ALL ON FUNCTION public.ensure_realtime_publication() FROM public;
GRANT EXECUTE ON FUNCTION public.ensure_realtime_publication() TO authenticated;

REVOKE ALL ON FUNCTION public.check_realtime_publication_status() FROM public;
GRANT EXECUTE ON FUNCTION public.check_realtime_publication_status() TO authenticated;