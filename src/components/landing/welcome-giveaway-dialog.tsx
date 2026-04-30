"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trophy } from "lucide-react";

export function WelcomeGiveawayDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Usamos sessionStorage para garantir que o card apareça apenas 1 vez por sessão
    const hasSeen = sessionStorage.getItem("alpha_seen_welcome_giveaway");
    if (!hasSeen) {
      const timer = setTimeout(() => {
        setOpen(true);
      }, 800); // Aguarda menos de 1 segundo para aparecer
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setOpen(false);
    sessionStorage.setItem("alpha_seen_welcome_giveaway", "1");
  };

  return (
    <Dialog 
      open={open} 
      onOpenChange={(val) => {
        if (!val) handleClose();
      }}
    >
      <DialogContent className="max-w-md border border-gold/50 bg-gradient-to-br from-[#1a1505]/95 to-[#0a0802]/95 backdrop-blur-xl p-0 overflow-hidden shadow-[0_0_60px_-10px_rgba(212,175,55,0.4)] gap-0">
        <DialogTitle className="sr-only">Sorteio Exclusivo</DialogTitle>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.12),transparent_70%)] pointer-events-none" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-bright to-transparent opacity-80" />
        
        <div className="relative z-10 p-8 pb-10 text-center flex flex-col items-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/20 px-4 py-1.5 text-gold-bright mb-6 shadow-[0_0_15px_rgba(212,175,55,0.3)]">
            <Trophy size={16} />
            <span className="text-xs font-bold uppercase tracking-widest">Sorteio Exclusivo</span>
          </div>

          <div className="relative h-36 w-full max-w-[260px] drop-shadow-[0_0_40px_rgba(212,175,55,0.6)] mb-6 animate-pulse-soft">
            <Image
              src="/images/golden-ticket.png"
              alt="Golden Ticket Copa do Mundo"
              fill
              className="object-contain"
            />
          </div>

          <h2 className="font-display text-[1.4rem] sm:text-2xl font-extrabold leading-tight tracking-tight text-white mb-3">
            Rumo ao Hexa na <br />
            <span className="bg-gradient-to-r from-gold-bright via-gold to-gold-muted bg-clip-text text-transparent drop-shadow-sm">
              Copa do Mundo 2026
            </span>
          </h2>
          
          <p className="text-[13px] sm:text-sm leading-relaxed text-gold/90 font-medium mb-8 max-w-xs">
            Ao garantir a sua camisa Alpha Brasil hoje, você concorre a <strong>2 ingressos com viagem e hospedagem pagas</strong> para assistir à Seleção.
          </p>

          <Button 
            onClick={handleClose} 
            size="xl" 
            className="w-full shimmer-btn font-bold uppercase tracking-widest text-sm bg-gold hover:bg-gold-bright text-navy-deep shadow-[0_0_20px_rgba(212,175,55,0.4)] border-none"
          >
            Continuar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}