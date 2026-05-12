import { NextResponse } from "next/server";

import { computeUpsellAddonCents } from "@/lib/pos-compra-upsell-pricing";
import { appendPosCompraUpsellToMainVenda } from "@/lib/supabase/append-pos-compra-snapshot";
import { insertPendingPixVenda } from "@/lib/supabase/pending-venda-pix";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const GATEWAY_TX_RE = /^[a-zA-Z0-9_.:-]{4,128}$/;

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

  const mainVendaId = isNonEmptyString(body.mainVendaId) ? body.mainVendaId.trim() : "";
  const leadId = isNonEmptyString(body.leadId) ? body.leadId.trim() : "";
  if (!UUID_RE.test(mainVendaId) || !UUID_RE.test(leadId)) {
    return NextResponse.json({ error: "Referência da venda ou lead inválida." }, { status: 400 });
  }

  const cap = body.cap === true;
  const bag = body.bag === true;
  const cup = body.cup === true;

  const expectedCents = computeUpsellAddonCents(cap, bag, cup);
  const amountCents =
    typeof body.amountCents === "number" && Number.isFinite(body.amountCents) ? Math.round(body.amountCents) : NaN;
  if (!Number.isFinite(amountCents) || amountCents !== expectedCents || amountCents <= 0 || amountCents > 1_000_000) {
    return NextResponse.json({ error: "Valor dos adicionais inválido." }, { status: 400 });
  }

  const gatewayRaw = isNonEmptyString(body.gatewayTransactionId) ? body.gatewayTransactionId.trim() : "";
  if (!GATEWAY_TX_RE.test(gatewayRaw)) {
    return NextResponse.json({ error: "ID da transação do gateway inválido." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Servidor sem acesso ao banco." }, { status: 503 });
  }

  const { data: existingRow } = await admin.from("vendas").select("id").eq("pedido_codigo", gatewayRaw).maybeSingle();
  if (existingRow && typeof (existingRow as { id?: unknown }).id === "string") {
    return NextResponse.json({ ok: true, vendaId: (existingRow as { id: string }).id });
  }

  const parts: string[] = [];
  if (cap) parts.push("Boné Alpha");
  if (bag) parts.push("Shoulder Bag");
  if (cup) parts.push("Copo Térmico");
  const productSummary = parts.length > 0 ? `Adicionais pós-compra · ${parts.join(" · ")} · Pix` : "Adicionais pós-compra · Pix";

  const upsellEntry = {
    cap,
    bag,
    cup,
    labels: parts,
    amountCents,
    pixTransactionId: gatewayRaw,
    recordedAt: new Date().toISOString(),
  };

  const merged = await appendPosCompraUpsellToMainVenda({
    mainVendaId,
    leadId,
    entry: upsellEntry,
  });
  if (!merged.ok) {
    return NextResponse.json({ error: merged.error }, { status: 400 });
  }

  const { data: leadInfo } = await admin.from("leads").select("email, telefone").eq("id", leadId).maybeSingle();
  const li = leadInfo as { email?: unknown; telefone?: unknown } | null;
  const customerEmail =
    li && typeof li.email === "string" && li.email.trim() ? li.email.trim().toLowerCase() : undefined;
  const customerPhone =
    li && typeof li.telefone === "string" && li.telefone.trim() ? li.telefone.trim().replace(/\D/g, "") : undefined;

  const venda = await insertPendingPixVenda({
    leadId,
    customerName: "Pós-compra (adicionais)",
    customerEmail,
    customerPhone,
    amountCents,
    productSummary,
    idTransaction: gatewayRaw,
    gatewayPixTransactionId: gatewayRaw,
  });

  if (!venda.ok) {
    return NextResponse.json({ error: venda.error }, { status: 502 });
  }

  return NextResponse.json({ ok: true, vendaId: venda.id });
}
