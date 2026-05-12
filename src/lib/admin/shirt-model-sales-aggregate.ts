import type { Sale } from "@/types/admin";

export type ShirtModelBreakdownRow = {
  /** Chave estável (modelId ou nome normalizado). */
  key: string;
  /** Nome apresentável (ex.: “Edição Canarinho”). */
  label: string;
  /** Unidades = linhas no snapshot (1 por camisa). */
  count: number;
};

function stableKeyFromLine(modelId: string, modelName: string): string {
  const id = modelId.trim();
  if (id) return `id:${id}`;
  const name = modelName.trim().toLowerCase().replace(/\s+/g, " ");
  return `name:${name}`;
}

/**
 * Conta camisas por modelo a partir de `vendas` com `orderDetails.lines`.
 * Cada entrada em `lines` conta como 1 unidade (como no checkout).
 */
export function aggregateShirtModelsFromSales(
  sales: Sale[],
  opts?: { onlyPaid?: boolean }
): { rows: ShirtModelBreakdownRow[]; totalUnits: number; ordersWithSnapshot: number } {
  const onlyPaid = opts?.onlyPaid !== false;
  const map = new Map<string, { label: string; count: number }>();
  let ordersWithSnapshot = 0;

  for (const sale of sales) {
    if (onlyPaid && sale.status !== "pago") continue;
    const lines = sale.orderDetails?.lines;
    if (!lines || lines.length === 0) continue;
    ordersWithSnapshot += 1;

    for (const line of lines) {
      const label = (line.modelName ?? "").trim() || "Modelo sem nome";
      const key = stableKeyFromLine(line.modelId ?? "", label);
      const cur = map.get(key);
      if (cur) {
        cur.count += 1;
      } else {
        map.set(key, { label, count: 1 });
      }
    }
  }

  const rows = [...map.entries()]
    .map(([key, v]) => ({ key, label: v.label, count: v.count }))
    .sort((a, b) => b.count - a.count);

  const totalUnits = rows.reduce((a, r) => a + r.count, 0);
  return { rows, totalUnits, ordersWithSnapshot };
}
