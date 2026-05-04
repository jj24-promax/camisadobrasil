/**
 * Facebook / Meta Pixel — chamadas tipadas após o snippet em `layout.tsx` carregar `window.fbq`.
 * O ID vem de `NEXT_PUBLIC_META_PIXEL_ID` (ou default do projeto).
 */

declare global {
  interface Window {
    fbq?: MetaFbqFn;
  }
}

/** Assinatura oficial do `fbq` (init, track, trackCustom, consent, etc.). */
export type MetaFbqFn = (...args: unknown[]) => void;

export function getMetaPixelId(): string {
  const fromEnv = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() : "";
  return fromEnv || "867703813018108";
}

export function isMetaPixelEnabled(): boolean {
  return getMetaPixelId().length > 0;
}

/** Dispara `fbq` só se existir (evita erros antes do script ou com adblock). */
export function metaFbq(...args: unknown[]): void {
  if (typeof window === "undefined") return;
  const fbq = window.fbq;
  if (typeof fbq !== "function") return;
  fbq(...args);
}

export type MetaPurchaseParams = {
  value: number;
  currency: string;
  content_ids?: string[];
  content_type?: string;
  num_items?: number;
};

/** Evento standard Purchase (ex.: página obrigado após Pix confirmado + gate). */
export function metaPixelTrackPurchase(params: MetaPurchaseParams): void {
  metaFbq("track", "Purchase", {
    value: params.value,
    currency: params.currency,
    ...(params.content_ids?.length ? { content_ids: params.content_ids } : {}),
    ...(params.content_type ? { content_type: params.content_type } : {}),
    ...(params.num_items != null ? { num_items: params.num_items } : {}),
  });
}

/** Outros eventos standard (InitiateCheckout, ViewContent, …). */
export function metaPixelTrack(event: string, params?: Record<string, unknown>): void {
  if (params && Object.keys(params).length > 0) {
    metaFbq("track", event, params);
  } else {
    metaFbq("track", event);
  }
}
