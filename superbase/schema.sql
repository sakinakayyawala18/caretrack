-- Run once in your Supabase project's SQL Editor.
-- The server seeds the fictional dataset on the first request.
create table if not exists public.caretrack_demo (
  id integer primary key check (id = 1),
  revision bigint not null default 0,
  data jsonb not null
);
alter table public.caretrack_demo enable row level security;
revoke all on public.caretrack_demo from anon, authenticated;
grant all on public.caretrack_demo to service_role;
