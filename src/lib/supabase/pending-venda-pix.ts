import "server-only";

import { collectVendaPixGatewayCorrelationKeys } from "@/lib/pix-gateway-paid-correlation-set";
import { sortPixWebhookTransactionIds } from "@/lib/pix-webhook-parse";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";
import type { OrderCheckoutSnapshotV1 } from "@/types/order-snapshot";

export type PendingPixVendaInput = {
  leadId?: string;
  customerName: string;
  /** Opcional (ex. chamadores antigos); contacto fica em `leads`, não se grava em `vendas`. */
  customerEmail?: string;
  /** Opcional; idem — use `lead_id` + `leads`. */
  customerPhone?: string;
  amountCents: number;
  productSummary: string;
  idTransaction: string;
  /**
   * ID nativo do gateway (ex. UUID/VPAY…). Grava-se em `pix_id_transaction` / `id_transacao_pix` e em `pedido_codigo` no checkout.
   */
  gatewayPixTransactionId?: string;
  shippingSummary?: string;
  /** JSON completo do pedido para o painel admin (`vendas.detalhes_pedido`). */
  detalhesPedido?: OrderCheckoutSnapshotV1 | null;
};

/** Colunas base (sempre usadas no checkout / inserts atuais). */
const VENDA_PIX_MATCH_COLS = ["pedido_codigo", "pix_id_transaction", "id_transacao_pix"] as const;

/** Inclui `id_transaction` quando existir na base — ver `docs/supabase-vendas-pix.sql`. */
const VENDA_PIX_MATCH_COLS_WITH_ID_TX = ["pedido_codigo", "pix_id_transaction", "id_transacao_pix", "id_transaction"] as const;

/** Filtro PostgREST seguro para `.or(...)`: valor entre aspas duplas. */
function orEqQuoted(columns: readonly string[], rawId: string): string {
  const safe = rawId.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return columns.map((c) => `${c}.eq."${safe}"`).join(",");
}

function transactionIdVariants(raw: string): string[] {
  const t = raw.trim();
  if (!t) return [];
  return [...new Set([t, t.toLowerCase(), t.toUpperCase()])];
}

function isMissingColumnError(message: string, column: string): boolean {
  const m = message.toLowerCase();
  const c = column.toLowerCase();
  return m.includes(c) && (m.includes("does not exist") || m.includes("unknown") || m.includes("schema cache") || m.includes("not found"));
}

/** Tenta incluir `id_transaction` na procura; se a coluna não existir ou a sonda falhar, usa só as 3 colunas base. */
async function pickMatchColumnsForQuery(admin: ReturnType<typeof createSupabaseAdminClient>): Promise<readonly string[]> {
  if (!admin) return VENDA_PIX_MATCH_COLS;
  const probe = await admin.from("vendas").select("id_transaction").limit(1);
  if (probe.error) {
    return VENDA_PIX_MATCH_COLS;
  }
  return VENDA_PIX_MATCH_COLS_WITH_ID_TX;
}

function normalizePaymentStatus(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

export type MarkPixVendaPaidByGatewayIdResult = {
  ok: boolean;
  matched: boolean;
  alreadyPaid: boolean;
  updated: number;
  leadId?: string;
  leadIds?: string[];
  vendaIds?: string[];
  error?: string;
  /** Motivo técnico do match (ex.: variant_match + coluna). */
  matchReason?: string;
};

export type MarkPixVendasWebhookAggregateResult = {
  ok: boolean;
  matched: boolean;
  alreadyPaid: boolean;
  updated: number;
  vendaIds: string[];
  leadIds: string[];
  attemptedKeys: string[];
  matchReason?: string;
  fallbackUsed?: boolean;
  error?: string;
};

export async function insertPendingPixVenda(
  p: PendingPixVendaInput
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY não configurada." };
  }

  const tx = p.idTransaction.trim();
  if (!tx) return { ok: false, error: "idTransaction vazio." };

  const base = `${p.productSummary} · Pix`;
  const line = p.shippingSummary ? `${base} · Entrega: ${p.shippingSummary}` : base;
  const id = crypto.randomUUID();

  const gw = p.gatewayPixTransactionId?.trim();
  /** Só chaves suportadas por `vendas` neste projeto — nunca `email`/`telefone` (ficam em `leads`). */
  type VendaPixInsert = {
    id: string;
    lead_id: string | null;
    cliente_nome: string;
    produto: string;
    valor: number;
    status_pagamento: "pendente";
    pedido_codigo: string;
    pix_id_transaction?: string;
    id_transacao_pix?: string;
    detalhes_pedido?: OrderCheckoutSnapshotV1;
  };

  const row: VendaPixInsert = {
    id,
    lead_id: p.leadId || null,
    cliente_nome: p.customerName,
    produto: line,
    valor: p.amountCents,
    status_pagamento: "pendente",
    pedido_codigo: tx,
  };
  if (gw) {
    row.pix_id_transaction = gw;
    row.id_transacao_pix = gw;
  }
  if (p.detalhesPedido != null) {
    row.detalhes_pedido = JSON.parse(JSON.stringify(p.detalhesPedido)) as OrderCheckoutSnapshotV1;
  }

  const { error } = await admin.from("vendas").insert(row);

  if (error) {
    console.error("[pending-venda-pix] erro ao inserir:", error.message, {
      payloadKeys: Object.keys(row),
    });
    return { ok: false, error: error.message };
  }

  return { ok: true, id };
}

