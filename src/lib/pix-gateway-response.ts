/** Mínimo em reais para Pix Cash In no gateway (evita `validation.min.numeric` no upstream). */
export const ROYAL_BANKING_MIN_PIX_AMOUNT_BRL = 1;

export function formatRoyalBankingMinPixAmountPt(): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    ROYAL_BANKING_MIN_PIX_AMOUNT_BRL
  );
}

export function isPixAmountBelowGatewayMin(amountBrl: number): boolean {
  return Math.round(amountBrl * 100) < Math.round(ROYAL_BANKING_MIN_PIX_AMOUNT_BRL * 100);
}

/** Converte chaves tipo Laravel (`validation.min.numeric`) em texto legível (pt-BR). */
function mapLaravelValidationKey(key: string): string | null {
  if (!key.startsWith("validation.")) return null;
  if (key === "validation.min.numeric" || key === "validation.min") {
    return `O valor do Pix está abaixo do mínimo permitido (${formatRoyalBankingMinPixAmountPt()}). Aumente o total do pedido ou use cartão.`;
  }
  return "O provedor de pagamento recusou os dados. Verifique os valores e tente novamente.";
}

function firstValidationMessageFromErrors(errors: Record<string, unknown>): string | null {
  for (const v of Object.values(errors)) {
    const parts = Array.isArray(v) ? v : [v];
    for (const p of parts) {
      if (typeof p !== "string") continue;
      const m = mapLaravelValidationKey(p.trim());
      if (m) return m;
    }
  }
  return null;
}

/**
 * Interpreta corpo de erro do gateway (ex. Laravel) e devolve mensagem para o utilizador.
 */
export function humanizePixGatewayError(data: unknown): string | null {
  if (typeof data !== "object" || data === null || Array.isArray(data)) return null;
  const o = data as Record<string, unknown>;

  const errors = o.errors;
  if (errors && typeof errors === "object" && !Array.isArray(errors)) {
    const fromFields = firstValidationMessageFromErrors(errors as Record<string, unknown>);
    if (fromFields) return fromFields;
  }

  if (typeof o.message === "string") {
    const m = mapLaravelValidationKey(o.message.trim());
    if (m) return m;
  }
  if (typeof o.error === "string") {
    const m = mapLaravelValidationKey(o.error.trim());
    if (m) return m;
  }

  return null;
}

/** Achata `response.data` do Mangofy/SDK para um único objeto antes de `extractPixGatewayPayload`. */
export function coercePixGatewayResponseRecord(response: unknown): Record<string, unknown> {
  if (!response || typeof response !== "object" || Array.isArray(response)) return {};
  const r = response as Record<string, unknown>;
  const d = r.data;
  if (d && typeof d === "object" && !Array.isArray(d)) {
    return { ...r, ...(d as Record<string, unknown>) };
  }
  return r;
}

/**
 * Normaliza respostas do Mangofy / gateway Pix (campos podem variar).
 */
export function extractPixGatewayPayload(data: Record<string, unknown>): {
  paymentCode: string;
  paymentCodeBase64: string;
  idTransaction?: string;
} {
  const paymentCode = String(
    data.paymentCode ?? data.payment_code ?? data.copyPaste ?? data.emv ?? ""
  ).trim();

  const rawB64 = data.paymentCodeBase64 ?? data.payment_code_base64 ?? data.qrCodeBase64 ?? data.qrcode;
  const paymentCodeBase64 =
    rawB64 == null ? "" : String(rawB64).trim().replace(/\s/g, "");

  const idRaw =
    data.idTransaction ??
    data.id_transaction ??
    data.transactionId ??
    data.transaction_id ??
    data.paymentId ??
    data.payment_id ??
    data.txId ??
    data.tx_id ??
    data.externalReference ??
    data.external_reference ??
    data.reference ??
    data.external_id;
  let idTransaction = idRaw == null ? undefined : String(idRaw).trim() || undefined;

  const nested = data.data;
  if (!idTransaction && nested && typeof nested === "object" && !Array.isArray(nested)) {
    const inner = extractPixGatewayPayload(nested as Record<string, unknown>);
    idTransaction = inner.idTransaction;
  }

  return { paymentCode, paymentCodeBase64, idTransaction };
}

/** ID da transação Mangofy/gateway a partir da resposta bruta do `generatePix` no browser. */
export function extractMangofyPixTransactionId(response: unknown): string | undefined {
  const root =
    response && typeof response === "object" && !Array.isArray(response)
      ? (response as Record<string, unknown>)
      : {};
  const flat = coercePixGatewayResponseRecord(root);
  const nested = extractPixGatewayPayload(flat).idTransaction?.trim();
  if (nested) return nested;
  const topKeys = [
    "idTransaction",
    "id_transaction",
    "transactionId",
    "transaction_id",
    "paymentId",
    "payment_id",
  ] as const;
  for (const k of topKeys) {
    const v = root[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}

/** Base64 puro ou já `data:image/...;base64,...` — adequado para `img[src]`. */
export function qrDataUrlForImg(raw: string): string | null {
  if (!raw.trim()) return null;
  const s = raw.trim().replace(/\s/g, "");
  if (s.startsWith("data:")) return s;
  return `data:image/png;base64,${s}`;
}
