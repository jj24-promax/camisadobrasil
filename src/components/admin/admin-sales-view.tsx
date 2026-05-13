"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { CheckCircle2, Eye, Loader2, MessageCircle, QrCode, UserRound } from "lucide-react";
import { markVendaPixPaidManualAction } from "@/app/admin/(dashboard)/vendas/actions";
import { AdminRegeneratePixDialog } from "@/components/admin/admin-regenerate-pix-dialog";
import { AdminOrderDetailsView } from "@/components/admin/admin-order-details-view";
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
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { OrderSnapshotShipping } from "@/types/order-snapshot";
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

function saleFirstName(customer: string): string {
  const first = customer.trim().split(/\s+/)[0];
  return first || "Cliente";
}

function saleAllowsManualPixFollowUp(s: Sale): boolean {
  if (s.status !== "pendente") return false;
  if (s.paymentMethod === "cartao" || s.paymentMethod === "boleto") return false;
  return true;
}

function saleWhatsAppPendingHref(sale: Sale): string | null {
  if (!saleAllowsManualPixFollowUp(sale)) return null;
  const digits = (sale.phone ?? "").replace(/\D/g, "");
  if (digits.length < 10) return null;

  const withCountry = digits.length <= 11 ? `55${digits}` : digits;
  const amount = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(sale.amountCents / 100);
  const firstName = saleFirstName(sale.customer || sale.email || "Cliente");
  const message = `Olá, ${firstName}! Tudo bem? 😊

Aqui é da Alpha Brasil 🇧🇷

Vi que você iniciou a compra da sua Camisa do Brasil Estilizada, mas o pedido ficou pendente e não foi confirmado.

Queria saber se aconteceu algum problema no pagamento via Pix ou se ficou alguma dúvida sobre o produto, entrega ou finalização da compra. Posso te ajudar por aqui mesmo. 🙌

Seu pedido ainda está reservado por enquanto, no valor de ${amount}.

Fico à disposição para te auxiliar e garantir sua camisa! 💛💚`;

  return `https://wa.me/${withCountry}?text=${encodeURIComponent(message)}`;
}

/** Rótulo legível para `YYYY-MM-DD` escolhido no filtro (calendário em pt-BR). */
function formatDayFilterLabelPt(ymd: string): string {
  const parts = ymd.split("-").map((x) => parseInt(x, 10));
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return ymd;
  const [y, m, d] = parts;
  const utc = Date.UTC(y, m - 1, d, 12, 0, 0);
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeZone: "America/Sao_Paulo" }).format(new Date(utc));
}

function formatShippingLine(s: OrderSnapshotShipping): string {
  const bits: string[] = [];
  if (s.street) bits.push(s.street);
  if (s.number) bits.push(String(s.number));
  if (s.complement?.trim()) bits.push(s.complement.trim());
  if (s.neighborhood) bits.push(s.neighborhood);
  if (s.city || s.state) bits.push([s.city, s.state].filter(Boolean).join("/"));
  const cep = s.cep?.replace(/\D/g, "") ?? "";
  if (cep.length === 8) bits.push(`CEP ${cep.slice(0, 5)}-${cep.slice(5)}`);
  else if (s.cep?.trim()) bits.push(`CEP ${s.cep.trim()}`);
  return bits.length ? bits.join(" · ") : "—";
}

