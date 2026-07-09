create table if not exists messages (
  id bigint generated always as identity primary key,
  group_id text not null,
  author text not null,
  author_name text,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_messages_group_created
  on messages (group_id, created_at desc);
