"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Check, Lock, Package, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import { generateMockTrackingCode } from "@/lib/tracking-utils";
import { takeMetaPurchasePixelAllowed } from "@/lib/meta-purchase-gate";
import { supabase } from "@/integrations/supabase/client";

function ObrigadoContent() {
  const searchParams = useSearchParams();
  const vip = searchParams.get("vip") === "1";
  const card = searchParams.get("card") === "1";
  const trackingCodeFromUrl = searchParams.get("code") || "";
  
  const [trackingCode, setTrackingCode] = useState("");
  const [trackingLinkUrl, setTrackingLinkUrl] = useState("https://rastrearlog.online");

  // Meta Pixel — Purchase só após confirmação de PIX no checkout (flag em sessão).
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!takeMetaPurchasePixelAllowed()) return;
    if (typeof (window as any).fbq !== "function") return;
    (window as any).fbq("track", "Purchase", { currency: "BRL" });
  }, []);

  useEffect(() => {
    // Ordem de prioridade:
    // 1) code na URL
    // 2) sessionStorage (mesma aba)
    // 3) localStorage (volta em outra aba/sessão)
    // 4) fallback final
    const fromSession = sessionStorage.getItem("alpha_tracking_code");
    const fromLocal = localStorage.getItem("alpha_tracking_code");
    const resolvedCode = trackingCodeFromUrl || fromSession || fromLocal || generateMockTrackingCode();

    setTrackingCode(resolvedCode);
    // Mantém sincronizado para não gerar novo código ao voltar à página.
    sessionStorage.setItem("alpha_tracking_code", resolvedCode);
    localStorage.setItem("alpha_tracking_code", resolvedCode);
  }, [trackingCodeFromUrl]);

  useEffect(() => {
    // Busca os links dinâmicos no Supabase
    const fetchSettings = async () => {
      const { data } = await supabase.from("store_settings").select("tracking_link").eq("id", 1).maybeSingle();
      if (data?.tracking_link) {
        setTrackingLinkUrl(data.tracking_link);
      }
    };
    fetchSettings();
  }, []);
  
  const copyTracking = () => {
    if (!trackingCode) return;
    navigator.clipboard.writeText(trackingCode);
    toast.success("Código de rastreio copiado!");
  };

  return (
    <motion.div
      className="min-h-[100dvh] bg-[#04070d] pb-20 text-foreground"
      initial={{ opacity: 0.9 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <header className="border-b border-white/5 bg-navy-deep/50 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-5">
          <span className="w-12" aria-hidden />
          <p className="font-display text-xs font-bold tracking-[0.3em] text-gold-bright">ALPHA BRASIL</p>
          <Lock size={16} className="text-muted-foreground/40" aria-hidden />
        </div>
      </header>

      <div className="pointer-events-none absolute inset-x-0 top-16 h-72 bg-[radial-gradient(ellipse_65%_55%_at_50%_0%,hsl(38_30%_22%/0.35),transparent)]" />

      <main className="relative mx-auto mt-12 max-w-lg px-5 md:mt-20 md:max-w-xl">
        <div className="glass-dark rounded-[2rem] px-6 py-10 text-center md:px-12 md:py-12">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full border border-green-500/30 bg-green-500/10">
            <Check className="h-7 w-7 text-green-400" strokeWidth={2.5} aria-hidden />
          </div>
          <p className="font-display text-[10px] font-semibold uppercase tracking-[0.42em] text-gold/75">
            Pedido confirmado
          </p>
          <h1 className="mt-4 font-display text-[clamp(1.5rem,5vw,2rem)] font-extrabold uppercase leading-tight tracking-tight text-white">
            Obrigado pela sua compra
          </h1>
          
          <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-muted-foreground">
            Recebemos o seu pedido com sucesso. Abaixo estão os detalhes para acompanhar a sua entrega.
          </p>

          <div className="mt-10 overflow-hidden rounded-2xl border border-gold/20 bg-gold/5 p-6 text-left">
            <div className="flex items-center gap-3 text-gold-bright mb-4">
              <Package size={20} />
              <h2 className="text-xs font-bold uppercase tracking-widest">Rastreamento do Pedido</h2>
            </div>
            
            <p className="text-[13px] text-muted-foreground leading-relaxed mb-5">
              O seu código de rastreio já foi gerado. Copie o código abaixo e acompanhe a viagem do seu pacote.
            </p>

            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between rounded-xl bg-black/40 border border-white/10 px-4 py-3">
                <span className="font-mono text-sm font-bold text-white tracking-wider">
                  {trackingCode || "..."}
                </span>
                <button 
                  onClick={copyTracking}
                  className="text-gold hover:text-gold-bright transition-colors p-1"
                  title="Copiar código"
                >
                  <Copy size={16} />
                </button>
              </div>

              {trackingCode && (
                <a 
                  href={trackingLinkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gold/10 border border-gold/30 text-[11px] font-bold uppercase tracking-widest text-gold-bright hover:bg-gold/20 transition-all"
                >
                  Acompanhar pedido agora
                  <ExternalLink size={14} />
                </a>
              )}
            </div>
            
            <p className="mt-4 text-[10px] text-center text-muted-foreground/60 italic">
              *As atualizações de rota podem demorar até 24h para iniciar.
            </p>
          </div>

          {(vip || card) && (
            <ul className="mx-auto mt-8 max-w-sm space-y-2 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-4 text-left text-[13px] text-muted-foreground">
              {vip && (
                <li className="flex gap-2">
                  <span className="text-gold-bright">✓</span>
                  <span>Fila VIP de produção incluída no seu pedido.</span>
                </li>
              )}
              {card && (
                <li className="flex gap-2">
                  <span className="text-gold-bright">✓</span>
                  <span>Card colecionável da edição reservado para envio com a peça.</span>
                </li>
              )}
            </ul>
          )}

          <Button asChild size="xl" className="mt-10 w-full font-bold uppercase tracking-[0.1em]">
            <Link href="/">Voltar à loja</Link>
          </Button>
        </div>
      </main>
    </motion.div>
  );
}

export default function ObrigadoPage() {
  return (
    <Suspense fallback={<ObrigadoFallback />}>
      <ObrigadoContent />
    </Suspense>
  );
}

function ObrigadoFallback() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#04070d] px-6">
      <div className="h-0.5 w-24 animate-pulse rounded-full bg-gold/30" />
    </div>
  );
}