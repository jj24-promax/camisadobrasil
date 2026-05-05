import type { Size } from "@/lib/types";

/** Microcopy CRO — landing / mobile bar (ajuste números conforme operação real). */
export const CRO = {
  stickySocialProof: "+3.000 vendidos",
  stickyUrgency: "Últimas unidades hoje",
  stripSalesToday: "+200 vendidos hoje",
  stripStock: "Estoque acabando rápido",
  stripPromoEnds: "Promoção termina hoje",
  /** Reforço só onde há dado típico de mercado — evita mensagem repetida nos 6 tamanhos. */
  sizeBlockEyebrow: "M · G · GG são os mais pedidos nesta coleção",
  heroPrimaryCta: "Garantir minha edição agora 🔥",
  stickyCta: "Garantir minha camisa",
  finalCta: "Quero garantir a minha agora",
  cartCheckoutCta: "Garantir minha camisa",
} as const;

/**
 * Microcopy apenas nos tamanhos com maior histórico típico de venda para camisa masc. BR.
 * Hoje não persistimos array de tamanhos no Supabase (só texto do produto) — não há agregação real.
 * Se passarem a gravar `sizes`/`tamanhos` por venda no `pix-record`/webhook, substituir esta lista pelos dados.
 */
export const HIGH_DEMAND_SIZE_HINT: Partial<Record<Size, string>> = {
  M: "Alta demanda",
  G: "Mais pedidos",
  GG: "Últimas unidades",
};

export function highDemandHintFor(size: Size): string | undefined {
  return HIGH_DEMAND_SIZE_HINT[size];
}
