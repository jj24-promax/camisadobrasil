import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminPage, AdminSalesView } from "@/components/admin";
import { AdminErrorBanner } from "@/components/admin/admin-error-banner";
import { AdminListPageSkeletonBlocks } from "@/components/admin/admin-loading-shell";
import { fetchAdminVendas } from "@/lib/supabase/queries";

export const metadata: Metadata = {
  title: "Vendas",
  description: "Pedidos e pagamentos no Supabase, ligados ao funil de leads quando houver checkout.",
};

async function VendasContent() {
  const res = await fetchAdminVendas();
  return (
    <>
      {!res.ok ? <AdminErrorBanner messages={[res.error]} title="Não foi possível carregar as vendas" /> : null}
      <AdminSalesView sales={res.ok ? res.data : []} />
    </>
  );
}

export default function AdminVendasPage() {
  return (
    <AdminPage
      title="Vendas"
      description="Todos os pedidos gravados em `vendas`: valor, pagamento e ligação ao lead (checkout). Complementa a vista por funil em Leads."
    >
      <Suspense fallback={<AdminListPageSkeletonBlocks />}>
        <VendasContent />
      </Suspense>
    </AdminPage>
  );
}
