-- Club leave, owner-only edits, member sittings, and per-member progress.
-- Apply in the Supabase SQL editor or `supabase db push` after review.
-- Not applied by the Pages build. Do not run this against production from CI.

-- Direct updates (name, book, owner, invite token) belong to the owner.
-- Members add a sitting through add_club_sitting, which only appends.
drop policy if exists clubs_update on public.clubs;
drop policy if exists clubs_owner_update on public.clubs;
create policy clubs_owner_update on public.clubs
  for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create or replace function public.leave_club(p_club text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in to leave a club';
  end if;
  delete from public.club_members
  where club_id = p_club and user_id = auth.uid();
end;
$$;

create or replace function public.add_club_sitting(
  p_club text,
  p_starts_at timestamptz,
  p_label text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.clubs%rowtype;
  next_id integer;
  label text;
  sitting jsonb;
begin
  if auth.uid() is null then
    raise exception 'Sign in to open a club';
  end if;
  if p_starts_at is null then
    raise exception 'Pick a day and time in Eastern time.';
  end if;
  select * into row from public.clubs where id = p_club;
  if not found then
    return null;
  end if;
  if row.owner_id is distinct from auth.uid() and not public.is_club_member(p_club) then
    raise exception 'Join the club first';
  end if;
  select coalesce(max((item->>'id')::int), 0) + 1
    into next_id
  from jsonb_array_elements(coalesce(row.sittings, '[]'::jsonb)) item
  where (item->>'id') ~ '^[0-9]+$';
  label := left(coalesce(p_label, ''), 160);
  sitting := jsonb_build_object(
    'id', next_id,
    'startsAt', to_char(p_starts_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'label', label
  );
  update public.clubs
    set sittings = coalesce(sittings, '[]'::jsonb) || jsonb_build_array(sitting)
    where id = p_club
    returning * into row;
  return to_jsonb(row);
end;
$$;

revoke all on function public.leave_club(text) from public;
revoke all on function public.add_club_sitting(text, timestamptz, text) from public;
grant execute on function public.leave_club(text) to authenticated;
grant execute on function public.add_club_sitting(text, timestamptz, text) to authenticated;

create table if not exists public.club_progress (
  club_id text not null references public.clubs (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  work_id text not null,
  breath_index integer not null default 0 check (breath_index >= 0 and breath_index < 1000000),
  place text not null default '',
  updated_at timestamptz not null default now(),
  primary key (club_id, user_id)
);

alter table public.club_progress enable row level security;

revoke all on table public.club_progress from public, anon;
grant select, insert, update on public.club_progress to authenticated;

drop policy if exists club_progress_select on public.club_progress;
create policy club_progress_select on public.club_progress
  for select to authenticated
  using (public.is_club_member(club_id));

drop policy if exists club_progress_insert on public.club_progress;
create policy club_progress_insert on public.club_progress
  for insert to authenticated
  with check (user_id = auth.uid() and public.is_club_member(club_id));

drop policy if exists club_progress_update on public.club_progress;
create policy club_progress_update on public.club_progress
  for update to authenticated
  using (user_id = auth.uid() and public.is_club_member(club_id))
  with check (user_id = auth.uid() and public.is_club_member(club_id));
