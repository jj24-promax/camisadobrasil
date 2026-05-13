import { NextResponse } from "next/server";

import { expandPixGatewayPaidCorrelationIds, isPixGatewayPaidDbStatus } from "@/lib/pix-gateway-paid-helpers";
import { orderStatusFromVendaRow } from "@/lib/normalize-payment-order-status";
import {
  markPendingPixVendaPaidByPrimaryId,
  markPixVendaPaidByGatewayId,
} from "@/lib/supabase/pending-venda-pix";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function gatewayMatchIds(row: Record<string, unknown>): string[] {
  const out = new Set<string>();
  for (const k of ["pedido_codigo", "pix_id_transaction", "id_transacao_pix"] as const) {
    const t = String(row[k] ?? "").trim();
    if (t) out.add(t);
  }
  const det = row.detalhes_pedido;
  if (det && typeof det === "object" && !Array.isArray(det)) {
    const arr = (det as Record<string, unknown>)._pixCorrelationIds;
    if (Array.isArray(arr)) {
      for (const x of arr) {
        const t = String(x ?? "").trim();
        if (t) out.add(t);
      }
    }
  }
  return [...out];
}

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
  if (sync.updated === 0 && vendaPk) {
    const byId = await markPendingPixVendaPaidByPrimaryId(vendaPk);
    if (!byId.ok && byId.error) {
      console.warn("[checkout/pix-venda-status] mark por id da venda:", byId.error);
    }
  }
}

/**
 * Confirma se o Pix está pago (linha `vendas` ou `pix_gateway_payments`) e tenta alinhar `vendas`
 * quando o webhook gravou outro `id_transaction` mas o payload contém o id do pedido.
 */
async function resolvePixPaidForVendaRow(
  admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  r: Record<string, unknown>,
  vendaPk: string
): Promise<boolean> {
  if (orderStatusFromVendaRow(r) === "pago") return true;

  const baseKeys = gatewayMatchIds(r);
  const keyLower = new Set(baseKeys.map((k) => k.trim().toLowerCase()).filter(Boolean));
  if (keyLower.size === 0) return false;

  const inKeys = distinctKeyVariants(baseKeys);
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

  const since = new Date(Date.now() - 72 * 3600 * 1000).toISOString();
  const { data: recent, error: rErr } = await admin
    .from("pix_gateway_payments")
    .select("id_transaction, status, raw_payload, updated_at")
    .gte("updated_at", since)
    .order("updated_at", { ascending: false })
    .limit(500);

  if (rErr || !Array.isArray(recent)) return false;

  for (const gw of recent) {
    const rec = gw as Record<string, unknown>;
    if (!isPixGatewayPaidDbStatus(rec.status)) continue;
    const expanded = expandPixGatewayPaidCorrelationIds({
      id_transaction: String(rec.id_transaction ?? ""),
      raw_payload: rec.raw_payload,
    });
    const hit = expanded.find((x) => keyLower.has(String(x).trim().toLowerCase()));
    if (hit) {
      const tx = String(rec.id_transaction ?? "").trim() || hit;
      await syncVendaPaidAfterGatewayHit(vendaPk, tx);
      return true;
    }
  }

  return false;
}

/**
 * Estado de pagamento da venda (checkout) — usado pelo browser a fazer polling após gerar Pix.
 * Não expõe PII: só `paid` e opcionalmente `trackingCode` já público no funil.
 *
 * Não usa bloqueio `Sec-Fetch-Site`: GET só leitura + `vendaId` imprevisível; bloquear `cross-site`
 * quebrava www/apex e alguns browsers móveis (polling ficava sempre “pendente”).
 */
export async function GET(req: Request) {
  const vendaId = new URL(req.url).searchParams.get("vendaId")?.trim() ?? "";
  if (!UUID_RE.test(vendaId)) {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Serviço indisponível." }, { status: 503 });
  }

  const { data: row, error } = await admin
    .from("vendas")
    .select(
      "id, status_pagamento, status, pedido_codigo, pix_id_transaction, id_transacao_pix, lead_id, detalhes_pedido"
    )
    .eq("id", vendaId)
    .maybeSingle();

  if (error) {
    console.warn("[checkout/pix-venda-status]", error.message);
    return NextResponse.json({ error: "Erro ao consultar pedido." }, { status: 502 });
  }

  if (!row) {
    return NextResponse.json({ paid: false, trackingCode: null as string | null });
  }

  const r = row as Record<string, unknown>;
  const paid = await resolvePixPaidForVendaRow(admin, r, vendaId);

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

  return NextResponse.json({ paid, trackingCode });
}
