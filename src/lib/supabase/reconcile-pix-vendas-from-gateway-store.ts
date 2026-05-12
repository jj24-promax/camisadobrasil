import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { markLeadConvertedById } from "@/lib/supabase/lead-mutations";
import { markPixVendaPaidByGatewayId } from "@/lib/supabase/pending-venda-pix";

const DEFAULT_LIMIT = 500;
const BATCH = 120;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * Atualiza `vendas.status_pagamento` para `pago` quando já existe registro `paid`
 * em `pix_gateway_payments` para algum dos IDs correlatos do pedido (webhook gravou,
 * mas o UPDATE em `vendas` falhou ou não casou na época).
 *
 * Não chama HTTP externo ao gateway — usa apenas dados já no Supabase (seguro e idempotente).
 */
export async function reconcilePendingPixVendasFromGatewayStore(options?: {
  limit?: number;
}): Promise<{
  ok: boolean;
  error?: string;
  scanned: number;
  vendaUpdates: number;
  leadsConverted: number;
  paidIdsMatched: number;
}> {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return {
      ok: false,
      error: "SUPABASE_SERVICE_ROLE_KEY não configurada.",
      scanned: 0,
      vendaUpdates: 0,
      leadsConverted: 0,
      paidIdsMatched: 0,
    };
  }

  const limit = Math.min(Math.max(options?.limit ?? DEFAULT_LIMIT, 1), 2000);

  const { data: vendas, error: vErr } = await admin
    .from("vendas")
    .select("pedido_codigo, id_transaction, pix_id_transaction, id_transacao_pix, status_pagamento")
    .eq("status_pagamento", "pendente")
    .limit(limit);

  if (vErr) {
    return {
      ok: false,
      error: vErr.message,
      scanned: 0,
      vendaUpdates: 0,
      leadsConverted: 0,
      paidIdsMatched: 0,
    };
  }

  const rows = (vendas ?? []) as Record<string, unknown>[];
  const candidateIds = new Set<string>();
  for (const r of rows) {
    for (const k of ["pedido_codigo", "id_transaction", "pix_id_transaction", "id_transacao_pix"] as const) {
      const v = r[k];
      if (typeof v === "string" && v.trim()) candidateIds.add(v.trim());
    }
  }

  if (candidateIds.size === 0) {
    return {
      ok: true,
      scanned: rows.length,
      vendaUpdates: 0,
      leadsConverted: 0,
      paidIdsMatched: 0,
    };
  }

  const paidIds = new Set<string>();
  for (const batch of chunk([...candidateIds], BATCH)) {
    const { data: gwRows, error: gErr } = await admin
      .from("pix_gateway_payments")
      .select("id_transaction")
      .eq("status", "paid")
      .in("id_transaction", batch);
    if (gErr) {
      console.warn("[reconcile-pix-vendas] pix_gateway_payments:", gErr.message);
      continue;
    }
    for (const row of gwRows ?? []) {
      const id = typeof row.id_transaction === "string" ? row.id_transaction.trim() : "";
      if (id) paidIds.add(id);
    }
  }

  let vendaUpdates = 0;
  const leadsToConvert = new Set<string>();

  for (const tx of paidIds) {
    const res = await markPixVendaPaidByGatewayId(tx);
    if (res.error) console.warn("[reconcile-pix-vendas] mark paid:", res.error);
    vendaUpdates += res.updated;
    if (res.leadId) leadsToConvert.add(res.leadId);
  }

  let leadsConverted = 0;
  for (const leadId of leadsToConvert) {
    const c = await markLeadConvertedById(leadId);
    if (c.ok) leadsConverted += 1;
    else if (c.error) console.warn("[reconcile-pix-vendas] lead:", c.error);
  }

  console.info("[reconcile-pix-vendas] done", {
    scanned: rows.length,
    paidIdsMatched: paidIds.size,
    vendaUpdates,
    leadsConverted,
  });

  return {
    ok: true,
    scanned: rows.length,
    vendaUpdates,
    leadsConverted,
    paidIdsMatched: paidIds.size,
  };
}
