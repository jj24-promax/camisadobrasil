/**
 * Snapshot gravado em `vendas.detalhes_pedido` para o painel admin.
 * `v` permite evoluir o formato sem quebrar leituras antigas.
 */

export type OrderSnapshotLine = {
  index: number;
  modelId: string;
  modelName: string;
  size: string;
  unitPriceCents: number;
};

export type OrderSnapshotBump = {
  id: string;
  title: string;
  priceCents: number;
};

export type OrderSnapshotPersonalization = {
  masterEnabled: boolean;
  paidPerShirt: boolean[];
  giftShirtFreePersonalization: boolean;
  /** Cliente pediu camisa sem número estampado na frente nem nas costas (sem custo; exclui extra pago nome+número). */
  preferNoPrintedNumbersFrontBack?: boolean;
  names: string[];
  numbers: string[];
};

export type OrderSnapshotPricing = {
  subtotalCents: number;
  itemDiscountCents: number;
  bumpsTotalCents: number;
  personalizationCents: number;
  baseTotalCents: number;
  retentionDiscountCents: number;
  finalTotalCents: number;
};

export type OrderSnapshotShipping = {
  cep: string;
  city: string;
  state: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
};

export type PosCompraUpsellSnapshot = {
  cap: boolean;
  bag: boolean;
  cup: boolean;
  labels: string[];
  amountCents: number;
  pixTransactionId: string;
  recordedAt: string;
};

export type OrderCheckoutSnapshotV1 = {
  v: 1;
  capturedAt: string;
  product: { id: string; name: string };
  quantity: number;
  lines: OrderSnapshotLine[];
  orderBumps: OrderSnapshotBump[];
  personalization: OrderSnapshotPersonalization;
  retention: { active: boolean; discountCents: number; percent?: number };
  pricing: OrderSnapshotPricing;
  shipping: OrderSnapshotShipping;
  posCompraUpsells: PosCompraUpsellSnapshot[];
  utm?: Record<string, string>;
  /**
   * Servidor: ids extraídos do EMV + id do gateway na criação — conciliação com webhook
   * quando o id na URL do Pix (ex. onlyup) difere do `idTransaction` do JSON.
   */
  _pixCorrelationIds?: string[];
};

export type OrderCheckoutSnapshot = OrderCheckoutSnapshotV1;

export function orderSnapshotSearchText(s: OrderCheckoutSnapshotV1): string {
  const parts: string[] = [
    s.product.name,
    ...s.lines.map((l) => `${l.modelName} ${l.size}`),
    ...s.orderBumps.map((b) => b.title),
    ...s.posCompraUpsells.flatMap((u) => u.labels),
  ];
  if (s.personalization.preferNoPrintedNumbersFrontBack) {
    parts.push("sem número frente costas personalização limpa");
  }
  if (s.utm) {
    for (const [k, v] of Object.entries(s.utm)) {
      parts.push(k, v);
    }
  }
  return parts.join(" ").toLowerCase();
}

export function isOrderCheckoutSnapshotV1(v: unknown): v is OrderCheckoutSnapshotV1 {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const o = v as Record<string, unknown>;
  if (Number(o.v) !== 1) return false;
  if (typeof o.capturedAt !== "string") return false;
  if (typeof o.quantity !== "number") return false;
  if (!o.pricing || typeof o.pricing !== "object") return false;
  const p = o.pricing as Record<string, unknown>;
  if (typeof p.finalTotalCents !== "number") return false;
  return true;
}

