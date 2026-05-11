/**
 * Piso do valor do checkout em centavos (anti-fraude / alinhado à Royal).
 * Com `ALLOW_LOW_CHECKOUT_AMOUNT=1` no `.env.local` e **fora da Vercel** (`VERCEL` ≠ `1`)
 * → permite R$ 1,00 para testes no teu PC (dev ou `next start` local). Na Vercel mantém-se R$ 47,50.
 */
export function getMinCheckoutAmountCents(): number {
  const onVercel = process.env.VERCEL === "1";
  if (!onVercel && process.env.ALLOW_LOW_CHECKOUT_AMOUNT === "1") {
    return 100;
  }
  return 4750;
}

export function getMinCheckoutAmountBrl(): number {
  return getMinCheckoutAmountCents() / 100;
}
