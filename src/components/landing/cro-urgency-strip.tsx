"use client";

import { cn } from "@/lib/utils";
import { CRO } from "@/lib/cro-copy";

type CroUrgencyVariant = "sales" | "stock" | "promo";

const copy: Record<CroUrgencyVariant, { icon: string; text: string }> = {
  sales: { icon: "🔥", text: CRO.stripSalesToday },
  stock: { icon: "⚠️", text: CRO.stripStock },
  promo: { icon: "⏳", text: CRO.stripPromoEnds },
};

type CroUrgencyStripProps = {
  variant: CroUrgencyVariant;
  className?: string;
};

/**
 * Faixa fina de urgência entre seções — fluxo desejo → pressão de decisão.
 */
export function CroUrgencyStrip({ variant, className }: CroUrgencyStripProps) {
  const { icon, text } = copy[variant];
  return (
    <div
      className={cn(
        "border-y border-white/[0.06] bg-gradient-to-r from-gold/[0.06] via-white/[0.02] to-gold/[0.06] px-4 py-2.5 text-center backdrop-blur-sm",
        className
      )}
      role="status"
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gold-bright/95 sm:text-xs sm:tracking-[0.24em]">
        <span aria-hidden className="mr-1.5">
          {icon}
        </span>
        {text}
      </p>
    </div>
  );
}
