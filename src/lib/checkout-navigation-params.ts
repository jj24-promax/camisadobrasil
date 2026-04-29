/**
 * Mantém parâmetros de atribuição (UTMs / clids) ao navegar para `/checkout`,
 * combinando query do carrinho com a URL atual ou snapshot da visita guardado em sessão.
 */

export const STORAGE_LAST_MARKETING_SEARCH = "alpha_last_marketing_search" as const;

const EXTRA_MARKETING_KEYS = new Set([
  "src",
  "sck",
  "fbclid",
  "gclid",
  "ttclid",
  "twclid",
  "wbraid",
  "gbraid",
  "msclkid",
  "gad_source",
  "gad_campaignid",
]);

function isMarketingQueryKey(key: string): boolean {
  const k = key.toLowerCase();
  if (k.startsWith("utm_")) return true;
  return EXTRA_MARKETING_KEYS.has(k);
}

/** Chama ao mudar rota para guardar última URL com UTMs/clids antes de sumirem do endereço. */
export function persistMarketingSearchFromBrowser(): void {
  if (typeof window === "undefined") return;
  try {
    const q = window.location.search;
    if (!q || q.length <= 1) return;
    const p = new URLSearchParams(q);
    let hasMarketing = false;
    for (const key of p.keys()) {
      if (isMarketingQueryKey(key)) {
        hasMarketing = true;
        break;
      }
    }
    if (hasMarketing) {
      sessionStorage.setItem(STORAGE_LAST_MARKETING_SEARCH, q);
    }
  } catch {
    // ignore quota / privacy mode
  }
}

function mergeSearchStringIntoParams(out: URLSearchParams, searchToMerge: string): void {
  const incoming = new URLSearchParams(searchToMerge);
  for (const [k, v] of incoming) {
    if (!isMarketingQueryKey(k)) continue;
    if (!out.has(k)) out.set(k, v);
  }
}

/**
 * Concatena só parâmetros de campanha; não sobrescreve chaves já definidas pelo carrinho (`q`, `sizes`, etc.).
 */
export function mergeCheckoutQueryWithMarketing(
  checkoutQueryWithoutQuestionMark: string
): string {
  if (typeof window === "undefined") return checkoutQueryWithoutQuestionMark;

  const out = new URLSearchParams(checkoutQueryWithoutQuestionMark);
  mergeSearchStringIntoParams(out, window.location.search);
  try {
    const stored = sessionStorage.getItem(STORAGE_LAST_MARKETING_SEARCH);
    if (stored) mergeSearchStringIntoParams(out, stored);
  } catch {
    // ignore
  }
  return out.toString();
}
