import { serializeOrderModels, serializeOrderSizes } from "@/lib/cart-sizes";
import type { ProductModelId, Size } from "@/lib/product";

/** Chaves da linha do pedido — removidas antes de regravar para evitar mistura singular/plural. */
const LINE_KEYS = ["modelo", "modelos", "size", "sizes", "q"] as const;

/**
 * Mantém todos os outros query params (UTMs etc.) e grava apenas modelo/tamanho/quantidade.
 */
export function replaceCheckoutProductLines(
  current: URLSearchParams,
  quantity: number,
  models: ProductModelId[],
  sizes: Size[]
): string {
  const next = new URLSearchParams(current.toString());
  for (const k of LINE_KEYS) {
    next.delete(k);
  }

  const qSafe = quantity > 0 ? quantity : 1;
  const m: ProductModelId[] = [];
  const s: Size[] = [];
  for (let i = 0; i < qSafe; i++) {
    m.push(models[i] ?? models[0] ?? "edicao-sagrada");
    s.push(sizes[i] ?? sizes[0] ?? "M");
  }

  next.set("q", String(qSafe));

  if (qSafe === 1) {
    next.set("modelo", m[0]!);
    next.set("size", s[0]!);
  } else {
    next.set("modelos", serializeOrderModels(m));
    next.set("sizes", serializeOrderSizes(s));
  }

  return next.toString();
}
