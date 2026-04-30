import "server-only";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_PUBLISHABLE_KEY } from "@/integrations/supabase/client";

export async function isAdminSessionValid(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("sb-access-token")?.value;
    
    if (!token) {
      console.warn("[AppSec] Tentativa de acesso bloqueada: Token JWT ausente.");
      return false;
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ulrigywayovxuyiktnlr.supabase.co";
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || SUPABASE_PUBLISHABLE_KEY;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) {
      console.warn("[AppSec] Tentativa de acesso bloqueada: JWT inválido ou expirado.");
      return false;
    }

    return true;
  } catch (err) {
    console.error("[AppSec] Erro interno ao validar sessão:", err);
    return false;
  }
}