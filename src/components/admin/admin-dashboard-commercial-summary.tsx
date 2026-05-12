import type { LeadStatusCounts, OrderStatusCounts } from "@/types/admin";
import { cn } from "@/lib/utils";

type Segment = { key: string; label: string; count: number; barClass: string; dotClass: string };

function Bar({ segments, total }: { segments: Segment[]; total: number }) {
  if (total <= 0) {
    return (
      <div className="h-2.5 rounded-full bg-white/[0.06]" aria-hidden>
        <span className="sr-only">Sem dados para exibir</span>
      </div>
    );
  }

  return (
    <div
      className="flex h-2.5 overflow-hidden rounded-full bg-white/[0.06]"
      role="img"
      aria-label={`Distribuição: ${segments.map((s) => `${s.label} ${s.count}`).join(", ")}`}
    >
      {segments.map((s) =>
        s.count > 0 ? (
          <div
            key={s.key}
            className={cn("min-w-0 transition-[width] duration-300", s.barClass)}
            style={{ width: `${(s.count / total) * 100}%` }}
            title={`${s.label}: ${s.count}`}
          />
        ) : null
      )}
    </div>
  );
}

function Legend({ segments }: { segments: Segment[] }) {
  return (
    <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[12px] text-muted-foreground">
      {segments.map((s) => (
        <li key={s.key} className="flex items-center gap-2">
          <span className={cn("h-2 w-2 shrink-0 rounded-full", s.dotClass)} aria-hidden />
          <span>
            {s.label}{" "}
            <strong className="font-semibold text-foreground/90">{s.count}</strong>
          </span>
        </li>
      ))}
    </ul>
  );
}

type AdminDashboardCommercialSummaryProps = {
  leadStatusCounts: LeadStatusCounts;
  orderStatusCounts: OrderStatusCounts;
};

export function AdminDashboardCommercialSummary({
  leadStatusCounts,
  orderStatusCounts,
}: AdminDashboardCommercialSummaryProps) {
  const leadSegments: Segment[] = [
    { key: "novo", label: "Novo", count: leadStatusCounts.novo, barClass: "bg-emerald-500/70", dotClass: "bg-emerald-400/90" },
    {
      key: "em_contato",
      label: "Em contato",
      count: leadStatusCounts.em_contato,
      barClass: "bg-sky-500/70",
      dotClass: "bg-sky-400/90",
    },
    {
      key: "convertido",
      label: "Convertido",
      count: leadStatusCounts.convertido,
      barClass: "bg-gold/80",
      dotClass: "bg-gold-bright/90",
    },
    { key: "perdido", label: "Perdido", count: leadStatusCounts.perdido, barClass: "bg-white/25", dotClass: "bg-muted-foreground/80" },
  ];

  const orderSegments: Segment[] = [
    { key: "pago", label: "Pago", count: orderStatusCounts.pago, barClass: "bg-emerald-500/75", dotClass: "bg-emerald-400/90" },
    {
      key: "pendente",
      label: "Pendente",
      count: orderStatusCounts.pendente,
      barClass: "bg-amber-500/75",
      dotClass: "bg-amber-400/90",
    },
    {
      key: "cancelado",
      label: "Cancelado",
      count: orderStatusCounts.cancelado,
      barClass: "bg-red-500/65",
      dotClass: "bg-red-400/85",
    },
  ];

  const leadsTotal = leadSegments.reduce((a, s) => a + s.count, 0);
  const ordersTotal = orderSegments.reduce((a, s) => a + s.count, 0);

  return (
    <div className="grid gap-4 sm:gap-5 lg:grid-cols-2">
      <div className="admin-stat-surface">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/90">Funil de leads</p>
        <p className="mt-1 text-[13px] text-muted-foreground">Status na base carregada ({leadsTotal} lead{leadsTotal === 1 ? "" : "s"}).</p>
        <div className="mt-4">
          <Bar segments={leadSegments} total={leadsTotal} />
          <Legend segments={leadSegments} />
        </div>
      </div>
      <div className="admin-stat-surface">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/90">Pagamento (leads)</p>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Última venda ligada a cada lead — reflete webhook Pix e funil ({ordersTotal} com status de pagamento).
        </p>
        <div className="mt-4">
          <Bar segments={orderSegments} total={ordersTotal} />
          <Legend segments={orderSegments} />
        </div>
      </div>
    </div>
  );
}
