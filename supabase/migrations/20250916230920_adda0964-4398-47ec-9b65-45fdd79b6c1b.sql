-- Enable realtime for userai_profiles (may already be added)
do $$
begin
  alter publication supabase_realtime add table public.userai_profiles;
exception when duplicate_object then
  -- Table already in publication
end $$;

-- Set replica identity to FULL for all tables to capture complete row data
alter table public.userai_profiles replica identity full;
alter table public.scenarios replica identity full;
alter table public.runs replica identity full;
alter table public.turns replica identity full;
alter table public.events replica identity full;