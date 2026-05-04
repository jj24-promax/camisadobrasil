import type { LeadGeographySummary } from "@/lib/admin/leads-geography";
import { cn } from "@/lib/utils";

const BAR_SEGMENTS: { bar: string; dot: string }[] = [
  { bar: "bg-gold/80", dot: "bg-gold-bright/90" },
  { bar: "bg-emerald-500/75", dot: "bg-emerald-400/90" },
  { bar: "bg-sky-500/72", dot: "bg-sky-400/90" },
  { bar: "bg-violet-500/70", dot: "bg-violet-400/90" },
  { bar: "bg-amber-500/72", dot: "bg-amber-400/90" },
  { bar: "bg-rose-500/68", dot: "bg-rose-400/85" },
  { bar: "bg-teal-500/68", dot: "bg-teal-400/85" },
  { bar: "bg-orange-500/68", dot: "bg-orange-400/85" },
];

function GeoBar({
  segments,
  total,
}: {
  segments: { key: string; count: number; barClass: string }[];
  total: number;
}) {
  if (total <= 0) {
    return (
      <div className="h-2.5 rounded-full bg-white/[0.06]" aria-hidden>
        <span className="sr-only">Sem distribuição por estado.</span>
      </div>
    );
  }

  return (
    <div
      className="flex h-2.5 overflow-hidden rounded-full bg-white/[0.06]"
      role="img"
      aria-label={`Distribuição por estado: ${segments.map((s) => `${s.key} ${s.count}`).join(", ")}`}
    >
      {segments.map((s) =>
        s.count > 0 ? (
          <div
            key={s.key}
            className={cn("min-w-0 transition-[width] duration-300", s.barClass)}
            style={{ width: `${(s.count / total) * 100}%` }}
            title={`${s.key}: ${s.count}`}
          />
        ) : null
      )}
    </div>
  );
}

type AdminLeadsGeographyProps = {
  data: LeadGeographySummary;
};

export function AdminLeadsGeography({ data }: AdminLeadsGeographyProps) {
  const { states, totalLeads, unknownStateCount } = data;

  const barTotal = states.reduce((a, s) => a + s.count, 0) + unknownStateCount;
  const barSegments = [
    ...states.map((s, i) => ({
      key: s.uf,
      count: s.count,
      barClass: BAR_SEGMENTS[i % BAR_SEGMENTS.length]!.bar,
    })),
    ...(unknownStateCount > 0
      ? [{ key: "?", count: unknownStateCount, barClass: "bg-white/30" as const }]
      : []),
  ];

  const legendItems = [
    ...states.map((s, i) => ({
      key: s.uf,
      label: s.displayLabel,
      count: s.count,
      dotClass: BAR_SEGMENTS[i % BAR_SEGMENTS.length]!.dot,
    })),
    ...(unknownStateCount > 0
      ? [
          {
            key: "sem-uf",
            label: "Sem UF / inválido",
            count: unknownStateCount,
            dotClass: "bg-muted-foreground/70",
          },
        ]
      : []),
  ];

  if (totalLeads === 0) {
    return (
      <div className="admin-stat-surface">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/90">Leads por estado</p>
        <p className="mt-3 text-[13px] text-muted-foreground">Nenhum lead na base para agrupar.</p>
      </div>
    );
  }

  return (
    <div className="admin-stat-surface">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/90">
        Leads por estado e cidade
      </p>
      <p className="mt-1 text-[13px] text-muted-foreground">
        {totalLeads} lead{totalLeads === 1 ? "" : "s"} na base — ordenados pelo total por UF (maior primeiro).
        {unknownStateCount > 0 ? (
          <span className="text-amber-200/90">
            {" "}
            · {unknownStateCount} sem UF válida para agrupamento
          </span>
        ) : null}
      </p>

      {barTotal > 0 ? (
        <div className="mt-5">
          <GeoBar segments={barSegments} total={barTotal} />
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[12px] text-muted-foreground">
            {legendItems.map((item) => (
              <li key={item.key} className="flex max-w-[min(100%,220px)] items-start gap-2">
                <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", item.dotClass)} aria-hidden />
                <span className="leading-snug">
                  <span className="text-foreground/90">{item.label}</span>{" "}
                  <strong className="font-semibold text-foreground/95">{item.count}</strong>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {states.length > 0 ? (
        <div className="mt-6 overflow-x-auto rounded-xl border border-white/[0.08] bg-white/[0.02]">
          <table className="w-full min-w-[520px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-white/[0.08] text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                <th className="whitespace-nowrap px-4 py-3 font-semibold">UF</th>
                <th className="whitespace-nowrap px-3 py-3 font-semibold tabular-nums">Leads</th>
                <th className="px-3 py-3 font-semibold">%</th>
                <th className="min-w-[220px] px-3 py-3 font-semibold">Principais cidades</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {states.map((s) => {
                const pctOfAll = totalLeads > 0 ? Math.round((s.count / totalLeads) * 1000) / 10 : 0;
                const topCities = s.cities.slice(0, 6);
                const rest = s.cities.length - topCities.length;
                const cityLine = topCities.map((c) => `${c.label} (${c.count})`).join(" · ");

                return (
                  <tr key={s.uf} className="hover:bg-white/[0.03]">
                    <td className="whitespace-nowrap px-4 py-3 align-top font-medium text-foreground/95">
                      <span title={s.displayLabel}>{s.uf}</span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 align-top font-display text-base tabular-nums font-semibold text-gold-bright/95">
                      {s.count}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 align-top text-muted-foreground tabular-nums">
                      {pctOfAll}%
                    </td>
                    <td className="px-3 py-3 align-top text-[12px] leading-relaxed text-muted-foreground">
                      <span className="text-foreground/85">{cityLine}</span>
                      {rest > 0 ? (
                        <span className="text-muted-foreground/80"> · +{rest} outra{rest === 1 ? "" : "s"}</span>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-4 text-[13px] text-muted-foreground">
          Nenhum lead possui campo de estado com UF válida (ex.: RJ, SP). Confira os dados importados ou o checkout.
        </p>
      )}
    </div>
  );
}
