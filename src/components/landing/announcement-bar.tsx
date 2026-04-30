"use client";

import { Ticket, Zap } from "lucide-react";

export function AnnouncementBar() {
  return (
    <div className="relative z-50 w-full bg-gradient-to-r from-[#a38040] via-[#cfa864] to-[#a38040] py-2.5 shadow-md">
      <div className="flex items-center justify-center gap-2.5 px-4 text-center">
        <Ticket className="h-4 w-4 text-[#0a0a0a]" strokeWidth={1.75} />
        <Zap className="h-4 w-4 text-[#0a0a0a]" strokeWidth={1.75} />
        <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.15em] text-[#0a0a0a] sm:text-xs">
          COMPRE E CONCORRA A 2 INGRESSOS PARA A COPA DO MUNDO <span className="mx-2 font-normal opacity-40">|</span> FRETE GRÁTIS
        </p>
      </div>
    </div>
  );
}