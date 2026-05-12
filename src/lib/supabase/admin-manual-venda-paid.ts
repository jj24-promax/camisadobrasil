import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { markLeadConvertedById } from "@/lib/supabase/lead-mutations";

/**
 * Marca todas as vendas **Pix pendentes** do lead como `pago` e tenta pôr o lead em `convertido`.
 * Uso manual no admin quando o webhook não atualizou mas o pagamento já foi confirmado por fora.
 */
export async function markPendingPixVendasPaidForLeadManual(leadId: string): Promise<
  | { ok: true; updated: number; leadConverted: boolean }
  | { ok: false; updated: 0; error: string }
> {
  const id = leadId.trim();
  if (!id) return { ok: false, updated: 0, error: "Lead inválido." };

  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, updated: 0, error: "SUPABASE_SERVICE_ROLE_KEY não configurada." };

  const { data, error } = await admin
    .from("vendas")
    .update({ status_pagamento: "pago" })
    .eq("lead_id", id)
    .eq("status_pagamento", "pendente")
    .select("id");

  if (error) return { ok: false, updated: 0, error: error.message };

  const updated = data?.length ?? 0;
  if (updated === 0) {
    return { ok: false, updated: 0, error: "Nenhuma venda Pix pendente encontrada para este lead." };
  }

  const conv = await markLeadConvertedById(id);
  return { ok: true, updated, leadConverted: conv.ok };
}
