import { NextResponse } from "next/server";

import {
  collectVendaPixGatewayCorrelationKeys,
  fetchPaidGatewayTransactionIfPaid,
  findPaidGatewayIdTransactionMatchingVenda,
} from "@/lib/pix-gateway-paid-correlation-set";
import { isPixGatewayPaidDbStatus } from "@/lib/pix-gateway-paid-helpers";
import { orderStatusFromVendaRow } from "@/lib/normalize-payment-order-status";
import {
  markPendingPixVendaPaidByPrimaryId,
  markPixVendaPaidByGatewayId,
} from "@/lib/supabase/pending-venda-pix";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** PostgREST pode falhar com listas `.in()` muito longas (URL / limite) — evita 502 no polling. */
const MAX_PIX_IN_KEYS = 96;

/** Scan pesado só para últimas N linhas do gateway (polling a cada ~2,5s). */
const PIX_VENDA_STATUS_GATEWAY_SCAN_CAP = 900;

/** Colunas mínimas em `vendas` — evita pedir `status` se a base não tiver (erro 42703 → 502). */
const VENDA_SELECT_MINIMAL =
  "id, status_pagamento, pedido_codigo, pix_id_transaction, id_transacao_pix, lead_id, detalhes_pedido";

/** Variações de caixa para `.in("id_transaction", …)` (Postgres text é sensível a maiúsculas). */
function distinctKeyVariants(ids: readonly string[]): string[] {
  const s = new Set<string>();
  for (const raw of ids) {
    const id = raw.trim();
    if (!id) continue;
    s.add(id);
    s.add(id.toLowerCase());
    s.add(id.toUpperCase());
  }
  return [...s];
}

async function syncVendaPaidAfterGatewayHit(vendaPk: string, gatewayTxId: string): Promise<void> {
  const sync = await markPixVendaPaidByGatewayId(gatewayTxId);
  if ((sync.updated ?? 0) === 0 && vendaPk) {
    const byId = await markPendingPixVendaPaidByPrimaryId(vendaPk);
    if (!byId.ok && byId.error) {
      console.warn("[checkout/pix-venda-status] mark por id da venda:", byId.error);
    }
  }
}

/**
 * Confirma se o Pix está pago (`vendas` ou `pix_gateway_payments`) e alinha `vendas` quando o webhook
 * gravou correlatos só no payload — **mesma lógica de merge** que `fetchAdminVendas` no painel.
 */
async function resolvePixPaidForVendaRow(
  admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  r: Record<string, unknown>,
  vendaPk: string,
  gatewayTxHint: string | null
): Promise<boolean> {
  if (orderStatusFromVendaRow(r) === "pago") return true;

  const hint = gatewayTxHint?.trim() ?? "";
  if (hint) {
    const directTx = await fetchPaidGatewayTransactionIfPaid(admin, hint);
    if (directTx) {
      await syncVendaPaidAfterGatewayHit(vendaPk, directTx);
      return true;
    }
  }

  const baseKeys = collectVendaPixGatewayCorrelationKeys(r);
  if (baseKeys.length === 0) return false;

  const inKeys = distinctKeyVariants(baseKeys).slice(0, MAX_PIX_IN_KEYS);
  if (inKeys.length === 0) return false;

  const { data: gwRows, error: gwErr } = await admin
    .from("pix_gateway_payments")
    .select("id_transaction, status, raw_payload")
    .in("id_transaction", inKeys);

  if (!gwErr && Array.isArray(gwRows)) {
    for (const gw of gwRows) {
      if (!isPixGatewayPaidDbStatus((gw as { status?: unknown }).status)) continue;
      const tx = String((gw as { id_transaction?: unknown }).id_transaction ?? "").trim();
      if (tx) await syncVendaPaidAfterGatewayHit(vendaPk, tx);
      return true;
    }
  }

  const gwTx = await findPaidGatewayIdTransactionMatchingVenda(admin, r, PIX_VENDA_STATUS_GATEWAY_SCAN_CAP);
  if (gwTx) {
    await syncVendaPaidAfterGatewayHit(vendaPk, gwTx);
    return true;
  }

  return false;
}

const NO_STORE_JSON = {
  headers: {
    "Cache-Control": "no-store, no-cache, must-revalidate, private",
    "CDN-Cache-Control": "no-store",
    "Vercel-CDN-Cache-Control": "no-store",
  },
} as const;

