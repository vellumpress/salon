alter table book_clubs
  add column if not exists serialize_plan_id text,
  add column if not exists start_episode integer;
