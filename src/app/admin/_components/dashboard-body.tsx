import "server-only";

import { Banknote, Percent, ShoppingBag, Ticket, UserCheck, Users } from "lucide-react";
import {
  AdminStatCard,
  AdminStatCardsGroup,
  AdminDataTable,
  AdminBadge,
  AdminSectionTitle,
  AdminSalesPerformanceChart,
} from "@/components/admin";
import { AdminDashboardCommercialSummary } from "@/components/admin/admin-dashboard-commercial-summary";
import { AdminLeadsGeography } from "@/components/admin/admin-leads-geography";
import { AdminErrorBanner } from "@/components/admin/admin-error-banner";
import { mockSalesPerformanceByDay, mockSalesPerformanceByWeek } from "@/data/mock";
import { formatBRL, formatDate } from "@/lib/admin-format";
import { cn } from "@/lib/utils";
import { aggregateLeadGeography } from "@/lib/admin/leads-geography";
import { getLeadRowHighlightClass, leadFunnelHighlight } from "@/lib/admin/lead-funnel-highlight";
import { computeDashboardKpisFromData } from "@/lib/supabase/dashboard-kpis";
import { fetchAdminLeads } from "@/lib/supabase/queries";

export async function AdminDashboardBody() {
  const leadsRes = await fetchAdminLeads();

  const warnings: string[] = [];
  if (!leadsRes.ok) warnings.push(`Leads: ${leadsRes.error}`);

  const leads = leadsRes.ok ? leadsRes.data : [];
  const k = computeDashboardKpisFromData(leads);

  const geo = aggregateLeadGeography(leads);
  const leadsRecentes = leads.slice(0, 5);

  return (
    <>
      {warnings.length > 0 ? <AdminErrorBanner messages={warnings} /> : null}

      <section>
        <AdminStatCardsGroup columns={3}>
          <AdminStatCard
            label="Faturamento total"
            value={formatBRL(k.revenueMonthCents)}
            hint="Mês corrente (leads com Pix pago, valor da última venda)"
            icon={Banknote}
          />
          <AdminStatCard
            label="Pedidos no mês"
            value={String(k.ordersMonth)}
            hint={`${k.paidOrdersMonth} pagos · ${k.ordersMonth - k.paidOrdersMonth} Pix pendentes (leads do mês)`}
            icon={ShoppingBag}
          />
          <AdminStatCard
            label="Ticket médio"
            value={formatBRL(k.averageTicketCents)}
            hint="Média dos leads com Pix pago no mês"
            icon={Ticket}
          />
          <AdminStatCard
            label="Total de leads"
            value={String(k.totalLeads)}
            hint={`${k.newLeadsWeek} novos nos últimos 7 dias`}
            icon={Users}
          />
          <AdminStatCard
            label="Taxa de conversão"
            value={`${k.conversionRate}%`}
            hint="Leads convertidos ÷ total na base carregada"
            icon={Percent}
          />
          <AdminStatCard
            label="Leads convertidos"
            value={String(k.convertedLeadsCount)}
            hint="Status “convertido” no funil"
            icon={UserCheck}
          />
        </AdminStatCardsGroup>
      </section>

      <section>
        <AdminDashboardCommercialSummary leadStatusCounts={k.leadStatusCounts} orderStatusCounts={k.orderStatusCounts} />
      </section>

      <section>
        <AdminLeadsGeography data={geo} />
      </section>

      <section>
        <AdminSalesPerformanceChart byDay={mockSalesPerformanceByDay} byWeek={mockSalesPerformanceByWeek} />
      </section>

      <section>
        <AdminSectionTitle title="Leads recentes" subtitle="Últimos contatos registrados no funil." />
        <AdminDataTable
          getRowKey={(r) => r.id}
          getRowClassName={(r) => getLeadRowHighlightClass(r)}
          rows={leadsRecentes}
          emptyMessage={
            leadsRes.ok
              ? "Nenhum lead na base ainda."
              : "Não foi possível listar leads. Verifique o aviso acima."
          }
          columns={[
            {
              key: "name",
              header: "Nome",
              cell: (r) => {
                const tier = leadFunnelHighlight(r);
                return (
                  <span className="inline-flex items-center gap-2 font-medium">
                    {tier ? (
                      <span
                        aria-hidden
                        title={
                          tier === "green"
                            ? "Pagamento aprovado (Pix pago / webhook) ou pós-checkout concluído (obrigado + rastreio)"
                            : "Pix pendente — aguardando confirmação de pagamento"
                        }
                        className={cn(
                          "inline-block h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-offset-2 ring-offset-[#0a0f18]",
                          tier === "green"
                            ? "bg-emerald-400 ring-emerald-400/60"
                            : "bg-amber-400 ring-amber-400/60"
                        )}
                      />
                    ) : null}
                    {r.name}
                  </span>
                );
              },
            },
            { key: "tracking", header: "Rastreio", cell: (r) => <span className="font-mono text-[11px] font-bold text-gold-bright">{r.trackingCode || "—"}</span> },
            { key: "phone", header: "Telefone", cell: (r) => r.phone },
            {
              key: "city",
              header: "Cidade",
              cell: (r) => (
                <span className="max-w-[140px] truncate sm:max-w-[180px]" title={`${r.city} — ${r.state}`}>
                  {r.city} — {r.state}
                </span>
              ),
            },
            {
              key: "status",
              header: "Status",
              cell: (r) => <AdminBadge variant="lead" value={r.status} />,
            },
            {
              key: "createdAt",
              header: "Data",
              cell: (r) => <span className="text-muted-foreground">{formatDate(r.createdAt)}</span>,
            },
          ]}
        />
      </section>
    </>
  );
}
