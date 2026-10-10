-- Escolha do usuário sobre notas em PDF protegidas por senha.
-- choice: 'store' (senha guardada cifrada, AES-256-GCM) | 'none' (não guardar; lançar manualmente)
create table if not exists pdf_password_prefs (
  user_id text primary key,
  choice text not null check (choice in ('store', 'none')),
  password_enc text,
  updated_at timestamptz not null default now(),
  check ((choice = 'store') = (password_enc is not null))
);

-- Nota protegida sem senha (ou senha errada) fica registrada para avisar o usuário.
alter table pending_imports drop constraint if exists pending_imports_status_check;
alter table pending_imports add constraint pending_imports_status_check
  check (status in ('pending', 'accepted', 'rejected', 'failed', 'needs_password'));