/** Marca uma venda pendente como paga pelo `id` da linha (reconciliação por match indireto). */
export async function markPendingPixVendaPaidByPrimaryId(
  vendaId: string
): Promise<{ ok: boolean; updated: number; leadId?: string; error?: string }> {
  const vid = vendaId.trim();
  if (!vid) return { ok: false, updated: 0, error: "id vazio" };

  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, updated: 0, error: "SUPABASE_SERVICE_ROLE_KEY não configurada" };

  const { data, error } = await admin
    .from("vendas")
    .update({ status_pagamento: "pago" })
    .eq("id", vid)
    .eq("status_pagamento", "pendente")
    .select("id, lead_id");

  if (error) return { ok: false, updated: 0, error: error.message };
  return { ok: true, updated: data?.length || 0, leadId: data?.[0]?.lead_id };
}

/**
 * Marca vendas **pendentes** como pagas quando qualquer coluna de correlação coincide com o id
 * (inclui variantes de maiúsculas). Idempotente: vendas já `pago` não são alteradas; devolve `alreadyPaid`.
 */
export async function markPixVendaPaidByGatewayId(idTransaction: string): Promise<MarkPixVendaPaidByGatewayIdResult> {
  const id = idTransaction.trim();
  if (!id) return { ok: false, matched: false, alreadyPaid: false, updated: 0, error: "id vazio" };

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return { ok: false, matched: false, alreadyPaid: false, updated: 0, error: "SUPABASE_SERVICE_ROLE_KEY não configurada" };
  }

  const cols = await pickMatchColumnsForQuery(admin);
  const variants = transactionIdVariants(id);

  for (const v of variants) {
    const orPart = orEqQuoted(cols, v);
    const { data, error } = await admin
      .from("vendas")
      .update({ status_pagamento: "pago" })
      .or(orPart)
      .eq("status_pagamento", "pendente")
      .select("id, lead_id");

    if (error) {
      if (cols === VENDA_PIX_MATCH_COLS_WITH_ID_TX && isMissingColumnError(error.message, "id_transaction")) {
        const baseOr = orEqQuoted(VENDA_PIX_MATCH_COLS, v);
        const retry = await admin
          .from("vendas")
          .update({ status_pagamento: "pago" })
          .or(baseOr)
          .eq("status_pagamento", "pendente")
          .select("id, lead_id");
        if (retry.error) return { ok: false, matched: false, alreadyPaid: false, updated: 0, error: retry.error.message };
        if (retry.data?.length) {
          return finalizeMarkResult(retry.data as { id?: unknown; lead_id?: unknown }[], `variant_column_match:${v}`);
        }
        continue;
      }
      return { ok: false, matched: false, alreadyPaid: false, updated: 0, error: error.message };
    }

    if (data?.length) {
      return finalizeMarkResult(data as { id?: unknown; lead_id?: unknown }[], `variant_column_match:${v}`);
    }
  }

  const seenVenda = new Map<string, { status: string; lead_id?: string }>();
  for (const v of variants) {
    const orPart = orEqQuoted(cols, v);
    const { data: existing, error: selErr } = await admin.from("vendas").select("id, lead_id, status_pagamento").or(orPart);
    if (selErr || !existing?.length) continue;
    for (const row of existing) {
      const rid = String((row as { id?: unknown }).id ?? "").trim();
      if (!rid) continue;
      const st = normalizePaymentStatus((row as { status_pagamento?: unknown }).status_pagamento);
      const lid = String((row as { lead_id?: unknown }).lead_id ?? "").trim();
      seenVenda.set(rid, { status: st, lead_id: lid || undefined });
    }
  }

  if (seenVenda.size > 0) {
    const rows = [...seenVenda.entries()].map(([id, meta]) => ({ id, status_pagamento: meta.status, lead_id: meta.lead_id }));
    const allPaid = rows.every((row) => row.status_pagamento === "pago");
    if (allPaid) {
      const vendaIds = rows.map((r) => r.id);
      const leadIds = [...new Set(rows.map((r) => String(r.lead_id ?? "").trim()).filter(Boolean))];
      return {
        ok: true,
        matched: true,
        alreadyPaid: true,
        updated: 0,
        vendaIds,
        leadIds: leadIds.length ? leadIds : undefined,
        leadId: leadIds[0],
        matchReason: "already_paid_same_correlation",
      };
    }
  }

  return {
    ok: true,
    matched: false,
    alreadyPaid: false,
    updated: 0,
    matchReason: "no_matching_venda_pending",
  };
}

