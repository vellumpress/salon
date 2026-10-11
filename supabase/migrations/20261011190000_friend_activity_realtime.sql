-- Let a follower hear a new kept line or a new follow without waiting on the poll.
-- Activity stays follower-only: the existing SELECT policy is the privacy default.
-- There is no separate public/private switch. A missing follow row is what hid the book.

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'activity'
  ) then
    alter publication supabase_realtime add table public.activity;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'follows'
  ) then
    alter publication supabase_realtime add table public.follows;
  end if;
end $$;

alter table public.activity replica identity full;
alter table public.follows replica identity full;