export function AdminSalesView({ sales }: AdminSalesViewProps) {
  const router = useRouter();
  const [localSales, setLocalSales] = useState<Sale[]>(sales);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [pixDlg, setPixDlg] = useState<{ open: boolean; leadId: string | null; leadName: string }>({
    open: false,
    leadId: null,
    leadName: "",
  });
  const [markingVendaId, setMarkingVendaId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const searchPending = search !== deferredSearch;

  const [status, setStatus] = useState<OrderStatus | "all">("all");
  const [sortDate, setSortDate] = useState<SaleSortByDate>("desc");
  /** `YYYY-MM-DD` (input type=date) — dia do pedido em horário de Brasília. */
  const [dayFilter, setDayFilter] = useState("");
  const [page, setPage] = useState(1);
  const [uiPending, startTransition] = useTransition();

  useEffect(() => {
    setLocalSales(sales);
  }, [sales]);

  const filters: SalesListFilters = useMemo(
    () => ({ search: deferredSearch, status, dayYmd: dayFilter }),
    [deferredSearch, status, dayFilter]
  );

  const filtered = useMemo(() => filterSales(localSales, filters), [localSales, filters]);
  const sorted = useMemo(() => sortSalesByDate(filtered, sortDate), [filtered, sortDate]);

  const { items, total, page: safePage, pageSize, totalPages } = useMemo(
    () => paginateList(sorted, page, DEFAULT_SALES_PAGE_SIZE),
    [sorted, page]
  );

  const listLoading = searchPending || uiPending;

  useEffect(() => {
    setPage(1);
  }, [deferredSearch, status, sortDate, dayFilter]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const emptyMessage = useMemo(() => {
    if (sales.length === 0) {
      return "Nenhum pedido na base. Quando houver vendas no Supabase, elas aparecerão aqui.";
    }
    if (filtered.length === 0) {
      if (dayFilter.trim()) {
        return `Nenhum pedido em ${formatDayFilterLabelPt(dayFilter.trim())}. Experimenta outro dia ou limpa o filtro de data.`;
      }
      return "Nenhum pedido corresponde à busca ou ao status de pagamento. Tente outros termos ou limpe os filtros.";
    }
    return "Nenhum registro nesta página.";
  }, [sales.length, filtered.length, dayFilter]);

  const handleMarkVendaPaidManual = useCallback(
    async (sale: Sale) => {
      const label = sale.customer?.trim() || sale.email || "este pedido";
      if (
        !window.confirm(
          `Marcar como PAGO manualmente?\n\n${label}\n\nConfirme só se o Pix já foi recebido. O pedido passa a "pago" no painel.`
        )
      ) {
        return;
      }
      setMarkingVendaId(sale.id);
      const res = await markVendaPixPaidManualAction(sale.id);
      setMarkingVendaId(null);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(
        res.leadConverted ? "Venda marcada como paga e lead convertido." : "Venda marcada como paga."
      );
      setLocalSales((list) => list.map((s) => (s.id === sale.id ? { ...s, status: "pago" as const } : s)));
      setSelectedSale((cur) => (cur?.id === sale.id ? { ...cur, status: "pago" } : cur));
      router.refresh();
    },
    [router]
  );

  return (
    <div className="w-full space-y-7 sm:space-y-8">
      <AdminRegeneratePixDialog
        leadId={pixDlg.leadId}
        leadName={pixDlg.leadName}
        open={pixDlg.open}
        onOpenChange={(open) => setPixDlg((d) => ({ ...d, open, leadId: open ? d.leadId : null }))}
      />
      <section className="admin-filter-surface" aria-label="Filtros da lista de vendas">
        <p className="mb-4 text-sm text-muted-foreground">
          Cada linha é um registo em <code className="rounded bg-black/30 px-1 font-mono text-xs">vendas</code>. Com{" "}
          <code className="rounded bg-black/30 px-1 font-mono text-xs">lead_id</code>, abre o funil em{" "}
          <Link href="/admin/leads" className="font-medium text-sky-300 underline-offset-4 hover:text-sky-200 hover:underline">
            Leads
          </Link>
          .
        </p>
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
          <div className="w-full min-w-0 lg:w-[min(100%,280px)]">
            <label htmlFor="sales-day-filter" className="admin-field-label">
              Dia do pedido
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                id="sales-day-filter"
                type="date"
                value={dayFilter}
                onChange={(e) => startTransition(() => setDayFilter(e.target.value))}
                className={cn(
                  "admin-control min-w-0 flex-1 font-mono text-[13px] tabular-nums sm:max-w-[14rem]",
                  "[color-scheme:dark]"
                )}
                title="Filtra pela data do pedido em horário de Brasília (o mesmo critério da coluna Histórico)."
              />
              {dayFilter ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-11 shrink-0 border-white/[0.12] px-3 text-xs"
                  onClick={() => startTransition(() => setDayFilter(""))}
                >
                  Limpar dia
                </Button>
              ) : null}
            </div>
            <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground/85">
              Só mostra vendas desse dia; a ordenação (acima) continua a aplicar-se à lista filtrada.
            </p>
          </div>
        </div>
      </section>

      <div className="space-y-4">
        <p className="text-xs text-muted-foreground/90 lg:hidden">
          Vista em cartões neste tamanho de ecrã. Em ecrã maior vês a tabela completa com scroll horizontal.
        </p>
        <p className="text-[13px] leading-relaxed text-muted-foreground sm:text-sm">
          {status === "all" &&
          deferredSearch === "" &&
          !dayFilter.trim() &&
          total === localSales.length &&
          localSales.length > 0 ? (
            <>
              <strong className="text-foreground">{total}</strong> pedido{total === 1 ? "" : "s"} na base.
            </>
          ) : sales.length === 0 ? (
            <span className="text-muted-foreground">Nenhum pedido carregado.</span>
          ) : (
            <>
              <strong className="text-foreground">{total}</strong> resultado{total === 1 ? "" : "s"} com os filtros
              atuais
              {dayFilter.trim() ? (
                <>
                  {" "}
                  <span className="text-foreground/80">· dia {formatDayFilterLabelPt(dayFilter.trim())}</span>
                </>
              ) : null}{" "}
              <span className="text-foreground/50">(base: {sales.length})</span>
            </>
          )}
        </p>

        <div className="relative">
          <AdminTableLoadingOverlay show={listLoading} />
          {items.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] py-14 text-center text-sm text-muted-foreground lg:hidden">
              {emptyMessage}
            </div>
          ) : (
            <div className="grid gap-3 lg:hidden">
            {items.map((r) => (
              <article
                key={r.id}
                className={cn(
                  "rounded-2xl border border-white/[0.1] bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-4 shadow-[var(--shadow-luxe)]",
                  r.status === "pago" && "border-emerald-500/25 bg-emerald-950/[0.12]"
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-foreground">{r.customer || "—"}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{r.id}</p>
                  </div>
                  <AdminBadge variant="order" value={r.status} />
                </div>
                <p className="mt-2 text-sm font-semibold tabular-nums text-gold-bright/95">{formatBRL(r.amountCents)}</p>
                <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(r.date)}</p>
                {r.trackingCode ? (
                  <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Rastreio{" "}
                    <span className="font-mono text-xs font-bold normal-case tracking-normal text-gold-bright">
                      {r.trackingCode}
                    </span>
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  {r.leadId ? (
                    <Link
                      href={`/admin/leads?leadId=${encodeURIComponent(r.leadId)}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/35 bg-sky-500/10 px-3 py-1.5 text-xs font-medium text-sky-100 hover:bg-sky-500/20"
                    >
                      <UserRound className="h-3.5 w-3.5" aria-hidden />
                      Ver lead
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setSelectedSale(r)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.12] px-3 py-1.5 text-xs font-medium text-foreground/90 hover:border-gold/35"
                  >
                    <Eye className="h-3.5 w-3.5" aria-hidden />
                    Detalhes
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 border-t border-white/[0.06] pt-3">
                  {saleWhatsAppPendingHref(r) ? (
                    <a
                      href={saleWhatsAppPendingHref(r)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#25D366] text-white shadow-md transition-colors hover:bg-[#20bd5a]",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35"
                      )}
                      title="Cobrar pedido pendente no WhatsApp"
                      aria-label="Cobrar pedido pendente no WhatsApp"
                    >
                      <MessageCircle className="h-4 w-4" aria-hidden />
                    </a>
                  ) : null}
                  {saleAllowsManualPixFollowUp(r) ? (
                    <button
                      type="button"
                      disabled={markingVendaId === r.id}
                      onClick={() => void handleMarkVendaPaidManual(r)}
                      className="inline-flex items-center gap-1 rounded-lg border border-emerald-600/30 px-2.5 py-1.5 text-xs font-medium text-emerald-200 disabled:opacity-50"
                    >
                      {markingVendaId === r.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                      )}
                      Marcar pago
                    </button>
                  ) : null}
                  {r.leadId ? (
                    <button
                      type="button"
                      onClick={() =>
                        setPixDlg({
                          open: true,
                          leadId: r.leadId!,
                          leadName: r.customer || r.email || "Cliente",
                        })
                      }
                      className="inline-flex items-center gap-1 rounded-lg border border-gold/30 px-2.5 py-1.5 text-xs font-medium text-gold-bright"
                    >
                      <QrCode className="h-3.5 w-3.5" aria-hidden />
                      Pix
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled
                      title="Gera Pix a partir do lead: associe um lead a esta venda ou use a aba Leads."
                      className="inline-flex cursor-not-allowed items-center gap-1 rounded-lg border border-white/[0.08] px-2.5 py-1.5 text-xs font-medium text-muted-foreground opacity-55"
                    >
                      <QrCode className="h-3.5 w-3.5" aria-hidden />
                      Pix
                    </button>
                  )}
                </div>
              </article>
            ))}
            </div>
          )}
          {total > 0 ? (
            <div className="lg:hidden">
              <AdminPagination
                embedded
                page={safePage}
                pageSize={pageSize}
                totalItems={total}
                onPageChange={(p) => startTransition(() => setPage(p))}
                className="px-1 pt-4"
              />
            </div>
          ) : null}
          <div className="hidden lg:block">
            <AdminDataTable
              getRowKey={(r) => r.id}
              getRowClassName={(r) =>
                r.status === "pago" ? "bg-emerald-500/[0.06] hover:bg-emerald-500/[0.09]" : undefined
              }
              tableClassName="min-w-[1080px]"
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
                key: "lead",
                header: "Lead",
                className: "w-[100px]",
                cell: (r) =>
                  r.leadId ? (
                    <Link
                      href={`/admin/leads?leadId=${encodeURIComponent(r.leadId)}`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-sky-300 hover:text-sky-100 hover:underline"
                    >
                      <UserRound className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      Funil
                    </Link>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  ),
              },
              {
                key: "tracking",
                header: "Rastreio",
                className: "min-w-[7.5rem] max-w-[11rem]",
                cell: (r) => (
                  <span
                    className="block truncate font-mono text-[11px] font-bold text-gold-bright"
                    title={r.trackingCode || undefined}
                  >
                    {r.trackingCode || "—"}
                  </span>
                ),
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
              {
                key: "actions",
                header: "",
                className: "min-w-[10.5rem] text-right",
                cell: (r) => (
                  <div className="flex flex-wrap items-center justify-end gap-0.5">
                    {saleWhatsAppPendingHref(r) ? (
                      <a
                        href={saleWhatsAppPendingHref(r)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#25D366] text-white shadow-md transition-colors hover:bg-[#20bd5a]",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35"
                        )}
                        title="Cobrar pedido pendente no WhatsApp"
                        aria-label="Cobrar pedido pendente no WhatsApp"
                      >
                        <MessageCircle className="h-4 w-4" aria-hidden />
                      </a>
                    ) : null}
                    {saleAllowsManualPixFollowUp(r) ? (
                      <button
                        type="button"
                        onClick={() => void handleMarkVendaPaidManual(r)}
                        disabled={markingVendaId === r.id}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-emerald-600/20 hover:text-emerald-300 disabled:opacity-50"
                        title="Marcar esta venda Pix como paga (manual)"
                        aria-label="Marcar como pago manualmente"
                      >
                        {markingVendaId === r.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" aria-hidden />
                        )}
                      </button>
                    ) : null}
                    {r.leadId ? (
                      <button
                        type="button"
                        onClick={() =>
                          setPixDlg({
                            open: true,
                            leadId: r.leadId!,
                            leadName: r.customer || r.email || "Cliente",
                          })
                        }
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-gold/15 hover:text-gold"
                        title="Gerar ou regenerar Pix (via lead)"
                        aria-label="Gerar ou regenerar Pix"
                      >
                        <QrCode className="h-4 w-4" aria-hidden />
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled
                        title="Precisa de lead associado para gerar Pix a partir do painel."
                        className="inline-flex h-8 w-8 cursor-not-allowed items-center justify-center rounded-lg text-muted-foreground opacity-45"
                        aria-label="Pix indisponível sem lead"
                      >
                        <QrCode className="h-4 w-4" aria-hidden />
                      </button>
                    )}
                  </div>
                ),
              },
            ]}
          />
        </div>
      </div>
      </div>
      <Dialog open={selectedSale !== null} onOpenChange={(open) => { if (!open) setSelectedSale(null); }}>
        <DialogContent className="flex max-h-[min(92dvh,860px)] max-w-[min(96vw,720px)] flex-col gap-0 overflow-hidden border-white/[0.12] bg-[#070c14]/98 p-0">
          {selectedSale ? (
            <>
              <div className="shrink-0 space-y-4 border-b border-white/[0.08] px-5 pb-4 pt-5 sm:px-6">
                <DialogHeader className="space-y-2 text-left">
                  <DialogTitle>Pedido {selectedSale.id}</DialogTitle>
                  <DialogDescription>
                    Dados do Supabase. Ações rápidas (WhatsApp, marcar pago, Pix) são as mesmas da aba Leads; o bloco
                    inferior faz scroll se o pedido for grande.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex flex-wrap gap-2">
                  {saleWhatsAppPendingHref(selectedSale) ? (
                    <a
                      href={saleWhatsAppPendingHref(selectedSale)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg bg-[#25D366] px-3 py-2 text-xs font-medium text-white shadow-md transition-colors hover:bg-[#20bd5a]",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35"
                      )}
                      title="Cobrar pedido pendente no WhatsApp"
                    >
                      <MessageCircle className="h-4 w-4 shrink-0" aria-hidden />
                      WhatsApp
                    </a>
                  ) : null}
                  {saleAllowsManualPixFollowUp(selectedSale) ? (
                    <button
                      type="button"
                      disabled={markingVendaId === selectedSale.id}
                      onClick={() => void handleMarkVendaPaidManual(selectedSale)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-600/35 bg-emerald-950/30 px-3 py-2 text-xs font-medium text-emerald-100 hover:bg-emerald-900/40 disabled:opacity-50"
                    >
                      {markingVendaId === selectedSale.id ? (
                        <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
                      )}
                      Marcar pago
                    </button>
                  ) : null}
                  {selectedSale.leadId ? (
                    <button
                      type="button"
                      onClick={() =>
                        setPixDlg({
                          open: true,
                          leadId: selectedSale.leadId!,
                          leadName: selectedSale.customer || selectedSale.email || "Cliente",
                        })
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gold/35 bg-gold/10 px-3 py-2 text-xs font-medium text-gold-bright hover:bg-gold/20"
                    >
                      <QrCode className="h-4 w-4 shrink-0" aria-hidden />
                      Pix / QR
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled
                      title="Associe um lead à venda para gerar Pix a partir do painel."
                      className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-white/[0.08] px-3 py-2 text-xs font-medium text-muted-foreground opacity-55"
                    >
                      <QrCode className="h-4 w-4 shrink-0" aria-hidden />
                      Pix / QR
                    </button>
                  )}
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6">
                <div className="grid gap-3 sm:grid-cols-2">
                  <DetailItem label="Cliente" value={selectedSale.customer || "—"} />
                  {selectedSale.leadId ? (
                    <DetailItem
                      label="Lead (funil)"
                      value={
                        <Link
                          href={`/admin/leads?leadId=${encodeURIComponent(selectedSale.leadId)}`}
                          className="text-sky-300 hover:underline"
                        >
                          Abrir em Leads
                        </Link>
                      }
                    />
                  ) : null}
                  <DetailItem
                    label="E-mail"
                    value={
                      selectedSale.email?.trim() ? (
                        selectedSale.email
                      ) : selectedSale.leadId ? (
                        <span className="text-muted-foreground">
                          Não consta na linha da venda.{" "}
                          <Link
                            href={`/admin/leads?leadId=${encodeURIComponent(selectedSale.leadId)}`}
                            className="text-sky-300 hover:underline"
                          >
                            Ver no lead
                          </Link>
                        </span>
                      ) : (
                        "—"
                      )
                    }
                  />
                  <DetailItem
                    label="Telefone"
                    value={
                      selectedSale.phone?.trim() ? (
                        selectedSale.phone
                      ) : selectedSale.leadId ? (
                        <span className="text-muted-foreground">
                          Não consta na linha da venda.{" "}
                          <Link
                            href={`/admin/leads?leadId=${encodeURIComponent(selectedSale.leadId)}`}
                            className="text-sky-300 hover:underline"
                          >
                            Ver no lead
                          </Link>
                        </span>
                      ) : (
                        "—"
                      )
                    }
                  />
                  {selectedSale.orderDetails ? (
                    <>
                      <DetailItem
                        label="Produto"
                        value={
                          <span>
                            <span className="font-medium text-foreground">{selectedSale.orderDetails.product.name}</span>
                            <span className="text-muted-foreground"> · {selectedSale.orderDetails.quantity} un.</span>
                          </span>
                        }
                      />
                      <DetailItem
                        label="Entrega"
                        value={formatShippingLine(selectedSale.orderDetails.shipping)}
                        className="sm:col-span-2"
                      />
                      {selectedSale.productName?.trim() &&
                      selectedSale.productName.trim() !==
                        `${selectedSale.orderDetails.product.name} (${selectedSale.orderDetails.quantity} un.)` ? (
                        <DetailItem
                          label="Texto completo (fatura / sistema)"
                          value={selectedSale.productName}
                          className="sm:col-span-2"
                        />
                      ) : null}
                    </>
                  ) : (
                    <DetailItem label="Produto" value={selectedSale.productName || "—"} className="sm:col-span-2" />
                  )}
                  <DetailItem label="Pagamento" value={formatPaymentMethod(selectedSale.paymentMethod)} />
                  <DetailItem label="Status" value={<AdminBadge variant="order" value={selectedSale.status} />} />
                  <DetailItem label="Valor total" value={formatBRL(selectedSale.amountCents)} />
                  <DetailItem label="Rastreio" value={selectedSale.trackingCode || "—"} />
                  <DetailItem label="Data do pedido" value={formatDateTime(selectedSale.date)} />
                  <DetailItem label="Quando aconteceu" value={formatRelativeTimePt(selectedSale.date)} />
                </div>
                {selectedSale.orderDetails ? (
                  <div className="mt-5 border-t border-white/[0.08] pt-5">
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/90">
                      Itens e extras (snapshot)
                    </p>
                    <AdminOrderDetailsView snapshot={selectedSale.orderDetails} />
                  </div>
                ) : null}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailItem({
  label,
  value,
  className,
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-3", className)}>
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/85">{label}</p>
      <div className="min-w-0 break-words text-sm leading-relaxed text-foreground/95 [&_a]:text-sky-300 [&_a]:underline [&_a:hover]:text-sky-200">
        {value}
      </div>
    </div>
  );
}