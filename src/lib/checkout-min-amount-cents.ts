import { PRODUCT } from "@/lib/product";

/** Piso “antifraude” quando o preço de catálogo da camisa é ≥ a isto (centavos). */
const DEFAULT_MIN_CENTS = 4750;
const ABSOLUTE_MIN_CENTS = 100;

/**
 * Piso do valor do checkout em centavos (anti-fraude / alinhado à Royal).
 *
 * - `ALLOW_LOW_CHECKOUT_AMOUNT=1` (qualquer ambiente, incl. Vercel) → mínimo R$ 1,00.
 * - Se `PRODUCT.priceCents` for menor que o piso padrão (ex.: campanha/teste a R$ 1,00),
 *   o mínimo segue o catálogo, para o total legítimo não ser bloqueado em produção.
 * - Caso contrário mantém-se R$ 47,50.
 */
export function getMinCheckoutAmountCents(): number {
  if (process.env.ALLOW_LOW_CHECKOUT_AMOUNT === "1") {
    return ABSOLUTE_MIN_CENTS;
  }
  if (PRODUCT.priceCents < DEFAULT_MIN_CENTS) {
    return Math.max(ABSOLUTE_MIN_CENTS, PRODUCT.priceCents);
  }
  return DEFAULT_MIN_CENTS;
}

export function getMinCheckoutAmountBrl(): number {
  return getMinCheckoutAmountCents() / 100;
}
