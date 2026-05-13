import "server-only";

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

/** Colunas onde o id da transação pode coincidir com `pix_gateway_payments.id_transaction` (webhook / reconciliação). */
/** Não incluir `id_transaction` aqui: muitas bases só têm `docs/supabase-vendas.sql` sem a coluna opcional. */
const VENDA_PIX_MATCH_COLS = ["pedido_codigo", "pix_id_transaction", "id_transacao_pix"] as const;

/** Filtro PostgREST seguro para `.or(...)`: valor entre aspas duplas. */
function orEqQuoted(columns: readonly string[], rawId: string): string {
  const safe = rawId.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return columns.map((c) => `${c}.eq."${safe}"`).join(",");
}

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

  // Mapeamento EXATO para as colunas da tabela "vendas"
  const row: Record<string, unknown> = {
    id,
    lead_id: p.leadId || null,
    cliente_nome: p.customerName,
    produto: line,
    valor: p.amountCents,
    status_pagamento: "pendente",
    pedido_codigo: tx,
  };
  const gw = p.gatewayPixTransactionId?.trim();
  if (gw) {
    row.pix_id_transaction = gw;
    row.id_transacao_pix = gw;
  }
  if (p.detalhesPedido != null) {
    row.detalhes_pedido = p.detalhesPedido;
  }

  const { error } = await admin.from("vendas").insert(row);
  
  if (error) {
    console.error("[pending-venda-pix] erro ao inserir:", error.message);
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

export async function markPixVendaPaidByGatewayId(
  idTransaction: string
): Promise<{ ok: boolean; updated: number; leadId?: string; leadIds?: string[]; vendaIds?: string[]; error?: string }> {
  const id = idTransaction.trim();
  if (!id) return { ok: false, updated: 0, error: "id vazio" };

  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, updated: 0, error: "SUPABASE_SERVICE_ROLE_KEY não configurada" };

  const { data, error } = await admin
    .from("vendas")
    .update({ status_pagamento: "pago" })
    .or(orEqQuoted(VENDA_PIX_MATCH_COLS, id))
    .select("id, lead_id");

  if (error) return { ok: false, updated: 0, error: error.message };
  const vendaIds = (data ?? []).map((row) => String((row as { id?: unknown }).id ?? "").trim()).filter(Boolean);
  const leadIds = [
    ...new Set(
      (data ?? [])
        .map((row) => String((row as { lead_id?: unknown }).lead_id ?? "").trim())
        .filter(Boolean)
    ),
  ];
  return {
    ok: true,
    updated: data?.length || 0,
    leadId: data?.[0]?.lead_id,
    leadIds: leadIds.length ? leadIds : undefined,
    vendaIds,
  };
}

export async function markPixVendaCanceledByGatewayId(
  idTransaction: string
): Promise<{ ok: boolean; updated: number; error?: string }> {
  const id = idTransaction.trim();
  if (!id) return { ok: false, updated: 0, error: "id vazio" };

  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, updated: 0, error: "SUPABASE_SERVICE_ROLE_KEY não configurada" };

  const { data, error } = await admin
    .from("vendas")
    .update({ status_pagamento: "cancelado" })
    .or(orEqQuoted(VENDA_PIX_MATCH_COLS, id))
    .select("id");
  
  if (error) return { ok: false, updated: 0, error: error.message };
  return { ok: true, updated: data?.length || 0 };
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