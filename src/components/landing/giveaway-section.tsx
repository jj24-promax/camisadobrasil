"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Ticket, Plane, Trophy } from "lucide-react";
import { SectionReveal, SectionShell } from "@/components/landing/section-shell";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Ticket,
    title: "1 Camisa = 1 Chance",
    desc: "Cada camisa no seu pedido gera um número da sorte automático no seu e-mail.",
  },
  {
    icon: Trophy,
    title: "Jogo do Brasil",
    desc: "Ingressos garantidos para você e um acompanhante em uma partida da Seleção.",
  },
  {
    icon: Plane,
    title: "Tudo Pago",
    desc: "Passagens aéreas e hospedagem inclusas para você viver essa experiência sem custos.",
  },
];

type GiveawaySectionProps = {
  onParticipate: () => void;
};

export function GiveawaySection({ onParticipate }: GiveawaySectionProps) {
  return (
    <SectionShell
      id="sorteio"
      variant="highlight"
      grain="low"
      className="py-16 md:py-24 relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 -mt-20 -mr-20 h-96 w-96 rounded-full bg-gold/20 blur-[120px]" />
      <div className="absolute bottom-0 left-0 -mb-20 -ml-20 h-96 w-96 rounded-full bg-gold-bright/15 blur-[120px]" />

      <SectionReveal className="mx-auto max-w-5xl">
        <div className="relative overflow-hidden rounded-[2.5rem] border border-gold/50 bg-gradient-to-br from-[#1a1505]/95 to-[#0a0802]/95 shadow-[0_0_60px_-10px_rgba(212,175,55,0.4)] backdrop-blur-xl">
          
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.15),transparent_70%)]" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-bright to-transparent opacity-80" />
          
          <div className="relative z-10 grid lg:grid-cols-2 gap-10 p-8 md:p-12 lg:p-16 items-center">
            
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/20 px-4 py-1.5 text-gold-bright mb-6 shadow-[0_0_15px_rgba(212,175,55,0.3)]">
                <Trophy size={16} />
                <span className="text-xs font-bold uppercase tracking-widest">Sorteio Exclusivo</span>
              </div>
              <h2 className="font-display text-[clamp(2.2rem,4vw,3.5rem)] font-extrabold leading-[1.1] tracking-tight text-white">
                Rumo ao Hexa na <br />
                <span className="bg-gradient-to-r from-gold-bright via-gold to-gold-muted bg-clip-text text-transparent drop-shadow-sm">
                  Copa do Mundo 2026
                </span>
              </h2>
              <p className="mt-6 text-base md:text-lg leading-relaxed text-gold/90 font-medium">
                Vista o manto sagrado e prepare as malas. Ao garantir sua Edição Alpha Brasil hoje, 
                você já está concorrendo a <strong>2 ingressos com viagem e hospedagem pagas</strong> para assistir a Seleção Brasileira.
              </p>

              <div className="mt-10">
                <Button size="xl" onClick={onParticipate} className="shimmer-btn w-full sm:w-auto px-10 py-7 text-sm font-bold uppercase tracking-widest bg-gold hover:bg-gold-bright text-navy-deep shadow-[0_0_20px_rgba(212,175,55,0.5)] border-none">
                  <Ticket className="mr-2.5 h-5 w-5" />
                  Comprar e Participar
                </Button>
              </div>
            </div>

            <div className="flex flex-col items-center gap-8 lg:gap-10">
              <div className="grid gap-4 sm:gap-5 w-full">
                {features.map((item, idx) => (
                  <motion.div 
                    key={idx}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.15 }}
                    className="flex items-start gap-5 rounded-2xl border border-gold/15 bg-gold/[0.04] p-5 hover:bg-gold/[0.08] hover:border-gold/30 transition-colors shadow-sm"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-gold/30 to-gold/10 border border-gold/40 text-gold-bright shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
                      <item.icon size={22} strokeWidth={1.5} />
                    </div>
                    <div>
                      <h3 className="font-display text-base font-bold text-white tracking-wide">{item.title}</h3>
                      <p className="mt-1.5 text-[13px] leading-relaxed text-gold/70">{item.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

            </div>

          </div>
        </div>
      </SectionReveal>
    </SectionShell>
  );
}