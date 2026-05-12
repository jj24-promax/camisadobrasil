import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminPage, AdminLeadsView } from "@/components/admin";
import { AdminErrorBanner } from "@/components/admin/admin-error-banner";
import { AdminListPageSkeletonBlocks } from "@/components/admin/admin-loading-shell";
import { fetchAdminLeads } from "@/lib/supabase/queries";

export const metadata: Metadata = {
  title: "Leads",
  description: "Funil de leads e contatos do painel administrativo.",
};

async function LeadsContent() {
  const res = await fetchAdminLeads();
  return (
    <>
      {!res.ok ? <AdminErrorBanner messages={[res.error]} title="Não foi possível carregar os leads" /> : null}
      <Suspense fallback={<div className="min-h-[12rem] animate-pulse rounded-2xl bg-white/[0.04]" aria-hidden />}>
        <AdminLeadsView leads={res.ok ? res.data : []} />
      </Suspense>
    </>
  );
}

export default function AdminLeadsPage() {
  return (
    <AdminPage
      title="Leads"
      description="Gerencie o funil de contatos: busque por nome ou dados, filtre por status e acompanhe o histórico. Dados carregados do Supabase."
    >
      <Suspense fallback={<AdminListPageSkeletonBlocks />}>
        <LeadsContent />
      </Suspense>
    </AdminPage>
  );
}
