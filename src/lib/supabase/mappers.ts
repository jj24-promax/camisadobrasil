import type { Client, Lead, LeadSource, LeadStatus, PaymentMethod, Sale } from "@/types/admin";
import { normalizePaymentOrderStatusForSale } from "@/lib/normalize-payment-order-status";
import { isOrderCheckoutSnapshotV1 } from "@/types/order-snapshot";

function str(v: unknown, fallback = ""): string {
  if (v === null || v === undefined) return fallback;
  return String(v).trim();
}

function num(v: unknown, fallback = 0): number {
  if (typeof v === "number" && !Number.isNaN(v)) return Math.round(v);
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v.replace(",", "."));
    return Number.isFinite(n) ? Math.round(n) : fallback;
  }
  return fallback;
}

function pick(r: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) {
    const v = r[k];
    if (v !== null && v !== undefined && v !== "") return v;
  }
  return undefined;
}

const LEAD_STATUSES: LeadStatus[] = ["novo", "em_contato", "convertido", "perdido"];

function normLeadStatus(s: string): LeadStatus {
  const x = s.toLowerCase().replace(/\s+/g, "_");
  if (LEAD_STATUSES.includes(x as LeadStatus)) return x as LeadStatus;
  return "novo";
}

function normPayment(s: string): PaymentMethod {
  const x = s.toLowerCase();
  if (x === "pix" || x === "cartao" || x === "boleto" || x === "pendente") return x;
  return "pendente";
}

const SOURCES: LeadSource[] = ["instagram", "facebook", "google", "whatsapp", "indicacao", "site", "tiktok", "outro"];

function normSource(s: string): LeadSource {
  const x = s.toLowerCase() as LeadSource;
  return SOURCES.includes(x) ? x : "outro";
}

function isoDate(v: unknown): string {
  if (v instanceof Date) return v.toISOString();
  const s = str(v);
  if (!s) return new Date(0).toISOString();
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? new Date(0).toISOString() : d.toISOString();
}

export function mapLeadRow(r: Record<string, unknown>): Lead {
  const id = str(pick(r, ["id", "lead_id"]));
  return {
    id: id || `lead-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    name: str(pick(r, ["nome", "name", "full_name"])),
    email: str(pick(r, ["email", "e_mail"])),
    phone: str(pick(r, ["telefone", "phone", "tel", "celular"])),
    city: str(pick(r, ["cidade", "city", "municipio"])),
    state: str(pick(r, ["estado", "state", "uf"])),
    source: normSource(str(pick(r, ["origem", "source", "canal"]))),
    productInterest: str(pick(r, ["produto_interesse", "product_interest"])),
    status: normLeadStatus(str(pick(r, ["status"]))),
    createdAt: isoDate(pick(r, ["created_at", "criado_em"])),
    trackingCode: str(pick(r, ["codigo_rastreio"])),
    cpf: str(pick(r, ["cpf", "documento"])),
    cep: str(pick(r, ["cep", "zipcode"])),
    address: str(pick(r, ["endereco", "address", "logradouro"])),
    number: str(pick(r, ["numero", "number"])),
    complement: str(pick(r, ["complemento", "complement"])),
    neighborhood: str(pick(r, ["bairro", "neighborhood"])),
    obrigadoEm: (() => {
      const v = pick(r, ["obrigado_em", "obrigadoEm"]);
      if (v == null || v === "") return undefined;
      const s = String(v).trim();
      const d = new Date(s);
      return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
    })(),
  };
}

export function mapVendaRow(r: Record<string, unknown>): Sale {
  const id = str(pick(r, ["id", "pedido_id"]));
  const pedidoCod = str(pick(r, ["pedido_codigo", "id_transaction"]));
  const methodStr = str(pick(r, ["metodo_pagamento", "forma_pagamento", "payment_method"]));
  
  // A tabela pode não ter 'metodo_pagamento', inferimos se vier de cartão (prefixo CARD-) ou PIX
  const method = methodStr ? normPayment(methodStr) : (pedidoCod.startsWith("CARD") ? "cartao" : "pix");

  const dpRaw = pick(r, ["detalhes_pedido", "detalhesPedido"]);
  const orderDetails = isOrderCheckoutSnapshotV1(dpRaw) ? dpRaw : undefined;

  const leadIdRaw = pick(r, ["lead_id", "leadId"]);
  const leadId = leadIdRaw != null && String(leadIdRaw).trim() ? String(leadIdRaw).trim() : undefined;

  return {
    id: id || `PED-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    customer: str(pick(r, ["cliente_nome", "customer", "nome"])),
    email: str(pick(r, ["email", "e_mail", "cliente_email", "lead_email"])),
    phone: str(pick(r, ["telefone", "phone", "tel", "celular", "cliente_telefone", "lead_phone"])),
    amountCents: num(pick(r, ["valor", "amount_cents"])),
    status: normalizePaymentOrderStatusForSale(pick(r, ["status_pagamento", "status"])),
    date: isoDate(pick(r, ["created_at", "date"])),
    productName: str(pick(r, ["produto", "product_name"])),
    paymentMethod: method,
    trackingCode: str(pick(r, ["codigo_rastreio", "tracking_code", "tracking", "rastreio"])),
    leadId,
    orderDetails,
  };
}

export function mapClienteRow(r: Record<string, unknown>): Client {
  const id = str(pick(r, ["id", "cliente_id"]));
  return {
    id: id || `CLI-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    name: str(pick(r, ["nome", "name", "full_name"])),
    email: str(pick(r, ["email"])),
    phone: str(pick(r, ["telefone", "phone"])),
    city: str(pick(r, ["cidade", "city"])),
    ordersCount: Math.max(0, num(pick(r, ["total_pedidos", "orders_count", "pedidos"]))),
    lifetimeCents: num(pick(r, ["total_gasto_centavos", "lifetime_cents", "ltv_cents"])),
    lastOrderAt: isoDate(pick(r, ["ultima_compra", "last_order_at", "updated_at"])),
  };
}