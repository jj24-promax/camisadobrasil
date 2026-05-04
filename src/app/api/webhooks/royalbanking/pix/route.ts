import { NextResponse } from "next/server";
import {
  collectRoyalWebhookTransactionIds,
  parseRoyalBankingPixWebhook,
  sortWebhookTransactionIdsGatewayFirst,
} from "@/lib/royalbanking-webhook-parse";
import {
  markPixVendaCanceledByGatewayId,
  markPixVendaPaidByGatewayId,
} from "@/lib/supabase/pending-venda-pix";
import {
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

function mergeCandidateIds(payload: unknown, parsedId?: string): string[] {
  const fromPayload = collectRoyalWebhookTransactionIds(payload);
  const merged = [...(parsedId?.trim() ? [parsedId.trim()] : []), ...fromPayload];
  return sortWebhookTransactionIdsGatewayFirst(merged);
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
  const candidateIds = mergeCandidateIds(payload, parsed.idTransaction);

  if (candidateIds.length === 0) {
    return NextResponse.json({ ok: true, ignored: true, reason: "Webhook sem id de transação reconhecível." });
  }

  const primaryTx = candidateIds[0]!;

  if (parsed.failed) {
    const errors: string[] = [];
    let gatewayStored = false;
    let vendaUpdated = 0;
    for (const tx of candidateIds) {
      const gwFail = await markPixGatewayPaymentFailed(tx, payload);
      if (gwFail.ok) gatewayStored = true;
      if (gwFail.error) errors.push(gwFail.error);
      const vendaFail = await markPixVendaCanceledByGatewayId(tx);
      vendaUpdated += vendaFail.updated;
      if (vendaFail.error) errors.push(vendaFail.error);
    }
    return NextResponse.json({
      ok: true,
      idTransaction: primaryTx,
      candidateIds,
      paid: false,
      canceled: true,
      gatewayStored,
      vendaUpdated,
      errors: errors.filter(Boolean),
    });
  }

  if (!parsed.paid) {
    return NextResponse.json({
      ok: true,
      idTransaction: primaryTx,
      candidateIds,
      ignored: true,
      reason: "Evento não conclusivo.",
    });
  }

  const gwPaid = await markPixGatewayPaymentPaid(primaryTx, payload);

  let vendaUpdated = 0;
  const vendaErrors: string[] = [];
  for (const tx of candidateIds) {
    const vendaPaid = await markPixVendaPaidByGatewayId(tx);
    vendaUpdated += vendaPaid.updated;
    if (vendaPaid.error) vendaErrors.push(vendaPaid.error);
    if (vendaPaid.updated > 0) break;
  }

  return NextResponse.json({
    ok: true,
    idTransaction: primaryTx,
    candidateIds,
    paid: true,
    gatewayStored: gwPaid.ok,
    vendaUpdated,
    errors: [gwPaid.error, ...vendaErrors].filter(Boolean),
  });
}
