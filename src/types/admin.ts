import type { OrderCheckoutSnapshotV1 } from "@/types/order-snapshot";

/**
 * Modelos do painel administrativo.
 */

export type LeadStatus = "novo" | "em_contato" | "convertido" | "perdido";
export type OrderStatus = "pago" | "pendente" | "cancelado";
export type PaymentMethod = "pix" | "cartao" | "boleto" | "pendente";

export type LeadSource =
  | "instagram"
  | "facebook"
  | "google"
  | "whatsapp"
  | "indicacao"
  | "site"
  | "tiktok"
  | "outro";

export type Lead = {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  source: LeadSource;
  productInterest: string;
  status: LeadStatus;
  createdAt: string;
  trackingCode?: string;
  /** Primeira visita à página /pos-compra/obrigado (confirma funil pós-checkout). */
  obrigadoEm?: string;
  cpf?: string;
  cep?: string;
  address?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  paymentStatus?: OrderStatus;
  paymentAmountCents?: number;
  orderDetails?: OrderCheckoutSnapshotV1;
};

export type Sale = {
  id: string;
  customer: string;
  email: string;
  phone?: string;
  amountCents: number;
  status: OrderStatus;
  date: string;
  productName: string;
  paymentMethod: PaymentMethod;
  trackingCode?: string;
  orderDetails?: OrderCheckoutSnapshotV1;
};

export type Client = {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  ordersCount: number;
  lifetimeCents: number;
  lastOrderAt: string;
};

export type ClientsAggregateMetrics = {
  totalClients: number;
  recurringClients: number;
  averageTicketCents: number;
  totalLifetimeCents: number;
};

export type LeadStatusCounts = Record<LeadStatus, number>;
export type OrderStatusCounts = Record<OrderStatus, number>;

export type DashboardKpis = {
  revenueMonthCents: number;
  ordersMonth: number;
  paidOrdersMonth: number;
  averageTicketCents: number;
  newLeadsWeek: number;
  totalLeads: number;
  conversionRate: number;
  convertedLeadsCount: number;
  leadStatusCounts: LeadStatusCounts;
  orderStatusCounts: OrderStatusCounts;
};

export type RevenueDayPoint = {
  label: string;
  valueCents: number;
};

export type SalesPerformancePoint = {
  label: string;
  valueCents: number;
};