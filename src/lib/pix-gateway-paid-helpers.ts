import { collectPixWebhookTransactionIds } from "@/lib/pix-webhook-parse";
import { normalizePaymentOrderStatus } from "@/lib/normalize-payment-order-status";

/** Status gravados em `pix_gateway_payments.status` que tratamos como pagamento confirmado. */
const PAID_STATUS_EXACT = new Set([
  "paid",
  "pago",
  "paga",
  "approved",
  "aprovado",
  "completed",
  "confirmado",
  "liquidado",
  "success",
  "settled",
  "confirmed",
]);

/**
 * Indica se a linha em `pix_gateway_payments` representa Pix pago.
 * Aceita variações comuns (maiúsculas, sinónimos) sem marcar pendentes como pagos.
 */
export function isPixGatewayPaidDbStatus(status: unknown): boolean {
  if (status == null || status === "") return false;
  const normalized = normalizePaymentOrderStatus(status);
  if (normalized === "pago") return true;
  const s = String(status).trim().toLowerCase();
  if (PAID_STATUS_EXACT.has(s)) return true;
  if (s.includes("pend") || s.includes("wait") || s.includes("aguard") || s.includes("process")) return false;
  if (s.includes("fail") || s.includes("cancel") || s.includes("expir") || s.includes("rejeit")) return false;
  if (s.includes("saque")) return false;
  return false;
}

function parseJsonObjectIfNeeded(v: unknown): unknown {
  if (v != null && typeof v === "string") {
    try {
      return JSON.parse(v) as unknown;
    } catch {
      return v;
    }
  }
  return v;
}

/** IDs correlatos: chave primária da linha + todos os candidatos extraídos do payload bruto do webhook. */
export function expandPixGatewayPaidCorrelationIds(row: {
  id_transaction: string;
  raw_payload?: unknown;
}): string[] {
  const out = new Set<string>();
  const main = String(row.id_transaction ?? "").trim();
  if (main) out.add(main);
  const rawParsed = parseJsonObjectIfNeeded(row.raw_payload);
  const merged: Record<string, unknown> = {};
  if (rawParsed && typeof rawParsed === "object" && !Array.isArray(rawParsed)) {
    Object.assign(merged, rawParsed as Record<string, unknown>);
  }
  if (main) merged.gatewayStoredId = main;
  for (const x of collectPixWebhookTransactionIds(merged)) {
    const t = x.trim();
    if (t) out.add(t);
  }
  for (const x of collectPixWebhookTransactionIds(rawParsed)) {
    const t = x.trim();
    if (t) out.add(t);
  }
  return [...out];
}

export function normalizeDocDigits(v: unknown): string {
  return String(v ?? "").replace(/\D/g, "");
}

export function normalizeEmail(v: unknown): string {
  return String(v ?? "")
    .trim()
    .toLowerCase();
}

export function normalizePhoneDigits(v: unknown): string {
  return String(v ?? "").replace(/\D/g, "");
}

function pickDeep(o: unknown, keys: string[], maxDepth = 4): unknown {
  if (maxDepth <= 0 || o == null) return undefined;
  if (typeof o !== "object" || Array.isArray(o)) return undefined;
  const r = o as Record<string, unknown>;
  for (const k of keys) {
    if (k in r && r[k] != null && r[k] !== "") return r[k];
  }
  for (const v of Object.values(r)) {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const inner = pickDeep(v, keys, maxDepth - 1);
      if (inner != null && inner !== "") return inner;
    }
  }
  return undefined;
}

/** Extrai impressão digital do cliente e valor (centavos) a partir do JSON do webhook/gateway. */
export function extractPixWebhookClientFingerprint(payload: unknown): {
  doc?: string;
  email?: string;
  phone?: string;
  amountCents?: number;
} {
  if (payload == null || typeof payload !== "object") return {};
  const root = payload as Record<string, unknown>;

  const doc =
    normalizeDocDigits(
      pickDeep(
        root,
        [
          "document",
          "documento",
          "cpf",
          "cnpj",
          "taxId",
          "tax_id",
          "payerDocument",
          "cpfCnpj",
          "cpf_cnpj",
          "numeroDocumento",
          "numero_documento",
          "nroDocumento",
          "nro_documento",
        ],
        6
      )
    ) || undefined;
  const email = (() => {
    const e = pickDeep(root, ["email", "e_mail", "mail", "payerEmail", "customerEmail", "customer_email", "clientEmail"], 6);
    const s = normalizeEmail(e);
    return s || undefined;
  })();
  const phone = (() => {
    const p = pickDeep(
      root,
      ["telefone", "phone", "tel", "celular", "mobile", "payerPhone", "customerPhone", "customer_phone", "telephone"],
      6
    );
    const s = normalizePhoneDigits(p);
    return s.length >= 10 ? s : undefined;
  })();

  const amountRaw = pickDeep(
    root,
    ["amountCents", "amount_cents", "valorCentavos", "valueCents", "totalCents", "amount", "valor", "value", "total"],
    5
  );
  let amountCents: number | undefined;
  if (typeof amountRaw === "number" && Number.isFinite(amountRaw)) {
    const n = amountRaw;
    if (Number.isInteger(n) && Math.abs(n) >= 100) amountCents = Math.abs(Math.round(n));
    else amountCents = Math.abs(Math.round(n * 100));
  } else if (typeof amountRaw === "string" && amountRaw.trim()) {
    const n = Number(amountRaw.replace(",", "."));
    if (Number.isFinite(n)) {
      amountCents = Number.isInteger(n) && Math.abs(n) >= 100 ? Math.abs(Math.round(n)) : Math.abs(Math.round(n * 100));
    }
  }

  return {
    doc: doc && (doc.length === 11 || doc.length === 14) ? doc : undefined,
    email,
    phone,
    amountCents,
  };
}
