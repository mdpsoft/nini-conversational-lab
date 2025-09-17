-- Extension por si no está
create extension if not exists pgcrypto;

-- 1) Tabla de diagnóstico mínima
create table if not exists public.realtime_diag (
  id uuid primary key default gen_random_uuid(),
  test_id text not null,
  created_at timestamptz not null default now()
);

-- Replica identity para que Realtime tenga payload completo
alter table public.realtime_diag replica identity full;

-- 2) RLS
alter table public.realtime_diag enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='realtime_diag' and policyname='rls_realtime_diag_select'
  ) then
    create policy rls_realtime_diag_select
      on public.realtime_diag for select
      using (auth.uid() is not null);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='realtime_diag' and policyname='rls_realtime_diag_insert'
  ) then
    create policy rls_realtime_diag_insert
      on public.realtime_diag for insert
      with check (auth.uid() is not null);
  end if;
end$$;

-- 3) Publicación supabase_realtime y suscripción de la tabla
do $$
begin
  if not exists (select 1 from pg_publication where pubname='supabase_realtime') then
    create publication supabase_realtime for table public.realtime_diag;
  else
    -- add table si no está incluida aún
    begin
      alter publication supabase_realtime add table public.realtime_diag;
    exception when duplicate_object then
      -- ya estaba, ignorar
      null;
    end;
  end if;
end$$;