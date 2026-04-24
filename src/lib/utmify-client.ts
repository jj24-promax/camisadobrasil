"use client";

export type UtmifyClientOrderPayload = {
  orderId: string;
  paymentMethod: "pix" | "credit_card" | "boleto";
  status: "paid";
  createdAt: string;
  approvedDate: string;
  customer: {
    name: string;
    email: string;
    phone?: string;
  };
  totalPriceInCents: number;
  trackingParameters?: Record<string, string | null>;
  products?: Array<{
    id?: string;
    name: string;
    priceInCents: number;
    quantity: number;
  }>;
};

function sentKey(orderId: string): string {
  return `alpha_utmify_sent_${orderId}`;
}

export async function sendUtmifyPaidOrderOnce(payload: UtmifyClientOrderPayload): Promise<void> {
  if (typeof window === "undefined") return;
  const orderId = payload.orderId.trim();
  if (!orderId) return;

  try {
    if (sessionStorage.getItem(sentKey(orderId)) === "1") return;
  } catch {
    // ignore storage errors
  }

  const res = await fetch("/api/utmify/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Falha no postback UTMify (${res.status}).`);
  }

  try {
    sessionStorage.setItem(sentKey(orderId), "1");
  } catch {
    // ignore storage errors
  }
}

export function extractTrackingFromSearch(searchParams: URLSearchParams): Record<string, string | null> {
  const pick = (k: string) => searchParams.get(k) || null;
  return {
    src: pick("src"),
    sck: pick("sck"),
    utm_source: pick("utm_source"),
    utm_campaign: pick("utm_campaign"),
    utm_medium: pick("utm_medium"),
    utm_content: pick("utm_content"),
    utm_term: pick("utm_term"),
    utm_id: pick("utm_id"),
    fbclid: pick("fbclid"),
    gclid: pick("gclid"),
  };
}
