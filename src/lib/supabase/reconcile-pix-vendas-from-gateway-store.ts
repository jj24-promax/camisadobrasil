import "server-only";

import {
  expandPixGatewayPaidCorrelationIds,
  extractPixWebhookClientFingerprint,
  isPixGatewayPaidDbStatus,
  normalizeDocDigits,
  normalizeEmail,
  normalizePhoneDigits,
} from "@/lib/pix-gateway-paid-helpers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { markLeadConvertedById } from "@/lib/supabase/lead-mutations";
import {
  markPendingPixVendaPaidByPrimaryId,
  markPixVendaPaidByGatewayId,
} from "@/lib/supabase/pending-venda-pix";

const DEFAULT_LIMIT = 2000;
const PAID_ROWS_CAP = 4_000;

function vendaPixCorrelationKeys(raw: Record<string, unknown>): string[] {
  const cols = ["pedido_codigo", "id_transaction", "pix_id_transaction", "id_transacao_pix"] as const;
  const out: string[] = [];
  for (const c of cols) {
    const v = raw[c];
    if (v == null || v === "") continue;
    const t = String(v).trim();
    if (t) out.push(t);
  }
  return [...new Set(out)];
}

export type ReconcilePixVendasFromGatewayResult = {
  ok: boolean;
  error?: string;
  scanned: number;
  /** Vendas que passaram a `pago` (match por id / payload). */
  vendaUpdates: number;
  leadsConverted: number;
  /** Quantidade de ids de transação distintos que casaram com linha paga (métrica legada). */
  paidIdsMatched: number;
  paidRowsAnalyzed: number;
  expandedPaidIdCount: number;
  transactionMatches: number;
  fingerprintMatches: number;
  paidRowsWithoutPendingVenda: number;
  pendingVendasStillUnpaid: number;
};

/**
 * Atualiza `vendas.status_pagamento` para `pago` quando o Pix já consta pago em `pix_gateway_payments`.
 * Usa o id da linha + todos os ids extraídos de `raw_payload` (webhook pode gravar um id e a venda outro).
 * Fase opcional conservadora: documento + valor + (e-mail ou telefone), só com 1 venda pendente por lead.
 */
