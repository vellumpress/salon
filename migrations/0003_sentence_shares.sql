create table if not exists sentence_shares (
  token text primary key,
  work_id text not null,
  breath_index integer not null check (breath_index >= 0),
  sentence_text text not null default '',
  to_phone text not null default '',
  created_by text,
  created_at timestamptz not null default now(),
  claimed_at timestamptz
);
create index if not exists sentence_shares_work_id_idx on sentence_shares (work_id);
