import type { Metadata } from "next";

import { AdminCollectPixView, AdminPage } from "@/components/admin";

export const metadata: Metadata = {
  title: "Cobrar Pix",
  description: "Monte um pedido com produtos do site e gere Pix em PDF para leads.",
};

export default function AdminCobrarPixPage() {
  return (
    <AdminPage
      title="Cobrar Pix"
      description="Selecione produtos e quantidades (preços iguais ao site), informe o cliente e gere código Pix + QR em PDF para enviar manualmente. Não grava venda no Supabase."
    >
      <AdminCollectPixView />
    </AdminPage>
  );
}
