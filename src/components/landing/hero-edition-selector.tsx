"use client";

import { cn } from "@/lib/utils";
import type { HeroEditionId } from "@/lib/product";

type HeroEditionOption = {
  id: HeroEditionId;
  name: string;
  badge: string;
  shortDescription: string;
};

type HeroEditionSelectorProps = {
  options: readonly HeroEditionOption[];
  selectedEdition: HeroEditionId;
  onChange: (edition: HeroEditionId) => void;
};

export function HeroEditionSelector({
  options,
  selectedEdition,
  onChange,
}: HeroEditionSelectorProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-1 text-center sm:text-left">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Escolha sua edição
        </p>
        <p className="text-xs text-muted-foreground">
          Selecione o modelo que mais combina com você antes de escolher o tamanho.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const active = selectedEdition === option.id;
          const isNew = option.badge.toLowerCase().includes("novo");
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.id)}
              className={cn(
                "group relative w-full overflow-hidden rounded-2xl border px-4 py-3 text-left transition-all duration-300",
                active
                  ? "border-gold/70 bg-gold/[0.12] shadow-[0_0_0_1px_rgba(212,175,55,0.24),0_0_20px_-10px_rgba(212,175,55,0.55)]"
                  : "border-white/10 bg-white/[0.02] hover:border-gold/35 hover:bg-white/[0.04]",
                isNew &&
                  (active
                    ? "border-emerald-300/70 bg-gradient-to-br from-emerald-300/[0.22] via-gold/[0.12] to-transparent shadow-[0_0_0_1px_rgba(110,231,183,0.35),0_0_24px_-8px_rgba(110,231,183,0.7),0_0_30px_-14px_rgba(212,175,55,0.85)]"
                    : "border-emerald-200/35 bg-gradient-to-br from-emerald-300/[0.1] via-gold/[0.05] to-transparent shadow-[0_0_18px_-14px_rgba(110,231,183,0.75)] hover:border-emerald-200/55 hover:shadow-[0_0_24px_-12px_rgba(110,231,183,0.9)]")
              )}
              aria-pressed={active}
            >
              {isNew && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute -right-14 -top-8 h-24 w-24 rounded-full bg-emerald-300/25 blur-2xl transition-opacity duration-300 group-hover:opacity-100"
                />
              )}
              <span className="relative inline-flex">
                {isNew && (
                  <span
                    aria-hidden
                    className="absolute inset-0 -z-10 rounded-full bg-emerald-300/30 blur-[1px] animate-pulse"
                  />
                )}
                <span
                  className={cn(
                    "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                    isNew
                      ? "border-emerald-200/55 bg-emerald-300/20 text-emerald-100 shadow-[0_0_12px_-6px_rgba(110,231,183,0.9)]"
                      : "border-gold/35 bg-gold/[0.14] text-gold-bright"
                  )}
                >
                  {option.badge}
                </span>
              </span>
              <p className="mt-2 text-sm font-bold leading-snug text-white">{option.name}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{option.shortDescription}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
