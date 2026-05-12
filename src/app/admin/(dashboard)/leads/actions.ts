"use server";

import { revalidatePath } from "next/cache";

import { isAdminSessionValid } from "@/lib/admin-auth/verify-session.server";
import {
  regenerateRoyalPixForLeadAdmin,
  syncLeadPendingVendaPedidoCodigoToGateway,
} from "@/lib/supabase/admin-pix-regenerate";
import { markPendingPixVendasPaidForLeadManual } from "@/lib/supabase/admin-manual-venda-paid";
import { reconcilePendingPixVendasFromGatewayStore } from "@/lib/supabase/reconcile-pix-vendas-from-gateway-store";
import { updateLeadStatus, deleteLeadAndRelatedData } from "@/lib/supabase/lead-mutations";
import type { LeadStatus } from "@/types/admin";

export type RegenerateRoyalPixActionResult =
  | { ok: true; paymentCode: string; paymentCodeBase64: string; gatewayTransactionId: string }
  | { ok: false; error: string };

export type UpdateLeadStatusActionResult = { ok: true } | { ok: false; error: string };

export async function updateLeadStatusAction(
  leadId: string,
  status: LeadStatus
): Promise<UpdateLeadStatusActionResult> {
  if (!(await isAdminSessionValid())) {
    return { ok: false, error: "Sessão expirada ou inválida. Entre novamente no painel." };
  }

  const result = await updateLeadStatus(leadId, status);
  if (result.ok) {
    revalidatePath("/admin/leads");
    revalidatePath("/admin");
  }
  return result;
}

export async function deleteLeadAction(leadId: string): Promise<{ ok: boolean; error?: string }> {
  if (!(await isAdminSessionValid())) {
    return { ok: false, error: "Sessão expirada ou inválida. Entre novamente no painel." };
  }

  const result = await deleteLeadAndRelatedData(leadId);
  if (result.ok) {
    revalidatePath("/admin/leads");
    revalidatePath("/admin/vendas");
    revalidatePath("/admin");
  }
  return result;
}

/** Gera Pix na Royal Banking no servidor e associa à venda pendente do lead. */
export async function regenerateRoyalPixAction(leadId: string): Promise<RegenerateRoyalPixActionResult> {
  if (!(await isAdminSessionValid())) {
    return { ok: false, error: "Sessão expirada ou inválida. Entre novamente no painel." };
  }
  return regenerateRoyalPixForLeadAdmin(leadId);
}

export async function syncPendingVendaGatewayIdAction(
  leadId: string,
  gatewayTransactionId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await isAdminSessionValid())) {
    return { ok: false, error: "Sessão expirada ou inválida. Entre novamente no painel." };
  }
  return syncLeadPendingVendaPedidoCodigoToGateway(leadId, gatewayTransactionId);
}

/** Cruza vendas pendentes com `pix_gateway_payments` (status pago) e atualiza vendas/leads. */
export async function reconcilePixVendasAction(): Promise<
  | {
      ok: true;
      scanned: number;
      vendaUpdates: number;
      leadsConverted: number;
      paidIdsMatched: number;
      paidRowsAnalyzed: number;
      expandedPaidIdCount: number;
      transactionMatches: number;
      fingerprintMatches: number;
      paidRowsWithoutPendingVenda: number;
      pendingVendasStillUnpaid: number;
    }
  | { ok: false; error: string }
> {
  if (!(await isAdminSessionValid())) {
    return { ok: false, error: "Sessão expirada ou inválida. Entre novamente no painel." };
  }

  const res = await reconcilePendingPixVendasFromGatewayStore();
  if (!res.ok) {
    return {
      ok: false,
      error:
        res.error ??
        "Erro ao sincronizar com gateway Pix. Verifique as credenciais, webhook ou permissões do Supabase.",
    };
  }

  revalidatePath("/admin/leads");
  revalidatePath("/admin/vendas");
  revalidatePath("/admin");

  return {
    ok: true,
    scanned: res.scanned,
    vendaUpdates: res.vendaUpdates,
    leadsConverted: res.leadsConverted,
    paidIdsMatched: res.paidIdsMatched,
    paidRowsAnalyzed: res.paidRowsAnalyzed,
    expandedPaidIdCount: res.expandedPaidIdCount,
    transactionMatches: res.transactionMatches,
    fingerprintMatches: res.fingerprintMatches,
    paidRowsWithoutPendingVenda: res.paidRowsWithoutPendingVenda,
    pendingVendasStillUnpaid: res.pendingVendasStillUnpaid,
  };
}

/** Marca manualmente todas as vendas Pix pendentes do lead como pagas (e lead convertido). */
export async function markLeadPixPaidManualAction(
  leadId: string
): Promise<{ ok: true; updated: number; leadConverted: boolean } | { ok: false; error: string }> {
  if (!(await isAdminSessionValid())) {
    return { ok: false, error: "Sessão expirada ou inválida. Entre novamente no painel." };
  }

  const res = await markPendingPixVendasPaidForLeadManual(leadId);
  if (!res.ok) {
    return { ok: false, error: res.error };
  }

  revalidatePath("/admin/leads");
  revalidatePath("/admin/vendas");
  revalidatePath("/admin");

  return { ok: true, updated: res.updated, leadConverted: res.leadConverted };
}
