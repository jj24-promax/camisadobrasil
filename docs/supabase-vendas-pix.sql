-- Ligação vendas ↔ Pix Royal Banking (webhook Cash In → status pago no painel).
-- Se ainda não tens tabela `vendas`, executa primeiro `docs/supabase-vendas.sql`.
-- Executar no Supabase → SQL Editor após a tabela `vendas` existir.

alter table public.vendas add column if not exists pix_id_transaction text;

alter table public.vendas add column if not exists id_transacao_pix text;

-- Opcional: mesmo id que o gateway grava em `pix_gateway_payments.id_transaction` (casamento webhook/reconciliação).
alter table public.vendas add column if not exists id_transaction text;

create index if not exists vendas_pix_id_transaction_idx
  on public.vendas (pix_id_transaction)
  where pix_id_transaction is not null;

create index if not exists vendas_id_transacao_pix_idx
  on public.vendas (id_transacao_pix)
  where id_transacao_pix is not null;
