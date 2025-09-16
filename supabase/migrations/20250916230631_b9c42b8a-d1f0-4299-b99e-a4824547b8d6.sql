-- Enable RLS on userai_profiles table that was missing it
alter table public.userai_profiles enable row level security;

-- Create RLS policy for userai_profiles to allow users to manage their own profiles
create policy "own_userai_profiles" on public.userai_profiles
for all to authenticated using (owner = auth.uid()) with check (owner = auth.uid());