export const dynamic = "force-dynamic";

const debugPixVendaStatus =
  process.env.NODE_ENV === "development" || process.env.DEBUG_CHECKOUT_PIX_STATUS === "1";

/**
 * Estado de pagamento da venda (checkout) — usado pelo browser a fazer polling após gerar Pix.
 * Não expõe PII: só `paid` e opcionalmente `trackingCode` já público no funil.
 *
 * Não usa bloqueio `Sec-Fetch-Site`: GET só leitura + `vendaId` imprevisível; bloquear `cross-site`
 * quebrava www/apex e alguns browsers móveis (polling ficava sempre “pendente”).
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const vendaId = url.searchParams.get("vendaId")?.trim() ?? "";
    const gatewayTxId = url.searchParams.get("gatewayTxId")?.trim() ?? "";
    if (!UUID_RE.test(vendaId)) {
      return NextResponse.json({ error: "Pedido inválido." }, { status: 400, ...NO_STORE_JSON });
    }

    const admin = createSupabaseAdminClient();
    if (!admin) {
      return NextResponse.json({ error: "Serviço indisponível." }, { status: 503, ...NO_STORE_JSON });
    }

    let row: unknown = null;

    const primary = await admin.from("vendas").select(VENDA_SELECT_MINIMAL).eq("id", vendaId).maybeSingle();
    if (primary.error) {
      const fallback = await admin
        .from("vendas")
        .select("id, status_pagamento, pedido_codigo, pix_id_transaction, id_transacao_pix, lead_id")
        .eq("id", vendaId)
        .maybeSingle();
      if (!fallback.error) {
        row = fallback.data;
      } else {
        console.warn("[checkout/pix-venda-status] select venda:", primary.error.message, fallback.error.message);
        return NextResponse.json(
          { error: "Erro ao consultar pedido.", code: "venda_select" },
          { status: 502, ...NO_STORE_JSON }
        );
      }
    } else {
      row = primary.data;
    }

    if (!row) {
      if (debugPixVendaStatus) {
        console.info("[checkout/pix-venda-status] venda não encontrada", { vendaId });
      }
      return NextResponse.json(
        {
          paid: false,
          state: "not_found" as const,
          trackingCode: null as string | null,
        },
        NO_STORE_JSON
      );
    }

    const r = row as Record<string, unknown>;
    const rowPaidBefore = orderStatusFromVendaRow(r) === "pago";
    const gatewayHint = gatewayTxId || null;
    let paid: boolean;
    try {
      paid = await resolvePixPaidForVendaRow(admin, r, vendaId, gatewayHint);
    } catch (resolveErr) {
      console.error("[checkout/pix-venda-status] resolvePixPaidForVendaRow", resolveErr);
      return NextResponse.json(
        { error: "Erro ao resolver estado Pix.", code: "resolve_pix" },
        { status: 500, ...NO_STORE_JSON }
      );
    }

    if (debugPixVendaStatus) {
      const keys = collectVendaPixGatewayCorrelationKeys(r);
      console.info("[checkout/pix-venda-status]", {
        vendaId,
        gatewayTxHint: gatewayHint ? "[presente]" : "[ausente]",
        rowPaidBefore,
        resolvedPaid: paid,
        status_pagamento: r.status_pagamento,
        correlationKeyCount: keys.length,
      });
    }

    let trackingCode: string | null = null;
    if (paid) {
      const lid = String((row as { lead_id?: unknown }).lead_id ?? "").trim();
      if (lid && UUID_RE.test(lid)) {
        const { data: lead, error: leadErr } = await admin.from("leads").select("codigo_rastreio").eq("id", lid).maybeSingle();
        if (!leadErr && lead && typeof (lead as { codigo_rastreio?: unknown }).codigo_rastreio === "string") {
          const c = String((lead as { codigo_rastreio: string }).codigo_rastreio).trim();
          if (c) trackingCode = c;
        }
      }
    }

    const state = paid ? ("paid" as const) : ("pending" as const);

    return NextResponse.json({ paid, state, trackingCode }, NO_STORE_JSON);
  } catch (e) {
    console.error("[checkout/pix-venda-status] não tratado", e);
    return NextResponse.json(
      { error: "Erro interno ao consultar Pix.", code: "unhandled" },
      { status: 500, ...NO_STORE_JSON }
    );
  }
}
