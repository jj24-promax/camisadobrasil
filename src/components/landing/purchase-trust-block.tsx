"use client";

import { BadgeCheck, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

function CardBrandStrip({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-center gap-2 sm:justify-start",
        className
      )}
      aria-label="Formas de pagamento aceitas"
    >
      <span className="inline-flex h-8 items-center rounded-md bg-[#1a1f71] px-2.5 text-[10px] font-black tracking-tight text-white">
        VISA
      </span>
      <span className="inline-flex h-8 items-center gap-0.5 rounded-md bg-[#1a1a1a] px-2 text-[10px] font-bold text-white/95">
        <span className="h-3.5 w-3.5 rounded-full bg-[#eb001b]" />
        <span className="-ml-1.5 h-3.5 w-3.5 rounded-full bg-[#f79e1b]" />
        <span className="ml-0.5 text-[9px] font-semibold">MC</span>
      </span>
      <span className="inline-flex h-8 items-center rounded-md bg-gradient-to-r from-[#0a2d72] via-[#ffcb05] to-[#00a4e0] px-2.5 text-[10px] font-black text-[#0a2d72]">
        ELO
      </span>
      <span className="inline-flex h-8 items-center rounded-md border border-emerald-500/40 bg-emerald-500/15 px-2.5 text-[10px] font-bold tracking-wide text-emerald-200">
        PIX
      </span>
    </div>
  );
}

type PurchaseTrustBlockProps = {
  variant?: "hero" | "compact";
  className?: string;
};

export function PurchaseTrustBlock({ variant = "hero", className }: PurchaseTrustBlockProps) {
  if (variant === "compact") {
    return (
      <div
        className={cn(
          "flex flex-col gap-2 border-t border-white/[0.06] pt-4 text-center sm:text-left",
          className
        )}
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gold/85">
          Pagamento 100% seguro e protegido
        </p>
        <p className="text-[11px] font-semibold leading-snug text-gold-bright/95">
          7 dias de garantia · PIX e cartão · Compra segura
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-start">
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <Shield className="h-3.5 w-3.5 text-gold/80" aria-hidden />
            Compra segura
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <BadgeCheck className="h-3.5 w-3.5 text-gold/80" aria-hidden />
            Site verificado
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("mt-6 flex flex-col gap-5", className)}>
      <div className="relative overflow-hidden rounded-2xl border border-gold/25 bg-gradient-to-br from-gold/[0.12] via-gold/[0.04] to-transparent p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
        <div
          className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gold/20 blur-2xl"
          aria-hidden
        />
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex shrink-0 items-center justify-center sm:justify-start">
            <div className="flex h-16 w-16 flex-col items-center justify-center rounded-2xl border border-gold/35 bg-navy-deep/80 text-center shadow-[0_0_24px_-4px_rgba(212,175,55,0.35)]">
              <span className="font-display text-xl font-black leading-none text-gold-bright">7</span>
              <span className="mt-0.5 text-[8px] font-bold uppercase leading-tight tracking-widest text-gold/85">
                dias
              </span>
            </div>
          </div>
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <p className="font-display text-sm font-extrabold uppercase tracking-[0.12em] text-gold-bright">
              7 dias — satisfação ou reembolso total
            </p>
            <p className="mt-2 text-sm font-medium leading-relaxed text-white/90">
              Teste por 7 dias em casa. Se não gostar, devolvemos 100% do seu dinheiro — sem enrolação.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-4 sm:px-5">
        <p className="text-center text-[10px] font-extrabold uppercase tracking-[0.2em] text-gold-bright/95 sm:text-left">
          Pagamento 100% seguro e protegido
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 sm:justify-start">
            <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-white/85">
              <Shield className="h-4 w-4 shrink-0 text-gold" aria-hidden />
              Compra segura
            </span>
            <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-white/85">
              <BadgeCheck className="h-4 w-4 shrink-0 text-gold" aria-hidden />
              Site verificado
            </span>
          </div>
          <CardBrandStrip className="sm:justify-end" />
        </div>
        <p className="text-center text-[10px] leading-relaxed text-muted-foreground sm:text-left">
          Seus dados são criptografados e protegidos em toda a jornada.
        </p>
      </div>
    </div>
  );
}
