import { getPixWebhookSecret } from "@/lib/pix-webhook-env";
import {
  collectPixWebhookTransactionIds,
  parsePixCashInWebhook,
  sortPixWebhookTransactionIds,
} from "@/lib/pix-webhook-parse";
import { royalBankingWebhookAck } from "@/lib/royal-banking-webhook-response";
import { markLeadConvertedById } from "@/lib/supabase/lead-mutations";
import {
  markPixVendaCanceledByGatewayId,
  markPixVendaPaidByGatewayId,
} from "@/lib/supabase/pending-venda-pix";
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

/**
 * Webhook Royal Banking — Cash In pago atualiza `pix_gateway_payments` + `vendas` (dashboard).
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

    if (candidateIds.length === 0) {
      console.info("[royal/webhook] ack — sem id de transação reconhecível", {
        keys: payload && typeof payload === "object" && !Array.isArray(payload) ? Object.keys(payload as object) : [],
      });
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
      return royalBankingWebhookAck();
    }

    if (!parsed.paid) {
      console.info("[royal/webhook] ack — evento ignorado (Cash Out, pendente ou formato não-Cash-In)", {
        primaryTx,
        candidateCount: candidateIds.length,
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

    let vendaUpdated = 0;
    const convertedLeads = new Set<string>();
    let winningGatewayTx: string | undefined;
    for (const tx of candidateIds) {
      const vendaPaid = await markPixVendaPaidByGatewayId(tx);
      vendaUpdated += vendaPaid.updated;
      if (vendaPaid.leadId) convertedLeads.add(vendaPaid.leadId);
      if (vendaPaid.updated > 0) {
        winningGatewayTx = tx;
        break;
      }
    }

    if (winningGatewayTx) {
      const utm = await syncUtmifyAfterPixPaid(winningGatewayTx);
      if (!utm.ok && utm.error) {
        console.warn("[royal/webhook] UTMify:", utm.error);
      }
    }

    for (const leadId of convertedLeads) {
      const converted = await markLeadConvertedById(leadId);
      if (!converted.ok && converted.error) {
        console.warn("[royal/webhook] lead convertido:", converted.error);
      }
    }

    console.info("[royal/webhook] cash-in pago", {
      primaryTx,
      candidateCount: candidateIds.length,
      vendaUpdated,
      winningGatewayTx: winningGatewayTx ?? null,
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
