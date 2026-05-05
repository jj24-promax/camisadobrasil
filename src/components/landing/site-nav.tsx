"use client";

import { motion } from "framer-motion";
import { Menu } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const SITE_NAV_LINKS = [
  { href: "#inicio", label: "Início" },
  { href: "#detalhes", label: "Detalhes" },
  { href: "#galeria", label: "Galeria" },
  { href: "#duvidas", label: "Dúvidas" },
  { href: "#feedback", label: "Envie feedback" },
] as const;

function NavAnchor({
  href,
  label,
  className,
}: {
  href: string;
  label: string;
  className?: string;
}) {
  return (
    <a
      href={href}
      className={cn(
        "relative py-1 font-sans text-[11px] font-semibold uppercase tracking-[0.24em] text-gold/88 transition-colors duration-300 hover:text-gold-bright",
        "after:pointer-events-none after:absolute after:bottom-0 after:left-1/2 after:h-px after:w-9 after:-translate-x-1/2 after:bg-gradient-to-r after:from-transparent after:via-[hsl(38,38%,48%)] after:to-transparent after:opacity-0 after:transition-opacity after:duration-300 hover:after:opacity-100",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(222,48%,3%)]",
        className
      )}
    >
      {label}
    </a>
  );
}

export function SiteNavDesktop() {
  return (
    <nav
      className="hidden items-center justify-center gap-7 md:flex lg:gap-9"
      aria-label="Secções da página"
    >
      {SITE_NAV_LINKS.map(({ href, label }) => (
        <NavAnchor key={href} href={href} label={label} />
      ))}
    </nav>
  );
}

export function SiteNavMobile() {
  return (
    <div className="flex items-center gap-2 md:hidden">
      <Dialog>
        <DialogTrigger asChild>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-[hsl(215,14%,70%)] transition-colors hover:border-white/15 hover:bg-white/[0.06] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40"
            aria-label="Abrir menu de navegação"
          >
            <Menu className="h-[18px] w-[18px]" strokeWidth={1.5} />
          </button>
        </DialogTrigger>
        <DialogContent className="max-w-[min(100%,20rem)] gap-0 border-white/[0.1] bg-[hsl(222,42%,7%)]/95 p-0 shadow-luxe backdrop-blur-2xl">
          <DialogTitle className="border-b border-white/[0.06] px-5 py-4 text-left font-display text-xs font-semibold uppercase tracking-[0.28em] text-gold/80">
            Navegar
          </DialogTitle>
          <nav className="flex flex-col py-2" aria-label="Secções da página">
            {SITE_NAV_LINKS.map(({ href, label }, i) => (
              <DialogClose key={href} asChild>
                <motion.a
                  href={href}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    delay: 0.05 * i,
                    duration: 0.28,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="border-b border-white/[0.04] px-5 py-3.5 text-left font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-gold/88 transition-colors last:border-b-0 hover:bg-white/[0.04] hover:text-gold-bright"
                >
                  {label}
                </motion.a>
              </DialogClose>
            ))}
          </nav>
        </DialogContent>
      </Dialog>
    </div>
  );
}
