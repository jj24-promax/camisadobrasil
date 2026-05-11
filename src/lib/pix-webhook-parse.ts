/**
 * Interpreta webhooks de notificação Pix Cash In (ex.: Royal Banking).
 * Pago: `status` = `paid` (ex.: { idTransaction, status: "paid" }).
 * Falhou: `status` = `failed` ou `providerStatus` = `CANCELLED`.
 * Cash Out: `SaquePago`, `SaqueFalhou` — não marcam depósito Pix no checkout.
 */

const PAID_HINTS = [
  "paid",
  "pago",
  "paga",
  "approved",
  "confirm",
  "success",
  "conclu",
  "liquid",
  "aprov",
  "completed",
];

const FAILED_HINTS = [
  "failed",
  "fail",
  "cancel",
  "falhou",
  "erro",
  "rejeit",
];

function norm(s: unknown): string {
  return String(s ?? "")
    .trim()
    .toLowerCase();
}

function looksPaidStatus(s: string): boolean {
  if (!s) return false;
  return PAID_HINTS.some((h) => s.includes(h));
}

function looksFailedStatus(s: string): boolean {
  if (!s) return false;
  return FAILED_HINTS.some((h) => s.includes(h));
}

function isCashOutOrNonDepositEvent(status: string): boolean {
  if (!status) return false;
  if (status.includes("saque")) return true;
  if (status === "saquepago" || status === "saquefalhou") return true;
  return false;
}

function pickTransactionId(r: Record<string, unknown>): string | undefined {
  const raw =
    r.externalReference ??
    r.external_reference ??
    r.idTransaction ??
    r.id_transaction ??
    r.transactionId ??
    r.transaction_id ??
    r.paymentId ??
    r.payment_id ??
    r.id ??
    r.txId ??
    r.tx_id;
  if (raw == null || raw === "") return undefined;
  return String(raw).trim();
}

function deepFindId(o: unknown, depth = 0): string | undefined {
  if (depth > 6 || o == null) return undefined;
  if (typeof o !== "object") return undefined;
  const r = o as Record<string, unknown>;
  const id = pickTransactionId(r);
  if (id) return id;
  for (const v of Object.values(r)) {
    if (typeof v === "object" && v !== null) {
      const inner = deepFindId(v, depth + 1);
      if (inner) return inner;
    }
  }
  return undefined;
}

function isPixCashInPaid(r: Record<string, unknown>): boolean {
  const status = norm(r.status ?? r.payment_status ?? r.paymentStatus ?? r.state ?? r.providerStatus);
  if (isCashOutOrNonDepositEvent(status)) return false;
  if (status === "paid") return true;
  if (r.paid === true && !isCashOutOrNonDepositEvent(status)) return true;
  const ev = norm(r.event);
  if (ev === "payment.confirmed" || (ev.includes("paid") && !ev.includes("saque"))) return true;
  if (looksPaidStatus(status)) return true;
  return false;
}

function isPixCashInFailed(r: Record<string, unknown>): boolean {
  const status = norm(r.status ?? r.payment_status ?? r.paymentStatus ?? r.state ?? r.providerStatus);
  if (isCashOutOrNonDepositEvent(status)) return false;
  if (looksFailedStatus(status)) return true;
  const ev = norm(r.event);
  if (looksFailedStatus(ev)) return true;
  return false;
}

function deepCashInPaid(o: unknown, depth = 0): boolean {
  if (depth > 6 || o == null || typeof o !== "object") return false;
  const r = o as Record<string, unknown>;
  if (isPixCashInPaid(r)) return true;
  for (const v of Object.values(r)) {
    if (typeof v === "object" && v !== null && deepCashInPaid(v, depth + 1)) return true;
  }
  return false;
}

function deepCashInFailed(o: unknown, depth = 0): boolean {
  if (depth > 6 || o == null || typeof o !== "object") return false;
  const r = o as Record<string, unknown>;
  if (isPixCashInFailed(r)) return true;
  for (const v of Object.values(r)) {
    if (typeof v === "object" && v !== null && deepCashInFailed(v, depth + 1)) return true;
  }
  return false;
}

export function parsePixCashInWebhook(payload: unknown): { idTransaction?: string; paid: boolean; failed: boolean } {
  if (payload == null || typeof payload !== "object") {
    return { paid: false, failed: false };
  }
  const root = payload as Record<string, unknown>;
  const idTransaction = deepFindId(payload);
  const paid = deepCashInPaid(payload);
  const failed = deepCashInFailed(payload);

  if (!paid && !failed && idTransaction && isCashOutOrNonDepositEvent(norm(root.status))) {
    return { idTransaction, paid: false, failed: false };
  }
  return { idTransaction, paid, failed };
}

const WEBHOOK_TX_KEYS = [
  "idTransaction",
  "id_transaction",
  "transactionId",
  "transaction_id",
  "externalReference",
  "external_reference",
  "paymentId",
  "payment_id",
  "txId",
  "tx_id",
] as const;

function isLikelyGatewayTransactionIdString(s: string): boolean {
  const t = s.trim();
  if (t.length < 4 || t.length > 128) return false;
  return /^[a-zA-Z0-9_.:-]+$/.test(t);
}

export function collectPixWebhookTransactionIds(payload: unknown): string[] {
  const found = new Set<string>();
  function walk(o: unknown, depth: number) {
    if (depth > 12 || o == null) return;
    if (Array.isArray(o)) {
      for (const item of o) walk(item, depth + 1);
      return;
    }
    if (typeof o !== "object") return;
    const r = o as Record<string, unknown>;
    for (const k of WEBHOOK_TX_KEYS) {
      const v = r[k];
      if (v == null || v === "") continue;
      const s = String(v).trim();
      if (isLikelyGatewayTransactionIdString(s)) found.add(s);
    }
    for (const v of Object.values(r)) walk(v, depth + 1);
  }
  walk(payload, 0);
  return [...found];
}

const UUID_LOOSE_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Prioriza IDs nativos do gateway face a UUID usado como referência interna. */
export function sortPixWebhookTransactionIds(ids: string[]): string[] {
  return [...new Set(ids.map((x) => x.trim()).filter(Boolean))].sort((a, b) => {
    const au = UUID_LOOSE_RE.test(a) ? 1 : 0;
    const bu = UUID_LOOSE_RE.test(b) ? 1 : 0;
    if (au !== bu) return au - bu;
    return a.length - b.length;
  });
}
