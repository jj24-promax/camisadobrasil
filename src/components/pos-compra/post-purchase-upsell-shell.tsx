"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PostPurchaseUpsellShellProps = {
  stepLabel: string;
  headline: string;
  subheadline: string;
  priceDisplay: string;
  visual: ReactNode;
  acceptLabel: string;
  declineLabel: string;
  onAccept: () => void;
  onDecline: () => void;
};

export function PostPurchaseUpsellShell({
  stepLabel,
  headline,
  subheadline,
  priceDisplay,
  visual,
  acceptLabel,
  declineLabel,
  onAccept,
  onDecline,
}: PostPurchaseUpsellShellProps) {
  return (
    <motion.div
      className="min-h-[100dvh] bg-[#04070d] pb-16 pt-0 text-foreground"
      initial={{ opacity: 0.92 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <header className="border-b border-white/5 bg-navy-deep/50 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-5">
          <Link
            href="/"
            className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground transition-colors hover:text-gold"
          >
            Início
          </Link>
          <p className="font-display text-xs font-bold tracking-[0.3em] text-gold-bright">ALPHA BRASIL</p>
          <Lock size={16} className="text-muted-foreground/40" aria-hidden />
        </div>
      </header>

      <div className="pointer-events-none absolute inset-x-0 top-20 h-64 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,hsl(38_28%_18%/0.22),transparent)]" />

      <main className="relative mx-auto mt-10 max-w-lg px-5 md:mt-14 md:max-w-xl">
        <p className="mb-6 text-center font-display text-[10px] font-semibold uppercase tracking-[0.38em] text-gold/75">
          {stepLabel}
        </p>

        <div className="glass-dark overflow-hidden rounded-[2rem] p-6 md:p-10">
          <div className="mb-8 text-center">
            <h1 className="font-display text-[clamp(1.15rem,4vw,1.65rem)] font-extrabold uppercase leading-snug tracking-[0.06em] text-white">
              {headline}
            </h1>
            <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-muted-foreground md:text-[17px]">
              {subheadline}
            </p>
            <p className="mt-8 font-display text-3xl font-bold tracking-tight text-gold-bright md:text-4xl">
              {priceDisplay}
            </p>
          </div>

          <div
            className={cn(
              "relative mb-10 overflow-hidden rounded-2xl border-2 border-gold/55 bg-[#060a12]/90",
              "shadow-[0_0_32px_-8px_hsl(var(--gold)/0.4),inset_0_1px_0_rgba(255,255,255,0.06)]",
              "ring-1 ring-gold/25"
            )}
          >
            {visual}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-col">
            <Button
              type="button"
              size="xl"
              className="shimmer-btn w-full font-bold uppercase tracking-[0.08em] shadow-[0_0_30px_-8px_hsl(var(--gold)/0.35)]"
              onClick={onAccept}
            >
              {acceptLabel}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full border-white/15 text-[11px] uppercase tracking-[0.14em] text-gold-bright/95"
              onClick={onDecline}
            >
              {declineLabel}
            </Button>
          </div>
        </div>

        <p className="mt-8 text-center text-[10px] uppercase tracking-[0.28em] text-muted-foreground/80">
          Ambiente seguro · Continuação do seu pedido
        </p>
      </main>
    </motion.div>
  );
}
