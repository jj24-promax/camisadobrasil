import { SUPABASE_PUBLISHABLE_KEY } from "@/integrations/supabase/client";

/**
 * Headers para invocar Edge Functions do Supabase no browser (JWT anon).
 * Sem isto o gateway devolve Missing authorization / Invalid JWT.
 */
export function supabaseEdgeInvokeHeaders(jsonBody = true): HeadersInit {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || SUPABASE_PUBLISHABLE_KEY;
  const headers: Record<string, string> = {};
  if (jsonBody) headers["Content-Type"] = "application/json";
  headers.Authorization = `Bearer ${key}`;
  headers.apikey = key;
  return headers;
}
