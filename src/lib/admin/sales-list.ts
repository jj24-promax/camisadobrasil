import type { OrderStatus, Sale } from "@/types/admin";
import { orderSnapshotSearchText } from "@/types/order-snapshot";

/** Filtros de listagem — espelho de query string ou RPC no Supabase (`status`, `q`). */
export type SalesListFilters = {
  search: string;
  status: OrderStatus | "all";
};

export const DEFAULT_SALES_PAGE_SIZE = 8;

function normalize(s: string) {
  return s.trim().toLowerCase();
}

/** Busca em id do pedido, cliente, e-mail, telefone e produto (uso genérico). */
export function saleMatchesSearch(sale: Sale, rawQuery: string): boolean {
  const q = normalize(rawQuery);
  if (!q) return true;
  const reais = (sale.amountCents / 100).toFixed(2).replace(".", ",");
  const haystack = [
    sale.id,
    sale.customer,
    sale.email,
    sale.phone ?? "",
    sale.productName,
    String(sale.amountCents),
    reais,
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

/** Busca do painel: cliente e produto. */
export function saleMatchesCustomerProductSearch(sale: Sale, rawQuery: string): boolean {
  const q = normalize(rawQuery);
  if (!q) return true;
  const detail = sale.orderDetails ? orderSnapshotSearchText(sale.orderDetails) : "";
  const haystack = [sale.customer, sale.productName, detail].join(" ").toLowerCase();
  return haystack.includes(q);
}

export type SaleSortByDate = "desc" | "asc";

export function sortSalesByDate(sales: Sale[], order: SaleSortByDate): Sale[] {
  const copy = [...sales];
  if (order === "desc") {
    return copy.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
  return copy.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export function filterSales(sales: Sale[], filters: SalesListFilters): Sale[] {
  return sales.filter((sale) => {
    if (filters.status !== "all" && sale.status !== filters.status) return false;
    return saleMatchesCustomerProductSearch(sale, filters.search);
  });
}
