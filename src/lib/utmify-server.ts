import "server-only";

export type UtmifyServerOrderPayload = {
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

const DEFAULT_UTMIFY_ENDPOINT = "https://api.utmify.com.br/api-credentials/orders";

export async function postUtmifyPaidOrder(payload: UtmifyServerOrderPayload): Promise<{ ok: true } | { ok: false; error: string; status?: number }> {
  const apiKey = process.env.UTMIFY_API_KEY?.trim();
  const endpoint = process.env.UTMIFY_ENDPOINT?.trim() || DEFAULT_UTMIFY_ENDPOINT;

  if (!apiKey) {
    return { ok: false, error: "UTMIFY_API_KEY não configurada." };
  }

  const body = {
    orderId: payload.orderId,
    platform: "AlphaBrasil",
    paymentMethod: payload.paymentMethod,
    status: payload.status,
    createdAt: payload.createdAt,
    approvedDate: payload.approvedDate,
    customer: {
      name: payload.customer.name,
      email: payload.customer.email,
      phone: payload.customer.phone || undefined,
    },
    products: payload.products ?? [],
    trackingParameters: payload.trackingParameters ?? {},
    commission: {
      totalPriceInCents: Math.round(payload.totalPriceInCents),
      gatewayFeeInCents: 0,
      userCommissionInCents: Math.round(payload.totalPriceInCents),
      currency: "BRL",
    },
  };

  const r = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-token": apiKey,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!r.ok) {
    const text = await r.text();
    return { ok: false, error: text.slice(0, 1200) || "UTMify rejeitou o postback.", status: r.status };
  }
  return { ok: true };
}
