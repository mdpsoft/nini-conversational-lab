-- Helper RPC to insert a diagnostic event owned by the current user
create or replace function public.emit_diag_event(payload jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
  new_run_id uuid;
begin
  -- Create a temporary run for the diagnostic event
  insert into public.runs (id, owner, status)
  values (gen_random_uuid(), auth.uid(), 'completed')
  returning id into new_run_id;
  
  -- Insert the diagnostic event
  insert into public.events (id, event_type, payload, run_id, created_at)
  values (gen_random_uuid(), 'DIAG.PING', coalesce(payload, '{}'::jsonb), new_run_id, now())
  returning id into new_id;
  
  return jsonb_build_object('status','ok','id',new_id,'run_id',new_run_id);
end;
$$;

-- Set proper permissions
revoke all on function public.emit_diag_event(jsonb) from public;
grant execute on function public.emit_diag_event(jsonb) to authenticated;