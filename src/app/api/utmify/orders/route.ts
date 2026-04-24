import { NextResponse } from "next/server";
import { postUtmifyPaidOrder } from "@/lib/utmify-server";

type IncomingBody = {
  orderId?: string;
  paymentMethod?: "pix" | "credit_card" | "boleto";
  status?: "paid";
  createdAt?: string;
  approvedDate?: string;
  customer?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  totalPriceInCents?: number;
  trackingParameters?: Record<string, string | null>;
  products?: Array<{
    id?: string;
    name?: string;
    priceInCents?: number;
    quantity?: number;
  }>;
};

export async function POST(req: Request) {
  let body: IncomingBody;
  try {
    body = (await req.json()) as IncomingBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Body JSON inválido." }, { status: 400 });
  }

  const orderId = String(body.orderId ?? "").trim();
  const customerName = String(body.customer?.name ?? "").trim();
  const customerEmail = String(body.customer?.email ?? "").trim().toLowerCase();
  const totalPriceInCents = Number(body.totalPriceInCents ?? 0);

  if (!orderId || !customerName || !customerEmail || !Number.isFinite(totalPriceInCents) || totalPriceInCents <= 0) {
    return NextResponse.json(
      { ok: false, error: "Campos obrigatórios ausentes para postback UTMify." },
      { status: 400 }
    );
  }

  const payload = {
    orderId,
    paymentMethod: body.paymentMethod ?? "pix",
    status: "paid" as const,
    createdAt: body.createdAt ?? new Date().toISOString(),
    approvedDate: body.approvedDate ?? new Date().toISOString(),
    customer: {
      name: customerName,
      email: customerEmail,
      phone: String(body.customer?.phone ?? "").trim() || undefined,
    },
    products:
      body.products?.map((p) => ({
        id: p.id,
        name: String(p.name ?? "").trim() || "Pedido Alpha Brasil",
        quantity: Number(p.quantity ?? 1) || 1,
        priceInCents: Number(p.priceInCents ?? 0) || 0,
      })) ?? [],
    trackingParameters: body.trackingParameters ?? {},
    totalPriceInCents: Math.round(totalPriceInCents),
  };

  const r = await postUtmifyPaidOrder(payload);
  if (!r.ok) {
    return NextResponse.json(
      { ok: false, error: "UTMify rejeitou o postback.", status: r.status, details: r.error },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
