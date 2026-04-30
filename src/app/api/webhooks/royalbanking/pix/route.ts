import { NextResponse } from "next/server";
import { parseRoyalBankingPixWebhook } from "@/lib/royalbanking-webhook-parse";
import {
  markPixVendaCanceledByGatewayId,
  markPixVendaPaidByGatewayId,
} from "@/lib/supabase/pending-venda-pix";
import {
  isPixGatewayPaymentPaid,
  markPixGatewayPaymentFailed,
  markPixGatewayPaymentPaid,
} from "@/lib/supabase/pix-payment-store";

function isRoyalWebhookAuthorized(req: Request): boolean {
  const expected = process.env.ROYALBANKING_WEBHOOK_SECRET?.trim();
  if (!expected) return true;
  const got =
    req.headers.get("x-webhook-secret")?.trim() ||
    req.headers.get("x-royal-webhook-secret")?.trim() ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ||
    "";
  return got === expected;
}

export async function POST(req: Request) {
  if (!isRoyalWebhookAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized webhook." }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido." }, { status: 400 });
  }

  const parsed = parseRoyalBankingPixWebhook(payload);
  const tx = (parsed.idTransaction ?? "").trim();
  if (!tx) {
    return NextResponse.json({ ok: true, ignored: true, reason: "Webhook sem idTransaction." });
  }

  if (parsed.failed) {
    const gwFail = await markPixGatewayPaymentFailed(tx, payload);
    const vendaFail = await markPixVendaCanceledByGatewayId(tx);
    return NextResponse.json({
      ok: true,
      idTransaction: tx,
      paid: false,
      canceled: true,
      gatewayStored: gwFail.ok,
      vendaUpdated: vendaFail.updated,
      errors: [gwFail.error, vendaFail.error].filter(Boolean),
    });
  }

  if (!parsed.paid) {
    return NextResponse.json({ ok: true, idTransaction: tx, ignored: true, reason: "Evento não conclusivo." });
  }

  const alreadyPaid = await isPixGatewayPaymentPaid(tx);
  const gwPaid = await markPixGatewayPaymentPaid(tx, payload);
  const vendaPaid = await markPixVendaPaidByGatewayId(tx);

  return NextResponse.json({
    ok: true,
    idTransaction: tx,
    paid: true,
    gatewayStored: gwPaid.ok,
    vendaUpdated: vendaPaid.updated,
    errors: [gwPaid.error, vendaPaid.error].filter(Boolean),
  });
}