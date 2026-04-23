"use client";

import { useDeferredValue, useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import { Eye } from "lucide-react";
import { AdminBadge } from "@/components/admin/admin-badge";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { AdminSearchField } from "@/components/admin/admin-search-field";
import { AdminFilterSelect, type AdminSelectOption } from "@/components/admin/admin-filter-select";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { AdminTableLoadingOverlay } from "@/components/admin/admin-table-loading-overlay";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { paginateList } from "@/lib/admin/paginate-list";
import {
  DEFAULT_SALES_PAGE_SIZE,
  filterSales,
  sortSalesByDate,
  type SaleSortByDate,
  type SalesListFilters,
} from "@/lib/admin/sales-list";
import { formatBRL, formatDateTime, formatPaymentMethod, formatRelativeTimePt } from "@/lib/admin-format";
import { cn } from "@/lib/utils";
import type { OrderStatus, Sale } from "@/types/admin";

const PAYMENT_STATUS_OPTIONS: AdminSelectOption<OrderStatus | "all">[] = [
  { value: "all", label: "Todos os status" },
  { value: "pago", label: "Pago" },
  { value: "pendente", label: "Pendente" },
  { value: "cancelado", label: "Cancelado" },
];

const SORT_OPTIONS: AdminSelectOption<SaleSortByDate>[] = [
  { value: "desc", label: "Data (mais recente primeiro)" },
  { value: "asc", label: "Data (mais antiga primeiro)" },
];

type AdminSalesViewProps = {
  sales: Sale[];
};

export function AdminSalesView({ sales }: AdminSalesViewProps) {
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const searchPending = search !== deferredSearch;

  const [status, setStatus] = useState<OrderStatus | "all">("all");
  const [sortDate, setSortDate] = useState<SaleSortByDate>("desc");
  const [page, setPage] = useState(1);
  const [uiPending, startTransition] = useTransition();

  const filters: SalesListFilters = useMemo(
    () => ({ search: deferredSearch, status }),
    [deferredSearch, status]
  );

  const filtered = useMemo(() => filterSales(sales, filters), [sales, filters]);
  const sorted = useMemo(() => sortSalesByDate(filtered, sortDate), [filtered, sortDate]);

  const { items, total, page: safePage, pageSize, totalPages } = useMemo(
    () => paginateList(sorted, page, DEFAULT_SALES_PAGE_SIZE),
    [sorted, page]
  );

  const listLoading = searchPending || uiPending;

  useEffect(() => {
    setPage(1);
  }, [deferredSearch, status, sortDate]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const emptyMessage = useMemo(() => {
    if (sales.length === 0) {
      return "Nenhum pedido na base. Quando houver vendas no Supabase, elas aparecerão aqui.";
    }
    if (filtered.length === 0) {
      return "Nenhum pedido corresponde à busca ou ao status de pagamento. Tente outros termos ou limpe os filtros.";
    }
    return "Nenhum registro nesta página.";
  }, [sales.length, filtered.length]);

  return (
    <div className="w-full space-y-7 sm:space-y-8">
      <section className="admin-filter-surface" aria-label="Filtros da lista de vendas">
        <div className="flex flex-col gap-5 lg:flex-row lg:flex-wrap lg:items-end lg:gap-x-8 lg:gap-y-5">
          <AdminSearchField
            label="Buscar"
            placeholder="Cliente ou produto…"
            value={search}
            onChange={setSearch}
            id="sales-search"
            className="min-w-0 lg:min-w-[min(100%,18rem)] lg:flex-1"
          />
          <AdminFilterSelect<OrderStatus | "all">
            label="Status do pagamento"
            id="sales-payment-status-filter"
            value={status}
            onChange={(v) => startTransition(() => setStatus(v))}
            options={PAYMENT_STATUS_OPTIONS}
            className="w-full lg:w-[min(100%,240px)]"
          />
          <AdminFilterSelect<SaleSortByDate>
            label="Ordenar por data"
            id="sales-sort-filter"
            value={sortDate}
            onChange={(v) => startTransition(() => setSortDate(v))}
            options={SORT_OPTIONS}
            className="w-full lg:w-[min(100%,260px)]"
          />
        </div>
      </section>

      <div className="space-y-4">
        <p className="text-[13px] leading-relaxed text-muted-foreground sm:text-sm">
          {total === sales.length && sales.length > 0 ? (
            <>
              <strong className="text-foreground">{total}</strong> pedido{total === 1 ? "" : "s"} na base.
            </>
          ) : sales.length === 0 ? (
            <span className="text-muted-foreground">Nenhum pedido carregado.</span>
          ) : (
            <>
              <strong className="text-foreground">{total}</strong> resultado{total === 1 ? "" : "s"} com os filtros
              atuais <span className="text-foreground/50">(base: {sales.length})</span>
            </>
          )}
        </p>

        <div className="relative">
          <AdminTableLoadingOverlay show={listLoading} />
          <AdminDataTable
            getRowKey={(r) => r.id}
            getRowClassName={(r) =>
              r.status === "pago" ? "bg-emerald-500/[0.06] hover:bg-emerald-500/[0.09]" : undefined
            }
            tableClassName="min-w-[980px]"
            rows={items}
            emptyMessage={emptyMessage}
            footer={
              total > 0 ? (
                <AdminPagination
                  embedded
                  page={safePage}
                  pageSize={pageSize}
                  totalItems={total}
                  onPageChange={(p) => startTransition(() => setPage(p))}
                />
              ) : undefined
            }
            columns={[
              {
                key: "id",
                header: "Pedido",
                className: "whitespace-nowrap",
                cell: (r) => <span className="font-mono text-xs font-medium text-foreground">{r.id}</span>,
              },
              {
                key: "customer",
                header: "Cliente",
                cell: (r) => <span className="font-medium text-foreground">{r.customer}</span>,
              },
              {
                key: "tracking",
                header: "Rastreio",
                cell: (r) => <span className="font-mono text-xs font-bold text-gold-bright">{r.trackingCode || "—"}</span>,
              },
              {
                key: "status",
                header: "Pagamento",
                className: "w-[118px]",
                cell: (r) => <AdminBadge variant="order" value={r.status} />,
              },
              {
                key: "amountCents",
                header: "Valor",
                className: "whitespace-nowrap tabular-nums",
                cell: (r) => (
                  <span
                    className={cn(
                      "font-display text-base tracking-tight",
                      r.status === "pago" ? "font-semibold text-gold-bright" : "font-medium text-foreground/88"
                    )}
                  >
                    {formatBRL(r.amountCents)}
                  </span>
                ),
              },
              {
                key: "date",
                header: "Histórico",
                className: "min-w-[9.5rem]",
                cell: (r) => (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[13px] text-foreground/95">{formatDateTime(r.date)}</span>
                    <span className="text-[11px] leading-tight text-muted-foreground">{formatRelativeTimePt(r.date)}</span>
                  </div>
                ),
              },
              {
                key: "details",
                header: "Detalhes",
                className: "w-[110px] whitespace-nowrap",
                cell: (r) => (
                  <button
                    type="button"
                    onClick={() => setSelectedSale(r)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.12] px-2.5 py-1.5 text-xs font-medium text-foreground/90 transition-colors hover:border-gold/35 hover:text-gold-bright"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Ver
                  </button>
                ),
              },
            ]}
          />
        </div>
      </div>
      <Dialog open={selectedSale !== null} onOpenChange={(open) => { if (!open) setSelectedSale(null); }}>
        <DialogContent className="max-w-[min(92vw,640px)] border-white/[0.12] bg-[#070c14]/98 p-0">
          {selectedSale ? (
            <div className="space-y-5 p-5 sm:p-6">
              <DialogHeader className="space-y-2 text-left">
                <DialogTitle>Pedido {selectedSale.id}</DialogTitle>
                <DialogDescription>
                  Detalhes do pedido usando os dados atualmente registrados no Supabase.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-3 sm:grid-cols-2">
                <DetailItem label="Cliente" value={selectedSale.customer} />
                <DetailItem label="E-mail" value={selectedSale.email || "—"} />
                <DetailItem label="Telefone" value={selectedSale.phone || "—"} />
                <DetailItem label="Produto" value={selectedSale.productName || "—"} />
                <DetailItem label="Pagamento" value={formatPaymentMethod(selectedSale.paymentMethod)} />
                <DetailItem label="Status" value={<AdminBadge variant="order" value={selectedSale.status} />} />
                <DetailItem label="Valor total" value={formatBRL(selectedSale.amountCents)} />
                <DetailItem label="Rastreio" value={selectedSale.trackingCode || "—"} />
                <DetailItem label="Data do pedido" value={formatDateTime(selectedSale.date)} />
                <DetailItem label="Quando aconteceu" value={formatRelativeTimePt(selectedSale.date)} />
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-3">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/85">{label}</p>
      <p className="text-sm text-foreground/95">{value}</p>
    </div>
  );
}