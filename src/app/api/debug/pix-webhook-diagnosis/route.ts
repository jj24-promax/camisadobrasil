import { NextResponse } from "next/server";

import { collectVendaPixGatewayCorrelationKeys } from "@/lib/pix-gateway-paid-correlation-set";
import { isPixGatewayPaidDbStatus } from "@/lib/pix-gateway-paid-helpers";
import { orderStatusFromVendaRow } from "@/lib/normalize-payment-order-status";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";

export const dynamic = "force-dynamic";

const VENDA_MATCH = ["pedido_codigo", "pix_id_transaction", "id_transacao_pix"] as const;

function orEqQuoted(columns: readonly string[], rawId: string): string {
  const safe = rawId.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return columns.map((c) => `${c}.eq."${safe}"`).join(",");
}

function txVariants(id: string): string[] {
  const t = id.trim();
  if (!t) return [];
  return [...new Set([t, t.toLowerCase(), t.toUpperCase()])];
}

/**
 * Diagnóstico operacional do encadeamento Pix → venda (protegido por segredo).
 * GET com header `x-pix-diagnosis-secret: <PIX_WEBHOOK_DIAGNOSIS_SECRET>` e query `transactionId=`.
 * Não expõe `raw_payload` completo nem PII.
 */
export async function GET(req: Request) {
  const secret = process.env.PIX_WEBHOOK_DIAGNOSIS_SECRET?.trim();
  const got = req.headers.get("x-pix-diagnosis-secret")?.trim() ?? "";
  if (!secret || got !== secret) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tx = new URL(req.url).searchParams.get("transactionId")?.trim() ?? "";
  if (!tx || tx.length > 512) {
    return NextResponse.json({ error: "transactionId inválido ou ausente." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY ausente no servidor." }, { status: 503 });
  }

  const variants = txVariants(tx);
  const orVenda = variants.map((v) => orEqQuoted(VENDA_MATCH, v)).join(",");

  const { data: gwRows } = await admin
    .from("pix_gateway_payments")
    .select("id_transaction, status, updated_at")
    .in("id_transaction", variants);

  const gateway = (gwRows ?? []).map((r) => ({
    id_transaction: String((r as { id_transaction?: unknown }).id_transaction ?? ""),
    status: String((r as { status?: unknown }).status ?? ""),
    updated_at: String((r as { updated_at?: unknown }).updated_at ?? ""),
    isPaidFlag: isPixGatewayPaidDbStatus((r as { status?: unknown }).status),
  }));

  const { data: vendaRows, error: vErr } = await admin
    .from("vendas")
    .select("id, status_pagamento, status, pedido_codigo, pix_id_transaction, id_transacao_pix, detalhes_pedido")
    .or(orVenda);

  let vendas: unknown;
  if (vErr || !vendaRows) {
    vendas = { error: vErr?.message ?? "sem dados" };
  } else {
    vendas = (vendaRows as Record<string, unknown>[]).map((row) => {
      const merged = orderStatusFromVendaRow(row);
      const keys = collectVendaPixGatewayCorrelationKeys(row);
      return {
        id: String(row.id ?? ""),
        status_pagamento: row.status_pagamento ?? null,
        status: row.status ?? null,
        mergedOrderStatus: merged ?? null,
        pedido_codigo: row.pedido_codigo ?? null,
        pix_id_transaction: row.pix_id_transaction ?? null,
        id_transacao_pix: row.id_transacao_pix ?? null,
        correlationKeyCount: keys.length,
      };
    });
  }

  const vendaList = Array.isArray(vendas) ? (vendas as { mergedOrderStatus?: string }[]) : [];
  const anyVendaPago = vendaList.some((v) => v.mergedOrderStatus === "pago");

  let recommendation = "ok";
  if (gateway.some((g) => g.isPaidFlag) && !anyVendaPago) {
    recommendation =
      "pix_gateway_payments indica pago mas nenhuma venda casou com pedido_codigo/pix_id_transaction/id_transacao_pix (verificar ids no payload vs colunas gravadas no insert; usar DEBUG_PIX_WEBHOOK=1 no webhook).";
  } else if (!gateway.length) {
    recommendation = "Sem linha em pix_gateway_payments para este transactionId — webhook pode não ter corrido ou id diferente.";
  } else if (anyVendaPago) {
    recommendation = "Venda já reflete pago na tabela principal.";
  }

  return NextResponse.json(
    {
      transactionId: tx,
      variantsTried: variants,
      pix_gateway_payments: gateway,
      vendasMatch: vendas,
      summary: {
        gatewayPaidRow: gateway.some((g) => g.isPaidFlag),
        vendaPrincipalPaga: anyVendaPago,
      },
      recommendation,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
