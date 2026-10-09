create table if not exists entitlements (
  user_id text primary key,
  plan text not null default 'free',
  role text not null default 'user',
  cycle_end timestamptz,
  cancel_at timestamptz,
  updated_at timestamptz not null default now()
);
