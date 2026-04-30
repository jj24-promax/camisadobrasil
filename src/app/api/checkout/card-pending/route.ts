import { NextResponse } from "next/server";

import { PRODUCT } from "@/lib/product";
import { insertCheckoutLead } from "@/lib/supabase/insert-lead-from-checkout";
import { insertPendingCardVenda } from "@/lib/supabase/pending-venda-card";
import { generateMockTrackingCode } from "@/lib/tracking-utils";

const FORBIDDEN_BODY_KEYS = new Set(
  ["cvv", "cardcvv", "card_cvv", "cvc", "cardnumber", "card_number", "pan", "full_card", "numero_cartao"].map((k) =>
    k.toLowerCase()
  )
);

function badKeys(body: Record<string, unknown>): string[] {
  return Object.keys(body).filter((k) => FORBIDDEN_BODY_KEYS.has(k.toLowerCase()));
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function validExpiry(s: string): boolean {
  return /^\d{2}\/\d{2}$/.test(s);
}

export async function POST(req: Request) {
  // AppSec: Prevenção contra Cross-Site Request Forgery (CSRF) e SPAM via botnets
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

  const forbidden = badKeys(body);
  if (forbidden.length > 0) {
    return NextResponse.json(
      {
        error:
          "Não envie número completo do cartão nem CVV. O servidor só aceita últimos 4 dígitos e dados não sensíveis.",
      },
      { status: 400 }
    );
  }

  const name = isNonEmptyString(body.name) ? body.name.trim() : "";
  const email = isNonEmptyString(body.email) ? body.email.trim().toLowerCase() : "";
  const confirmEmail = isNonEmptyString(body.confirmEmail) ? body.confirmEmail.trim().toLowerCase() : "";
  const phone = isNonEmptyString(body.phone) ? body.phone.trim() : "";
  const cpf = isNonEmptyString(body.cpf) ? body.cpf.trim() : "";
  const cardLast4 = isNonEmptyString(body.cardLast4) ? body.cardLast4.trim() : "";
  const cardExpiry = isNonEmptyString(body.cardExpiry) ? body.cardExpiry.trim() : "";
  const cardholderName = isNonEmptyString(body.cardholderName) ? body.cardholderName.trim() : "";
  const amountCents = typeof body.amountCents === "number" && Number.isFinite(body.amountCents) ? Math.round(body.amountCents) : NaN;
  const quantity = typeof body.quantity === "number" && body.quantity > 0 ? Math.floor(body.quantity) : 1;

  const cep = isNonEmptyString(body.cep) ? body.cep.replace(/\D/g, "") : "";
  const endereco = isNonEmptyString(body.endereco) ? body.endereco.trim() : "";
  const numero = isNonEmptyString(body.numero) ? body.numero.trim() : "";
  const complemento = isNonEmptyString(body.complemento) ? body.complemento.trim() : "";
  const bairro = isNonEmptyString(body.bairro) ? body.bairro.trim() : "";
  const cidade = isNonEmptyString(body.cidade) ? body.cidade.trim() : "";
  const estado = isNonEmptyString(body.estado) ? body.estado.replace(/\s/g, "").toUpperCase() : "";

  if (cep.length !== 8) return NextResponse.json({ error: "CEP deve ter 8 dígitos." }, { status: 400 });
  if (!endereco || !numero || !bairro || !cidade) return NextResponse.json({ error: "Preencha endereço, número, bairro e cidade." }, { status: 400 });
  if (estado.length !== 2 || !/^[A-Z]{2}$/.test(estado)) return NextResponse.json({ error: "Estado (UF) inválido — use 2 letras." }, { status: 400 });

  const shippingSummary = `${cep.slice(0, 5)}-${cep.slice(5)} · ${endereco}, ${numero}${complemento ? ` — ${complemento}` : ""} · ${bairro} · ${cidade}/${estado}`;

  if (!name || !email || !phone || !cpf) return NextResponse.json({ error: "Preencha nome, e-mail, telefone e CPF/CNPJ." }, { status: 400 });
  if (email !== confirmEmail) return NextResponse.json({ error: "Os e-mails não coincidem." }, { status: 400 });
  
  const docDigits = cpf.replace(/\D/g, "");
  if (docDigits.length !== 11 && docDigits.length !== 14) return NextResponse.json({ error: "CPF ou CNPJ inválido." }, { status: 400 });
  
  const phoneDigits = phone.replace(/\D/g, "");
  if (phoneDigits.length < 10) return NextResponse.json({ error: "Telefone inválido." }, { status: 400 });
  if (!/^\d{4}$/.test(cardLast4)) return NextResponse.json({ error: "Informe apenas os últimos 4 dígitos do cartão." }, { status: 400 });
  if (!validExpiry(cardExpiry)) return NextResponse.json({ error: "Validade inválida (use MM/AA)." }, { status: 400 });
  if (!cardholderName) return NextResponse.json({ error: "Informe o nome no cartão." }, { status: 400 });
  
  // AppSec: Trava financeira (Price Floor) para evitar manipulação client-side do valor cobrado
  if (!Number.isFinite(amountCents) || amountCents < 4750 || amountCents > 50_000_000) {
    return NextResponse.json({ error: "Valor do pedido adulterado ou inválido. Transação bloqueada." }, { status: 400 });
  }

  const productSummary = `${PRODUCT.name} (${quantity} un.)`;
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
    console.warn("[checkout/card-pending] lead não gravado:", lead.error);
  }

  const result = await insertPendingCardVenda({
    leadId,
    customerName: name,
    amountCents,
    productSummary: `${productSummary} · Cartão ****${cardLast4}`,
    shippingSummary,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  return NextResponse.json({ ok: true, id: result.id, trackingCode });
}