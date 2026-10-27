-- One local session publishes one activity row.
-- client_key is the session id (sit:<id>, or the older sit:<work>:<endedAt>
-- key when a sit was saved before ids existed). A retried insert conflicts
-- here instead of writing a second copy. Null keys are the rows from before
-- this column; Postgres unique indexes allow many nulls.

alter table public.activity
  add column if not exists client_key text;

create unique index if not exists activity_user_client_key_uidx
  on public.activity (user_id, client_key);

grant update (kind, book_id, payload, created_at) on public.activity to authenticated;

drop policy if exists "users update own activity" on public.activity;
create policy "users update own activity"
  on public.activity
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
