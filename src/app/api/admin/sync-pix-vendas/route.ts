import { NextResponse } from "next/server";

import { isAdminSessionValid } from "@/lib/admin-auth/verify-session.server";
import { reconcilePendingPixVendasFromGatewayStore } from "@/lib/supabase/reconcile-pix-vendas-from-gateway-store";

/**
 * POST — sessão admin obrigatória (cookie `sb-access-token`).
 * Reconcilia vendas `pendente` com `pix_gateway_payments` (vários status equivalentes a “pago”)
 * e cruza ids extraídos de `raw_payload` quando o id da linha ≠ id gravado na venda.
 * Chamada típica (painel aberto no mesmo domínio): `fetch('/api/admin/sync-pix-vendas', { method: 'POST', credentials: 'include' })`.
 */
export async function POST(req: Request) {
  if (!(await isAdminSessionValid())) {
    return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
  }

  let limit: number | undefined;
  try {
    const body = await req.json().catch(() => ({}));
    if (body && typeof body === "object" && typeof (body as { limit?: unknown }).limit === "number") {
      const n = Math.round((body as { limit: number }).limit);
      if (Number.isFinite(n)) limit = n;
    }
  } catch {
    limit = undefined;
  }

  const result = await reconcilePendingPixVendasFromGatewayStore({ limit });
  if (!result.ok) {
    return NextResponse.json(result, { status: 502 });
  }
  return NextResponse.json(result);
}
