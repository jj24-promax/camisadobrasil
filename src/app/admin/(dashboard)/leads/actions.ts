"use server";

import { revalidatePath } from "next/cache";

import { isAdminSessionValid } from "@/lib/admin-auth/verify-session.server";
import {
  regenerateRoyalPixForLeadAdmin,
  syncLeadPendingVendaPedidoCodigoToGateway,
} from "@/lib/supabase/admin-pix-regenerate";
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
