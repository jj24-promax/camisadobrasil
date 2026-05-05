"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { Trash2, Loader2, QrCode } from "lucide-react";
import { updateLeadStatusAction, deleteLeadAction } from "@/app/admin/(dashboard)/leads/actions";
import { AdminRegeneratePixDialog } from "@/components/admin/admin-regenerate-pix-dialog";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { AdminLeadStatusSelect } from "@/components/admin/admin-lead-status-select";
import { AdminSearchField } from "@/components/admin/admin-search-field";
import { AdminFilterSelect, type AdminSelectOption } from "@/components/admin/admin-filter-select";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { AdminTableLoadingOverlay } from "@/components/admin/admin-table-loading-overlay";
import {
  DEFAULT_LEADS_PAGE_SIZE,
  filterLeads,
  sortLeadsByDate,
  type LeadSortByDate,
  type LeadsListFilters,
} from "@/lib/admin/leads-list";
import { paginateList } from "@/lib/admin/paginate-list";
import { formatDateTime, formatLeadSource } from "@/lib/admin-format";
import { cn } from "@/lib/utils";
import type { Lead, LeadStatus } from "@/types/admin";

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

function getLeadPaymentHighlightClass(status?: Lead["paymentStatus"]) {
  if (status === "pago") {
    return "border-l-4 border-l-emerald-400/80 bg-emerald-500/[0.06]";
  }
  if (status === "pendente") {
    return "border-l-4 border-l-amber-400/80 bg-amber-500/[0.06]";
  }
  return undefined;
}

export function AdminLeadsView({ leads }: AdminLeadsViewProps) {
  const [localLeads, setLocalLeads] = useState<Lead[]>(leads);
  const [pixDlg, setPixDlg] = useState<{ open: boolean; leadId: string | null; leadName: string }>({
    open: false,
    leadId: null,
    leadName: "",
  });
  const [updatingLeadId, setUpdatingLeadId] = useState<string | null>(null);
  const [deletingLeadId, setDeletingLeadId] = useState<string | null>(null);

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
      <section className="admin-filter-surface" aria-label="Filtros da lista de leads">
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

      <div className="space-y-4">
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
          <AdminDataTable
            getRowKey={(r) => r.id}
            tableClassName="min-w-[1420px] lg:min-w-[1480px]"
            rows={items}
            getRowClassName={(r) => getLeadPaymentHighlightClass(r.paymentStatus)}
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
                cell: (r) => (
                  <span className="inline-flex items-center gap-2 font-medium text-foreground">
                    {(r.paymentStatus === "pago" || r.paymentStatus === "pendente") && (
                      <span
                        aria-hidden
                        className={cn(
                          "inline-block h-2.5 w-2.5 rounded-full",
                          r.paymentStatus === "pago" ? "bg-emerald-400" : "bg-amber-400"
                        )}
                      />
                    )}
                    {r.name}
                  </span>
                ),
              },
              {
                key: "cpf",
                header: "CPF/CNPJ",
                cell: (r) => <span className="font-mono text-xs text-muted-foreground">{r.cpf || "—"}</span>,
              },
              {
                key: "tracking",
                header: "Código de Rastreio",
                cell: (r) => <span className="font-mono text-xs font-bold text-gold-bright">{r.trackingCode || "—"}</span>,
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
                key: "createdAt",
                header: "Data",
                className: "whitespace-nowrap",
                cell: (r) => <span className="text-muted-foreground">{formatDateTime(r.createdAt)}</span>,
              },
              {
                key: "actions",
                header: "",
                className: "w-[4.5rem] text-right",
                cell: (r) => (
                  <div className="flex justify-end gap-0.5">
                    <button
                      type="button"
                      onClick={() => setPixDlg({ open: true, leadId: r.id, leadName: r.name || r.email || "Lead" })}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-gold/15 hover:text-gold"
                      title="Gerar novo Pix (venda pendente)"
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
  );
}