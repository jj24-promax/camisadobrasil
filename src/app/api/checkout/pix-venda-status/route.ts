import { NextResponse } from "next/server";

import { orderStatusFromVendaRow } from "@/lib/normalize-payment-order-status";
import { isPixGatewayPaidDbStatus } from "@/lib/pix-gateway-paid-helpers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function gatewayMatchIds(row: Record<string, unknown>): string[] {
  const keys = ["pedido_codigo", "pix_id_transaction", "id_transacao_pix"] as const;
  const out = new Set<string>();
  for (const k of keys) {
    const t = String(row[k] ?? "").trim();
    if (t) out.add(t);
  }
  return [...out];
}

/**
 * Estado de pagamento da venda (checkout) — usado pelo browser a fazer polling após gerar Pix.
 * Não expõe PII: só `paid` e opcionalmente `trackingCode` já público no funil.
 */
export async function GET(req: Request) {
  const fetchSite = req.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") {
    return NextResponse.json({ error: "Acesso bloqueado." }, { status: 403 });
  }

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
    .select("id, status_pagamento, status, pedido_codigo, pix_id_transaction, id_transacao_pix, lead_id")
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
  let paid = orderStatusFromVendaRow(r) === "pago";

  if (!paid) {
    const ids = gatewayMatchIds(r);
    if (ids.length > 0) {
      const { data: gwRows, error: gwErr } = await admin
        .from("pix_gateway_payments")
        .select("status")
        .in("id_transaction", ids);
      if (!gwErr && Array.isArray(gwRows)) {
        for (const gw of gwRows) {
          if (isPixGatewayPaidDbStatus((gw as { status?: unknown }).status)) {
            paid = true;
            break;
          }
        }
      }
    }
  }

  let trackingCode: string | null = null;
  if (paid) {
    const lid = String(r.lead_id ?? "").trim();
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
