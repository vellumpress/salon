create table if not exists profiles (
  user_id text primary key,
  name text not null default '',
  role text not null default 'reader' check (role in ('reader', 'staff')),
  sitting_minutes integer not null default 20,
  taste text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists reading (
  user_id text not null,
  work_id text not null,
  breath_index integer not null default 0,
  kept integer not null default 0,
  completed boolean not null default false,
  last_opened_at timestamptz,
  primary key (user_id, work_id)
);
create index if not exists reading_user_id_idx on reading (user_id);

create table if not exists featured (
  work_id text primary key,
  sort integer not null default 0,
  note text not null default '',
  updated_by text not null,
  updated_at timestamptz not null default now()
);

create table if not exists notices (
  id serial primary key,
  title text not null,
  body text not null,
  author_id text not null,
  created_at timestamptz not null default now()
);
