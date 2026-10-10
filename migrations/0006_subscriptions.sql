-- Assinaturas confirmadas pelo servidor (Asaas). O plano do usuário sai SÓ daqui.
create table if not exists subscriptions (
  id text primary key,                 -- id da assinatura no Asaas (sub_...) ou do pagamento avulso (pay_...)
  user_id text not null,
  plan text not null check (plan in ('pro', 'baleia', 'enterprise')),
  cycle text not null check (cycle in ('month', 'year')),
  status text not null check (status in ('active', 'overdue', 'canceled')),
  paid_until timestamptz,              -- acesso liberado até aqui (pagamento confirmado + período)
  canal text,
  parceiro text,
  last_payment_id text,
  updated_at timestamptz not null default now()
);
create index if not exists subscriptions_user_idx on subscriptions (user_id);

-- Idempotência: cada evento do Asaas é processado uma única vez.
create table if not exists asaas_events (
  event_id text primary key,
  event text not null,
  received_at timestamptz not null default now()
);
