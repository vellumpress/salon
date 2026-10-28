-- Mike approved 2026-10-27 8:05 PM ET.
-- Four close-twice House of Mirth sits on one account.
-- Keep the lower id of each pair. Delete only 528, 539, 544, 548.
-- Each deleted row is copied into the 2026-10-27 backup first if it is missing.

insert into public.activity_dup_backup_20261027 (
  id, user_id, kind, book_id, payload, created_at, disposition
)
select a.id, a.user_id, a.kind, a.book_id, a.payload, a.created_at, 'delete'
from public.activity a
where a.user_id = '0cd19a55-f8d5-425e-b3c2-334bcd104bd6'
  and a.id in (528, 539, 544, 548)
  and not exists (
    select 1 from public.activity_dup_backup_20261027 b where b.id = a.id
  );

delete from public.activity a
where a.user_id = '0cd19a55-f8d5-425e-b3c2-334bcd104bd6'
  and a.id in (528, 539, 544, 548)
  and exists (
    select 1
    from public.activity_dup_backup_20261027 b
    where b.id = a.id
      and b.user_id = a.user_id
  );
