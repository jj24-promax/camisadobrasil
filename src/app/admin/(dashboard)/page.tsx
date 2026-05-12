import { Suspense } from "react";
import { AdminPage } from "@/components/admin";
import { AdminDashboardSkeletonBlocks } from "@/components/admin/admin-loading-shell";
import { AdminDashboardBody } from "../_components/dashboard-body";

export default function AdminDashboardPage() {
  return (
    <AdminPage
      title="Dashboard"
      description="Visão consolidada da loja — métricas e leads recentes no Supabase (gráfico de desempenho ainda em dados de referência)."
    >
      <Suspense fallback={<AdminDashboardSkeletonBlocks />}>
        <AdminDashboardBody />
      </Suspense>
    </AdminPage>
  );
}
