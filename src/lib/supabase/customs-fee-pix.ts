import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";

/** Marca taxa alfandegária como paga quando o webhook confirma o `pedido_codigo` do Pix gerado no rastreio. */
export async function markCustomsFeePixPaidByGatewayId(
  idTransaction: string
): Promise<{ ok: boolean; updated: number; error?: string }> {
  const id = idTransaction.trim();
  if (!id) return { ok: false, updated: 0, error: "id vazio" };

  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, updated: 0, error: "SUPABASE_SERVICE_ROLE_KEY não configurada" };

  const paidAt = new Date().toISOString();
  const { data, error } = await admin
    .from("customs_fee_pix")
    .update({ paid_at: paidAt })
    .eq("pedido_codigo", id)
    .select("codigo_rastreio");

  if (error) return { ok: false, updated: 0, error: error.message };
  return { ok: true, updated: data?.length ?? 0 };
}
