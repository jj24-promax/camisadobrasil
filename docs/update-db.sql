ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS cep TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS endereco TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS numero TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS complemento TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS bairro TEXT;

-- Marca visita à página /pos-compra/obrigado (funil: checkout → obrigado).
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS obrigado_em TIMESTAMPTZ;