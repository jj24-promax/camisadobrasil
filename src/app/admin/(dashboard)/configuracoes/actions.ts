"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { revalidatePath } from "next/cache";
import { isAdminSessionValid } from "@/lib/admin-auth/verify-session.server";

export async function updateStoreSettings(prevState: any, formData: FormData) {
  if (!(await isAdminSessionValid())) {
    return { error: "Acesso negado: Sessão de administrador inválida ou expirada.", success: false };
  }

  const tracking_link = String(formData.get("tracking_link") || "").trim();
  const whatsapp = String(formData.get("whatsapp") || "").trim();
  const contact_email = String(formData.get("contact_email") || "").trim();

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return { error: "Erro: SUPABASE_SERVICE_ROLE_KEY ausente no servidor.", success: false };
  }

  const { error } = await admin.from("store_settings").upsert({
    id: 1,
    tracking_link,
    whatsapp,
    contact_email,
    updated_at: new Date().toISOString()
  }, { onConflict: "id" });

  if (error) {
    return { error: `Erro ao salvar no Supabase: ${error.message}`, success: false };
  }

  // Força o Next.js a atualizar a cache destas páginas para refletir o novo link imediatamente
  revalidatePath("/admin/configuracoes");
  revalidatePath("/pos-compra/obrigado");
  
  return { success: true, message: "Configurações salvas com sucesso!" };
}