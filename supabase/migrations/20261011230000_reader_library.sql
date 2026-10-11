-- Private reading shelf for one account: favorites, place in a book,
-- kept lines, and the day-by-day score. The owner can read and write it.
-- There is no delete policy: signing out must leave the row in place.
-- The shelf jsonb holds book ids and reading fields only. No email.

create table if not exists public.library (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  shelf jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.library enable row level security;

revoke all on table public.library from public, anon;
grant select, insert, update on public.library to authenticated;

drop policy if exists library_select on public.library;
create policy library_select on public.library
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists library_insert on public.library;
create policy library_insert on public.library
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists library_update on public.library;
create policy library_update on public.library
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
