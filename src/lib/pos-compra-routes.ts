/** Rotas do funil pós-compra (upsells → obrigado). Centralizado para evitar typos e facilitar mudanças. */
export const POS_COMPRA = {
  upsell1: "/pos-compra/upsell-1",
  upsell2: "/pos-compra/upsell-2",
  upsell3: "/pos-compra/upsell-3",
  /** Pix só dos adicionais antes da página de obrigado. */
  pixAddons: "/pos-compra/pix-addons",
  obrigado: "/pos-compra/obrigado",
} as const;

export function posCompraPixAddonsQuery(cap: boolean, bag: boolean, cup: boolean): string {
  const p = new URLSearchParams();
  if (cap) p.set("cap", "1");
  if (bag) p.set("bag", "1");
  if (cup) p.set("cup", "1");
  const s = p.toString();
  return s ? `${POS_COMPRA.pixAddons}?${s}` : POS_COMPRA.pixAddons;
}

export function posCompraObrigadoQuery(cap: boolean, bag: boolean, cup: boolean): string {
  const p = new URLSearchParams();
  if (cap) p.set("cap", "1");
  if (bag) p.set("bag", "1");
  if (cup) p.set("cup", "1");
  const s = p.toString();
  return s ? `${POS_COMPRA.obrigado}?${s}` : POS_COMPRA.obrigado;
}