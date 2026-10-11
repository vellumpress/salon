-- Handle, current book, progress, and kept lines are public.
-- Writes stay with the owner. Profiles have no email column.
drop policy if exists "owner or followers read activity" on public.activity;
drop policy if exists "activity is publicly readable" on public.activity;
create policy "activity is publicly readable"
  on public.activity
  for select
  to anon, authenticated
  using (true);
