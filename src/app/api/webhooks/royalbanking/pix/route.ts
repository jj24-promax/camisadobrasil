import { getPixWebhookSecret } from "@/lib/pix-webhook-env";
import {
  collectPixWebhookTransactionIds,
  parsePixCashInWebhook,
  sortPixWebhookTransactionIds,
} from "@/lib/pix-webhook-parse";
import { pixWebhookDebugLog } from "@/lib/pix-webhook-debug-log";
import { royalBankingWebhookAck } from "@/lib/royal-banking-webhook-response";
import { markLeadConvertedById } from "@/lib/supabase/lead-mutations";
import {
  markPixVendaCanceledByGatewayId,
  markPixVendasPaidFromWebhookCandidateIds,
} from "@/lib/supabase/pending-venda-pix";
import {
  markPixGatewayPaymentFailed,
  markPixGatewayPaymentPaid,
} from "@/lib/supabase/pix-payment-store";
import { markCustomsFeePixPaidByGatewayId } from "@/lib/supabase/customs-fee-pix";

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

function payloadTopLevelKeys(payload: unknown): string[] {
  if (payload == null || typeof payload !== "object" || Array.isArray(payload)) return [];
  return Object.keys(payload as object);
}

function pickSafeStatusPreview(payload: unknown): unknown {
  if (payload == null || typeof payload !== "object" || Array.isArray(payload)) return undefined;
  const r = payload as Record<string, unknown>;
  return (
    r.status ??
    r.payment_status ??
    r.paymentStatus ??
    r.state ??
    r.providerStatus ??
    r.event ??
    undefined
  );
}

/**
 * Webhook Royal Banking — Cash In pago atualiza `pix_gateway_payments` + `vendas` (fonte de verdade).
 * Cash Out / eventos não-Cash-In: reconhece-se mas não altera vendas de checkout.
 * Resposta sempre `200` + JSON `200` em caso de sucesso operacional (requisito Royal).
 */
export async function POST(req: Request) {
  if (!isPixWebhookAuthorized(req)) {
    return new Response(JSON.stringify({ error: "Unauthorized webhook." }), {
      status: 401,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "JSON inválido." }), {
      status: 400,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }

  try {
    const parsed = parsePixCashInWebhook(payload);
    const candidateIds = mergeCandidateIds(payload, parsed.idTransaction);

    pixWebhookDebugLog("webhook recebido", {
      topLevelKeys: payloadTopLevelKeys(payload),
      statusPreview: pickSafeStatusPreview(payload),
      parsedPaid: parsed.paid,
      parsedFailed: parsed.failed,
      parsedIdTransaction: parsed.idTransaction ?? null,
      candidateCount: candidateIds.length,
      candidateIdsSample: candidateIds.slice(0, 8),
    });

    if (candidateIds.length === 0) {
      console.info("[royal/webhook] ack — sem id de transação reconhecível", {
        keys: payloadTopLevelKeys(payload),
      });
      pixWebhookDebugLog("sem transaction id reconhecível", { keys: payloadTopLevelKeys(payload) });
      return royalBankingWebhookAck();
    }

    const primaryTx = candidateIds[0]!;

    if (parsed.failed) {
      let gatewayStored = false;
      let vendaUpdated = 0;
      for (const tx of candidateIds) {
        const gwFail = await markPixGatewayPaymentFailed(tx, payload);
        if (gwFail.ok) gatewayStored = true;
        const vendaFail = await markPixVendaCanceledByGatewayId(tx);
        vendaUpdated += vendaFail.updated;
      }
      console.info("[royal/webhook] cash-in falhou/cancelado", {
        primaryTx,
        gatewayStored,
        vendaUpdated,
      });
      pixWebhookDebugLog("cash-in falhou/cancelado", { primaryTx, gatewayStored, vendaUpdated });
      return royalBankingWebhookAck();
    }

    if (!parsed.paid) {
      console.info("[royal/webhook] ack — evento ignorado (Cash Out, pendente ou formato não-Cash-In)", {
        primaryTx,
        candidateCount: candidateIds.length,
      });
      pixWebhookDebugLog("evento ignorado (não pago)", {
        primaryTx,
        candidateCount: candidateIds.length,
        statusPreview: pickSafeStatusPreview(payload),
      });
      return royalBankingWebhookAck();
    }

    for (const tx of candidateIds) {
      await markPixGatewayPaymentPaid(tx, payload);
    }

    for (const tx of candidateIds) {
      const customs = await markCustomsFeePixPaidByGatewayId(tx);
      if (customs.updated > 0) break;
    }

    const aggregate = await markPixVendasPaidFromWebhookCandidateIds(candidateIds);

    pixWebhookDebugLog("resultado marcação vendas", {
      matched: aggregate.matched,
      alreadyPaid: aggregate.alreadyPaid,
      updated: aggregate.updated,
      vendaIds: aggregate.vendaIds,
      matchReason: aggregate.matchReason ?? null,
      fallbackUsed: aggregate.fallbackUsed ?? false,
      attemptedKeysCount: aggregate.attemptedKeys.length,
      error: aggregate.error ?? null,
    });

    const convertedLeads = new Set<string>();
    for (const lid of aggregate.leadIds) {
      if (lid) convertedLeads.add(lid);
    }

    for (const leadId of convertedLeads) {
      const converted = await markLeadConvertedById(leadId);
      if (!converted.ok && converted.error) {
        console.warn("[royal/webhook] lead convertido:", converted.error);
      }
    }

    if (!aggregate.matched && !aggregate.alreadyPaid) {
      console.warn("[royal/webhook] cash-in pago mas nenhuma venda pendente casou — ids candidatos:", candidateIds);
    }

    console.info("[royal/webhook] cash-in pago", {
      primaryTx,
      candidateCount: candidateIds.length,
      vendaUpdated: aggregate.updated,
      matched: aggregate.matched,
      alreadyPaid: aggregate.alreadyPaid,
      fallbackUsed: aggregate.fallbackUsed ?? false,
      matchReason: aggregate.matchReason ?? null,
      leadsConverted: convertedLeads.size,
    });

    return royalBankingWebhookAck();
  } catch (err) {
    console.error("[royal/webhook] erro não tratado", err);
    return new Response(JSON.stringify({ error: "internal_error" }), {
      status: 500,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }
}
