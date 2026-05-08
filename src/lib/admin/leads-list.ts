import { formatLeadSource } from "@/lib/admin-format";
import type { Lead, LeadStatus } from "@/types/admin";
import { orderSnapshotSearchText } from "@/types/order-snapshot";

/** Filtros de listagem — espelho do que virá em query string ou RPC no Supabase. */
export type LeadsListFilters = {
  search: string;
  status: LeadStatus | "all";
};

export const DEFAULT_LEADS_PAGE_SIZE = 8;

function normalize(s: string) {
  return s.trim().toLowerCase();
}

/** Busca textual em nome, e-mail, telefone, cidade, UF e produto (uso genérico). */
export function leadMatchesSearch(lead: Lead, rawQuery: string): boolean {
  const q = normalize(rawQuery);
  if (!q) return true;
  const haystack = [
    lead.name,
    lead.email,
    lead.phone,
    lead.city,
    lead.state,
    lead.productInterest,
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

/** Busca do painel: contato, origem, produto de interesse. */
export function leadMatchesContactSearch(lead: Lead, rawQuery: string): boolean {
  const q = normalize(rawQuery);
  if (!q) return true;
  const haystack = [
    lead.name,
    lead.email,
    lead.phone,
    lead.cpf || "", // Buscando também por CPF
    lead.source,
    formatLeadSource(lead.source),
    lead.productInterest,
    lead.orderDetails ? orderSnapshotSearchText(lead.orderDetails) : "",
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

export type LeadSortByDate = "desc" | "asc";

export function sortLeadsByDate(leads: Lead[], order: LeadSortByDate): Lead[] {
  const copy = [...leads];
  if (order === "desc") {
    return copy.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  return copy.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export function filterLeads(leads: Lead[], filters: LeadsListFilters): Lead[] {
  return leads.filter((lead) => {
    if (filters.status !== "all" && lead.status !== filters.status) return false;
    return leadMatchesContactSearch(lead, filters.search);
  });
}