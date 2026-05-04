import { NextResponse } from "next/server";

import { PRODUCT } from "@/lib/product";
import { insertCheckoutLead } from "@/lib/supabase/insert-lead-from-checkout";
import { insertPendingPixVenda } from "@/lib/supabase/pending-venda-pix";
import { generateMockTrackingCode } from "@/lib/tracking-utils";

/** Referência gerada no browser (`crypto.randomUUID`) ou fallback alfanumérico curto. */
const ORDER_REF_RE = /^[a-zA-Z0-9_-]{8,80}$/;

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

  const orderRef = isNonEmptyString(body.orderRef) ? body.orderRef.trim() : "";
  if (!orderRef || !ORDER_REF_RE.test(orderRef)) {
    return NextResponse.json({ error: "Referência do pedido inválida." }, { status: 400 });
  }

  const amountCents = typeof body.amountCents === "number" && Number.isFinite(body.amountCents) ? Math.round(body.amountCents) : NaN;
  const quantity = typeof body.quantity === "number" && body.quantity > 0 ? Math.floor(body.quantity) : 1;

  if (!Number.isFinite(amountCents) || amountCents < 4750 || amountCents > 50_000_000) {
    return NextResponse.json({ error: "Valor do pedido adulterado ou inválido. Transação bloqueada." }, { status: 400 });
  }

  const name = isNonEmptyString(body.name) ? body.name.trim() : "";
  const email = isNonEmptyString(body.email) ? body.email.trim().toLowerCase() : "";
  const confirmEmail = isNonEmptyString(body.confirmEmail) ? body.confirmEmail.trim().toLowerCase() : "";
  const phone = isNonEmptyString(body.phone) ? body.phone.trim() : "";
  const cpf = isNonEmptyString(body.cpf) ? body.cpf.trim() : "";

  const cep = isNonEmptyString(body.cep) ? body.cep.replace(/\D/g, "") : "";
  const endereco = isNonEmptyString(body.endereco) ? body.endereco.trim() : "";
  const numero = isNonEmptyString(body.numero) ? body.numero.trim() : "";
  const complemento = isNonEmptyString(body.complemento) ? body.complemento.trim() : "";
  const bairro = isNonEmptyString(body.bairro) ? body.bairro.trim() : "";
  const cidade = isNonEmptyString(body.cidade) ? body.cidade.trim() : "";
  const estado = isNonEmptyString(body.estado) ? body.estado.replace(/\s/g, "").toUpperCase() : "";

  if (cep.length !== 8) return NextResponse.json({ error: "CEP deve ter 8 dígitos." }, { status: 400 });
  if (!endereco || !numero || !bairro || !cidade) {
    return NextResponse.json({ error: "Preencha endereço, número, bairro e cidade." }, { status: 400 });
  }
  if (estado.length !== 2 || !/^[A-Z]{2}$/.test(estado)) {
    return NextResponse.json({ error: "Estado (UF) inválido — use 2 letras." }, { status: 400 });
  }

  if (!name || !email || !phone || !cpf) {
    return NextResponse.json({ error: "Preencha nome, e-mail, telefone e CPF/CNPJ." }, { status: 400 });
  }
  if (email !== confirmEmail) {
    return NextResponse.json({ error: "Os e-mails não coincidem." }, { status: 400 });
  }

  const docDigits = cpf.replace(/\D/g, "");
  if (docDigits.length !== 11 && docDigits.length !== 14) {
    return NextResponse.json({ error: "CPF ou CNPJ inválido." }, { status: 400 });
  }

  const phoneDigits = phone.replace(/\D/g, "");
  if (phoneDigits.length < 10) {
    return NextResponse.json({ error: "Telefone inválido." }, { status: 400 });
  }

  const shippingSummary = `${cep.slice(0, 5)}-${cep.slice(5)} · ${endereco}, ${numero}${complemento ? ` — ${complemento}` : ""} · ${bairro} · ${cidade}/${estado}`;
  const productSummary = `${PRODUCT.name} (${quantity} un.) · Pix Mangofy`;

  const leadId = crypto.randomUUID();
  const trackingCode = generateMockTrackingCode();

  const lead = await insertCheckoutLead({
    id: leadId,
    name,
    email,
    phoneDigits,
    city: cidade,
    state: estado,
    productInterest: productSummary,
    source: "site",
    status: "em_contato",
    cpf: docDigits,
    cep,
    address: endereco,
    number: numero,
    complement: complemento,
    neighborhood: bairro,
    trackingCode,
  });

  if (!lead.ok) {
    console.warn("[checkout/pix-record] lead não gravado:", lead.error);
  }

  const venda = await insertPendingPixVenda({
    leadId,
    customerName: name,
    amountCents,
    productSummary,
    idTransaction: orderRef,
    shippingSummary,
  });

  if (!venda.ok) {
    return NextResponse.json({ error: venda.error }, { status: 502 });
  }

  return NextResponse.json({ ok: true, leadId, vendaId: venda.id });
}
