import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";
import type { OrderCheckoutSnapshotV1, PosCompraUpsellSnapshot } from "@/types/order-snapshot";
import { isOrderCheckoutSnapshotV1 } from "@/types/order-snapshot";

/**
 * Anexa um upsell de pós-compra ao JSON da venda principal (mesmo pedido no painel).
 */
export async function appendPosCompraUpsellToMainVenda(input: {
  mainVendaId: string;
  leadId: string;
  entry: PosCompraUpsellSnapshot;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY não configurada." };
  }

  const vid = input.mainVendaId.trim();
  const lid = input.leadId.trim();
  if (!vid || !lid) {
    return { ok: false, error: "IDs inválidos." };
  }

  const { data: row, error: readErr } = await admin
    .from("vendas")
    .select("id, lead_id, detalhes_pedido")
    .eq("id", vid)
    .maybeSingle();

  if (readErr) return { ok: false, error: readErr.message };
  if (!row) return { ok: false, error: "Venda principal não encontrada." };

  const rowLead = String((row as Record<string, unknown>).lead_id ?? "").trim();
  if (rowLead !== lid) {
    return { ok: false, error: "Lead não corresponde à venda." };
  }

  const details = (row as Record<string, unknown>).detalhes_pedido;
  if (!isOrderCheckoutSnapshotV1(details)) {
    return { ok: false, error: "Venda principal não possui detalhes do checkout gravados." };
  }
  const base = details;

  if (base.posCompraUpsells.some((u) => u.pixTransactionId === input.entry.pixTransactionId)) {
    return { ok: true };
  }

  const next: OrderCheckoutSnapshotV1 = {
    ...base,
    posCompraUpsells: [...base.posCompraUpsells, input.entry].slice(0, 16),
  };

  const { error: updErr } = await admin.from("vendas").update({ detalhes_pedido: next }).eq("id", vid);

  if (updErr) return { ok: false, error: updErr.message };
  return { ok: true };
}
