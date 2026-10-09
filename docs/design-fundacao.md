# Anzol — Nota de arquitetura: fundação para plataforma (rascunho CTO, 09/10/2026)

## 1. Livro de lançamentos normalizado (Postgres no servidor; PGlite no aparelho)
- `pessoa` (id, nome, email, país, criado_em) — o login.
- `carteira` (id, pessoa_id, tipo: PF_INVEST | PF_CASA | MEI | PJ | EXTERIOR, documento CPF/CNPJ **criptografado**, país, moeda, regime fiscal) — uma pessoa, várias carteiras.
- `lancamento` — **uma linha por lançamento**: id (UUID gerado no aparelho), carteira_id, grupo_dre (enum fixo do CFO), categoria_id, valor_centavos BIGINT, moeda, data_competencia, data_caixa, dedutivel_ir BOOL, origem (manual | nota_pdf | b3 | open_finance | asaas), origem_ref (nº da nota, id externo — chave de deduplicação), atualizado_em, apagado_em (soft delete), versao.
- `categoria` (id, pessoa_id NULL = padrão, grupo_dre NOT NULL, nome) — subcategoria do usuário sempre presa a um grupo.
- `operacao` (trade): lancamento_id, ativo, classe (acao|fii|etf|bdr|futuro|opcao), tipo (DT|swing), qtd, preço_centavos, taxas_centavos, irrf_centavos, nota.
- `apuracao_mensal` (carteira, mês, DT/swing, base, devido, diferido < R$10, pago, guia) — cache recalculável, nunca fonte da verdade.
- `assinatura` (pessoa, plano, periodicidade, canal, parceiro, status, asaas_id).
- Dinheiro sempre `BIGINT` em centavos (`src/lib/money.ts`).

## 2. Sincronização offline-first (requisito do README)
- Aparelho mantém PGlite com cópia local → app abre na hora e funciona sem internet.
- Escrita: grava local + fila `outbox`; envia ao servidor quando houver rede. Servidor é a fonte oficial; conflito por `versao` (último a escrever vence por linha, com histórico).
- Leitura: `pull` incremental por `atualizado_em > cursor`.
- **Aparelho vazio nunca apaga dados**: o protocolo só tem upsert e soft delete explícito por id. Não existe "substituir tudo pelo que está no aparelho". Se o aparelho tem 0 linhas e o servidor tem N, o aparelho baixa N. Teste automático obrigatório disso.

## 3. Migração dos dados atuais (blob JSON por usuário → linhas)
1. Backup: `pg_dump` + cópia do blob por usuário em tabela `backup_blob_2026_10` (somente leitura) antes de tudo.
2. Script idempotente converte blob → pessoa/carteira/lançamento, com `origem_ref` para não duplicar.
3. Conferência: recalcula DARF de cada mês com o motor e compara com o resultado antigo; diferenças viram relatório (esperadas onde os bugs foram corrigidos).
4. Por 30 dias o blob segue sendo gravado em paralelo (rollback possível).

## 4. LGPD
- Criptografia: TLS em trânsito; disco criptografado; CPF/CNPJ e tokens de terceiros com criptografia de campo (chave em KMS/segredo do provedor, nunca no repositório).
- Consentimento: aceite de termos/política versionado (`consentimento`: pessoa, finalidade, versão, data); autorização separada para B3, Open Finance e contador.
- Direitos do titular: exportar tudo (JSON+CSV) e excluir conta (apaga em até 15 dias; backups expiram pelo ciclo).
- Registro de acesso: `log_acesso` (quem, qual carteira, ação, quando), visível ao usuário — inclusive acessos do contador.
- Mínimo necessário: CPF completo só onde a guia exige.

## 5. Painel do contador
- `vinculo_contador` (contador_pessoa_id, carteira_id, escopo leitura|edição, concedido_em, revogado_em) — o cliente concede e revoga.
- Tela: lista de clientes com DARF do mês, pendências (nota faltando, mês sem lançamento), exportação. Tudo gravado em `log_acesso`.

## 6. Cobrança — Asaas (sandbox primeiro)
- Assinatura mensal/anual por cartão; Pix Automático para recorrência no Pix; split para comissão de parceiro (20%).
- Webhook do Asaas → valida token → atualiza `assinatura` → recalcula entitlement (`plans.ts`) no servidor. Cliente nunca define o próprio plano (hoje o plano fica no localStorage: precisa mudar).
- Idempotência por id do evento.

## 7. Roteiro de sincronização com corretoras
1. **Nota de corretagem em PDF** (protótipo em `src/lib/tcp/nota-corretagem.ts`): upload ou e-mail encaminhado para um endereço do Anzol. Extração de texto com pdfjs-dist no aparelho.
2. **API Área do Investidor B3**: exige CNPJ, self-assessment de segurança e contrato. Traz posição e movimentação de todas as corretoras.
3. **Open Finance (Pluggy/Belvo)**: extrato e saldo bancário para casa e empresa (etapa 2).

## 8. DARF dentro do app — Serpro Integra Contador
- Serviço SICALC `CONSOLIDARGERARDARF51` (PDF) / `GERARDARFCODBARRA53` (código de barras).
- Exige CNPJ, e-CNPJ (certificado) e procuração eletrônica do contribuinte para o Anzol. Cobrança por chamada.
