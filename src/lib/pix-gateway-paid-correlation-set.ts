import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { expandPixGatewayPaidCorrelationIds, isPixGatewayPaidDbStatus } from "@/lib/pix-gateway-paid-helpers";

/** Mesmo teto usado no painel (`queries.fetchPaidPixIdSet`) para correlatos Pix pagos. */
export const PAID_PIX_GATEWAY_SCAN_CAP = 4000;

function parseJsonObjectIfNeeded(v: unknown): Record<string, unknown> | null {
  let cur = v;
  if (typeof cur === "string") {
    try {
      cur = JSON.parse(cur) as unknown;
    } catch {
      return null;
    }
  }
  if (cur && typeof cur === "object" && !Array.isArray(cur)) return cur as Record<string, unknown>;
  return null;
}

function distinctTransactionVariants(id: string): string[] {
  const s = new Set<string>();
  const t = id.trim();
  if (!t || t.length > 512) return [];
  s.add(t);
  s.add(t.toLowerCase());
  s.add(t.toUpperCase());
  return [...s];
}

/**
 * Consulta direta a `pix_gateway_payments` pelo id da transação (variantes de maiúsculas).
 * Usa o mesmo id devolvido ao browser em `pix-create` → evita depender só do scan por correlação.
 */
export async function fetchPaidGatewayTransactionIfPaid(
  admin: SupabaseClient,
  gatewayTxHint: string
): Promise<string | null> {
  const keys = distinctTransactionVariants(gatewayTxHint);
  if (keys.length === 0) return null;

  const { data: rows, error } = await admin.from("pix_gateway_payments").select("id_transaction, status").in("id_transaction", keys);

  if (error) {
    console.warn("[pix-gateway-paid-correlation-set] lookup direto gateway:", error.message);
    return null;
  }
  if (!Array.isArray(rows)) return null;

  for (const pr of rows) {
    const row = pr as Record<string, unknown>;
    if (!isPixGatewayPaidDbStatus(row.status)) continue;
    const tx = String(row.id_transaction ?? "").trim();
    if (tx) return tx;
  }
  return null;
}

/**
 * Chaves da venda que podem casar com `pix_gateway_payments` (colunas + correlatos do EMV no snapshot).
 * Alinhado ao merge do admin: colunas + `_pixCorrelationIds` em `detalhes_pedido`.
 */
export function collectVendaPixGatewayCorrelationKeys(row: Record<string, unknown>): string[] {
  const out = new Set<string>();
  for (const k of ["pedido_codigo", "pix_id_transaction", "id_transacao_pix"] as const) {
    const t = String(row[k] ?? "").trim();
    if (t) out.add(t);
  }
  const detObj = parseJsonObjectIfNeeded(row.detalhes_pedido);
  if (detObj) {
    const arr = detObj._pixCorrelationIds;
    if (Array.isArray(arr)) {
      for (const x of arr) {
        const t = String(x ?? "").trim();
        if (t) out.add(t);
      }
    }
  }
  return [...out];
}

/**
 * Conjunto (minúsculas) de todos os ids correlatos de linhas Pix **pagas** recentes no armazém do gateway.
 * Usado pelo painel e pelo polling do checkout para a mesma fonte de verdade.
 */
export async function buildPaidPixCorrelationMegaSetLowercase(
  admin: SupabaseClient,
  cap: number = PAID_PIX_GATEWAY_SCAN_CAP
): Promise<Set<string>> {
  const mega = new Set<string>();
  const { data: rows, error } = await admin
    .from("pix_gateway_payments")
    .select("id_transaction, raw_payload, status")
    .order("updated_at", { ascending: false })
    .limit(cap);

  if (error) {
    console.warn("[pix-gateway-paid-correlation-set] pix_gateway_payments:", error.message);
    return mega;
  }
  if (!Array.isArray(rows)) return mega;

  for (const pr of rows) {
    const row = pr as Record<string, unknown>;
    if (!isPixGatewayPaidDbStatus(row.status)) continue;
    let expanded: string[];
    try {
      expanded = expandPixGatewayPaidCorrelationIds({
        id_transaction: String(row.id_transaction ?? ""),
        raw_payload: row.raw_payload,
      });
    } catch {
      expanded = [String(row.id_transaction ?? "").trim()].filter(Boolean);
    }
    for (const x of expanded) {
      const t = x.trim();
      if (t) mega.add(t.toLowerCase());
    }
  }
  return mega;
}

/**
 * Devolve `id_transaction` da linha em `pix_gateway_payments` (paga) que correlaciona com a venda,
 * para reconciliar `vendas` via `markPixVendaPaidByGatewayId`.
 */
export async function findPaidGatewayIdTransactionMatchingVenda(
  admin: SupabaseClient,
  vendaRow: Record<string, unknown>,
  cap: number = PAID_PIX_GATEWAY_SCAN_CAP
): Promise<string | null> {
  const keys = collectVendaPixGatewayCorrelationKeys(vendaRow);
  const keyLower = new Set(keys.map((k) => k.trim().toLowerCase()).filter(Boolean));
  if (keyLower.size === 0) return null;

  const { data: rows, error } = await admin
    .from("pix_gateway_payments")
    .select("id_transaction, raw_payload, status")
    .order("updated_at", { ascending: false })
    .limit(cap);

  if (error) {
    console.warn("[pix-gateway-paid-correlation-set] match scan:", error.message);
    return null;
  }
  if (!Array.isArray(rows)) return null;

  for (const pr of rows) {
    const row = pr as Record<string, unknown>;
    if (!isPixGatewayPaidDbStatus(row.status)) continue;
    const gwTx = String(row.id_transaction ?? "").trim();
    if (!gwTx) continue;
    let expanded: string[];
    try {
      expanded = expandPixGatewayPaidCorrelationIds({
        id_transaction: gwTx,
        raw_payload: row.raw_payload,
      });
    } catch {
      expanded = [gwTx];
    }
    const hit = expanded.some((x) => keyLower.has(String(x).trim().toLowerCase()));
    if (hit) return gwTx;
  }
  return null;
}
