-- Endereço único por usuário para encaminhar notas de corretagem (n-<token>@<domínio>).
create table if not exists inbound_addresses (
  token text primary key,
  user_id text not null unique,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  forward_code text,              -- código de confirmação de encaminhamento do Gmail, mostrado ao usuário
  forward_code_at timestamptz
);

-- Remetentes autorizados (o e-mail do próprio usuário que encaminha).
create table if not exists inbound_senders (
  user_id text not null,
  email text not null,
  verified_at timestamptz,
  primary key (user_id, email)
);

-- Notas lidas aguardando revisão do usuário. O PDF NÃO é guardado: só o hash (deduplicação).
create table if not exists pending_imports (
  id text primary key,
  user_id text not null,
  pdf_sha256 text not null,
  nota_numero text,
  data_pregao text,
  trades jsonb not null default '[]'::jsonb,
  operacoes jsonb not null default '[]'::jsonb,
  avisos jsonb not null default '[]'::jsonb,
  status text not null check (status in ('pending', 'accepted', 'rejected', 'failed')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  unique (user_id, pdf_sha256)
);
