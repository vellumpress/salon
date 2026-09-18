create table if not exists book_clubs (
  id text primary key,
  name text not null,
  work_id text not null,
  host_user_id text,
  invite_token text not null unique,
  fill text not null default 'paper',
  note text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists club_sessions (
  id serial primary key,
  club_id text not null references book_clubs (id) on delete cascade,
  starts_at timestamptz not null,
  label text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists club_members (
  club_id text not null references book_clubs (id) on delete cascade,
  user_id text not null,
  joined_at timestamptz not null default now(),
  primary key (club_id, user_id)
);

create unique index if not exists book_clubs_invite_token_idx on book_clubs (invite_token);
create index if not exists club_sessions_starts_at_idx on club_sessions (starts_at);
create index if not exists club_sessions_club_id_idx on club_sessions (club_id);
create index if not exists club_members_user_id_idx on club_members (user_id);
