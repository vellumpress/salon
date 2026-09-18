create table if not exists favorites (
  user_id text not null,
  work_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, work_id)
);
create index if not exists favorites_user_id_idx on favorites (user_id);
