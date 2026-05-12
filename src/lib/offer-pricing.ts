import { PRODUCT } from "@/lib/product";

/**
 * Oferta "Leve 3, Pague 2" cumulativa: a cada 3 unidades no pedido, 1 isenta.
 * Ex.: 3 → 1 isenta; 4 → 1 isenta; 6 → 2 isentas; 9 → 3 isentas.
 */
export function leve3Pague2FreeUnitCount(quantity: number): number {
  return Math.floor(quantity / 3);
}

/** Desconto em centavos: soma dos `k` menores preços de linha, com `k = leve3Pague2FreeUnitCount`. */
export function leve3Pague2DiscountFromLinePricesCents(
  linePriceCents: readonly number[]
): number {
  const k = leve3Pague2FreeUnitCount(linePriceCents.length);
  if (k <= 0) return 0;
  const sorted = [...linePriceCents].sort((a, b) => a - b);
  let sum = 0;
  for (let i = 0; i < k; i++) sum += sorted[i]!;
  return sum;
}

/** Todas as linhas ao mesmo preço (ex.: testes ou fallback). */
export function leve3Pague2DiscountCents(
  quantity: number,
  unitPriceCents = PRODUCT.priceCents
): number {
  return leve3Pague2FreeUnitCount(quantity) * unitPriceCents;
}
