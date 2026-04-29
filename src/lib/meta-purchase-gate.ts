/**
 * Gate para o Pixel Meta Purchase na página obrigado: só dispara após confirmação
 * explícita de pagamento PIX no checkout/caminho oficial (marcado em sessão).
 */

export const META_PURCHASE_PIXEL_ALLOWED_KEY = "alpha_meta_purchase_pixel_allowed" as const;

export function grantMetaPurchasePixelAfterConfirmedPix(): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(META_PURCHASE_PIXEL_ALLOWED_KEY, "1");
  } catch {
    // ignore
  }
}

/** Lê autorização e remove (uma vez por página obrigado) para não repetir Purchase em refreshes válidos apenas no primeiro disparo bem-sucedido. */
export function takeMetaPurchasePixelAllowed(): boolean {
  if (typeof sessionStorage === "undefined") return false;
  try {
    const ok = sessionStorage.getItem(META_PURCHASE_PIXEL_ALLOWED_KEY) === "1";
    if (ok) sessionStorage.removeItem(META_PURCHASE_PIXEL_ALLOWED_KEY);
    return ok;
  } catch {
    return false;
  }
}
