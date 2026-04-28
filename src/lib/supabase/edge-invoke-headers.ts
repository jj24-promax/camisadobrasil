import { SUPABASE_PUBLISHABLE_KEY } from "@/integrations/supabase/client";

/** Evita usar NEXT_PUBLIC_SUPABASE_ANON_KEY truncada/errada (comum na Vercel/.env) → Invalid JWT. */
function resolveAnonKey(): string {
  const env = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const fb = SUPABASE_PUBLISHABLE_KEY;
  if (!env) return fb;
  const looksJwt = env.startsWith("eyJ") && env.includes(".") && env.split(".").length === 3 && env.length >= 120;
  return looksJwt ? env : fb;
}

/**
 * Headers para invocar Edge Functions do Supabase no browser (JWT anon).
 * Sem isto o gateway devolve Missing authorization / Invalid JWT.
 */
export function supabaseEdgeInvokeHeaders(jsonBody = true): HeadersInit {
  const key = resolveAnonKey();
  const headers: Record<string, string> = {};
  if (jsonBody) headers["Content-Type"] = "application/json";
  headers.Authorization = `Bearer ${key}`;
  headers.apikey = key;
  return headers;
}
