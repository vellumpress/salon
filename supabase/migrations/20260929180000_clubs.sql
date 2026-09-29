-- Book clubs for the static Pages client.
-- Owner creates a row. Members read and write. An invite token joins.
-- Apply in the Supabase SQL editor or `supabase db push`. Not applied by the Pages build.

create table if not exists public.clubs (
  id text primary key,
  name text not null,
  work_id text not null,
  owner_id uuid not null references auth.users (id) on delete cascade,
  invite_token text not null unique,
  fill text not null default 'paper',
  note text not null default '',
  serialize_plan_id text,
  start_episode integer,
  sittings jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.club_members (
  club_id text not null references public.clubs (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (club_id, user_id)
);

create table if not exists public.club_messages (
  id bigint generated always as identity primary key,
  club_id text not null references public.clubs (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists club_members_user_idx on public.club_members (user_id);
create index if not exists club_messages_club_idx on public.club_messages (club_id, id);
create index if not exists clubs_invite_idx on public.clubs (invite_token);

alter table public.clubs enable row level security;
alter table public.club_members enable row level security;
alter table public.club_messages enable row level security;

-- Owner is a member as soon as the club exists.
create or replace function public.clubs_add_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.club_members (club_id, user_id)
  values (new.id, new.owner_id)
  on conflict (club_id, user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists clubs_add_owner on public.clubs;
create trigger clubs_add_owner
  after insert on public.clubs
  for each row execute function public.clubs_add_owner();

create or replace function public.club_by_invite(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select to_jsonb(c)
  from public.clubs c
  where c.invite_token = p_token
  limit 1;
$$;

create or replace function public.join_club_by_invite(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.clubs%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Sign in to join a club';
  end if;
  select * into row from public.clubs where invite_token = p_token;
  if not found then
    return null;
  end if;
  insert into public.club_members (club_id, user_id)
  values (row.id, auth.uid())
  on conflict (club_id, user_id) do nothing;
  return to_jsonb(row);
end;
$$;

-- Membership checks must not query club_members under the caller's RLS.
-- An inline exists() on club_members from club_members_select recurses forever.
create or replace function public.is_club_member(p_club text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.club_members m
    where m.club_id = p_club and m.user_id = auth.uid()
  );
$$;

revoke all on function public.club_by_invite(text) from public;
revoke all on function public.join_club_by_invite(text) from public;
revoke all on function public.is_club_member(text) from public;
grant execute on function public.club_by_invite(text) to anon, authenticated;
grant execute on function public.join_club_by_invite(text) to authenticated;
grant execute on function public.is_club_member(text) to anon, authenticated, service_role;

grant select, insert, update on public.clubs to authenticated;
grant select on public.club_members to authenticated;
grant select, insert on public.club_messages to authenticated;

drop policy if exists clubs_select on public.clubs;
create policy clubs_select on public.clubs
  for select to authenticated
  using (
    owner_id = auth.uid()
    or public.is_club_member(clubs.id)
  );

drop policy if exists clubs_insert on public.clubs;
create policy clubs_insert on public.clubs
  for insert to authenticated
  with check (owner_id = auth.uid());

drop policy if exists clubs_update on public.clubs;
create policy clubs_update on public.clubs
  for update to authenticated
  using (
    owner_id = auth.uid()
    or public.is_club_member(clubs.id)
  )
  with check (
    owner_id = auth.uid()
    or public.is_club_member(clubs.id)
  );

drop policy if exists club_members_select on public.club_members;
create policy club_members_select on public.club_members
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_club_member(club_members.club_id)
  );

drop policy if exists club_messages_select on public.club_messages;
create policy club_messages_select on public.club_messages
  for select to authenticated
  using (public.is_club_member(club_messages.club_id));

drop policy if exists club_messages_insert on public.club_messages;
create policy club_messages_insert on public.club_messages
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.is_club_member(club_messages.club_id)
  );

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'club_messages'
     ) then
    alter publication supabase_realtime add table public.club_messages;
  end if;
end $$;
