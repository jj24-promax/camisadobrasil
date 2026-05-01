"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Package, Truck, Check, Search, ChevronLeft, Loader2, MapPin } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TrackingEvent } from "@/lib/tracking-utils";

function RastreioContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialCode = searchParams.get("code") || "";

  const [code, setCode] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [timeline, setTimeline] = useState<TrackingEvent[] | null>(null);
  const [error, setError] = useState("");

  const fetchTracking = useCallback(async (trackingCode: string) => {
    if (!trackingCode.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/rastreio?code=${encodeURIComponent(trackingCode)}`);
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Erro ao consultar código.");
      if (!data.timeline || data.timeline.length === 0) throw new Error("Ainda não há atualizações para este objeto.");
      
      setTimeline(data.timeline);
      // Atualiza a URL sem recarregar a página
      router.replace(`/rastreio?code=${trackingCode}`);
    } catch (err) {
      setTimeline(null);
      setError(err instanceof Error ? err.message : "Código não encontrado.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (initialCode) fetchTracking(initialCode);
  }, [initialCode, fetchTracking]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTracking(code);
  };

  return (
    <motion.div
      className="min-h-screen bg-[#04070d] pb-20 text-foreground"
      initial={{ opacity: 0.9 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <header className="border-b border-white/5 bg-navy-deep/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-5">
          <Link href="/" className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-gold">
            <ChevronLeft size={18} />
            <span className="text-[10px] font-bold uppercase tracking-widest">
              <span className="sm:hidden">Voltar</span>
              <span className="hidden sm:inline">Voltar à loja</span>
            </span>
          </Link>
          <p className="font-display text-[11px] font-bold tracking-[0.2em] text-gold-bright sm:text-xs sm:tracking-[0.3em]">ALPHA BRASIL</p>
          <div className="w-[60px] sm:w-[82px]" />
        </div>
      </header>

      <main className="mx-auto mt-10 max-w-2xl px-5">
        <div className="text-center mb-10">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gold/10 border border-gold/30">
            <Package className="h-6 w-6 text-gold-bright" />
          </div>
          <h1 className="font-display text-2xl font-bold uppercase tracking-tight text-white md:text-3xl">
            Rastrear Pedido
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Acompanhe a sua entrega em tempo real pelas agências do Brasil.
          </p>
        </div>

        <form onSubmit={handleSearch} className="mb-12 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative min-w-0 w-full flex-1">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground/50" />
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Digite o código de rastreio"
              className="h-14 w-full rounded-2xl border border-white/10 bg-white/[0.03] pl-12 pr-4 text-sm font-bold text-white placeholder:text-muted-foreground/50 placeholder:font-normal focus:border-gold/50 focus:outline-none focus:ring-1 focus:ring-gold/50 transition-all uppercase"
            />
          </div>
          <Button type="submit" size="xl" className="h-14 w-full rounded-2xl px-8 font-bold uppercase tracking-widest sm:w-auto" disabled={loading || !code.trim()}>
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Buscar"}
          </Button>
        </form>

        {error && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.05] p-5 text-center text-sm text-red-200">
            {error}
          </div>
        )}

        {timeline && !loading && (
          <div className="glass-dark rounded-[2.5rem] p-6 md:p-10">
            <div className="mb-10 pb-6 border-b border-white/10 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Código de Rastreio</p>
                <p className="font-mono text-xl font-bold text-white mt-1">{code}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Status Atual</p>
                <p className="text-sm font-bold text-gold-bright mt-1">{timeline[0]?.status}</p>
              </div>
            </div>

            <div className="relative pl-6 md:pl-8 space-y-10 border-l border-gold/20">
              {timeline.map((event, index) => {
                const isFirst = index === 0;
                
                const IconComp = event.icon === "check" ? Check : event.icon === "truck" ? Truck : Package;

                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="relative"
                  >
                    <div className={cn(
                      "absolute -left-[40px] md:-left-[48px] flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-full border-2",
                      isFirst ? "bg-gold text-navy-deep border-gold shadow-[0_0_15px_rgba(212,175,55,0.4)]" : "bg-[#060a12] text-gold/70 border-gold/30"
                    )}>
                      <IconComp size={isFirst ? 18 : 16} strokeWidth={isFirst ? 2.5 : 2} />
                    </div>
                    
                    <div className="pl-4">
                      <p className={cn("text-base font-bold", isFirst ? "text-white" : "text-white/80")}>
                        {event.status}
                      </p>
                      
                      <div className="mt-2 space-y-1.5">
                        <div className="flex items-start gap-2 text-sm text-muted-foreground">
                          <MapPin size={14} className="mt-0.5 shrink-0 text-gold/60" />
                          <span>
                            {event.location}
                            {event.destination && (
                              <>
                                <span className="block text-white/50 text-[11px] uppercase tracking-wider mt-1">Destino: {event.destination}</span>
                              </>
                            )}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground/60 font-mono">
                          {new Intl.DateTimeFormat("pt-BR", {
                            day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
                          }).format(new Date(event.date))}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </motion.div>
  );
}

export default function RastreioPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[#04070d]">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    }>
      <RastreioContent />
    </Suspense>
  );
}