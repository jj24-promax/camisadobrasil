import type { DashboardKpis, Lead, LeadStatus, OrderStatus, Sale } from "@/types/admin";

const LEAD_STATUSES: LeadStatus[] = ["novo", "em_contato", "convertido", "perdido"];
const ORDER_STATUSES: OrderStatus[] = ["pago", "pendente", "cancelado"];

/** Nomes normalizados excluídos dos totais de faturamento / pagamento (ex.: testes internos). */
const EXCLUDED_FROM_PAYMENT_METRICS_NAMES = new Set(["paulo borba"]);

function emptyLeadStatusCounts(): DashboardKpis["leadStatusCounts"] {
  return { novo: 0, em_contato: 0, convertido: 0, perdido: 0 };
}

function emptyOrderStatusCounts(): DashboardKpis["orderStatusCounts"] {
  return { pago: 0, pendente: 0, cancelado: 0 };
}

function normalizedDisplayName(name: string | undefined | null): string {
  return (name ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function isExcludedFromPaymentMetrics(name: string | undefined | null): boolean {
  const n = normalizedDisplayName(name);
  return n.length > 0 && EXCLUDED_FROM_PAYMENT_METRICS_NAMES.has(n);
}

function monthBounds(now: Date): { start: Date; end: Date } {
  const y = now.getFullYear();
  const m = now.getMonth();
  const start = new Date(y, m, 1, 0, 0, 0, 0);
  const end = new Date(y, m + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

function isSaleInMonth(sale: Sale, start: Date, end: Date): boolean {
  const t = new Date(sale.date).getTime();
  if (Number.isNaN(t)) return false;
  return t >= start.getTime() && t <= end.getTime();
}

/**
 * KPIs do dashboard a partir da lista de leads (limite Supabase) e, quando fornecida, da lista de vendas.
 *
 * - Funil de leads: sempre a partir de `leads`.
 * - Barras "Pagamento (leads)": última venda por lead, **excluindo** nomes em `EXCLUDED_FROM_PAYMENT_METRICS_NAMES`.
 * - Faturamento / pedidos / ticket do **mês corrente**: pela **data da venda** em `sales` (não pela criação do lead),
 *   com a mesma exclusão por nome (cliente na venda ou nome do lead ligado).
 */
export function computeDashboardKpisFromData(leads: Lead[], sales?: Sale[], now = new Date()): DashboardKpis {
  const { start, end } = monthBounds(now);

  let revenueMonthCents = 0;
  let paidOrdersMonth = 0;
  let ordersMonth = 0;

  if (sales && sales.length > 0) {
    const leadById = new Map(leads.map((l) => [l.id, l]));
    const monthSales = sales.filter((s) => {
      if (!isSaleInMonth(s, start, end)) return false;
      if (isExcludedFromPaymentMetrics(s.customer)) return false;
      const lid = s.leadId?.trim();
      if (lid) {
        const lead = leadById.get(lid);
        if (lead && isExcludedFromPaymentMetrics(lead.name)) return false;
      }
      return true;
    });
    const paidList = monthSales.filter((s) => s.status === "pago");
    revenueMonthCents = paidList.reduce((acc, s) => acc + (Number.isFinite(s.amountCents) ? s.amountCents : 0), 0);
    paidOrdersMonth = paidList.length;
    ordersMonth = monthSales.filter((s) => s.status === "pago" || s.status === "pendente").length;
  } else {
    const leadsMes = leads.filter((l) => {
      const d = new Date(l.createdAt);
      return !Number.isNaN(d.getTime()) && d >= start && d <= end;
    });
    const leadsMesCounting = leadsMes.filter((l) => !isExcludedFromPaymentMetrics(l.name));
    const withPixStatus = leadsMesCounting.filter((l) => l.paymentStatus === "pago" || l.paymentStatus === "pendente");
    const paidMes = leadsMesCounting.filter((l) => l.paymentStatus === "pago");
    revenueMonthCents = paidMes.reduce((acc, l) => acc + (l.paymentAmountCents ?? 0), 0);
    paidOrdersMonth = paidMes.length;
    ordersMonth = withPixStatus.length;
  }

  const averageTicketCents = paidOrdersMonth > 0 ? Math.round(revenueMonthCents / paidOrdersMonth) : 0;

  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const newLeadsWeek = leads.filter((l) => {
    const d = new Date(l.createdAt);
    return !Number.isNaN(d.getTime()) && d >= weekAgo;
  }).length;

  const converted = leads.filter((l) => l.status === "convertido").length;
  const conversionRate = leads.length > 0 ? Math.round((converted / leads.length) * 1000) / 10 : 0;

  const leadStatusCounts = emptyLeadStatusCounts();
  for (const l of leads) {
    if (LEAD_STATUSES.includes(l.status)) leadStatusCounts[l.status] += 1;
  }

  const orderStatusCounts = emptyOrderStatusCounts();
  for (const l of leads) {
    if (isExcludedFromPaymentMetrics(l.name)) continue;
    const st = l.paymentStatus;
    if (st && ORDER_STATUSES.includes(st)) orderStatusCounts[st] += 1;
  }

  return {
    revenueMonthCents,
    ordersMonth,
    paidOrdersMonth,
    averageTicketCents,
    newLeadsWeek,
    totalLeads: leads.length,
    conversionRate,
    convertedLeadsCount: converted,
    leadStatusCounts,
    orderStatusCounts,
  };
}
