import "server-only";

import { unstable_noStore as noStore } from "next/cache";
import { isSupabasePublicEnvConfigured } from "@/lib/supabase/env-check";
import { mapClienteRow, mapLeadRow, mapVendaRow } from "@/lib/supabase/mappers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { isAdminSessionValid } from "@/lib/admin-auth/verify-session.server";
import { orderStatusFromVendaRow } from "@/lib/normalize-payment-order-status";
import {
  buildPaidPixCorrelationMegaSetLowercase,
  collectVendaPixGatewayCorrelationKeys,
  PAID_PIX_GATEWAY_SCAN_CAP,
} from "@/lib/pix-gateway-paid-correlation-set";
import type { Client, Lead, Sale } from "@/types/admin";
import { isOrderCheckoutSnapshotV1, type OrderCheckoutSnapshotV1 } from "@/types/order-snapshot";

const ROW_LIMIT = 2_000;

export type AdminFetchResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string };

function toRecordRows(data: unknown): Record<string, unknown>[] {
  if (!Array.isArray(data)) return [];
  return data.filter((r): r is Record<string, unknown> => r !== null && typeof r === "object");
}

function friendlyMessage(message: string, code?: string): string {
  if (message.includes("permission denied") || code === "42501") {
    return "Sem permissão para ler esta tabela. Verifique as políticas RLS no Supabase.";
  }
  if (message.includes("relation") && message.includes("does not exist")) {
    return "Tabela não encontrada. Confirme os nomes: leads, vendas, clientes.";
  }
  return message || "Erro ao comunicar com o Supabase.";
}

function normalizeAmountCents(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.round(value));
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value.replace(",", "."));
    if (Number.isFinite(n)) return Math.max(0, Math.round(n));
  }
  return undefined;
}

/** Ordenação “última venda” mesmo quando `created_at` vem vazio ou noutra coluna. */
function vendaRowSortTimestampMs(raw: Record<string, unknown>): number {
  for (const key of ["created_at", "updated_at", "date", "criado_em"] as const) {
    const v = raw[key];
    if (v == null || v === "") continue;
    const t = new Date(String(v)).getTime();
    if (!Number.isNaN(t)) return t;
  }
  return 0;
}

type SupabaseAdminClient = NonNullable<ReturnType<typeof createSupabaseAdminClient>>;

function phoneDigitsLen(s: string | undefined): number {
  return (s ?? "").replace(/\D/g, "").length;
}

/** Telefone e código de rastreio vivem no lead no checkout; denormaliza para o painel de vendas. */
async function enrichSalesWithLeadFields(
  admin: SupabaseAdminClient,
  sales: Sale[]
): Promise<Sale[]> {
  const leadIds = new Set<string>();
  for (const s of sales) {
    const lid = s.leadId?.trim();
    if (!lid) continue;
    if (phoneDigitsLen(s.phone) < 10 || !(s.trackingCode ?? "").trim()) {
      leadIds.add(lid);
    }
  }
  if (leadIds.size === 0) return sales;

  const { data, error } = await admin
    .from("leads")
    .select("id, telefone, codigo_rastreio")
    .in("id", [...leadIds]);

  if (error) {
    console.warn("[fetchAdminVendas] enrich from leads:", error.message);
    return sales;
  }

  const byLead = new Map<string, { telefone: string; codigo_rastreio: string }>();
  for (const raw of toRecordRows(data)) {
    const id = String(raw.id ?? "").trim();
    if (!id) continue;
    byLead.set(id, {
      telefone: typeof raw.telefone === "string" ? raw.telefone.trim() : "",
      codigo_rastreio: typeof raw.codigo_rastreio === "string" ? raw.codigo_rastreio.trim() : "",
    });
  }

  return sales.map((s) => {
    const lid = s.leadId?.trim();
    if (!lid) return s;
    const L = byLead.get(lid);
    if (!L) return s;

    let next = s;
    if (phoneDigitsLen(s.phone) < 10 && phoneDigitsLen(L.telefone) >= 10) {
      next = { ...next, phone: L.telefone };
    }
    if (!(s.trackingCode ?? "").trim() && L.codigo_rastreio) {
      next = { ...next, trackingCode: L.codigo_rastreio };
    }
    return next;
  });
}

/**
 * Conjunto dos ids correlatos que já constam em algum Pix pago no armazém do gateway
 * (`id_transaction` da linha em pix_gateway_payments + ids extraídos de `raw_payload`).
 */
async function fetchPaidPixIdSet(admin: SupabaseAdminClient, ids: string[]): Promise<Set<string>> {
  const paid = new Set<string>();
  const uniq = [...new Set(ids.map((x) => x.trim()).filter(Boolean))];
  if (uniq.length === 0) return paid;

  const megaLower = await buildPaidPixCorrelationMegaSetLowercase(admin, PAID_PIX_GATEWAY_SCAN_CAP);

  for (const id of uniq) {
    if (megaLower.has(id.trim().toLowerCase())) paid.add(id);
  }
  return paid;
}