/** Aceita objeto do cliente após `JSON.parse` — descarta entradas inválidas ou maliciosas. */
export function parseOrderCheckoutSnapshotFromApi(body: unknown): OrderCheckoutSnapshotV1 | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const raw = body as Record<string, unknown>;
  if (Number(raw.v) !== 1) return null;

  const linesIn = raw.lines;
  const lines: OrderSnapshotLine[] = [];
  if (Array.isArray(linesIn)) {
    for (const item of linesIn) {
      if (!item || typeof item !== "object") continue;
      const L = item as Record<string, unknown>;
      const index = typeof L.index === "number" ? Math.floor(L.index) : 0;
      const modelId = typeof L.modelId === "string" ? L.modelId.slice(0, 64) : "";
      const modelName = typeof L.modelName === "string" ? L.modelName.slice(0, 120) : "";
      const size = typeof L.size === "string" ? L.size.slice(0, 32) : "";
      const unitPriceCents =
        typeof L.unitPriceCents === "number" && Number.isFinite(L.unitPriceCents) ? Math.round(L.unitPriceCents) : 0;
      lines.push({ index, modelId, modelName, size, unitPriceCents });
    }
  }

  const bumpsIn = raw.orderBumps;
  const orderBumps: OrderSnapshotBump[] = [];
  if (Array.isArray(bumpsIn)) {
    for (const b of bumpsIn) {
      if (!b || typeof b !== "object") continue;
      const B = b as Record<string, unknown>;
      const id = typeof B.id === "string" ? B.id.slice(0, 64) : "";
      const title = typeof B.title === "string" ? B.title.slice(0, 200) : "";
      const priceCents =
        typeof B.priceCents === "number" && Number.isFinite(B.priceCents) ? Math.round(B.priceCents) : 0;
      if (!id || !title) continue;
      orderBumps.push({ id, title, priceCents });
    }
  }

  const persIn = raw.personalization;
  let personalization: OrderSnapshotPersonalization = {
    masterEnabled: false,
    paidPerShirt: [],
    giftShirtFreePersonalization: false,
    preferNoPrintedNumbersFrontBack: undefined,
    names: [],
    numbers: [],
  };
  if (persIn && typeof persIn === "object" && !Array.isArray(persIn)) {
    const P = persIn as Record<string, unknown>;
    personalization = {
      masterEnabled: P.masterEnabled === true,
      paidPerShirt: Array.isArray(P.paidPerShirt)
        ? (P.paidPerShirt as unknown[]).map((x) => x === true).slice(0, 24)
        : [],
      giftShirtFreePersonalization: P.giftShirtFreePersonalization === true,
      preferNoPrintedNumbersFrontBack: P.preferNoPrintedNumbersFrontBack === true ? true : undefined,
      names: Array.isArray(P.names)
        ? (P.names as unknown[])
            .map((x) => (typeof x === "string" ? x.slice(0, 80) : ""))
            .slice(0, 24)
        : [],
      numbers: Array.isArray(P.numbers)
        ? (P.numbers as unknown[])
            .map((x) => (typeof x === "string" ? x.slice(0, 8) : ""))
            .slice(0, 24)
        : [],
    };
  }

  const retIn = raw.retention;
  let retention = { active: false, discountCents: 0, percent: undefined as number | undefined };
  if (retIn && typeof retIn === "object" && !Array.isArray(retIn)) {
    const R = retIn as Record<string, unknown>;
    retention = {
      active: R.active === true,
      discountCents:
        typeof R.discountCents === "number" && Number.isFinite(R.discountCents) ? Math.max(0, Math.round(R.discountCents)) : 0,
      percent:
        typeof R.percent === "number" && Number.isFinite(R.percent) ? Math.round(R.percent) : undefined,
    };
  }

  const priceIn = raw.pricing;
  if (!priceIn || typeof priceIn !== "object" || Array.isArray(priceIn)) return null;
  const PR = priceIn as Record<string, unknown>;
  const num = (k: string) =>
    typeof PR[k] === "number" && Number.isFinite(PR[k] as number) ? Math.round(PR[k] as number) : 0;
  const pricing: OrderSnapshotPricing = {
    subtotalCents: num("subtotalCents"),
    itemDiscountCents: num("itemDiscountCents"),
    bumpsTotalCents: num("bumpsTotalCents"),
    personalizationCents: num("personalizationCents"),
    baseTotalCents: num("baseTotalCents"),
    retentionDiscountCents: num("retentionDiscountCents"),
    finalTotalCents: num("finalTotalCents"),
  };

  const shipIn = raw.shipping;
  let shipping: OrderSnapshotShipping = {
    cep: "",
    city: "",
    state: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
  };
  if (shipIn && typeof shipIn === "object" && !Array.isArray(shipIn)) {
    const S = shipIn as Record<string, unknown>;
    const s = (k: string, max = 200) => (typeof S[k] === "string" ? (S[k] as string).slice(0, max) : "");
    shipping = {
      cep: s("cep", 16).replace(/\D/g, "").slice(0, 8),
      city: s("city", 120),
      state: s("state", 2).replace(/\s/g, "").toUpperCase().slice(0, 2),
      street: s("street", 200),
      number: s("number", 32),
      complement: s("complement", 120),
      neighborhood: s("neighborhood", 120),
    };
  }

  const prodIn = raw.product;
  let product = { id: "camisa-brasil-estilizada", name: "Camisa do Brasil Estilizada" };
  if (prodIn && typeof prodIn === "object" && !Array.isArray(prodIn)) {
    const G = prodIn as Record<string, unknown>;
    product = {
      id: typeof G.id === "string" ? G.id.slice(0, 80) : product.id,
      name: typeof G.name === "string" ? G.name.slice(0, 160) : product.name,
    };
  }

  const upsIn = raw.posCompraUpsells;
  const posCompraUpsells: PosCompraUpsellSnapshot[] = [];
  if (Array.isArray(upsIn)) {
    for (const u of upsIn) {
      if (!u || typeof u !== "object") continue;
      const U = u as Record<string, unknown>;
      if (typeof U.pixTransactionId !== "string") continue;
      posCompraUpsells.push({
        cap: U.cap === true,
        bag: U.bag === true,
        cup: U.cup === true,
        labels: Array.isArray(U.labels)
          ? (U.labels as unknown[]).map((x) => (typeof x === "string" ? x.slice(0, 80) : "")).slice(0, 8)
          : [],
        amountCents:
          typeof U.amountCents === "number" && Number.isFinite(U.amountCents) ? Math.round(U.amountCents) : 0,
        pixTransactionId: U.pixTransactionId.slice(0, 128),
        recordedAt:
          typeof U.recordedAt === "string" ? U.recordedAt.slice(0, 40) : new Date().toISOString(),
      });
    }
  }

  let utm: Record<string, string> | undefined;
  const utmIn = raw.utm;
  if (utmIn && typeof utmIn === "object" && !Array.isArray(utmIn)) {
    const entries = Object.entries(utmIn as Record<string, unknown>)
      .filter(([k, val]) => typeof k === "string" && k.length <= 64 && typeof val === "string" && val.length <= 512)
      .slice(0, 40);
    if (entries.length > 0) utm = Object.fromEntries(entries as [string, string][]);
  }

  const quantity = typeof raw.quantity === "number" && raw.quantity > 0 ? Math.min(99, Math.floor(raw.quantity)) : 1;

  return {
    v: 1,
    capturedAt: typeof raw.capturedAt === "string" ? raw.capturedAt.slice(0, 40) : new Date().toISOString(),
    product,
    quantity,
    lines: lines.slice(0, 32),
    orderBumps: orderBumps.slice(0, 32),
    personalization,
    retention,
    pricing,
    shipping,
    posCompraUpsells: posCompraUpsells.slice(0, 16),
    utm,
  };
}