export async function reconcilePendingPixVendasFromGatewayStore(options?: {
  limit?: number;
}): Promise<ReconcilePixVendasFromGatewayResult> {
  const emptyErr = (error: string): ReconcilePixVendasFromGatewayResult => ({
    ok: false,
    error,
    scanned: 0,
    vendaUpdates: 0,
    leadsConverted: 0,
    paidIdsMatched: 0,
    paidRowsAnalyzed: 0,
    expandedPaidIdCount: 0,
    transactionMatches: 0,
    fingerprintMatches: 0,
    paidRowsWithoutPendingVenda: 0,
    pendingVendasStillUnpaid: 0,
  });

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return emptyErr("SUPABASE_SERVICE_ROLE_KEY não configurada.");
  }

  const limit = Math.min(Math.max(options?.limit ?? DEFAULT_LIMIT, 1), 2000);

  const { data: vendas, error: vErr } = await admin
    .from("vendas")
    .select(
      "id, pedido_codigo, id_transaction, pix_id_transaction, id_transacao_pix, status_pagamento, lead_id, valor, created_at"
    )
    .eq("status_pagamento", "pendente")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (vErr) {
    return emptyErr(vErr.message);
  }

  const rows = (vendas ?? []) as Record<string, unknown>[];
  if (rows.length === 0) {
    return {
      ok: true,
      scanned: 0,
      vendaUpdates: 0,
      leadsConverted: 0,
      paidIdsMatched: 0,
      paidRowsAnalyzed: 0,
      expandedPaidIdCount: 0,
      transactionMatches: 0,
      fingerprintMatches: 0,
      paidRowsWithoutPendingVenda: 0,
      pendingVendasStillUnpaid: 0,
    };
  }

  const { data: paidRowsRaw, error: gErr } = await admin
    .from("pix_gateway_payments")
    .select("id_transaction, raw_payload, status, updated_at")
    .order("updated_at", { ascending: false })
    .limit(PAID_ROWS_CAP);

  if (gErr) {
    return emptyErr(gErr.message);
  }

  const paidRows = (paidRowsRaw ?? []).filter((r) => isPixGatewayPaidDbStatus((r as Record<string, unknown>).status));

  const megaExpanded = new Set<string>();
  const expandedByPrimary = new Map<string, string[]>();
  for (const pr of paidRows) {
    const row = pr as Record<string, unknown>;
    const expanded = expandPixGatewayPaidCorrelationIds({
      id_transaction: String(row.id_transaction ?? ""),
      raw_payload: row.raw_payload,
    });
    expandedByPrimary.set(String(row.id_transaction ?? "").trim(), expanded);
    for (const x of expanded) megaExpanded.add(x);
  }

  const pendingCorrelationPool = new Set<string>();
  for (const r of rows) {
    for (const k of vendaPixCorrelationKeys(r)) pendingCorrelationPool.add(k);
  }

  let paidRowsWithoutPendingVenda = 0;
  for (const pr of paidRows) {
    const primary = String((pr as Record<string, unknown>).id_transaction ?? "").trim();
    const expanded = expandedByPrimary.get(primary) ?? expandPixGatewayPaidCorrelationIds(pr as never);
    if (!expanded.some((id) => pendingCorrelationPool.has(id))) {
      paidRowsWithoutPendingVenda += 1;
    }
  }

  const handledVendaIds = new Set<string>();
  let transactionMatches = 0;
  const leadsFromTx = new Set<string>();

  for (const r of rows) {
    const vid = String(r.id ?? "").trim();
    if (!vid || handledVendaIds.has(vid)) continue;
    const keys = vendaPixCorrelationKeys(r);
    const hit = keys.find((k) => megaExpanded.has(k));
    if (!hit) continue;

    const res = await markPixVendaPaidByGatewayId(hit);
    if (res.error) {
      console.warn("[reconcile-pix-vendas] markPixVendaPaidByGatewayId:", res.error);
      continue;
    }
      if (res.updated > 0) {
        transactionMatches += res.updated;
        for (const idU of res.vendaIds ?? []) {
          if (idU) handledVendaIds.add(idU);
        }
        const lids = res.leadIds?.length ? res.leadIds : res.leadId ? [String(res.leadId)] : [];
        for (const lid of lids) {
          if (lid) leadsFromTx.add(lid);
        }
      }
  }

  const distinctTxHits = new Set<string>();
  for (const r of rows) {
    const hit = vendaPixCorrelationKeys(r).find((k) => megaExpanded.has(k));
    if (hit) distinctTxHits.add(hit);
  }

  const allLeadIds = [...new Set(rows.map((r) => String(r.lead_id ?? "").trim()).filter(Boolean))];

  const leadById = new Map<string, { cpf: string; email: string; phone: string }>();
  if (allLeadIds.length > 0) {
    const { data: leadRows, error: lErr } = await admin.from("leads").select("id, cpf, email, telefone").in("id", allLeadIds);
    if (lErr) {
      console.warn("[reconcile-pix-vendas] leads fetch:", lErr.message);
    } else {
      for (const lr of leadRows ?? []) {
        const o = lr as Record<string, unknown>;
        const id = String(o.id ?? "").trim();
        if (!id) continue;
        leadById.set(id, {
          cpf: normalizeDocDigits(o.cpf),
          email: normalizeEmail(o.email),
          phone: normalizePhoneDigits(o.telefone),
        });
      }
    }
  }

  const countOpenPendingForLead = (leadId: string): number =>
    rows.filter(
      (x) => String(x.lead_id ?? "").trim() === leadId && !handledVendaIds.has(String(x.id ?? "").trim())
    ).length;

  let fingerprintMatches = 0;
  for (const r of rows) {
    const vid = String(r.id ?? "").trim();
    if (!vid || handledVendaIds.has(vid)) continue;
    const leadId = String(r.lead_id ?? "").trim();
    if (!leadId) continue;
    if (countOpenPendingForLead(leadId) > 1) continue;

    const leadRow = leadById.get(leadId);
    if (!leadRow) continue;

    const vValor = Math.round(Number(r.valor ?? 0));
    if (!Number.isFinite(vValor) || vValor < 1) continue;

    for (const pr of paidRows) {
      const prRec = pr as Record<string, unknown>;
      const raw = prRec.raw_payload;
      const mergedForExtract =
        raw && typeof raw === "object" && !Array.isArray(raw)
          ? { ...(raw as Record<string, unknown>), gatewayRowId: prRec.id_transaction }
          : { gatewayRowId: prRec.id_transaction, value: raw };
      const fp = extractPixWebhookClientFingerprint(mergedForExtract);
      const docOk = Boolean(fp.doc && fp.doc === leadRow.cpf && leadRow.cpf.length >= 11);
      const emailOk = Boolean(fp.email && fp.email === leadRow.email && leadRow.email.includes("@"));
      const phoneOk = Boolean(
        fp.phone &&
          leadRow.phone.length >= 10 &&
          (fp.phone === leadRow.phone || fp.phone.endsWith(leadRow.phone) || leadRow.phone.endsWith(fp.phone))
      );

      const identityOk = docOk && (emailOk || phoneOk);
      if (!identityOk) continue;

      let amountOk = false;
      if (fp.amountCents != null && Number.isFinite(fp.amountCents)) {
        amountOk = Math.abs(fp.amountCents - vValor) <= 5;
      } else {
        amountOk = emailOk && phoneOk;
      }
      if (!amountOk) continue;

      const res = await markPendingPixVendaPaidByPrimaryId(vid);
      if (res.error) {
        console.warn("[reconcile-pix-vendas] fingerprint mark:", res.error);
        continue;
      }
      if (res.updated > 0) {
        fingerprintMatches += 1;
        handledVendaIds.add(vid);
        if (res.leadId) leadsFromTx.add(String(res.leadId));
        console.info("[reconcile-pix-vendas] fingerprint match", {
          vendaId: vid,
          leadId,
          gatewayRow: String((pr as Record<string, unknown>).id_transaction ?? "").slice(0, 24),
        });
        break;
      }
    }
  }

  const leadsToConvert = new Set(leadsFromTx);
  let leadsConverted = 0;
  for (const leadId of leadsToConvert) {
    const c = await markLeadConvertedById(leadId);
    if (c.ok) leadsConverted += 1;
    else if (c.error) console.warn("[reconcile-pix-vendas] lead:", c.error);
  }

  const vendaUpdates = transactionMatches + fingerprintMatches;
  const pendingVendasStillUnpaid = rows.length - handledVendaIds.size;

  const logPayload = {
    scanned: rows.length,
    paidRowsAnalyzed: paidRows.length,
    expandedPaidIdCount: megaExpanded.size,
    transactionMatches,
    fingerprintMatches,
    vendaUpdates,
    leadsConverted,
    paidIdsMatched: distinctTxHits.size,
    paidRowsWithoutPendingVenda,
    pendingVendasStillUnpaid,
  };
  console.info("[reconcile-pix-vendas] concluído", logPayload);

  return {
    ok: true,
    scanned: rows.length,
    vendaUpdates,
    leadsConverted,
    paidIdsMatched: distinctTxHits.size,
    paidRowsAnalyzed: paidRows.length,
    expandedPaidIdCount: megaExpanded.size,
    transactionMatches,
    fingerprintMatches,
    paidRowsWithoutPendingVenda,
    pendingVendasStillUnpaid,
  };
}
