import type { ProductModelId } from "@/lib/product";
import { getSelectableProductModels } from "@/lib/product";
import { UPSELL_BAG_CENTS, UPSELL_CAP_CENTS, UPSELL_CUP_CENTS } from "@/lib/pos-compra-upsell-pricing";
import { formatBRL } from "@/lib/admin-format";

const MAX_UNIT = 50;

export type CollectPixCart = {
  shirts: Record<ProductModelId, number>;
  capQty: number;
  bagQty: number;
  cupQty: number;
};

export function defaultCollectPixCart(): CollectPixCart {
  const shirts: Record<ProductModelId, number> = {
    "edicao-sagrada": 0,
    "edicao-canarinho": 0,
  };
  return { shirts, capQty: 0, bagQty: 0, cupQty: 0 };
}

function clampQty(n: unknown): number {
  if (typeof n !== "number" || !Number.isFinite(n)) return 0;
  const x = Math.floor(n);
  return Math.min(MAX_UNIT, Math.max(0, x));
}

/** Normaliza payload vindo do cliente ou da action (defensivo). */
export function normalizeCollectPixCart(raw: unknown): CollectPixCart {
  const base = defaultCollectPixCart();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return base;
  const o = raw as Record<string, unknown>;
  const shirtsIn = o.shirts;
  if (shirtsIn && typeof shirtsIn === "object" && !Array.isArray(shirtsIn)) {
    const s = shirtsIn as Record<string, unknown>;
    for (const id of Object.keys(base.shirts) as ProductModelId[]) {
      if (id in s) base.shirts[id] = clampQty(s[id]);
    }
  }
  base.capQty = clampQty(o.capQty);
  base.bagQty = clampQty(o.bagQty);
  base.cupQty = clampQty(o.cupQty);
  return base;
}

/**
 * Mesma lógica de camisas do checkout: soma das linhas e desconto = menor preço entre as linhas
 * quando há 3+ unidades. Adicionais pós-compra com preços fixos do site.
 */
export function computeCollectPixTotalCents(cart: CollectPixCart): {
  totalCents: number;
  discountCents: number;
  shirtLineCount: number;
  summaryParts: string[];
} {
  const lineCents: number[] = [];
  const summaryParts: string[] = [];

  for (const model of getSelectableProductModels()) {
    const q = Math.min(MAX_UNIT, Math.max(0, Math.floor(cart.shirts[model.id] ?? 0)));
    const unit = Math.round(model.price * 100);
    for (let i = 0; i < q; i++) lineCents.push(unit);
    if (q > 0) summaryParts.push(`${model.fullName} × ${q}`);
  }

  const shirtSubtotal = lineCents.reduce((a, b) => a + b, 0);
  const discountCents = lineCents.length >= 3 ? Math.min(...lineCents) : 0;
  if (discountCents > 0) {
    summaryParts.push(`Promoção Leve 3, Pague 2 (−${formatBRL(discountCents)} no total)`);
  }
  const shirtTotal = shirtSubtotal - discountCents;

  let addonTotal = 0;
  const { capQty, bagQty, cupQty } = cart;
  if (capQty > 0) {
    addonTotal += capQty * UPSELL_CAP_CENTS;
    summaryParts.push(`Boné Alpha × ${capQty}`);
  }
  if (bagQty > 0) {
    addonTotal += bagQty * UPSELL_BAG_CENTS;
    summaryParts.push(`Shoulder Bag × ${bagQty}`);
  }
  if (cupQty > 0) {
    addonTotal += cupQty * UPSELL_CUP_CENTS;
    summaryParts.push(`Copo térmico × ${cupQty}`);
  }

  return {
    totalCents: shirtTotal + addonTotal,
    discountCents,
    shirtLineCount: lineCents.length,
    summaryParts,
  };
}
