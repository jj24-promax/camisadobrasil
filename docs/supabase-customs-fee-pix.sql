-- Cobrança Pix da "taxa alfandegária" no rastreio (determinística no front; cobrança real via gateway).
-- Executar no Supabase → SQL Editor. O app grava via service role na edge function `check-pix-status`.
-- Webhook Mangofy (Next) marca `paid_at` quando o Pix desta transação for pago.

create table if not exists public.customs_fee_pix (
  codigo_rastreio text primary key,
  pedido_codigo text not null unique,
  pix_code text,
  pix_qr_base64 text,
  amount_cents integer,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

comment on table public.customs_fee_pix is 'Pix da taxa de desembaraço vinculado ao código de rastreio; leitura/escrita pela service role.';

create index if not exists customs_fee_pix_pedido_codigo_idx
  on public.customs_fee_pix (pedido_codigo);

alter table public.customs_fee_pix enable row level security;
-- Sem políticas SELECT/INSERT para `anon`: apenas clientes com service role (Edge Functions / servidor com SUPABASE_SERVICE_ROLE_KEY) acedem.
