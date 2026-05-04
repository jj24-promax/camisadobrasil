"use server";

import { revalidatePath } from "next/cache";

import { isAdminSessionValid } from "@/lib/admin-auth/verify-session.server";
import { prepareAdminRegeneratePixForLead, type MangofyRegenPayload } from "@/lib/supabase/admin-pix-regenerate";
import { updateLeadStatus, deleteLeadAndRelatedData } from "@/lib/supabase/lead-mutations";
import type { LeadStatus } from "@/types/admin";

export type PrepareRegeneratePixActionResult =
  | { ok: true; orderRef: string; mangofyPayload: MangofyRegenPayload }
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
    // Revalida a página de leads, de vendas e o dashboard
    revalidatePath("/admin/leads");
    revalidatePath("/admin/vendas");
    revalidatePath("/admin");
  }
  return result;
}

/** Atualiza a venda pendente com nova referência e devolve o payload para o SDK Mangofy no browser. */
export async function prepareRegeneratePixAction(leadId: string): Promise<PrepareRegeneratePixActionResult> {
  if (!(await isAdminSessionValid())) {
    return { ok: false, error: "Sessão expirada ou inválida. Entre novamente no painel." };
  }
  return prepareAdminRegeneratePixForLead(leadId);
}