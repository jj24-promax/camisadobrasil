import type { Size } from "@/lib/types";

/** Microcopy CRO — landing / mobile bar (ajuste números conforme operação real). */
export const CRO = {
  stickySocialProof: "+3.000 vendidos",
  stickyUrgency: "Últimas unidades hoje",
  stripSalesToday: "+200 vendidos hoje",
  stripStock: "Estoque acabando rápido",
  stripPromoEnds: "Promoção termina hoje",
  sizeBlockEyebrow: "Escolha rápido — tamanhos esgotando",
  heroPrimaryCta: "Garantir minha edição agora 🔥",
  stickyCta: "Garantir minha camisa",
  finalCta: "Quero garantir a minha agora",
  cartCheckoutCta: "Garantir minha camisa",
} as const;

/** Uma linha por tamanho — sensação de escassez (mensagem de marketing). */
export const SIZE_SCARCITY: Record<Size, string> = {
  P: "Últimas unidades",
  M: "Mais pedido — esgotando",
  G: "Quase esgotado",
  GG: "Poucas peças",
  G1: "Estoque limitado",
  G2: "Últimas da leva",
};
