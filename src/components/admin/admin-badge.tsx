import { cn } from "@/lib/utils";

const leadStyles: Record<string, string> = {
  novo: "border-emerald-500/35 bg-emerald-500/10 text-emerald-200",
  em_contato: "border-sky-500/35 bg-sky-500/10 text-sky-200",
  convertido: "border-gold/40 bg-gold/10 text-gold-bright",
  perdido: "border-white/15 bg-white/[0.06] text-muted-foreground",
};

const orderStyles: Record<string, string> = {
  pago: "border-emerald-400/45 bg-emerald-500/[0.14] text-emerald-100 shadow-[0_0_0_1px_rgba(52,211,153,0.12)]",
  pendente: "border-amber-400/40 bg-amber-500/[0.12] text-amber-100",
  cancelado: "border-red-400/40 bg-red-500/[0.12] text-red-100",
};

const leadLabels: Record<string, string> = {
  novo: "Novo",
  em_contato: "Em contato",
  convertido: "Convertido",
  perdido: "Perdido",
};

const orderLabels: Record<string, string> = {
  pago: "Pago",
  pendente: "Pendente",
  cancelado: "Cancelado",
};

type AdminBadgeProps = {
  variant: "lead" | "order";
  value: string;
};

export function AdminBadge({ variant, value }: AdminBadgeProps) {
  const map = variant === "lead" ? leadStyles : orderStyles;
  const labels = variant === "lead" ? leadLabels : orderLabels;
  const label = labels[value] ?? value;
  return (
    <span
      className={cn(
        "inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold leading-none tracking-wide",
        map[value] ?? "border-white/15 bg-white/[0.06] text-muted-foreground"
      )}
    >
      {label}
    </span>
  );
}
