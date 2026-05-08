"use client";

import { formatBRL } from "@/lib/admin-format";
import type { OrderCheckoutSnapshotV1 } from "@/types/order-snapshot";

export type AdminOrderDetailsViewProps = {
  snapshot: OrderCheckoutSnapshotV1;
};

export function AdminOrderDetailsView({ snapshot }: AdminOrderDetailsViewProps) {
  const p = snapshot.pricing;
  return (
    <div className="max-h-[min(70vh,520px)] space-y-5 overflow-y-auto pr-1 text-left">
      <section className="space-y-2 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3.5">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Camisas</h3>
        <ul className="space-y-1.5 text-sm text-foreground/95">
          {snapshot.lines.map((line) => (
            <li
              key={`${line.index}-${line.modelId}`}
              className="flex flex-wrap justify-between gap-2 border-b border-white/[0.04] pb-1.5 last:border-0 last:pb-0"
            >
              <span>
                Un. {line.index + 1}: {line.modelName} · tam. {line.size}
              </span>
              <span className="tabular-nums text-muted-foreground">{formatBRL(line.unitPriceCents)}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">Quantidade total no snapshot: {snapshot.quantity}</p>
      </section>

      <section className="space-y-2 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3.5">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Order bumps / extras</h3>
        {snapshot.orderBumps.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum extra marcado.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {snapshot.orderBumps.map((b) => (
              <li key={b.id} className="flex justify-between gap-2">
                <span className="text-foreground/90">{b.title}</span>
                <span className="tabular-nums text-gold-bright/90">{formatBRL(b.priceCents)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3.5">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Personalização</h3>
        <p className="text-sm text-foreground/90">
          Bloco ativo: {snapshot.personalization.masterEnabled ? "sim" : "não"}
          {snapshot.personalization.giftShirtFreePersonalization ? " · presente com nome grátis" : ""}
        </p>
        {snapshot.personalization.names.some((n) => n.trim()) ? (
          <ul className="space-y-1 text-xs text-muted-foreground">
            {snapshot.personalization.names.map((n, i) => (
              <li key={i}>
                Camisa {i + 1}: {n.trim() || "—"} · nº {snapshot.personalization.numbers[i]?.trim() || "—"}
                {snapshot.personalization.paidPerShirt[i] ? " (paga)" : ""}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">Sem nomes gravados no snapshot.</p>
        )}
      </section>

      <section className="space-y-2 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3.5">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Totais (checkout)</h3>
        <ul className="grid gap-1 text-xs sm:grid-cols-2">
          <Row label="Subtotal" value={formatBRL(p.subtotalCents)} />
          <Row label="Desconto itens" value={formatBRL(p.itemDiscountCents)} />
          <Row label="Extras (bumps)" value={formatBRL(p.bumpsTotalCents)} />
          <Row label="Personalização" value={formatBRL(p.personalizationCents)} />
          <Row label="Base" value={formatBRL(p.baseTotalCents)} />
          <Row
            label={`Retenção${snapshot.retention.percent != null ? ` (${snapshot.retention.percent}%)` : ""}`}
            value={`− ${formatBRL(p.retentionDiscountCents)}`}
          />
          <Row label="Total final" value={formatBRL(p.finalTotalCents)} strong />
        </ul>
      </section>

      <section className="space-y-2 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3.5">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Entrega (endereço)</h3>
        <p className="text-sm leading-relaxed text-foreground/90">
          {snapshot.shipping.street}, {snapshot.shipping.number}
          {snapshot.shipping.complement ? ` — ${snapshot.shipping.complement}` : ""}
          <br />
          {snapshot.shipping.neighborhood} · {snapshot.shipping.city}/{snapshot.shipping.state}
          <br />
          CEP {snapshot.shipping.cep}
        </p>
      </section>

      <section className="space-y-2 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3.5">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Upsells pós-compra</h3>
        {snapshot.posCompraUpsells.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum Pix de adicionais registrado (ou ainda não gerado).</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {snapshot.posCompraUpsells.map((u, i) => (
              <li key={`${u.pixTransactionId}-${i}`} className="rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2">
                <p className="font-medium text-foreground/95">{u.labels.join(" · ")}</p>
                <p className="text-xs text-muted-foreground">
                  {formatBRL(u.amountCents)} · Pix ID {u.pixTransactionId.slice(0, 24)}
                  {u.pixTransactionId.length > 24 ? "…" : ""}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground/80">
                  Registado em {new Date(u.recordedAt).toLocaleString("pt-BR")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {snapshot.utm && Object.keys(snapshot.utm).length > 0 ? (
        <section className="space-y-2 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3.5">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">UTM / parâmetros</h3>
          <ul className="max-h-32 overflow-y-auto text-xs text-muted-foreground">
            {Object.entries(snapshot.utm).map(([k, v]) => (
              <li key={k}>
                <span className="text-foreground/70">{k}:</span> {v}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <li className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? "font-semibold text-gold-bright/95 tabular-nums" : "tabular-nums text-foreground/90"}>{value}</span>
    </li>
  );
}
