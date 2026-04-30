/** Valores dos upsells pós-compra (centavos BRL), alinhados às cópias das telas. */
export const UPSELL_CAP_CENTS = 4990;
export const UPSELL_BAG_CENTS = 7990;
export const UPSELL_CUP_CENTS = 9990;

export function computeUpsellAddonCents(capAccepted: boolean, bagAccepted: boolean, cupAccepted: boolean): number {
  let total = 0;
  if (capAccepted) total += UPSELL_CAP_CENTS;
  if (bagAccepted) total += UPSELL_BAG_CENTS;
  if (cupAccepted) total += UPSELL_CUP_CENTS;
  return total;
}