function finalizeMarkResult(
  data: { id?: unknown; lead_id?: unknown }[],
  matchReason: string
): MarkPixVendaPaidByGatewayIdResult {
  const vendaIds = data.map((row) => String(row.id ?? "").trim()).filter(Boolean);
  const leadIds = [...new Set(data.map((row) => String(row.lead_id ?? "").trim()).filter(Boolean))];
  return {
    ok: true,
    matched: true,
    alreadyPaid: false,
    updated: data.length,
    leadId: data[0]?.lead_id != null ? String(data[0].lead_id) : undefined,
    leadIds: leadIds.length ? leadIds : undefined,
    vendaIds,
    matchReason,
  };
}

/**
 * Usado pelo webhook Royal: percorre todos os ids candidatos do payload, marca a primeira venda pendente
 * que casar, e opcionalmente reconcilia por `_pixCorrelationIds` em `detalhes_pedido`.
 */
export async function markPixVendasPaidFromWebhookCandidateIds(
  candidateIds: readonly string[]
): Promise<MarkPixVendasWebhookAggregateResult> {
  const sorted = sortPixWebhookTransactionIds([...new Set(candidateIds.map((x) => String(x).trim()).filter(Boolean))]);
  const attemptedKeys = [...sorted];

  if (sorted.length === 0) {
    return {
      ok: true,
      matched: false,
      alreadyPaid: false,
      updated: 0,
      vendaIds: [],
      leadIds: [],
      attemptedKeys,
      matchReason: "no_candidate_ids",
    };
  }

  for (const tx of sorted) {
    const r = await markPixVendaPaidByGatewayId(tx);
    if (!r.ok && r.error) {
      return {
        ok: false,
        matched: false,
        alreadyPaid: false,
        updated: 0,
        vendaIds: [],
        leadIds: [],
        attemptedKeys,
        error: r.error,
      };
    }
    if (r.updated > 0) {
      return {
        ok: true,
        matched: true,
        alreadyPaid: false,
        updated: r.updated,
        vendaIds: r.vendaIds ?? [],
        leadIds: r.leadIds ?? (r.leadId ? [r.leadId] : []),
        attemptedKeys,
        matchReason: r.matchReason,
      };
    }
    if (r.matched && r.alreadyPaid) {
      return {
        ok: true,
        matched: true,
        alreadyPaid: true,
        updated: 0,
        vendaIds: r.vendaIds ?? [],
        leadIds: r.leadIds ?? (r.leadId ? [r.leadId] : []),
        attemptedKeys,
        matchReason: r.matchReason,
      };
    }
  }

  const fb = await markPendingVendasPaidByDetalhesCorrelation(sorted);
  if (fb.updated > 0) {
    return {
      ok: true,
      matched: true,
      alreadyPaid: false,
      updated: fb.updated,
      vendaIds: fb.vendaIds,
      leadIds: fb.leadIds,
      attemptedKeys,
      matchReason: fb.matchReason,
      fallbackUsed: true,
    };
  }

  return {
    ok: true,
    matched: false,
    alreadyPaid: false,
    updated: 0,
    vendaIds: [],
    leadIds: [],
    attemptedKeys,
    matchReason: "no_matching_venda_found",
  };
}

