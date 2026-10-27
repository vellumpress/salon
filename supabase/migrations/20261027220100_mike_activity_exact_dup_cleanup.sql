-- One account, approved 2026-10-27. Exact activity duplicates only:
-- same user, book, kind, timestamp, and payload. The earliest id stays.
-- Sit rows that share a book and payload but not the timestamp are copied
-- into the backup as 'report' and are not deleted.

create table if not exists public.activity_dup_backup_20261027 (
  id bigint primary key,
  user_id uuid not null,
  kind text not null,
  book_id text,
  payload jsonb not null,
  created_at timestamptz not null,
  backed_up_at timestamptz not null default now(),
  disposition text not null check (disposition in ('keep', 'delete', 'report'))
);

revoke all on table public.activity_dup_backup_20261027 from public, anon, authenticated;

insert into public.activity_dup_backup_20261027 (
  id, user_id, kind, book_id, payload, created_at, disposition
)
select a.id, a.user_id, a.kind, a.book_id, a.payload, a.created_at,
  case when n.n = 1 then 'keep' else 'delete' end
from public.activity a
join (
  select id,
    row_number() over (
      partition by user_id, kind, book_id, created_at, payload
      order by id
    ) as n,
    count(*) over (
      partition by user_id, kind, book_id, created_at, payload
    ) as copies
  from public.activity
  where user_id = '0cd19a55-f8d5-425e-b3c2-334bcd104bd6'
) n on n.id = a.id
where n.copies > 1
  and not exists (
    select 1 from public.activity_dup_backup_20261027 b where b.id = a.id
  );

insert into public.activity_dup_backup_20261027 (
  id, user_id, kind, book_id, payload, created_at, disposition
)
select a.id, a.user_id, a.kind, a.book_id, a.payload, a.created_at, 'report'
from public.activity a
where a.user_id = '0cd19a55-f8d5-425e-b3c2-334bcd104bd6'
  and a.kind = 'sit'
  and exists (
    select 1
    from public.activity other
    where other.user_id = a.user_id
      and other.kind = 'sit'
      and other.book_id is not distinct from a.book_id
      and other.payload = a.payload
      and other.created_at is distinct from a.created_at
  )
  and not exists (
    select 1 from public.activity_dup_backup_20261027 b where b.id = a.id
  );

delete from public.activity a
using public.activity_dup_backup_20261027 b
where a.id = b.id
  and a.user_id = '0cd19a55-f8d5-425e-b3c2-334bcd104bd6'
  and b.user_id = a.user_id
  and b.disposition = 'delete';
