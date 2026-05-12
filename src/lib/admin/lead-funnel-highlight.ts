import type { Lead } from "@/types/admin";

export type LeadPaymentColumnKind = "pago" | "pendente" | "cancelado" | "checkout_sem_status" | "none";

/** Valor para a coluna “Pagamento” na lista de leads (operador). */
export function leadPaymentColumnKind(lead: Lead): LeadPaymentColumnKind {
  const st = lead.paymentStatus;
  if (st === "pago" || st === "pendente" || st === "cancelado") return st;
  if (lead.orderDetails) return "checkout_sem_status";
  return "none";
}

/**
 * Verde: Pix pago (webhook / venda) ou pós-checkout (obrigado + rastreio).
 * Amarelo: Pix pendente na venda, ou checkout gravado mas status da venda ainda não apareceu no merge.
 */
export function leadFunnelHighlight(lead: Lead): "green" | "yellow" | null {
  if (lead.paymentStatus === "cancelado") return null;

  const hasTracking = !!lead.trackingCode?.trim();
  const reachedObrigado = !!lead.obrigadoEm?.trim();
  const paid = lead.paymentStatus === "pago";
  const inferredPending = !lead.paymentStatus && !!lead.orderDetails;

  if (paid || (reachedObrigado && hasTracking)) return "green";
  if (lead.paymentStatus === "pendente" || inferredPending) return "yellow";
  return null;
}

export function getLeadRowHighlightClass(lead: Lead): string | undefined {
  const tier = leadFunnelHighlight(lead);
  if (tier === "green") {
    return "shadow-[inset_0_0_0_2px_rgba(52,211,153,0.55)] bg-emerald-500/[0.07]";
  }
  if (tier === "yellow") {
    return "shadow-[inset_0_0_0_2px_rgba(251,191,36,0.55)] bg-amber-500/[0.07]";
  }
  return undefined;
}
