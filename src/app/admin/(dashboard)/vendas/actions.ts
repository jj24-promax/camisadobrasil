"use server";

import { revalidatePath } from "next/cache";

import { isAdminSessionValid } from "@/lib/admin-auth/verify-session.server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { markLeadConvertedById } from "@/lib/supabase/lead-mutations";
import { mapVendaRow } from "@/lib/supabase/mappers";
import { markPendingPixVendaPaidByPrimaryId } from "@/lib/supabase/pending-venda-pix";

/** Marca uma venda Pix pendente como paga pelo id do pedido (e tenta converter o lead ligado). */
export async function markVendaPixPaidManualAction(
  vendaId: string
): Promise<{ ok: true; leadConverted: boolean } | { ok: false; error: string }> {
  if (!(await isAdminSessionValid())) {
    return { ok: false, error: "Sessão expirada ou inválida. Entre novamente no painel." };
  }

  const vid = vendaId.trim();
  if (!vid) return { ok: false, error: "Pedido inválido." };

  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY não configurada." };

  const { data: row, error: selErr } = await admin.from("vendas").select("*").eq("id", vid).maybeSingle();
  if (selErr) return { ok: false, error: selErr.message };
  if (!row) return { ok: false, error: "Venda não encontrada." };

  const sale = mapVendaRow(row as Record<string, unknown>);
  if (sale.status !== "pendente") {
    return { ok: false, error: "Só é possível confirmar manualmente vendas ainda pendentes." };
  }
  if (sale.paymentMethod === "cartao" || sale.paymentMethod === "boleto") {
    return { ok: false, error: "Confirmação manual pelo painel aplica-se a Pix." };
  }

  const res = await markPendingPixVendaPaidByPrimaryId(vid);
  if (!res.ok) {
    return { ok: false, error: res.error ?? "Erro ao atualizar a venda." };
  }
  if (!res.updated) {
    return {
      ok: false,
      error:
        "Nenhuma linha atualizada (status no banco pode não ser `pendente` em `status_pagamento`, ou já está paga).",
    };
  }

  let leadConverted = false;
  const leadIdRaw = res.leadId;
  const leadId = leadIdRaw != null && String(leadIdRaw).trim() ? String(leadIdRaw).trim() : "";
  if (leadId) {
    const conv = await markLeadConvertedById(leadId);
    leadConverted = conv.ok;
  }

  revalidatePath("/admin/leads");
  revalidatePath("/admin/vendas");
  revalidatePath("/admin");

  return { ok: true, leadConverted };
}
