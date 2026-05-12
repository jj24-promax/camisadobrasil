import type { DashboardKpis, Lead, LeadStatus, OrderStatus } from "@/types/admin";

const LEAD_STATUSES: LeadStatus[] = ["novo", "em_contato", "convertido", "perdido"];
const ORDER_STATUSES: OrderStatus[] = ["pago", "pendente", "cancelado"];

function emptyLeadStatusCounts(): DashboardKpis["leadStatusCounts"] {
  return { novo: 0, em_contato: 0, convertido: 0, perdido: 0 };
}

function emptyOrderStatusCounts(): DashboardKpis["orderStatusCounts"] {
  return { pago: 0, pendente: 0, cancelado: 0 };
}

/**
 * KPIs do dashboard a partir da lista de leads (limite Supabase).
 * Métricas de faturamento / pedidos do mês usam `paymentStatus` e `paymentAmountCents`
 * da última venda associada (mesmo critério da lista de leads), filtradas por `createdAt` do lead no mês.
 */
export function computeDashboardKpisFromData(leads: Lead[], now = new Date()): DashboardKpis {
  const y = now.getFullYear();
  const m = now.getMonth();
  const start = new Date(y, m, 1, 0, 0, 0, 0);
  const end = new Date(y, m + 1, 0, 23, 59, 59, 999);

  const leadsMes = leads.filter((l) => {
    const d = new Date(l.createdAt);
    return !Number.isNaN(d.getTime()) && d >= start && d <= end;
  });

  const withPixStatus = leadsMes.filter((l) => l.paymentStatus === "pago" || l.paymentStatus === "pendente");
  const paidMes = leadsMes.filter((l) => l.paymentStatus === "pago");
  const revenueMonthCents = paidMes.reduce((acc, l) => acc + (l.paymentAmountCents ?? 0), 0);
  const paidOrdersMonth = paidMes.length;
  const ordersMonth = withPixStatus.length;
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
