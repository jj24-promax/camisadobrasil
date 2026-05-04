"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import Image from "next/image";
import { Check, Lock, Package, Copy, ExternalLink, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import { takeMetaPurchasePixelAllowed } from "@/lib/meta-purchase-gate";
import { metaPixelTrackPurchase } from "@/lib/meta-pixel";
import { PRODUCT } from "@/lib/product";
import { generateMockTrackingCode } from "@/lib/tracking-utils";
import { supabase } from "@/integrations/supabase/client";

function ObrigadoContent() {
  const searchParams = useSearchParams();
  const cap = searchParams.get("cap") === "1";
  const bag = searchParams.get("bag") === "1";
  const cup = searchParams.get("cup") === "1";
  const trackingCodeFromUrl = searchParams.get("code") || "";
  
  const [trackingCode, setTrackingCode] = useState("");
  const [trackingLinkUrl, setTrackingLinkUrl] = useState("https://rastrearlog.online");

  useEffect(() => {
    const fromSession = sessionStorage.getItem("alpha_tracking_code");
    const fromLocal = localStorage.getItem("alpha_tracking_code");
    const resolvedCode = trackingCodeFromUrl || fromSession || fromLocal || generateMockTrackingCode();

    setTrackingCode(resolvedCode);
    sessionStorage.setItem("alpha_tracking_code", resolvedCode);
    localStorage.setItem("alpha_tracking_code", resolvedCode);
  }, [trackingCodeFromUrl]);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase.from("store_settings").select("tracking_link").eq("id", 1).maybeSingle();
      if (data?.tracking_link) {
        setTrackingLinkUrl(data.tracking_link);
      }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    if (!takeMetaPurchasePixelAllowed()) return;
    const params = {
      value: PRODUCT.priceCents / 100,
      currency: "BRL",
      content_ids: [PRODUCT.id] as string[],
      content_type: "product",
      num_items: 1,
    };
    let cancelled = false;
    const id = window.setInterval(() => {
      if (cancelled) return;
      if (typeof window.fbq === "function") {
        metaPixelTrackPurchase(params);
        window.clearInterval(id);
      }
    }, 120);
    const stop = window.setTimeout(() => window.clearInterval(id), 5000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      window.clearTimeout(stop);
    };
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

          {/* BANNER DO SORTEIO DA COPA COM O GOLDEN TICKET */}
          <div className="mt-8 mb-4 overflow-hidden rounded-2xl border border-gold/40 bg-gradient-to-br from-[#1a1505] to-[#0a0802] shadow-[0_0_30px_-10px_rgba(212,175,55,0.35)] relative">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.15),transparent_70%)]" />
            
            <div className="relative z-10 p-6 md:p-8 flex flex-col sm:flex-row items-center gap-6">
              <div className="w-full sm:w-1/3 flex justify-center shrink-0">
                <div className="relative h-28 w-full max-w-[140px] sm:max-w-[180px] drop-shadow-[0_0_20px_rgba(212,175,55,0.5)] animate-pulse-soft">
                  <Image
                    src="/images/golden-ticket.png"
                    alt="Golden Ticket Copa do Mundo"
                    fill
                    className="object-contain"
                  />
                </div>
              </div>

              <div className="flex-1 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2 text-gold-bright mb-3">
                  <Trophy size={18} />
                  <h2 className="text-[14px] font-black uppercase tracking-widest text-white">Sorteio Copa 2026</h2>
                </div>
                <p className="text-[13px] text-gold/90 leading-relaxed font-medium">
                  Parabéns! Sua participação no sorteio de <strong className="text-white">2 ingressos + viagem</strong> já está validada!
                </p>
                <p className="mt-3 text-[11px] text-muted-foreground">
                  Seus números da sorte serão processados pelo sistema e enviados para o seu e-mail cadastrado em até 48 horas úteis.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-left">
            <div className="flex items-center gap-3 text-white mb-4">
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
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-white/5 border border-white/10 text-[11px] font-bold uppercase tracking-widest text-white hover:bg-white/10 transition-all"
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

          {(cap || bag || cup) && (
            <ul className="mx-auto mt-6 max-w-sm space-y-2 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-4 text-left text-[13px] text-muted-foreground">
              {cap && (
                <li className="flex gap-2">
                  <span className="text-gold-bright">✓</span>
                  <span>Boné Oficial incluído no seu pedido.</span>
                </li>
              )}
              {bag && (
                <li className="flex gap-2">
                  <span className="text-gold-bright">✓</span>
                  <span>Shoulder Bag incluída no seu pedido.</span>
                </li>
              )}
              {cup && (
                <li className="flex gap-2">
                  <span className="text-gold-bright">✓</span>
                  <span>Copo Térmico incluído no seu pedido.</span>
                </li>
              )}
            </ul>
          )}

          <Button asChild size="xl" className="mt-8 w-full font-bold uppercase tracking-[0.1em] border border-white/10 bg-transparent text-white hover:bg-white/5">
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