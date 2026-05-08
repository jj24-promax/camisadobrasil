import "server-only";

import { PRODUCT } from "@/lib/product";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";
import type { UtmifyServerOrderPayload } from "@/lib/utmify-server";
import { postUtmifyPaidOrder } from "@/lib/utmify-server";
import { isOrderCheckoutSnapshotV1 } from "@/types/order-snapshot";

export type UtmifySyncOnPaidResult =
  | { ok: true; skipped?: string }
  | { ok: false; error: string };

function productsFromVenda(
  produtoFallback: string,
  valorCents: number,
  detalhes: unknown
): NonNullable<UtmifyServerOrderPayload["products"]> {
  if (isOrderCheckoutSnapshotV1(detalhes)) {
    const s = detalhes;
    const items: NonNullable<UtmifyServerOrderPayload["products"]> = [];
    for (const line of s.lines) {
      items.push({
        id: line.modelId,
        name: `${line.modelName} · tam. ${line.size}`,
        quantity: 1,
        priceInCents: line.unitPriceCents,
      });
    }
    for (const b of s.orderBumps) {
      items.push({
        id: b.id,
        name: b.title,
        quantity: 1,
        priceInCents: b.priceCents,
      });
    }
    if (items.length > 0) {
      return items;
    }
  }
  const name = produtoFallback.trim().slice(0, 200) || PRODUCT.name;
  return [{ id: PRODUCT.id, name, quantity: 1, priceInCents: Math.max(1, Math.round(valorCents)) }];
}

function utmFromSnapshot(detalhes: unknown): Record<string, string | null> {
  if (!isOrderCheckoutSnapshotV1(detalhes) || !detalhes.utm) return {};
  const out: Record<string, string | null> = {};
  for (const [k, v] of Object.entries(detalhes.utm)) {
    out[k] = v;
  }
  return out;
}

/**
 * Dispara o postback de pedido pago na UTMify quando o webhook Mangofy confirma o Pix.
 * Idempotente: usa `vendas.utmify_posted_at` para não duplicar envio.
 */
export async function syncUtmifyAfterMangofyPixPaid(idTransaction: string): Promise<UtmifySyncOnPaidResult> {
  const tx = idTransaction.trim();
  if (!tx) return { ok: false, error: "idTransaction vazio." };

  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY ausente." };

  const { data: venda, error: vErr } = await admin
    .from("vendas")
    .select("id, lead_id, valor, cliente_nome, produto, created_at, detalhes_pedido, utmify_posted_at")
    .eq("pedido_codigo", tx)
    .maybeSingle();

  if (vErr) return { ok: false, error: vErr.message };
  if (!venda) return { ok: true, skipped: "venda_nao_encontrada" };

  const v = venda as Record<string, unknown>;
  if (v.utmify_posted_at != null && String(v.utmify_posted_at).trim() !== "") {
    return { ok: true, skipped: "utmify_ja_enviado" };
  }

  const vendaId = String(v.id ?? "");
  const leadId = v.lead_id ? String(v.lead_id).trim() : "";
  const valor = Number(v.valor ?? 0);
  if (!Number.isFinite(valor) || valor <= 0) {
    return { ok: true, skipped: "valor_invalido" };
  }

  const produto = String(v.produto ?? "").trim();
  const clienteNome = String(v.cliente_nome ?? "").trim();
  const createdAt = new Date(String(v.created_at ?? Date.now())).toISOString();
  const detalhes = v.detalhes_pedido;

  let customerName = clienteNome;
  let customerEmail = "";
  let customerPhone: string | undefined;

  if (leadId) {
    const { data: lead } = await admin.from("leads").select("nome, email, telefone").eq("id", leadId).maybeSingle();
    if (lead) {
      const L = lead as Record<string, unknown>;
      const nm = String(L.nome ?? "").trim();
      if (nm) customerName = nm;
      customerEmail = String(L.email ?? "").trim().toLowerCase();
      const tel = String(L.telefone ?? "").replace(/\D/g, "");
      if (tel.length >= 10) customerPhone = tel;
    }
  }

  if (!customerEmail) {
    return { ok: true, skipped: "sem_email_lead" };
  }
  if (!customerName) customerName = "Cliente";

  const products = productsFromVenda(produto, valor, detalhes);
  const trackingParameters = utmFromSnapshot(detalhes);

  const payload: UtmifyServerOrderPayload = {
    orderId: `mangofy_${tx}`,
    paymentMethod: "pix",
    status: "paid",
    createdAt,
    approvedDate: new Date().toISOString(),
    customer: { name: customerName, email: customerEmail, phone: customerPhone },
    totalPriceInCents: Math.round(valor),
    products,
    trackingParameters,
  };

  const posted = await postUtmifyPaidOrder(payload);
  if (!posted.ok) {
    if (posted.error.includes("UTMIFY_API_KEY")) {
      return { ok: true, skipped: "utmify_nao_configurado" };
    }
    return { ok: false, error: posted.error };
  }

  const { error: updErr } = await admin
    .from("vendas")
    .update({ utmify_posted_at: new Date().toISOString() })
    .eq("id", vendaId);

  if (updErr) {
    console.warn("[utmify-sync] UTMify OK mas falhou ao gravar utmify_posted_at:", updErr.message);
  }

  return { ok: true };
}
