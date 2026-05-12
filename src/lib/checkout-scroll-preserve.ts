/** Evita saltar para o topo ao mudar só a query em `/checkout` (edição/tamanho/q). */
const KEY = "__ab_checkout_qnav_scroll_y";

export function stashCheckoutScrollBeforeQueryNavigation(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(KEY, String(window.scrollY));
  } catch {
    /* ignore */
  }
}

export function consumeCheckoutScrollAfterQueryNavigation(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    if (raw == null) return null;
    const y = Number(raw);
    return Number.isFinite(y) ? y : null;
  } catch {
    return null;
  }
}
