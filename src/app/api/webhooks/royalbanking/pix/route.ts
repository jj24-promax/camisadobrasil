import { NextResponse } from "next/server";

import { getPixWebhookSecret } from "@/lib/pix-webhook-env";
import {
  collectPixWebhookTransactionIds,
  parsePixCashInWebhook,
  sortPixWebhookTransactionIds,
} from "@/lib/pix-webhook-parse";
import {
  markPixVendaCanceledByGatewayId,
  markPixVendaPaidByGatewayId,
} from "@/lib/supabase/pending-venda-pix";
import { markLeadConvertedById } from "@/lib/supabase/lead-mutations";
import {
  markPixGatewayPaymentFailed,
  markPixGatewayPaymentPaid,
} from "@/lib/supabase/pix-payment-store";
import { markCustomsFeePixPaidByGatewayId } from "@/lib/supabase/customs-fee-pix";
import { syncUtmifyAfterPixPaid } from "@/lib/utmify-sync-on-pix-paid";

function isPixWebhookAuthorized(req: Request): boolean {
  const expected = getPixWebhookSecret();
  if (!expected) return true;
  const got =
    req.headers.get("x-webhook-secret")?.trim() ||
    req.headers.get("x-royal-webhook-secret")?.trim() ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ||
    "";
  return got === expected;
}

function mergeCandidateIds(payload: unknown, parsedId?: string): string[] {
  const fromPayload = collectPixWebhookTransactionIds(payload);
  const merged = [...(parsedId?.trim() ? [parsedId.trim()] : []), ...fromPayload];
  return sortPixWebhookTransactionIds(merged);
}

export async function POST(req: Request) {
  if (!isPixWebhookAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized webhook." }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido." }, { status: 400 });
  }

  const parsed = parsePixCashInWebhook(payload);
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
    console.info("[pix/webhook] inconclusive event", {
      candidateCount: candidateIds.length,
      primaryTx,
    });
    return NextResponse.json({
      ok: true,
      idTransaction: primaryTx,
      candidateIds,
      ignored: true,
      reason: "Evento não conclusivo.",
    });
  }

  let gatewayUpsertsOk = 0;
  const gwPaidErrors: string[] = [];
  for (const tx of candidateIds) {
    const gwPaid = await markPixGatewayPaymentPaid(tx, payload);
    if (gwPaid.ok) gatewayUpsertsOk += 1;
    else if (gwPaid.error) gwPaidErrors.push(gwPaid.error);
  }

  let customsFeeUpdated = 0;
  const customsFeeErrors: string[] = [];
  for (const tx of candidateIds) {
    const customs = await markCustomsFeePixPaidByGatewayId(tx);
    customsFeeUpdated += customs.updated;
    if (customs.error) customsFeeErrors.push(customs.error);
    if (customs.updated > 0) break;
  }

  let vendaUpdated = 0;
  const convertedLeads = new Set<string>();
  const vendaErrors: string[] = [];
  let winningGatewayTx: string | undefined;
  for (const tx of candidateIds) {
    const vendaPaid = await markPixVendaPaidByGatewayId(tx);
    vendaUpdated += vendaPaid.updated;
    if (vendaPaid.error) vendaErrors.push(vendaPaid.error);
    if (vendaPaid.leadId) convertedLeads.add(vendaPaid.leadId);
    if (vendaPaid.updated > 0) {
      winningGatewayTx = tx;
      break;
    }
  }

  let utmifySync: { ok: boolean; skipped?: string; error?: string } = { ok: true };
  if (winningGatewayTx) {
    const utm = await syncUtmifyAfterPixPaid(winningGatewayTx);
    if (utm.ok) {
      utmifySync = { ok: true, ...(utm.skipped ? { skipped: utm.skipped } : {}) };
    } else {
      utmifySync = { ok: false, error: utm.error };
      console.warn("[pix/webhook] UTMify:", utm.error);
    }
  }

  const convertedLeadErrors: string[] = [];
  for (const leadId of convertedLeads) {
    const converted = await markLeadConvertedById(leadId);
    if (!converted.ok && converted.error) {
      convertedLeadErrors.push(converted.error);
    }
  }

  console.info("[pix/webhook] pix paid processed", {
    candidateCount: candidateIds.length,
    gatewayUpsertsOk,
    vendaUpdated,
    winningGatewayTx: winningGatewayTx ?? null,
    leadsConverted: convertedLeads.size,
  });

  return NextResponse.json({
    ok: true,
    idTransaction: primaryTx,
    candidateIds,
    paid: true,
    gatewayUpsertsOk,
    customsFeeUpdated,
    vendaUpdated,
    winningGatewayTx: winningGatewayTx ?? null,
    utmifySync,
    leadsConverted: convertedLeads.size,
    errors: [...gwPaidErrors, ...customsFeeErrors, ...vendaErrors, ...convertedLeadErrors].filter(Boolean),
  });
}
