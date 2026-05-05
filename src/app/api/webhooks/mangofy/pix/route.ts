import { NextResponse } from "next/server";
import { getMangofyWebhookSecret } from "@/lib/mangofy-webhook-env";
import {
  collectMangofyPixWebhookTransactionIds,
  parseMangofyPixWebhook,
  sortMangofyPixWebhookTransactionIds,
} from "@/lib/mangofy-webhook-parse";
import {
  markPixVendaCanceledByGatewayId,
  markPixVendaPaidByGatewayId,
} from "@/lib/supabase/pending-venda-pix";
import { markLeadConvertedById } from "@/lib/supabase/lead-mutations";
import {
  markPixGatewayPaymentFailed,
  markPixGatewayPaymentPaid,
} from "@/lib/supabase/pix-payment-store";

function isMangofyPixWebhookAuthorized(req: Request): boolean {
  const expected = getMangofyWebhookSecret();
  if (!expected) return true;
  const got =
    req.headers.get("x-mangofy-webhook-secret")?.trim() ||
    req.headers.get("x-webhook-secret")?.trim() ||
    req.headers.get("x-royal-webhook-secret")?.trim() ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ||
    "";
  return got === expected;
}

function mergeCandidateIds(payload: unknown, parsedId?: string): string[] {
  const fromPayload = collectMangofyPixWebhookTransactionIds(payload);
  const merged = [...(parsedId?.trim() ? [parsedId.trim()] : []), ...fromPayload];
  return sortMangofyPixWebhookTransactionIds(merged);
}

export async function POST(req: Request) {
  if (!isMangofyPixWebhookAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized webhook." }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido." }, { status: 400 });
  }

  const parsed = parseMangofyPixWebhook(payload);
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
  const convertedLeads = new Set<string>();
  const vendaErrors: string[] = [];
  for (const tx of candidateIds) {
    const vendaPaid = await markPixVendaPaidByGatewayId(tx);
    vendaUpdated += vendaPaid.updated;
    if (vendaPaid.error) vendaErrors.push(vendaPaid.error);
    if (vendaPaid.leadId) convertedLeads.add(vendaPaid.leadId);
    if (vendaPaid.updated > 0) break;
  }

  const convertedLeadErrors: string[] = [];
  for (const leadId of convertedLeads) {
    const converted = await markLeadConvertedById(leadId);
    if (!converted.ok && converted.error) {
      convertedLeadErrors.push(converted.error);
    }
  }

  return NextResponse.json({
    ok: true,
    idTransaction: primaryTx,
    candidateIds,
    paid: true,
    gatewayStored: gwPaid.ok,
    vendaUpdated,
    leadsConverted: convertedLeads.size,
    errors: [gwPaid.error, ...vendaErrors, ...convertedLeadErrors].filter(Boolean),
  });
}
