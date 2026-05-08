-- Snapshot completo do pedido (checkout + adicionais pós-compra) para o painel /admin.
-- Executar no Supabase → SQL Editor após a tabela `vendas` existir.

alter table public.vendas add column if not exists detalhes_pedido jsonb;

comment on column public.vendas.detalhes_pedido is 'JSON: linhas do carrinho, order bumps, personalização, totais e upsells pós-compra (painel admin).';

create index if not exists vendas_detalhes_pedido_idx
  on public.vendas (lead_id)
  where detalhes_pedido is not null;
