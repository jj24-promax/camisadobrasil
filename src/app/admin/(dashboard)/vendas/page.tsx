import { redirect } from "next/navigation";

/** Listagem dedicada foi unificada em Leads (status de pagamento + funil). Mantém URL antiga. */
export default function AdminVendasPage() {
  redirect("/admin/leads");
}
