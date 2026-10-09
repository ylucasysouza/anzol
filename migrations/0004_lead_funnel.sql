alter table leads add column if not exists stage text not null default 'novo';
alter table leads add column if not exists dest text not null default 'fila';
alter table leads add column if not exists source text not null default 'boas-vindas';
