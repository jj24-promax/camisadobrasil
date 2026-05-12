-- Colunas opcionais em `vendas` para denormalizar contacto (o checkout atual não as exige: usa `lead_id` → `leads`).
-- Só executar se quiseres e-mail/telefone na própria linha de venda para relatórios ou integrações antigas.
-- O código em `insertPendingPixVenda` deixou de enviar estes campos para evitar erro quando a tabela não os tem.

alter table public.vendas add column if not exists email text not null default '';
alter table public.vendas add column if not exists telefone text not null default '';

comment on column public.vendas.email is 'Opcional: cópia do e-mail do cliente; o painel também resolve via lead_id.';
comment on column public.vendas.telefone is 'Opcional: cópia do telefone; o painel também resolve via lead_id.';
