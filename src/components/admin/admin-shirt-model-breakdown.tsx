import { Shirt } from "lucide-react";

import type { ShirtModelBreakdownRow } from "@/lib/admin/shirt-model-sales-aggregate";
import { cn } from "@/lib/utils";

type AdminShirtModelBreakdownProps = {
  rows: ShirtModelBreakdownRow[];
  totalUnits: number;
  ordersWithSnapshot: number;
  /** Total de vendas consideradas (ex.: só pagas). */
  ordersConsidered: number;
};

export function AdminShirtModelBreakdown({
  rows,
  totalUnits,
  ordersWithSnapshot,
  ordersConsidered,
}: AdminShirtModelBreakdownProps) {
  return (
    <div className="admin-stat-surface">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/90">
            Camisas por modelo
          </p>
          <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">
            Soma das linhas do carrinho em pedidos <strong className="font-medium text-foreground/90">pagos</strong> que
            têm <code className="rounded bg-black/35 px-1 font-mono text-[11px]">detalhes_pedido</code> gravado. Pedidos
            sem snapshot não entram nesta tabela.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2">
          <Shirt className="h-4 w-4 text-gold-bright/90" aria-hidden />
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Unidades</p>
            <p className="font-display text-lg font-semibold tabular-nums text-foreground">{totalUnits}</p>
          </div>
        </div>
      </div>

      <p className="mt-2 text-[12px] text-muted-foreground/90">
        {ordersWithSnapshot} pedido{ordersWithSnapshot === 1 ? "" : "s"} com snapshot · {ordersConsidered} pedido
        {ordersConsidered === 1 ? "" : "s"} pagos na base carregada
      </p>

      {rows.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-white/[0.1] bg-white/[0.02] py-10 text-center text-sm text-muted-foreground">
          Nenhuma unidade contabilizada. Quando houver vendas pagas com snapshot de linhas (modelo + tamanho), os
          totais aparecem aqui.
        </p>
      ) : (
        <ul className="mt-5 space-y-3">
          {rows.map((r) => (
            <li key={r.key} className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 sm:px-4">
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate font-medium text-foreground/95" title={r.label}>
                  {r.label}
                </span>
                <span className="shrink-0 font-display text-base font-semibold tabular-nums text-gold-bright/95">
                  {r.count}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className={cn("h-full rounded-full bg-gradient-to-r from-gold/50 to-gold-bright/80")}
                  style={{
                    width: `${totalUnits > 0 ? Math.max(5, Math.round((r.count / totalUnits) * 100)) : 0}%`,
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
