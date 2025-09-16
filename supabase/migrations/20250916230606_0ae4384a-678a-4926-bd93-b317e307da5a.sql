-- Drop existing policies if they exist to avoid conflicts
drop policy if exists "own_scenarios" on public.scenarios;
drop policy if exists "own_runs" on public.runs; 
drop policy if exists "own_turns" on public.turns;
drop policy if exists "own_events" on public.events;

-- Create required support tables for UserAI system
create table if not exists public.scenarios (
  id uuid primary key default gen_random_uuid(),
  owner uuid references auth.users(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz default now()
);

create table if not exists public.runs (
  id uuid primary key default gen_random_uuid(),
  scenario_id uuid references public.scenarios(id) on delete cascade,
  owner uuid references auth.users(id) on delete cascade,
  status text check (status in ('pending','running','completed','failed')) default 'pending',
  created_at timestamptz default now()
);

create table if not exists public.turns (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references public.runs(id) on delete cascade,
  role text check (role in ('user','assistant','system')),
  content text,
  created_at timestamptz default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references public.runs(id) on delete cascade,
  event_type text not null,
  payload jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- Enable Row Level Security
alter table public.scenarios enable row level security;
alter table public.runs enable row level security;
alter table public.turns enable row level security;
alter table public.events enable row level security;

-- Create RLS policies for user-specific data access
create policy "own_scenarios" on public.scenarios
for all to authenticated using (owner = auth.uid()) with check (owner = auth.uid());

create policy "own_runs" on public.runs
for all to authenticated using (owner = auth.uid()) with check (owner = auth.uid());

create policy "own_turns" on public.turns
for all to authenticated using (exists (
  select 1 from public.runs r where r.id = run_id and r.owner = auth.uid()
)) with check (exists (
  select 1 from public.runs r where r.id = run_id and r.owner = auth.uid()
));

create policy "own_events" on public.events
for all to authenticated using (exists (
  select 1 from public.runs r where r.id = run_id and r.owner = auth.uid()
)) with check (exists (
  select 1 from public.runs r where r.id = run_id and r.owner = auth.uid()
));

-- Enable realtime subscriptions for all tables (ignore errors if already added)
do $$
begin
  alter publication supabase_realtime add table public.scenarios;
exception when duplicate_object then
  -- Table already in publication
end $$;

do $$
begin
  alter publication supabase_realtime add table public.runs;
exception when duplicate_object then
  -- Table already in publication  
end $$;

do $$
begin
  alter publication supabase_realtime add table public.turns;
exception when duplicate_object then
  -- Table already in publication
end $$;

do $$
begin
  alter publication supabase_realtime add table public.events;
exception when duplicate_object then
  -- Table already in publication
end $$;