/**
 * Referências embutidas no payload EMV Pix (copia-e-cola) — ex. URL onlyup com UUID
 * que pode não coincidir com `idTransaction` devolvido no JSON da Royal na criação.
 * Usado para conciliar webhook / `pix_gateway_payments` com o pedido em `vendas`.
 */

const UUID_IN_EMV = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

export function extractPixEmvCorrelationIds(emv: string): string[] {
  if (!emv || typeof emv !== "string") return [];
  const out = new Set<string>();
  for (const m of emv.matchAll(UUID_IN_EMV)) {
    const u = m[0]?.trim();
    if (u && u.length >= 32) out.add(u);
  }
  return [...out].slice(0, 24);
}
