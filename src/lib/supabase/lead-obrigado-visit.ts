import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Primeira visita à página de obrigado: grava `obrigado_em` (idempotente).
 * Exige e-mail igual ao do lead (defesa básica contra marcação arbitrária de IDs).
 */
export async function markLeadObrigadoVisit(input: {
  leadId: string;
  email: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const leadId = input.leadId.trim();
  const email = input.email.trim().toLowerCase();
  if (!UUID_RE.test(leadId)) {
    return { ok: false, error: "leadId inválido." };
  }
  if (!email || !email.includes("@")) {
    return { ok: false, error: "E-mail inválido." };
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY não configurada." };
  }

  const { data: row, error: readErr } = await admin
    .from("leads")
    .select("id, email, obrigado_em")
    .eq("id", leadId)
    .maybeSingle();
  if (readErr) return { ok: false, error: readErr.message };
  if (!row) return { ok: false, error: "Lead não encontrado." };

  const rowRec = row as Record<string, unknown>;
  const rowEmail = String(rowRec.email ?? "")
    .trim()
    .toLowerCase();
  if (rowEmail !== email) {
    return { ok: false, error: "E-mail não confere com o lead." };
  }

  const existingObrigado = rowRec.obrigado_em;
  if (existingObrigado != null && String(existingObrigado).trim() !== "") {
    return { ok: true };
  }

  const now = new Date().toISOString();
  const { error: updErr } = await admin.from("leads").update({ obrigado_em: now }).eq("id", leadId);

  if (updErr) {
    return { ok: false, error: updErr.message };
  }

  return { ok: true };
}