export async function fetchAdminLeads(): Promise<AdminFetchResult<Lead[]>> {
  noStore();

  if (!(await isAdminSessionValid())) {
    return { ok: false, error: "Acesso Negado: Sessão inválida." };
  }

  if (!isSupabasePublicEnvConfigured()) {
    return {
      ok: false,
      error: "Configuração do Supabase ausente.",
    };
  }

  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, error: "Chave de serviço ausente." };

  const { data, error } = await admin.from("leads").select("*").limit(ROW_LIMIT);

  if (error) {
    return { ok: false, error: friendlyMessage(error.message, error.code), code: error.code };
  }

  const rows = toRecordRows(data).map(mapLeadRow);

  const { data: snapRows, error: snapErr } = await admin
    .from("vendas")
    .select("lead_id, detalhes_pedido, created_at")
    .not("lead_id", "is", null)
    .not("detalhes_pedido", "is", null)
    .limit(ROW_LIMIT);

  if (!snapErr) {
    const earliestSnapByLead = new Map<string, { t: number; snap: OrderCheckoutSnapshotV1 }>();
    for (const raw of toRecordRows(snapRows)) {
      const leadId = String(raw.lead_id ?? "").trim();
      if (!leadId) continue;
      const d = raw.detalhes_pedido;
      if (!isOrderCheckoutSnapshotV1(d)) continue;
      const createdAt = new Date(String(raw.created_at ?? "")).getTime();
      if (Number.isNaN(createdAt)) continue;
      const cur = earliestSnapByLead.get(leadId);
      if (!cur || createdAt < cur.t) {
        earliestSnapByLead.set(leadId, { t: createdAt, snap: d });
      }
    }
    for (const lead of rows) {
      const pack = earliestSnapByLead.get(lead.id);
      if (pack) lead.orderDetails = pack.snap;
    }
  }

  const { data: vendasData, error: vendasError } = await admin
    .from("vendas")
    .select(
      "lead_id, status_pagamento, status, valor, amount_cents, created_at, updated_at, date, criado_em, pedido_codigo, pix_id_transaction, id_transacao_pix"
    )
    .not("lead_id", "is", null)
    .limit(ROW_LIMIT);

  if (!vendasError) {
    const rawVendas = toRecordRows(vendasData);
    const corrIds: string[] = [];
    for (const raw of rawVendas) {
      corrIds.push(...collectVendaPixGatewayCorrelationKeys(raw));
    }
    const paidByGateway = await fetchPaidPixIdSet(admin, corrIds);

    const latestPaymentStatusByLead = new Map<
      string,
      { createdAt: number; status: Lead["paymentStatus"]; amountCents?: number }
    >();
    for (const raw of rawVendas) {
      const leadId = String(raw.lead_id ?? "").trim();
      if (!leadId) continue;
      const createdAt = vendaRowSortTimestampMs(raw);
      let status = orderStatusFromVendaRow(raw);
      if (status !== "pago" && collectVendaPixGatewayCorrelationKeys(raw).some((k) => paidByGateway.has(k))) {
        status = "pago";
      }
      const amountCents = normalizeAmountCents(raw.valor ?? raw.amount_cents);
      if (!status) continue;

      const current = latestPaymentStatusByLead.get(leadId);
      if (!current || createdAt >= current.createdAt) {
        latestPaymentStatusByLead.set(leadId, { createdAt, status, amountCents });
      }
    }

    for (const lead of rows) {
      const latest = latestPaymentStatusByLead.get(lead.id);
      if (latest?.status) {
        lead.paymentStatus = latest.status;
        lead.paymentAmountCents = latest.amountCents;
      }
    }
  }

  rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return { ok: true, data: rows };
}

export async function fetchAdminVendas(): Promise<AdminFetchResult<Sale[]>> {
  noStore();

  if (!(await isAdminSessionValid())) {
    return { ok: false, error: "Acesso Negado: Sessão inválida." };
  }

  if (!isSupabasePublicEnvConfigured()) {
    return {
      ok: false,
      error: "Configuração do Supabase ausente.",
    };
  }

  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, error: "Chave de serviço ausente." };

  const { data, error } = await admin.from("vendas").select("*").limit(ROW_LIMIT);

  if (error) {
    return { ok: false, error: friendlyMessage(error.message, error.code), code: error.code };
  }

  const rawRows = toRecordRows(data);
  const corrIds: string[] = [];
  for (const raw of rawRows) {
    corrIds.push(...collectVendaPixGatewayCorrelationKeys(raw));
  }
  const paidByGateway = await fetchPaidPixIdSet(admin, corrIds);

  const rows = rawRows.map(mapVendaRow);
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].status === "pago") continue;
    if (collectVendaPixGatewayCorrelationKeys(rawRows[i]).some((k) => paidByGateway.has(k))) {
      rows[i] = { ...rows[i], status: "pago" };
    }
  }

  rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const enriched = await enrichSalesWithLeadFields(admin, rows);
  return { ok: true, data: enriched };
}

export async function fetchAdminClientes(): Promise<AdminFetchResult<Client[]>> {
  noStore();

  if (!(await isAdminSessionValid())) {
    return { ok: false, error: "Acesso Negado: Sessão inválida." };
  }

  if (!isSupabasePublicEnvConfigured()) {
    return {
      ok: false,
      error: "Configuração do Supabase ausente.",
    };
  }

  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, error: "Chave de serviço ausente." };

  const { data, error } = await admin.from("clientes").select("*").limit(ROW_LIMIT);

  if (error) {
    return { ok: false, error: friendlyMessage(error.message, error.code), code: error.code };
  }

  const rows = toRecordRows(data).map(mapClienteRow);
  rows.sort((a, b) => new Date(b.lastOrderAt).getTime() - new Date(a.lastOrderAt).getTime());
  return { ok: true, data: rows };
}