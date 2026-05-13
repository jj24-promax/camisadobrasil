"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { Trash2, Loader2, QrCode, MessageCircle, Eye, RefreshCw, CheckCircle2, Users, Clock, Banknote, UserCircle } from "lucide-react";
import { updateLeadStatusAction, deleteLeadAction, reconcilePixVendasAction, markLeadPixPaidManualAction } from "@/app/admin/(dashboard)/leads/actions";
import { AdminRegeneratePixDialog } from "@/components/admin/admin-regenerate-pix-dialog";
import { AdminBadge } from "@/components/admin/admin-badge";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { AdminStatCard } from "@/components/admin/admin-stat-card";
import { AdminStatCardsGroup } from "@/components/admin/admin-stat-cards-group";
import { AdminLeadStatusSelect } from "@/components/admin/admin-lead-status-select";
import { AdminSearchField } from "@/components/admin/admin-search-field";
import { AdminFilterSelect, type AdminSelectOption } from "@/components/admin/admin-filter-select";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { AdminTableLoadingOverlay } from "@/components/admin/admin-table-loading-overlay";
import { AdminOrderDetailsView } from "@/components/admin/admin-order-details-view";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getLeadRowHighlightClass,
  leadFunnelHighlight,
  leadPaymentColumnKind,
} from "@/lib/admin/lead-funnel-highlight";
import {
  DEFAULT_LEADS_PAGE_SIZE,
  filterLeads,
  sortLeadsByDate,
  type LeadSortByDate,
  type LeadsListFilters,
} from "@/lib/admin/leads-list";
import { paginateList } from "@/lib/admin/paginate-list";
import { formatDateTime, formatLeadSource, formatBRL } from "@/lib/admin-format";
import { cn } from "@/lib/utils";
import type { Lead, LeadStatus } from "@/types/admin";
import { Button } from "@/components/ui/button";

const STATUS_FILTER_OPTIONS: AdminSelectOption<LeadStatus | "all">[] = [
  { value: "all", label: "Todos os status" },
  { value: "novo", label: "Novo" },
  { value: "em_contato", label: "Em contato" },
  { value: "convertido", label: "Convertido" },
  { value: "perdido", label: "Perdido" },
];

const SORT_OPTIONS: AdminSelectOption<LeadSortByDate>[] = [
  { value: "desc", label: "Data (mais recente primeiro)" },
  { value: "asc", label: "Data (mais antiga primeiro)" },
];

type AdminLeadsViewProps = {
  leads: Lead[];
};

function leadFirstName(name: string): string {
  const first = name.trim().split(/\s+/)[0];
  return first || "Cliente";
}

function leadWhatsAppPendingHref(lead: Lead): string | null {
  const pk = leadPaymentColumnKind(lead);
  if (pk !== "pendente" && pk !== "checkout_sem_status") return null;
  const digits = lead.phone.replace(/\D/g, "");
  if (digits.length < 10) return null;

  const withCountry = digits.length <= 11 ? `55${digits}` : digits;
  const amount = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    (lead.paymentAmountCents ?? 6790) / 100
  );
  const firstName = leadFirstName(lead.name);
  const message = `Olá, ${firstName}! Tudo bem? 😊

Aqui é da Alpha Brasil 🇧🇷

Vi que você iniciou a compra da sua Camisa do Brasil Estilizada, mas o pedido ficou pendente e não foi confirmado.

Queria saber se aconteceu algum problema no pagamento via Pix ou se ficou alguma dúvida sobre o produto, entrega ou finalização da compra. Posso te ajudar por aqui mesmo. 🙌

Seu pedido ainda está reservado por enquanto, no valor de ${amount}.

Fico à disposição para te auxiliar e garantir sua camisa! 💛💚`;

  return `https://wa.me/${withCountry}?text=${encodeURIComponent(message)}`;
}

