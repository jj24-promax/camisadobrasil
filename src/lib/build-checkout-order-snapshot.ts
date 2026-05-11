import { getProductModelById } from "@/lib/product";
import type { OrderCheckoutSnapshotV1 } from "@/types/order-snapshot";
import type { ProductModelId } from "@/lib/product";
import type { Size } from "@/lib/types";

export type CheckoutBumpMeta = { id: string; title: string; priceCents: number };

export function buildCheckoutOrderSnapshotV1(input: {
  product: { id: string; name: string };
  quantity: number;
  orderModels: ProductModelId[];
  orderSizes: Size[];
  selectedBumpIds: string[];
  bumpCatalog: CheckoutBumpMeta[];
  personalizationMaster: boolean;
  shirtPaidPersonalization: boolean[];
  giftFreePersonalization: boolean;
  preferNoPrintedNumbersFrontBack: boolean;
  customNames: string[];
  customNumbers: string[];
  retention: { active: boolean; discountCents: number; percent?: number };
  pricing: OrderCheckoutSnapshotV1["pricing"];
  shipping: OrderCheckoutSnapshotV1["shipping"];
  utmEntries: Record<string, string>;
}): OrderCheckoutSnapshotV1 {
  const lines = input.orderModels.map((modelId, i) => {
    const m = getProductModelById(modelId);
    return {
      index: i,
      modelId,
      modelName: m.name,
      size: input.orderSizes[i] ?? input.orderSizes[0] ?? "M",
      unitPriceCents: Math.round(m.price * 100),
    };
  });

  const orderBumps = input.selectedBumpIds
    .map((id) => input.bumpCatalog.find((b) => b.id === id))
    .filter((b): b is CheckoutBumpMeta => b != null && b.id !== "personalization")
    .map((b) => ({ id: b.id, title: b.title, priceCents: b.priceCents }));

  if (input.personalizationMaster) {
    const pBump = input.bumpCatalog.find((b) => b.id === "personalization");
    const paidLines = input.shirtPaidPersonalization.filter(Boolean).length;
    if (pBump && paidLines > 0) {
      orderBumps.push({
        id: "personalization_lines",
        title: `${pBump.title} (${paidLines} camisa(s))`,
        priceCents: paidLines * pBump.priceCents,
      });
    }
  }

  const utm =
    Object.keys(input.utmEntries).length > 0
      ? Object.fromEntries(Object.entries(input.utmEntries).slice(0, 40))
      : undefined;

  return {
    v: 1,
    capturedAt: new Date().toISOString(),
    product: input.product,
    quantity: input.quantity,
    lines,
    orderBumps,
    personalization: {
      masterEnabled: input.personalizationMaster,
      paidPerShirt: [...input.shirtPaidPersonalization],
      giftShirtFreePersonalization: input.giftFreePersonalization,
      ...(input.preferNoPrintedNumbersFrontBack ? { preferNoPrintedNumbersFrontBack: true } : {}),
      names: [...input.customNames],
      numbers: [...input.customNumbers],
    },
    retention: input.retention,
    pricing: input.pricing,
    shipping: input.shipping,
    posCompraUpsells: [],
    utm,
  };
}
