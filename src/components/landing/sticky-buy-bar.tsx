"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { PRODUCT } from "@/lib/product";
import { ArrowRight } from "lucide-react";
import { CRO } from "@/lib/cro-copy";

type StickyBuyBarProps = {
  isVisible: boolean;
  onBuyNow: () => void;
};

export function StickyBuyBar({ isVisible, onBuyNow }: StickyBuyBarProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 110, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 110, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 38 }}
          className="fixed inset-x-0 bottom-0 z-40 md:hidden"
        >
          <div className="border-t border-white/[0.1] bg-[hsl(222,48%,3%)]/92 px-4 py-3 pb-[max(0.85rem,env(safe-area-inset-bottom))] shadow-[0_-24px_64px_-24px_rgba(0,0,0,0.72),0_0_52px_-20px_rgba(32,76,180,0.2),0_0_72px_-28px_rgba(212,175,55,0.09)] backdrop-blur-2xl">
            <div className="mx-auto flex max-w-lg flex-col gap-2">
              <p className="text-center text-[9px] font-bold uppercase tracking-[0.18em] text-gold/88">
                {CRO.stickySocialProof}
                <span className="mx-1.5 text-white/25" aria-hidden>
                  ·
                </span>
                <span className="text-amber-200/95">🔥 {CRO.stickyUrgency}</span>
              </p>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[9px] font-medium uppercase tracking-[0.26em] text-muted-foreground">
                    Alpha Brasil · Compra segura
                  </p>
                  <p className="price-gold-glow font-display text-[1.35rem] font-bold tabular-nums leading-tight tracking-tight text-gold-bright">
                    {PRODUCT.priceFormatted}
                  </p>
                </div>
                <Button
                  size="lg"
                  className="max-w-[56%] shrink-0 px-3 py-6 text-[10px] font-extrabold uppercase leading-tight tracking-tight sm:px-5"
                  onClick={onBuyNow}
                >
                  <ArrowRight className="mr-1.5 h-4 w-4 shrink-0" />
                  {CRO.stickyCta}
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}