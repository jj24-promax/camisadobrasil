"use client";

import { Button } from "@/components/ui/button";
import { PRODUCT } from "@/lib/product";
import { ParallaxBg } from "@/components/landing/parallax-bg";
import { SectionReveal, SectionShell } from "@/components/landing/section-shell";
import { ArrowRight } from "lucide-react";
import { PurchaseTrustBlock } from "@/components/landing/purchase-trust-block";
import { CRO } from "@/lib/cro-copy";

type FinalCtaProps = {
  onBuyNow: () => void;
};

export function FinalCta({ onBuyNow }: FinalCtaProps) {
  return (
    <SectionShell
      aria-labelledby="final-cta-heading"
      variant="highlight"
      grain="low"
      bleedBottom={false}
      contentClassName="max-w-5xl !pb-32 !pt-8 md:!pb-40 md:!pt-12"
      backgroundSlot={
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
          <ParallaxBg range={26} className="opacity-[0.55]">
            <div className="h-full w-full bg-[radial-gradient(ellipse_100%_90%_at_50%_100%,hsl(215_35%_10%/0.75),hsl(222_48%_3%))]" />
          </ParallaxBg>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[rgba(212,175,55,0.05)] via-transparent to-transparent" />
        </div>
      }
    >
      <SectionReveal className="relative overflow-hidden rounded-[2rem] border border-white/[0.08] p-10 shadow-luxe md:p-16">
        <div className="pointer-events-none absolute -left-24 top-0 h-64 w-64 rounded-full bg-gold/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 bottom-0 h-48 w-48 rounded-full bg-[hsl(215_40%_25%/0.2)] blur-3xl" />

        <div className="relative text-center">
          <p className="font-display text-[10px] font-semibold uppercase tracking-[0.42em] text-amber-200/95">
            🔥 Estoque girando rápido
          </p>
          <h2
            id="final-cta-heading"
            className="mx-auto mt-6 max-w-4xl font-display text-[clamp(2rem,4.2vw,3.25rem)] font-bold leading-[1.08] tracking-tight text-balance"
          >
            Últimas unidades disponíveis —{" "}
            <span className="bg-gradient-to-r from-gold-bright via-gold to-gold-muted bg-clip-text text-transparent">
              garanta a sua agora
            </span>
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base font-medium leading-relaxed text-white/85 md:text-lg">
            ⏳ Essa edição não será reposta. Quem garante hoje leva o manto antes que a leva feche.
          </p>

          <div className="mt-12 flex flex-col items-center justify-center gap-10 md:flex-row md:gap-14">
            <div className="text-center md:text-left">
              <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-muted-foreground">
                A partir de
              </p>
              <p className="price-gold-glow mt-2 font-display text-4xl font-bold tabular-nums tracking-tight text-gold-bright md:text-5xl">
                {PRODUCT.priceFormatted}
              </p>
            </div>
            <Button
              size="xl"
              onClick={onBuyNow}
              className="max-w-md px-6 text-xs font-extrabold uppercase leading-snug tracking-tight transition-transform duration-300 hover:scale-[1.02] active:scale-[0.99] sm:text-sm sm:tracking-normal"
            >
              <ArrowRight className="mr-2.5 h-5 w-5 shrink-0" />
              {CRO.finalCta}
            </Button>
          </div>

          <PurchaseTrustBlock variant="compact" className="mx-auto mt-10 max-w-xl" />
        </div>
      </SectionReveal>
    </SectionShell>
  );
}