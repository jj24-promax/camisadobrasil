import { SIZES } from "@/lib/product";
import type { Size } from "@/lib/types";
import type { ProductModelId } from "@/lib/product";

function isSize(value: string): value is Size {
  return (SIZES as readonly string[]).includes(value);
}

/**
 * Lê `sizes` (CSV) ou `size` legado e devolve um tamanho por unidade do pedido.
 */
export function parseOrderSizes(
  searchParams: { get: (key: string) => string | null },
  quantity: number
): Size[] {
  const safeQty = quantity > 0 ? quantity : 1;
  const rawList = searchParams.get("sizes");
  if (rawList) {
    const parts = rawList.split(",").map((p) => p.trim()).filter(Boolean);
    const fallback: Size = parts[0] && isSize(parts[0]) ? parts[0] : "M";
    return Array.from({ length: safeQty }, (_, i) => {
      const p = parts[i];
      return p && isSize(p) ? p : fallback;
    });
  }
  const single = searchParams.get("size") ?? "";
  const fallback = single && isSize(single) ? single : "M";
  return Array.from({ length: safeQty }, () => fallback);
}

export function serializeOrderSizes(sizes: Size[]): string {
  return sizes.join(",");
}

const MODEL_IDS: readonly ProductModelId[] = ["edicao-sagrada", "edicao-canarinho"];

function isProductModelId(value: string): value is ProductModelId {
  return (MODEL_IDS as readonly string[]).includes(value);
}

export function parseOrderModels(
  searchParams: { get: (key: string) => string | null },
  quantity: number
): ProductModelId[] {
  const safeQty = quantity > 0 ? quantity : 1;
  const rawList = searchParams.get("modelos");
  if (rawList) {
    const parts = rawList.split(",").map((p) => p.trim()).filter(Boolean);
    const fallback: ProductModelId =
      parts[0] && isProductModelId(parts[0]) ? parts[0] : "edicao-sagrada";
    return Array.from({ length: safeQty }, (_, i) => {
      const p = parts[i];
      return p && isProductModelId(p) ? p : fallback;
    });
  }
  const single = searchParams.get("modelo") ?? "";
  const fallback: ProductModelId = isProductModelId(single) ? single : "edicao-sagrada";
  return Array.from({ length: safeQty }, () => fallback);
}

export function serializeOrderModels(models: ProductModelId[]): string {
  return models.join(",");
}
