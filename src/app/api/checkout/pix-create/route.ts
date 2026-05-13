import { NextResponse } from "next/server";

import { getMinCheckoutAmountCents } from "@/lib/checkout-min-amount-cents";
import { PRODUCT } from "@/lib/product";
import { extractPixEmvCorrelationIds } from "@/lib/pix-emv-correlation";
import { createRoyalBankingPixCashIn, getRoyalBankingPixCallbackUrl, listRoyalBankingPixWebhookUrlCandidates } from "@/lib/royal-banking-pix.server";
import { insertCheckoutLead } from "@/lib/supabase/insert-lead-from-checkout";
import { insertPendingPixVenda } from "@/lib/supabase/pending-venda-pix";
import { generateMockTrackingCode } from "@/lib/tracking-utils";
import { parseOrderCheckoutSnapshotFromApi } from "@/types/order-snapshot";

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

  const amountCents = typeof body.amountCents === "number" && Number.isFinite(body.amountCents) ? Math.round(body.amountCents) : NaN;
  const quantity = typeof body.quantity === "number" && body.quantity > 0 ? Math.floor(body.quantity) : 1;

  const minCents = getMinCheckoutAmountCents();
  if (!Number.isFinite(amountCents) || amountCents < minCents || amountCents > 50_000_000) {
    return NextResponse.json({ error: "Valor do pedido adulterado ou inválido. Transação bloqueada." }, { status: 400 });
  }

  let snapshotRawLen = 0;
  if (body.orderSnapshot != null) {
    try {
      snapshotRawLen = JSON.stringify(body.orderSnapshot).length;
    } catch {
      snapshotRawLen = 999_999;
    }
  }
  if (snapshotRawLen > 48_000) {
    return NextResponse.json({ error: "Snapshot do pedido excede o tamanho máximo." }, { status: 400 });
  }

  const orderSnapshot = parseOrderCheckoutSnapshotFromApi(body.orderSnapshot);
  if (!orderSnapshot) {
    return NextResponse.json({ error: "Snapshot do pedido inválido ou ausente." }, { status: 400 });
  }
  if (Math.abs(orderSnapshot.pricing.finalTotalCents - amountCents) > 2) {
    return NextResponse.json({ error: "Total do snapshot não confere com o valor cobrado." }, { status: 400 });
  }
  if (orderSnapshot.quantity !== quantity) {
    return NextResponse.json({ error: "Quantidade do snapshot não confere." }, { status: 400 });
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

  const amountBrl = Number((amountCents / 100).toFixed(2));
  const royal = await createRoyalBankingPixCashIn({
    amountBrl,
    client: {
      name,
      documentDigits: docDigits,
      telefoneDigits: phoneDigits,
      email,
    },
  });

  if (!royal.ok) {
    return NextResponse.json({ error: royal.message }, { status: royal.status >= 400 && royal.status < 600 ? royal.status : 502 });
  }

  const shippingSummary = `${cep.slice(0, 5)}-${cep.slice(5)} · ${endereco}, ${numero}${complemento ? ` — ${complemento}` : ""} · ${bairro} · ${cidade}/${estado}`;
  const productSummary = `${PRODUCT.name} (${quantity} un.) · Pix Royal Banking`;
  const gwId = royal.idTransaction;
  const pedidoCodigoParaWebhook = gwId;

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
    console.warn("[checkout/pix-create] lead não gravado:", lead.error);
  }

  const code = royal.paymentCode.trim();
  const fromEmv = extractPixEmvCorrelationIds(code);
  const _pixCorrelationIds = [...new Set([gwId, ...fromEmv].map((x) => x.trim()).filter(Boolean))].slice(0, 24);
  const detalhesPedido = { ...orderSnapshot, _pixCorrelationIds };

  const venda = await insertPendingPixVenda({
    leadId,
    customerName: name,
    customerEmail: email,
    customerPhone: phoneDigits,
    amountCents,
    productSummary,
    idTransaction: pedidoCodigoParaWebhook,
    gatewayPixTransactionId: gwId,
    shippingSummary,
    detalhesPedido,
  });

  if (!venda.ok) {
    return NextResponse.json({ error: venda.error }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    leadId,
    vendaId: venda.id,
    gatewayTransactionId: gwId,
    paymentCode: royal.paymentCode,
    paymentCodeBase64: royal.paymentCodeBase64,
    /** O mesmo URL enviado à Royal em `callbackUrl` — deve coincidir com o webhook no painel Royal. */
    webhookCallbackUrlUsed: getRoyalBankingPixCallbackUrl(),
    webhookCallbackUrlCandidates: listRoyalBankingPixWebhookUrlCandidates(),
  });
}
