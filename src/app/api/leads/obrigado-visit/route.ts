import { NextResponse } from "next/server";

import { markLeadObrigadoVisit } from "@/lib/supabase/lead-obrigado-visit";

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

export async function POST(req: Request) {
  const fetchSite = req.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") {
    return NextResponse.json({ error: "Acesso bloqueado por política de segurança (CORS/CSRF)." }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const leadId = isNonEmptyString(body.leadId) ? body.leadId.trim() : "";
  const email = isNonEmptyString(body.email) ? body.email.trim().toLowerCase() : "";

  const result = await markLeadObrigadoVisit({ leadId, email });
  if (!result.ok) {
    const soft = result.error.includes("não confere") || result.error === "Lead não encontrado.";
    return NextResponse.json({ ok: false, error: result.error }, { status: soft ? 400 : 502 });
  }

  return NextResponse.json({ ok: true });
}
