-- Notes, highlights, and saved parts for one account.
-- The owner can read and write the row. Signing out leaves it in place.
-- The jsonb holds book ids, sentence indexes, colors, and note text. No email.

create table if not exists public.reader_notes (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  notes jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.reader_notes enable row level security;

revoke all on table public.reader_notes from public, anon;
grant select, insert, update on public.reader_notes to authenticated;

drop policy if exists reader_notes_select on public.reader_notes;
create policy reader_notes_select on public.reader_notes
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists reader_notes_insert on public.reader_notes;
create policy reader_notes_insert on public.reader_notes
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists reader_notes_update on public.reader_notes;
create policy reader_notes_update on public.reader_notes
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
