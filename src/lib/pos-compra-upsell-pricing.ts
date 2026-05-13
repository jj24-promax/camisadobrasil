/** Valores dos upsells pós-compra (centavos BRL), alinhados às cópias das telas. */
/** Teste: R$ 1,00 cada — repor valores reais antes de produção. */
export const UPSELL_CAP_CENTS = 100;
export const UPSELL_BAG_CENTS = 100;
export const UPSELL_CUP_CENTS = 100;

export function computeUpsellAddonCents(capAccepted: boolean, bagAccepted: boolean, cupAccepted: boolean): number {
  let total = 0;
  if (capAccepted) total += UPSELL_CAP_CENTS;
  if (bagAccepted) total += UPSELL_BAG_CENTS;
  if (cupAccepted) total += UPSELL_CUP_CENTS;
  return total;
}