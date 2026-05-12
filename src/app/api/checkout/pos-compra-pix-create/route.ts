import { NextResponse } from "next/server";

import { computeUpsellAddonCents } from "@/lib/pos-compra-upsell-pricing";
import { createRoyalBankingPixCashIn } from "@/lib/royal-banking-pix.server";
import { appendPosCompraUpsellToMainVenda } from "@/lib/supabase/append-pos-compra-snapshot";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { insertPendingPixVenda } from "@/lib/supabase/pending-venda-pix";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function pick(r: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) {
    const v = r[k];
    if (v != null && v !== "") return v;
  }
  return undefined;
}

function str(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
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

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Servidor sem acesso ao banco." }, { status: 503 });
  }

  const { data: vendaRow, error: vErr } = await admin
    .from("vendas")
    .select("id, lead_id")
    .eq("id", mainVendaId)
    .maybeSingle();

  if (vErr) return NextResponse.json({ error: vErr.message }, { status: 502 });
  if (!vendaRow || str((vendaRow as { lead_id?: unknown }).lead_id) !== leadId) {
    return NextResponse.json({ error: "Venda principal não encontrada ou não pertence a este lead." }, { status: 400 });
  }

  const { data: leadRow, error: lErr } = await admin.from("leads").select("*").eq("id", leadId).maybeSingle();
  if (lErr) return NextResponse.json({ error: lErr.message }, { status: 502 });
  if (!leadRow) return NextResponse.json({ error: "Lead não encontrado." }, { status: 404 });

  const lr = leadRow as Record<string, unknown>;
  const nome = str(pick(lr, ["nome", "name"]));
  const email = str(pick(lr, ["email", "e_mail"])).toLowerCase();
  const telefone = str(pick(lr, ["telefone", "phone"])).replace(/\D/g, "");
  const cpfRaw = str(pick(lr, ["cpf", "documento"])).replace(/\D/g, "");

  if (!nome || !email || !telefone) {
    return NextResponse.json({ error: "Lead sem nome, e-mail ou telefone." }, { status: 400 });
  }
  if (cpfRaw.length !== 11 && cpfRaw.length !== 14) {
    return NextResponse.json({ error: "CPF/CNPJ inválido no lead." }, { status: 400 });
  }

  const amountBrl = Number((amountCents / 100).toFixed(2));
  const royal = await createRoyalBankingPixCashIn({
    amountBrl,
    client: {
      name: nome,
      documentDigits: cpfRaw,
      telefoneDigits: telefone,
      email,
    },
  });

  if (!royal.ok) {
    return NextResponse.json({ error: royal.message }, { status: royal.status >= 400 && royal.status < 600 ? royal.status : 502 });
  }

  const gatewayRaw = royal.idTransaction.trim();

  const { data: existingRow } = await admin.from("vendas").select("id").eq("pedido_codigo", gatewayRaw).maybeSingle();
  if (existingRow && typeof (existingRow as { id?: unknown }).id === "string") {
    return NextResponse.json({
      ok: true,
      vendaId: (existingRow as { id: string }).id,
      gatewayTransactionId: gatewayRaw,
      paymentCode: royal.paymentCode,
      paymentCodeBase64: royal.paymentCodeBase64,
    });
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

  const venda = await insertPendingPixVenda({
    leadId,
    customerName: "Pós-compra (adicionais)",
    customerEmail: email,
    customerPhone: telefone,
    amountCents,
    productSummary,
    idTransaction: gatewayRaw,
    gatewayPixTransactionId: gatewayRaw,
  });

  if (!venda.ok) {
    return NextResponse.json({ error: venda.error }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    vendaId: venda.id,
    gatewayTransactionId: gatewayRaw,
    paymentCode: royal.paymentCode,
    paymentCodeBase64: royal.paymentCodeBase64,
  });
}
