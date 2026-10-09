create table if not exists leads (
  id text primary key,
  name text not null,
  email text not null,
  phone text not null,
  locale text not null,
  created_at timestamptz not null default now()
);