export function AdminLeadsView({ leads }: AdminLeadsViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const highlightLeadId = searchParams.get("leadId")?.trim() || null;
  const [localLeads, setLocalLeads] = useState<Lead[]>(leads);
  const [pixDlg, setPixDlg] = useState<{ open: boolean; leadId: string | null; leadName: string }>({
    open: false,
    leadId: null,
    leadName: "",
  });
  const [orderDlgLead, setOrderDlgLead] = useState<Lead | null>(null);
  const [updatingLeadId, setUpdatingLeadId] = useState<string | null>(null);
  const [deletingLeadId, setDeletingLeadId] = useState<string | null>(null);
  const [reconciling, setReconciling] = useState(false);
  const [markingPaidLeadId, setMarkingPaidLeadId] = useState<string | null>(null);

  const funnelSummary = useMemo(() => {
    let pend = 0;
    let paid = 0;
    let cancel = 0;
    let emContato = 0;
    let sumPaidCents = 0;
    for (const l of localLeads) {
      const pk = leadPaymentColumnKind(l);
      if (pk === "pendente" || pk === "checkout_sem_status") pend += 1;
      else if (pk === "pago") {
        paid += 1;
        if (typeof l.paymentAmountCents === "number" && Number.isFinite(l.paymentAmountCents)) {
          sumPaidCents += l.paymentAmountCents;
        }
      } else if (pk === "cancelado") cancel += 1;
      if (l.status === "em_contato") emContato += 1;
    }
    return { total: localLeads.length, pend, paid, cancel, emContato, sumPaidCents };
  }, [localLeads]);

  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const searchPending = search !== deferredSearch;

  const [status, setStatus] = useState<LeadStatus | "all">("all");
  const [sortDate, setSortDate] = useState<LeadSortByDate>("desc");
  const [page, setPage] = useState(1);
  const [uiPending, startTransition] = useTransition();

  useEffect(() => {
    setLocalLeads(leads);
  }, [leads]);

  const handleLeadStatusChange = useCallback(async (leadId: string, next: LeadStatus) => {
    let previous: LeadStatus | undefined;
    let didChange = false;
    setLocalLeads((list) => {
      const row = list.find((l) => l.id === leadId);
      previous = row?.status;
      if (row === undefined || row.status === next) return list;
      didChange = true;
      return list.map((l) => (l.id === leadId ? { ...l, status: next } : l));
    });
    if (!didChange || previous === undefined) return;

    setUpdatingLeadId(leadId);
    const res = await updateLeadStatusAction(leadId, next);
    setUpdatingLeadId(null);

    if (!res.ok) {
      setLocalLeads((list) => list.map((l) => (l.id === leadId ? { ...l, status: previous! } : l)));
      toast.error(res.error);
    }
  }, []);

  const handleDeleteLead = useCallback(async (leadId: string) => {
    if (!window.confirm("Tem certeza que deseja excluir este lead e todas as vendas associadas? Esta ação não pode ser desfeita.")) {
      return;
    }
    
    setDeletingLeadId(leadId);
    const res = await deleteLeadAction(leadId);
    
    if (res.ok) {
      toast.success("Lead e vendas excluídos com sucesso.");
      setLocalLeads((list) => list.filter((l) => l.id !== leadId));
    } else {
      toast.error(res.error || "Erro ao excluir o lead.");
    }
    setDeletingLeadId(null);
  }, []);

  const handleReconcilePix = useCallback(async () => {
    setReconciling(true);
    const res = await reconcilePixVendasAction();
    setReconciling(false);
    if (!res.ok) {
      toast.error(
        res.error ||
          "Erro ao sincronizar com gateway Pix. Verifique as credenciais, webhook ou permissões do Supabase."
      );
      return;
    }
    const fp = res.fingerprintMatches > 0 ? `, ${res.fingerprintMatches} por dados do cliente (CPF/e-mail/valor)` : "";
    toast.success(
      `Sincronização concluída: ${res.paidRowsAnalyzed} pagamento(s) pago(s) analisado(s) na base, ` +
        `${res.vendaUpdates} venda(s) atualizada(s) (${res.transactionMatches} por id de transação${fp}), ` +
        `${res.leadsConverted} lead(s) convertido(s). ` +
        `${res.paidRowsWithoutPendingVenda} pagamento(s) sem venda pendente correspondente. ` +
        `${res.pendingVendasStillUnpaid} venda(s) pendente(s) ainda sem match.`
    );
    router.refresh();
  }, [router]);

  const handleMarkLeadPaidManual = useCallback(
    async (lead: Lead) => {
      const label = lead.name?.trim() || lead.email || "este lead";
      if (
        !window.confirm(
          `Marcar como PAGO manualmente?\n\n${label}\n\nConfirme só se o Pix já foi recebido. As vendas Pix pendentes deste lead passam a "pago" e o status do lead vai para "convertido".`
        )
      ) {
        return;
      }
      setMarkingPaidLeadId(lead.id);
      const res = await markLeadPixPaidManualAction(lead.id);
      setMarkingPaidLeadId(null);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(
        res.leadConverted
          ? `${res.updated} venda(s) marcada(s) como pago. Lead convertido.`
          : `${res.updated} venda(s) marcada(s) como pago. (Aviso: não foi possível atualizar o status do lead para convertido.)`
      );
      setLocalLeads((list) =>
        list.map((l) =>
          l.id === lead.id ? { ...l, paymentStatus: "pago" as const, status: res.leadConverted ? "convertido" : l.status } : l
        )
      );
      router.refresh();
    },
    [router]
  );

  const filters: LeadsListFilters = useMemo(
    () => ({ search: deferredSearch, status }),
    [deferredSearch, status]
  );

  const filtered = useMemo(() => filterLeads(localLeads, filters), [localLeads, filters]);
  const sorted = useMemo(() => sortLeadsByDate(filtered, sortDate), [filtered, sortDate]);

  const { items, total, page: safePage, pageSize, totalPages } = useMemo(
    () => paginateList(sorted, page, DEFAULT_LEADS_PAGE_SIZE),
    [sorted, page]
  );

  const listLoading = searchPending || uiPending;

  useEffect(() => {
    setPage(1);
  }, [deferredSearch, status, sortDate]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    if (!highlightLeadId) return;
    const timer = window.setTimeout(() => {
      const el = document.getElementById(`lead-row-${highlightLeadId}`);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-gold/45", "ring-offset-2", "ring-offset-[#060910]", "rounded-xl");
      window.setTimeout(() => {
        el.classList.remove("ring-2", "ring-gold/45", "ring-offset-2", "ring-offset-[#060910]", "rounded-xl");
      }, 2400);
    }, 200);
    return () => clearTimeout(timer);
  }, [highlightLeadId, items, safePage]);

  const emptyMessage = useMemo(() => {
    if (localLeads.length === 0) {
      return "Nenhum lead na base. Quando houver registros no Supabase, eles aparecerão aqui.";
    }
    if (filtered.length === 0) {
      return "Nenhum lead corresponde à busca ou ao filtro de status. Tente outros termos ou limpe os filtros.";
    }
    return "Nenhum registro nesta página.";
  }, [localLeads.length, filtered.length]);

  return (
    <div className="w-full space-y-7 sm:space-y-8">
      <AdminRegeneratePixDialog
        leadId={pixDlg.leadId}
        leadName={pixDlg.leadName}
        open={pixDlg.open}
        onOpenChange={(open) => setPixDlg((d) => ({ ...d, open, leadId: open ? d.leadId : null }))}
      />
      <Dialog open={orderDlgLead !== null} onOpenChange={(open) => { if (!open) setOrderDlgLead(null); }}>
        <DialogContent className="max-w-[min(92vw,560px)] border-white/[0.12] bg-[#070c14]/98 p-0">
          {orderDlgLead?.orderDetails ? (
            <div className="space-y-4 p-5 sm:p-6">
              <DialogHeader className="space-y-2 text-left">
                <DialogTitle>Pedido — {orderDlgLead.name || orderDlgLead.email || "Lead"}</DialogTitle>
                <DialogDescription>
                  Dados gravados na finalização do checkout (e upsells de pós-compra, se houver).
                </DialogDescription>
              </DialogHeader>
              <AdminOrderDetailsView snapshot={orderDlgLead.orderDetails} />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <section className="admin-filter-surface" aria-label="Resumo dos leads">
        <AdminStatCardsGroup columns={2} className="md:grid-cols-3 xl:grid-cols-4 xl:gap-5">
          <AdminStatCard
            label="Total de leads"
            value={String(funnelSummary.total)}
            hint="Registros carregados do Supabase nesta página."
            icon={Users}
          />
          <AdminStatCard
            label="Pagamento pendente"
            value={String(funnelSummary.pend)}
            hint="Pix em aberto ou status a confirmar na última venda."
            icon={Clock}
          />
          <AdminStatCard
            label="Pagamento confirmado"
            value={String(funnelSummary.paid)}
            hint="Venda reconhecida como paga (Pix ou painel)."
            icon={CheckCircle2}
          />
          <AdminStatCard
            label="Em contato"
            value={String(funnelSummary.emContato)}
            hint="Leads com status “em contato” no funil."
            icon={UserCircle}
          />
          <AdminStatCard
            label="Valor pago (estimado)"
            value={formatBRL(funnelSummary.sumPaidCents)}
            hint="Soma dos valores da última venda por lead já marcada como paga."
            icon={Banknote}
          />
        </AdminStatCardsGroup>
      </section>

      <section className="admin-filter-surface" aria-label="Filtros da lista de leads">
        <p className="mb-4 text-sm text-muted-foreground">
          Pedidos e valores por linha de venda:{" "}
          <Link href="/admin/vendas" className="font-medium text-sky-300 underline-offset-4 hover:text-sky-200 hover:underline">
            abrir aba Vendas
          </Link>
          .
        </p>
        <div className="flex flex-col gap-5 lg:flex-row lg:flex-wrap lg:items-end lg:gap-x-8 lg:gap-y-5">
          <AdminSearchField
            label="Buscar"
            placeholder="Nome, e-mail, CPF, telefone, origem ou produto…"
            value={search}
            onChange={setSearch}
            id="leads-search"
            className="min-w-0 lg:min-w-[min(100%,18rem)] lg:flex-1"
          />
          <AdminFilterSelect<LeadStatus | "all">
            label="Status"
            id="leads-status-filter"
            value={status}
            onChange={(v) => startTransition(() => setStatus(v))}
            options={STATUS_FILTER_OPTIONS}
            className="w-full lg:w-[min(100%,220px)]"
          />
          <AdminFilterSelect<LeadSortByDate>
            label="Ordenar por data"
            id="leads-sort-filter"
            value={sortDate}
            onChange={(v) => startTransition(() => setSortDate(v))}
            options={SORT_OPTIONS}
            className="w-full lg:w-[min(100%,260px)]"
          />
        </div>
      </section>

      <section
        className="rounded-2xl border border-emerald-500/[0.15] bg-gradient-to-br from-emerald-950/[0.35] via-[#070c14]/90 to-[#060910] p-5 shadow-[0_8px_40px_-20px_rgba(16,185,129,0.35)] backdrop-blur-xl sm:p-6"
        aria-label="Sincronização e confirmação manual de Pix"
      >
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
          <div className="min-w-0 max-w-3xl space-y-2.5">
            <p className="text-base font-semibold tracking-tight text-white">Sincronizar com o gateway Pix</p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Cruza vendas <strong className="font-medium text-foreground/90">pendentes</strong> com pagamentos já
              confirmados em <code className="rounded-md bg-black/40 px-1.5 py-0.5 font-mono text-[13px] text-emerald-100/90">pix_gateway_payments</code> — incluindo ids encontrados no <strong className="font-medium text-foreground/90">JSON bruto</strong> do webhook, quando o id da linha difere do gravado na venda. Use{" "}
              <span className="font-medium text-foreground/90">Marcar pago</span> só após conferir extrato ou painel da Royal.
            </p>
          </div>
          <Button
            type="button"
            className="h-12 shrink-0 gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/15 px-5 text-sm font-semibold text-emerald-50 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] transition-colors hover:bg-emerald-500/25 hover:text-white disabled:opacity-50"
            disabled={reconciling}
            onClick={() => void handleReconcilePix()}
          >
            {reconciling ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                A sincronizar…
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Sincronizar com gateway Pix
              </>
            )}
          </Button>
        </div>
      </section>

      <div className="space-y-4">
        <p className="text-xs text-muted-foreground/90 lg:hidden">
          Em ecrãs menores usas cartões; na vista larga (lg+) aparece a tabela com scroll horizontal.
        </p>
        <p className="text-[13px] leading-relaxed text-muted-foreground sm:text-sm">
          {total === localLeads.length && localLeads.length > 0 ? (
            <>
              <strong className="text-foreground">{total}</strong> lead{total === 1 ? "" : "s"} na base.
            </>
          ) : localLeads.length === 0 ? (
            <span className="text-muted-foreground">Nenhum lead carregado.</span>
          ) : (
            <>
              <strong className="text-foreground">{total}</strong> resultado{total === 1 ? "" : "s"} com os filtros
              atuais <span className="text-foreground/50">(base: {localLeads.length})</span>
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
                  id={`lead-row-${r.id}`}
                  className={cn(
                    "rounded-2xl border border-white/[0.1] bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-4 shadow-[var(--shadow-luxe)]",
                    getLeadRowHighlightClass(r)
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      {leadFunnelHighlight(r) ? (
                        <span
                          aria-hidden
                          className={cn(
                            "inline-block h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-offset-2 ring-offset-[#0a0f18]",
                            leadFunnelHighlight(r) === "green"
                              ? "bg-emerald-400 ring-emerald-400/50"
                              : "bg-amber-400 ring-amber-400/50"
                          )}
                        />
                      ) : null}
                      <span className="truncate font-semibold text-foreground">{r.name || r.email || "—"}</span>
                    </div>
                    <div className="shrink-0">
                      {leadPaymentColumnKind(r) === "pago" ? <AdminBadge variant="order" value="pago" /> : null}
                      {leadPaymentColumnKind(r) === "pendente" ? <AdminBadge variant="order" value="pendente" /> : null}
                      {leadPaymentColumnKind(r) === "cancelado" ? <AdminBadge variant="order" value="cancelado" /> : null}
                      {leadPaymentColumnKind(r) === "checkout_sem_status" ? (
                        <span className="rounded-md border border-sky-400/35 bg-sky-500/12 px-2 py-0.5 text-[10px] font-semibold uppercase text-sky-100">
                          A confirmar
                        </span>
                      ) : null}
                      {leadPaymentColumnKind(r) === "none" ? <span className="text-xs text-muted-foreground">—</span> : null}
                    </div>
                  </div>
                  <p className="mt-2 truncate text-xs text-muted-foreground">{r.phone || "—"}</p>
                  <p className="truncate text-xs text-muted-foreground">{r.email || "—"}</p>
                  {r.trackingCode ? (
                    <p className="mt-1 font-mono text-xs font-bold text-gold-bright">{r.trackingCode}</p>
                  ) : null}
                  {typeof r.paymentAmountCents === "number" && Number.isFinite(r.paymentAmountCents) ? (
                    <p className="mt-1 text-sm font-semibold text-gold-bright/95">{formatBRL(r.paymentAmountCents)}</p>
                  ) : null}
                  <div className="mt-3 max-w-full">
                    <AdminLeadStatusSelect
                      leadId={r.id}
                      value={r.status}
                      disabled={updatingLeadId === r.id}
                      onChange={(next) => handleLeadStatusChange(r.id, next)}
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-white/[0.06] pt-3">
                    {r.orderDetails ? (
                      <button
                        type="button"
                        onClick={() => setOrderDlgLead(r)}
                        className="inline-flex items-center gap-1 rounded-lg border border-white/[0.12] px-2.5 py-1.5 text-xs font-medium text-foreground/90 hover:border-gold/35"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Pedido
                      </button>
                    ) : null}
                    {leadWhatsAppPendingHref(r) ? (
                      <a
                        href={leadWhatsAppPendingHref(r)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 px-2.5 py-1.5 text-xs font-medium text-emerald-200"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        WhatsApp
                      </a>
                    ) : null}
                    {(leadPaymentColumnKind(r) === "pendente" || leadPaymentColumnKind(r) === "checkout_sem_status") ? (
                      <button
                        type="button"
                        disabled={markingPaidLeadId === r.id}
                        onClick={() => void handleMarkLeadPaidManual(r)}
                        className="inline-flex items-center gap-1 rounded-lg border border-emerald-600/30 px-2.5 py-1.5 text-xs font-medium text-emerald-200 disabled:opacity-50"
                      >
                        {markingPaidLeadId === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                        Marcar pago
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setPixDlg({ open: true, leadId: r.id, leadName: r.name || r.email || "Lead" })}
                      className="inline-flex items-center gap-1 rounded-lg border border-gold/30 px-2.5 py-1.5 text-xs font-medium text-gold-bright"
                    >
                      <QrCode className="h-3.5 w-3.5" />
                      Pix
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteLead(r.id)}
                      disabled={deletingLeadId === r.id}
                      className="inline-flex items-center gap-1 rounded-lg border border-red-500/25 px-2.5 py-1.5 text-xs font-medium text-red-300 disabled:opacity-50"
                    >
                      {deletingLeadId === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      Excluir
                    </button>
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
            getRowDomId={(r) => `lead-row-${r.id}`}
            tableClassName="min-w-[980px] xl:min-w-[1080px]"
            rows={items}
            getRowClassName={(r) => getLeadRowHighlightClass(r)}
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
                key: "name",
                header: "Nome",
                cell: (r) => {
                  const tier = leadFunnelHighlight(r);
                  return (
                    <span className="inline-flex items-center gap-2 font-medium text-foreground">
                      {tier ? (
                        <span
                          aria-hidden
                          title={
                            tier === "green"
                              ? "Pagamento aprovado (Pix pago / webhook) ou pós-checkout (obrigado + rastreio)"
                              : "Pix pendente, ou checkout sem status visível — use Sincronizar ou Marcar pago se já recebeu"
                          }
                          className={cn(
                            "inline-block h-3 w-3 shrink-0 rounded-full ring-2 ring-offset-2 ring-offset-[#0a0f18]",
                            tier === "green"
                              ? "bg-emerald-400 ring-emerald-400/60"
                              : "bg-amber-400 ring-amber-400/60"
                          )}
                        />
                      ) : null}
                      {r.name}
                    </span>
                  );
                },
              },
              {
                key: "cpf",
                header: "CPF/CNPJ",
                cell: (r) => <span className="font-mono text-sm text-muted-foreground">{r.cpf || "—"}</span>,
              },
              {
                key: "tracking",
                header: "Código de Rastreio",
                cell: (r) => <span className="font-mono text-sm font-bold text-gold-bright">{r.trackingCode || "—"}</span>,
              },
              { key: "phone", header: "Telefone", cell: (r) => <span className="whitespace-nowrap">{r.phone}</span> },
              {
                key: "email",
                header: "E-mail",
                cell: (r) => (
                  <span
                    className="max-w-[min(200px,28vw)] truncate text-[13px] text-foreground/90"
                    title={r.email || undefined}
                  >
                    {r.email?.trim() ? r.email : "—"}
                  </span>
                ),
              },
              {
                key: "city",
                header: "Cidade",
                cell: (r) => <span className="max-w-[140px] truncate md:max-w-[180px]">{r.city}</span>,
              },
              {
                key: "source",
                header: "Origem",
                className: "w-[7.5rem]",
                cell: (r) => (
                  <span className="text-[13px] text-foreground/90">{formatLeadSource(r.source)}</span>
                ),
              },
              {
                key: "payment",
                header: "Pagamento",
                className: "min-w-[8.5rem]",
                cell: (r) => {
                  const k = leadPaymentColumnKind(r);
                  if (k === "pago") return <AdminBadge variant="order" value="pago" />;
                  if (k === "pendente") return <AdminBadge variant="order" value="pendente" />;
                  if (k === "cancelado") return <AdminBadge variant="order" value="cancelado" />;
                  if (k === "checkout_sem_status") {
                    return (
                      <span
                        className="inline-flex max-w-[11rem] rounded-lg border border-sky-400/40 bg-sky-500/[0.14] px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-sky-100"
                        title="Checkout gravado, mas o status da venda não veio no painel (data inválida ou limite de linhas). Use Sincronizar ou confira no Supabase."
                      >
                        A confirmar
                      </span>
                    );
                  }
                  return <span className="text-xs text-muted-foreground">—</span>;
                },
              },
              {
                key: "status",
                header: "Status",
                className: "min-w-[10.5rem]",
                cell: (r) => (
                  <AdminLeadStatusSelect
                    leadId={r.id}
                    value={r.status}
                    disabled={updatingLeadId === r.id}
                    onChange={(next) => handleLeadStatusChange(r.id, next)}
                  />
                ),
              },
              {
                key: "order",
                header: "Pedido",
                className: "w-[5rem]",
                cell: (r) =>
                  r.orderDetails ? (
                    <button
                      type="button"
                      onClick={() => setOrderDlgLead(r)}
                      className="inline-flex items-center gap-1 rounded-md border border-white/[0.12] px-2 py-1 text-[11px] font-medium text-foreground/90 transition-colors hover:border-gold/35 hover:text-gold-bright"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Ver
                    </button>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  ),
              },
              {
                key: "orderValue",
                header: "Valor",
                className: "w-[6.5rem] whitespace-nowrap",
                cell: (r) =>
                  typeof r.paymentAmountCents === "number" && Number.isFinite(r.paymentAmountCents) ? (
                    <span
                      className="text-[13px] font-semibold tabular-nums text-gold-bright/95"
                      title="Valor da venda mais recente ligada a este lead"
                    >
                      {formatBRL(r.paymentAmountCents)}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  ),
              },
              {
                key: "createdAt",
                header: "Data",
                className: "whitespace-nowrap",
                cell: (r) => <span className="text-muted-foreground">{formatDateTime(r.createdAt)}</span>,
              },
              {
                key: "actions",
                header: "",
                className: "w-[11rem] text-right",
                cell: (r) => (
                  <div className="flex flex-wrap justify-end gap-0.5">
                    {leadWhatsAppPendingHref(r) ? (
                      <a
                        href={leadWhatsAppPendingHref(r)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-emerald-500/15 hover:text-emerald-300"
                        title="Cobrar lead pendente no WhatsApp"
                        aria-label="Cobrar lead pendente no WhatsApp"
                      >
                        <MessageCircle className="h-4 w-4" />
                      </a>
                    ) : null}
                    {(leadPaymentColumnKind(r) === "pendente" || leadPaymentColumnKind(r) === "checkout_sem_status") ? (
                      <button
                        type="button"
                        onClick={() => void handleMarkLeadPaidManual(r)}
                        disabled={markingPaidLeadId === r.id}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-emerald-600/20 hover:text-emerald-300 disabled:opacity-50"
                        title="Marcar vendas Pix pendentes como pagas (manual)"
                        aria-label="Marcar como pago manualmente"
                      >
                        {markingPaidLeadId === r.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setPixDlg({ open: true, leadId: r.id, leadName: r.name || r.email || "Lead" })}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-gold/15 hover:text-gold"
                      title="Gerar ou regenerar Pix (usa venda pendente; se não houver, cria nova com o último valor ou preço do site)"
                    >
                      <QrCode className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteLead(r.id)}
                      disabled={deletingLeadId === r.id}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                      title="Excluir lead"
                    >
                      {deletingLeadId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </button>
                  </div>
                ),
              },
            ]}
          />
          </div>
        </div>
      </div>
    </div>
  );
}