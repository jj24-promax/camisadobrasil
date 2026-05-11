import type { OrderStatus } from "@/types/admin";

/**
 * Converte `status_pagamento` (ou equivalentes do gateway) para o enum do painel.
 * Retorna `undefined` quando o valor não é reconhecido — útil para merges que devem ignorar ruído.
 */
export function normalizePaymentOrderStatus(value: unknown): OrderStatus | undefined {
  const status = String(value ?? "").trim().toLowerCase();
  if (
    status === "pago" ||
    status === "paid" ||
    status === "approved" ||
    status === "aprovado" ||
    status === "completed" ||
    status === "confirmado" ||
    status === "liquidado"
  )
    return "pago";
  if (
    status === "cancelado" ||
    status === "cancelled" ||
    status === "canceled" ||
    status === "expired" ||
    status === "expirado" ||
    status === "failed" ||
    status === "refunded" ||
    status === "reembolsado"
  )
    return "cancelado";
  if (
    status === "pendente" ||
    status === "pending" ||
    status === "awaiting_payment" ||
    status === "waiting" ||
    status === "processing"
  )
    return "pendente";
  return undefined;
}

/** Para linhas de venda no admin: desconhecido → tratamos como pendente. */
export function normalizePaymentOrderStatusForSale(value: unknown): OrderStatus {
  return normalizePaymentOrderStatus(value) ?? "pendente";
}

/**
 * Junta `status_pagamento` e `status` na tabela `vendas` (esquemas antigos só tinham `status`).
 * Se as colunas divergem, prioriza: pago > cancelado > pendente.
 */
export function orderStatusFromVendaRow(row: Record<string, unknown>): OrderStatus | undefined {
  const a = normalizePaymentOrderStatus(row.status_pagamento);
  const b = normalizePaymentOrderStatus(row.status);
  if (a === "pago" || b === "pago") return "pago";
  if (a === "cancelado" || b === "cancelado") return "cancelado";
  if (a === "pendente" || b === "pendente") return "pendente";
  return a ?? b;
}