async function markPendingVendasPaidByDetalhesCorrelation(
  candidateIds: readonly string[]
): Promise<{ updated: number; vendaIds: string[]; leadIds: string[]; matchReason: string }> {
  const admin = createSupabaseAdminClient();
  if (!admin) return { updated: 0, vendaIds: [], leadIds: [], matchReason: "no_admin" };

  const keyLower = new Set(candidateIds.map((k) => k.trim().toLowerCase()).filter(Boolean));
  if (keyLower.size === 0) return { updated: 0, vendaIds: [], leadIds: [], matchReason: "empty_keys" };

  const since = new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString();
  const { data: rows, error } = await admin
    .from("vendas")
    .select("id, lead_id, status_pagamento, detalhes_pedido, pedido_codigo, pix_id_transaction, id_transacao_pix")
    .eq("status_pagamento", "pendente")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(280);

  if (error || !rows?.length) {
    return { updated: 0, vendaIds: [], leadIds: [], matchReason: error ? "detalhes_select_error" : "detalhes_no_rows" };
  }

  const vendaIds: string[] = [];
  const leadIds: string[] = [];

  for (const row of rows) {
    const r = row as Record<string, unknown>;
    const keys = collectVendaPixGatewayCorrelationKeys(r);
    if (!keys.some((k) => keyLower.has(k.trim().toLowerCase()))) continue;
    const pk = String(r.id ?? "").trim();
    if (!pk) continue;
    const m = await markPendingPixVendaPaidByPrimaryId(pk);
    if (m.updated > 0) {
      vendaIds.push(pk);
      if (m.leadId) leadIds.push(String(m.leadId));
    }
  }

  return {
    updated: vendaIds.length,
    vendaIds,
    leadIds: [...new Set(leadIds)],
    matchReason: "detalhes_pedido_correlation",
  };
}

export async function markPixVendaCanceledByGatewayId(
  idTransaction: string
): Promise<{ ok: boolean; updated: number; error?: string }> {
  const id = idTransaction.trim();
  if (!id) return { ok: false, updated: 0, error: "id vazio" };

  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, updated: 0, error: "SUPABASE_SERVICE_ROLE_KEY não configurada" };

  const cols = await pickMatchColumnsForQuery(admin);
  let total = 0;

  for (const v of transactionIdVariants(id)) {
    const { data, error } = await admin
      .from("vendas")
      .update({ status_pagamento: "cancelado" })
      .or(orEqQuoted(cols, v))
      .eq("status_pagamento", "pendente")
      .select("id");

    if (error) {
      if (cols === VENDA_PIX_MATCH_COLS_WITH_ID_TX && isMissingColumnError(error.message, "id_transaction")) {
        const r2 = await admin
          .from("vendas")
          .update({ status_pagamento: "cancelado" })
          .or(orEqQuoted(VENDA_PIX_MATCH_COLS, v))
          .eq("status_pagamento", "pendente")
          .select("id");
        if (r2.error) return { ok: false, updated: 0, error: r2.error.message };
        total += r2.data?.length ?? 0;
        continue;
      }
      return { ok: false, updated: 0, error: error.message };
    }
    total += data?.length ?? 0;
  }

  return { ok: true, updated: total };
}

export async function getVendaContextByGatewayId(
  idTransaction: string
): Promise<{
  ok: boolean;
  error?: string;
  data?: {
    pedidoCodigo: string;
    clienteNome: string;
    valor: number;
    produto: string;
    createdAt: string;
    leadEmail?: string;
    leadPhone?: string;
  };
}> {
  const id = idTransaction.trim();
  if (!id) return { ok: false, error: "id vazio" };

  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY não configurada" };

  const { data, error } = await admin
    .from("vendas")
    .select("pedido_codigo, cliente_nome, valor, produto, created_at, lead_id")
    .or(orEqQuoted(VENDA_PIX_MATCH_COLS, id))
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Venda não encontrada para este idTransaction." };

  let leadEmail: string | undefined;
  let leadPhone: string | undefined;
  if (data.lead_id) {
    const { data: leadRow } = await admin
      .from("leads")
      .select("email, telefone")
      .eq("id", data.lead_id)
      .maybeSingle();
    if (leadRow) {
      leadEmail = typeof leadRow.email === "string" ? leadRow.email.trim().toLowerCase() : undefined;
      leadPhone = typeof leadRow.telefone === "string" ? leadRow.telefone.replace(/\D/g, "") : undefined;
    }
  }

  return {
    ok: true,
    data: {
      pedidoCodigo: String(data.pedido_codigo ?? id),
      clienteNome: String(data.cliente_nome ?? "").trim(),
      valor: Number(data.valor ?? 0),
      produto: String(data.produto ?? "").trim(),
      createdAt: new Date(String(data.created_at ?? new Date().toISOString())).toISOString(),
      leadEmail,
      leadPhone,
    },
  };
}