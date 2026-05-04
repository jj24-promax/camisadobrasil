import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";

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

/** Payload serializável para `window.generatePix` (Mangofy Fast API), alinhado ao checkout. */
export type MangofyRegenPayload = {
  total_price: number;
  customer: { name: string; document: string; email: string; phone: string };
  shipping: { zip_code: string; street: string; city: string; state: string; country: "BR" };
  metadata: Record<string, string>;
  items: { name: string; price: number; quantity: number }[];
};

function vendaTimestampMs(row: Record<string, unknown>): number {
  const raw = pick(row, ["created_at", "date", "criado_em"]);
  const d = raw ? new Date(String(raw)) : new Date(0);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

/**
 * Prepara novo identificador de pedido na venda pendente e devolve o corpo para o SDK Mangofy no browser.
 * O `pedido_codigo` é atualizado antes do generatePix para o webhook continuar a casar com a mesma linha de venda.
 */
export async function prepareAdminRegeneratePixForLead(
  leadId: string
): Promise<{ ok: true; orderRef: string; mangofyPayload: MangofyRegenPayload } | { ok: false; error: string }> {
  const id = leadId.trim();
  if (!id) return { ok: false, error: "Lead inválido." };

  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY não configurada." };

  const { data: leadRow, error: leadErr } = await admin.from("leads").select("*").eq("id", id).maybeSingle();
  if (leadErr) return { ok: false, error: leadErr.message };
  if (!leadRow) return { ok: false, error: "Lead não encontrado." };

  const lr = leadRow as Record<string, unknown>;
  const nome = str(pick(lr, ["nome", "name"]));
  const email = str(pick(lr, ["email", "e_mail"])).toLowerCase();
  const telefone = str(pick(lr, ["telefone", "phone"])).replace(/\D/g, "");
  const cpfRaw = str(pick(lr, ["cpf", "documento"])).replace(/\D/g, "");
  const cep = str(pick(lr, ["cep", "zipcode"])).replace(/\D/g, "");
  const endereco = str(pick(lr, ["endereco", "address", "logradouro"]));
  const numero = str(pick(lr, ["numero", "number"]));
  const bairro = str(pick(lr, ["bairro", "neighborhood"]));
  const cidade = str(pick(lr, ["cidade", "city"]));
  const estado = str(pick(lr, ["estado", "state", "uf"])).replace(/\s/g, "").toUpperCase().slice(0, 2);

  if (!nome || !email || !telefone) {
    return { ok: false, error: "Lead sem nome, e-mail ou telefone." };
  }
  if (cpfRaw.length !== 11 && cpfRaw.length !== 14) {
    return { ok: false, error: "CPF/CNPJ ausente ou inválido neste lead." };
  }
  if (cep.length !== 8 || !endereco || !numero || !bairro || !cidade || estado.length !== 2) {
    return {
      ok: false,
      error: "Endereço incompleto no lead (CEP, logradouro, número, bairro, cidade, UF). Corrija no Supabase ou refaça o checkout.",
    };
  }

  const { data: vendasRows, error: vErr } = await admin
    .from("vendas")
    .select("*")
    .eq("lead_id", id)
    .eq("status_pagamento", "pendente");

  if (vErr) return { ok: false, error: vErr.message };

  const rows = (vendasRows ?? []) as Record<string, unknown>[];
  if (rows.length === 0) {
    return { ok: false, error: "Nenhuma venda Pix pendente ligada a este lead." };
  }

  rows.sort((a, b) => vendaTimestampMs(b) - vendaTimestampMs(a));
  const venda = rows[0]!;

  const amountCents = Math.round(Number(venda.valor ?? 0));
  if (!Number.isFinite(amountCents) || amountCents < 4750 || amountCents > 50_000_000) {
    return { ok: false, error: "Valor da venda pendente inválido." };
  }

  const orderRef = crypto.randomUUID();
  const vendaId = str(pick(venda, ["id", "pedido_id"]));
  if (!vendaId) return { ok: false, error: "ID da venda inválido." };

  const { error: updErr } = await admin
    .from("vendas")
    .update({ pedido_codigo: orderRef })
    .eq("id", vendaId)
    .eq("status_pagamento", "pendente");

  if (updErr) return { ok: false, error: `Erro ao atualizar referência do pedido: ${updErr.message}` };

  const amount = Number((amountCents / 100).toFixed(2));

  const mangofyPayload: MangofyRegenPayload = {
    total_price: amount,
    customer: {
      name: nome,
      document: cpfRaw,
      email,
      phone: telefone,
    },
    shipping: {
      zip_code: cep,
      street: endereco,
      city: cidade,
      state: estado,
      country: "BR",
    },
    metadata: { alpha_order_ref: orderRef, source: "admin_regenerate_pix" },
    items: [{ name: "CamisaBrasil", price: amount, quantity: 1 }],
  };

  return { ok: true, orderRef, mangofyPayload };
}
