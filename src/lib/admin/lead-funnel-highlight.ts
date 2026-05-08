import type { Lead } from "@/types/admin";

/** Verde: pós-compra (obrigado) ou pagamento confirmado no gateway. Amarelo: Pix pendente. */
export function leadFunnelHighlight(lead: Lead): "green" | "yellow" | null {
  const reachedObrigado = !!lead.obrigadoEm?.trim();
  if (reachedObrigado || lead.paymentStatus === "pago") {
    return "green";
  }
  if (lead.paymentStatus === "pendente") {
    return "yellow";
  }
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
