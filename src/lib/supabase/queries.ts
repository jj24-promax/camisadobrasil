import "server-only";

import { unstable_noStore as noStore } from "next/cache";
import { isSupabasePublicEnvConfigured } from "@/lib/supabase/env-check";
import { mapClienteRow, mapLeadRow, mapVendaRow } from "@/lib/supabase/mappers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { isAdminSessionValid } from "@/lib/admin-auth/verify-session.server";
import type { Client, Lead, Sale } from "@/types/admin";

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

  const rows = toRecordRows(data).map(mapVendaRow);
  rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return { ok: true, data: rows };
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