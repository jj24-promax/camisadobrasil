import "server-only";

import { getMinCheckoutAmountCents } from "@/lib/checkout-min-amount-cents";
import { PRODUCT } from "@/lib/product";
import { createRoyalBankingPixCashIn } from "@/lib/royal-banking-pix.server";
import { orderStatusFromVendaRow } from "@/lib/normalize-payment-order-status";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { insertPendingPixVenda } from "@/lib/supabase/pending-venda-pix";
import type { OrderCheckoutSnapshotV1 } from "@/types/order-snapshot";

function pick(r: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) {
    const v = r[k];
    if (v != null && v !== "") return v;
  }
  return undefined;
}

function str(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

function vendaTimestampMs(row: Record<string, unknown>): number {
  const raw = pick(row, ["created_at", "date", "criado_em"]);
  const d = raw ? new Date(String(raw)) : new Date(0);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

/**
 * Gera novo Pix na Royal Banking (servidor) e associa à venda pendente mais recente do lead.
 * Se não houver pendente, cria uma nova venda (último valor do lead ou preço do site) e liga o ID do gateway.
 */
export async function regenerateRoyalPixForLeadAdmin(
  leadId: string
): Promise<
  | { ok: true; paymentCode: string; paymentCodeBase64: string; gatewayTransactionId: string }
  | { ok: false; error: string }
> {
  const id = leadId.trim();
  if (!id) return { ok: false, error: "Lead inválido." };

  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY não configurada." };

  const { data: leadRow, error: leadErr } = await admin.from("leads").select("*").eq("id", id).maybeSingle();
  if (leadErr) return { ok: false, error: leadErr.message };
  if (!leadRow) return { ok: false, error: "Lead não encontrado." };

  const lr = leadRow as Record<string, unknown>;
  const nome = str(pick(lr, ["nome", "name"]));
  const email = str(pick(lr, ["email", "e_mail"])).toLowerCase();
  const telefone = str(pick(lr, ["telefone", "phone"])).replace(/\D/g, "");
  const cpfRaw = str(pick(lr, ["cpf", "documento"])).replace(/\D/g, "");

  if (!nome || !email || !telefone) {
    return { ok: false, error: "Lead sem nome, e-mail ou telefone." };
  }
  if (cpfRaw.length !== 11 && cpfRaw.length !== 14) {
    return { ok: false, error: "CPF/CNPJ ausente ou inválido neste lead." };
  }

  const { data: vendasRows, error: vErr } = await admin.from("vendas").select("*").eq("lead_id", id);

  if (vErr) return { ok: false, error: vErr.message };

  const all = vendasRows ?? [];
  const pending = all.filter((row) => orderStatusFromVendaRow(row as Record<string, unknown>) === "pendente");

  let amountCents: number;
  if (pending.length > 0) {
    pending.sort((a, b) => vendaTimestampMs(b as Record<string, unknown>) - vendaTimestampMs(a as Record<string, unknown>));
    amountCents = Math.round(Number((pending[0] as { valor?: unknown }).valor ?? 0));
  } else {
    const sorted = [...all].sort(
      (a, b) => vendaTimestampMs(b as Record<string, unknown>) - vendaTimestampMs(a as Record<string, unknown>)
    );
    const last = sorted[0] as Record<string, unknown> | undefined;
    if (last) {
      const ref = `regen-${crypto.randomUUID()}`;
      const prevValor = Math.round(Number(last.valor ?? 0));
      const productLine = str(last.produto);
      const productSummary =
        (productLine ? productLine.split(" · Pix")[0]?.trim() : "") || `${PRODUCT.name} (1 un.)`;
      const det = last.detalhes_pedido;
      const detalhesPedido =
        det != null && typeof det === "object" && !Array.isArray(det) ? (det as OrderCheckoutSnapshotV1) : null;
      const ins = await insertPendingPixVenda({
        leadId: id,
        customerName: nome,
        amountCents: prevValor > 0 ? prevValor : PRODUCT.priceCents,
        productSummary,
        idTransaction: ref,
        detalhesPedido,
      });
      if (!ins.ok) return { ok: false, error: ins.error };
      amountCents = prevValor > 0 ? prevValor : PRODUCT.priceCents;
    } else {
      const ref = `regen-${crypto.randomUUID()}`;
      const ins = await insertPendingPixVenda({
        leadId: id,
        customerName: nome,
        amountCents: PRODUCT.priceCents,
        productSummary: `${PRODUCT.name} (1 un.)`,
        idTransaction: ref,
      });
      if (!ins.ok) return { ok: false, error: ins.error };
      amountCents = PRODUCT.priceCents;
    }
  }
  const minCents = getMinCheckoutAmountCents();
  if (!Number.isFinite(amountCents) || amountCents < minCents || amountCents > 50_000_000) {
    return { ok: false, error: "Valor da venda pendente inválido." };
  }

  const amountBrl = Number((amountCents / 100).toFixed(2));
  const royal = await createRoyalBankingPixCashIn({
    amountBrl,
    client: {
      name: nome,
      documentDigits: cpfRaw,
      telefoneDigits: telefone,
      email,
    },
  });

  if (!royal.ok) {
    return { ok: false, error: royal.message };
  }

  const sync = await syncLeadPendingVendaPedidoCodigoToGateway(id, royal.idTransaction);
  if (!sync.ok) {
    return { ok: false, error: `Pix gerado, mas falhou ao associar à venda: ${sync.error}` };
  }

  return {
    ok: true,
    paymentCode: royal.paymentCode,
    paymentCodeBase64: royal.paymentCodeBase64,
    gatewayTransactionId: royal.idTransaction,
  };
}

const GW_ID_RE = /^[a-zA-Z0-9_.:-]{4,128}$/;

/**
 * Após gerar Pix no servidor, grava o `pedido_codigo` com o ID do gateway para o webhook marcar pago.
 */
export async function syncLeadPendingVendaPedidoCodigoToGateway(
  leadId: string,
  gatewayTransactionId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const lid = leadId.trim();
  const gw = gatewayTransactionId.trim();
  if (!lid || !GW_ID_RE.test(gw)) return { ok: false, error: "ID de transação do gateway inválido." };

  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY não configurada." };

  const { data: allRows, error: selErr } = await admin
    .from("vendas")
    .select("id, created_at, status_pagamento")
    .eq("lead_id", lid);

  if (selErr) return { ok: false, error: selErr.message };
  const pending = (allRows ?? []).filter((row) => orderStatusFromVendaRow(row as Record<string, unknown>) === "pendente");
  if (pending.length === 0) return { ok: false, error: "Nenhuma venda pendente para este lead." };

  const ts = (r: Record<string, unknown>) => {
    const raw = r.created_at;
    const t = raw ? new Date(String(raw)).getTime() : 0;
    return Number.isNaN(t) ? 0 : t;
  };
  const sorted = [...(pending as Record<string, unknown>[])].sort((a, b) => ts(b) - ts(a));
  const vendaId = str(pick(sorted[0]!, ["id"]));
  if (!vendaId) return { ok: false, error: "ID da venda inválido." };

  const { error: updErr } = await admin
    .from("vendas")
    .update({ pedido_codigo: gw, pix_id_transaction: gw, id_transacao_pix: gw })
    .eq("id", vendaId);

  if (updErr) return { ok: false, error: updErr.message };
  return { ok: true };
}
