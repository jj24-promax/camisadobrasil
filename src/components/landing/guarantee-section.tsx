"use client";

import { ShieldCheck, RefreshCcw, CheckCircle2 } from "lucide-react";
import { SectionReveal, SectionShell } from "@/components/landing/section-shell";
import { motion } from "framer-motion";

export function GuaranteeSection() {
  return (
    <SectionShell
      variant="soft"
      grain="low"
      className="py-16 md:py-24"
      backgroundSlot={
        <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_50%_50%,rgba(212,175,55,0.05),transparent_70%)]" />
      }
    >
      <div className="mx-auto max-w-4xl">
        <SectionReveal className="relative overflow-hidden rounded-[2.5rem] border border-gold/20 bg-gradient-to-br from-white/[0.03] to-transparent p-8 md:p-16 shadow-gold-soft">
          {/* Efeito de brilho de fundo */}
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gold/10 blur-[80px]" />
          <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-navy/20 blur-[80px]" />

          <div className="relative grid gap-12 lg:grid-cols-[200px_1fr] lg:items-center">
            <div className="flex justify-center">
              <motion.div
                initial={{ scale: 0.8, rotate: -10 }}
                whileInView={{ scale: 1, rotate: 0 }}
                viewport={{ once: true }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="relative flex h-40 w-40 items-center justify-center rounded-full border-2 border-gold/30 bg-gold/5 shadow-[0_0_40px_rgba(212,175,55,0.15)]"
              >
                <div className="absolute inset-2 rounded-full border border-gold/10 border-dashed" />
                <div className="flex flex-col items-center text-center">
                  <span className="font-display text-5xl font-black text-gold-bright">7</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gold/80">Dias de</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gold/80">Garantia</span>
                </div>
              </motion.div>
            </div>

            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 rounded-full bg-green-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-green-400 mb-4 border border-green-500/20">
                <ShieldCheck size={12} />
                Compra 100% Segura
              </div>
              <h2 className="font-display text-[clamp(1.75rem,4vw,2.5rem)] font-bold leading-tight tracking-tight text-white">
                Teste por 7 dias — <br />
                <span className="bg-gradient-to-r from-gold-bright to-gold-muted bg-clip-text text-transparent">
                  se não gostar, devolvemos 100% do seu dinheiro
                </span>
              </h2>
              <p className="mt-6 text-base leading-relaxed text-muted-foreground md:text-lg">
                Sem letra miúda: vista a sua Alpha no conforto de casa. Não ficou do jeito que você imaginou? Em até{" "}
                <span className="font-medium text-white">7 dias</span> devolvemos tudo que você pagou — simples assim.
              </p>
              
              <div className="mt-8 flex flex-wrap justify-center lg:justify-start gap-4 md:gap-8">
                <div className="flex items-center gap-2 text-xs font-semibold text-white/80">
                  <CheckCircle2 size={16} className="text-gold" />
                  Risco Zero para Você
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-white/80">
                  <RefreshCcw size={16} className="text-gold" />
                  Troca Fácil e Ágil
                </div>
              </div>
            </div>
          </div>
        </SectionReveal>
      </div>
    </SectionShell>
  );
}