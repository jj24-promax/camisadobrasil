"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { SectionReveal, SectionShell } from "@/components/landing/section-shell";
import { ArrowRight, TicketPercent } from "lucide-react";
import { PurchaseTrustBlock } from "@/components/landing/purchase-trust-block";

type PromoBundleProps = {
  onBuyBundle: () => void;
};

export function PromoBundle({ onBuyBundle }: PromoBundleProps) {
  return (
    <SectionShell variant="highlight" grain="low" className="py-12 md:py-20">
      <div className="mx-auto max-w-7xl">
        <SectionReveal className="grid items-center gap-12 lg:grid-cols-[1fr_1.3fr]">
          <div className="order-2 text-center md:order-1 lg:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/5 px-4 py-1.5 text-gold mb-6">
              <TicketPercent size={16} />
              <span className="text-xs font-bold uppercase tracking-widest">Oferta Exclusiva</span>
            </div>
            <h2 className="font-display text-[clamp(2.5rem,5vw,4rem)] font-extrabold leading-tight tracking-tight text-foreground">
              Leve 3, <br/>
              <span className="bg-gradient-to-r from-gold-bright to-gold-muted bg-clip-text text-transparent">Pague apenas 2</span>
            </h2>
            <p className="mt-6 text-xl leading-relaxed text-muted-foreground">
              Garanta o kit completo para a família ou amigos com o melhor custo-benefício da coleção. A oportunidade perfeita para vestir o manto da redenção.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground/85">
              Promoção não cumulativa: o benefício de uma peça isenta aplica-se uma única vez por pedido, independentemente da quantidade.
            </p>
            <div className="mt-8 space-y-0">
              <Button size="xl" onClick={onBuyBundle} className="shimmer-btn w-full md:w-auto px-12">
                <ArrowRight className="mr-2.5 h-5 w-5" />
                Aproveitar Oferta
              </Button>
              <PurchaseTrustBlock variant="compact" className="mt-6 max-w-md mx-auto md:mx-0" />
            </div>
          </div>

          <div className="relative order-1 mx-auto aspect-square w-full max-w-[780px] overflow-hidden rounded-[2.5rem] md:order-2 lg:max-w-none shadow-luxe">
            <Image
              src="/images/promo-bundle-2.png"
              alt="Promoção Leve 3 Pague 2"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 800px"
              loading="lazy"
            />
          </div>
        </SectionReveal>
      </div>
    </SectionShell>
  );
}