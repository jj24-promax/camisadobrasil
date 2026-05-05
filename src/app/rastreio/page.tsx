"use client";

import { Suspense, useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Package, Truck, Check, Search, ChevronLeft, Loader2, MapPin, Shield, AlertTriangle, Copy } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { generateTimeline, type TrackingEvent } from "@/utils/tracking";

/** Espelha `src/app/api/rastreio/route.ts` — manter sincronizado. */
const TRACKING_REGEX = /^BR\d{4}[A-Z]\d{3}BR$/i;

function RastreioContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialCode = searchParams.get("code") || "";

  const [code, setCode] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [timeline, setTimeline] = useState<TrackingEvent[] | null>(null);
  const [error, setError] = useState("");
  const [taxPix, setTaxPix] = useState<{ pixCode: string; qrBase64: string } | null>(null);

  const searchCtxRef = useRef<{
    code: string;
    finalCity: string;
    finalState: string;
    bairro: string;
    dataCriacao: string;
  } | null>(null);

  const taxEnsureRequestedRef = useRef("");

  const performSearch = useCallback(async (trackingCode: string) => {
    const codeToSearch = trackingCode.trim().toUpperCase();

    if (!codeToSearch || codeToSearch.length > 15) {
      setError("Código de rastreio inválido ou ausente.");
      setTimeline(null);
      setLoading(false);
      return;
    }

    if (!TRACKING_REGEX.test(codeToSearch)) {
      setError("Código não encontrado no sistema.");
      setTimeline(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    setTimeline(null);
    setTaxPix(null);
    taxEnsureRequestedRef.current = "";

    try {
      let cidade = "";
      let estado = "";
      let bairro = "";
      let dataCriacao = new Date().toISOString();

      const { data: lead } = await supabase
        .from("leads")
        .select("cidade, estado, bairro, created_at")
        .eq("codigo_rastreio", codeToSearch)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lead) {
        if (lead.cidade) cidade = String(lead.cidade).trim();
        if (lead.estado) estado = String(lead.estado).trim();
        if (lead.bairro) bairro = String(lead.bairro).trim();
        if (lead.created_at) dataCriacao = String(lead.created_at);
      } else {
        const { data: venda } = await supabase
          .from("vendas")
          .select("created_at, lead_id, cliente_nome")
          .eq("codigo_rastreio", codeToSearch)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!venda) {
          throw new Error("Encomenda não encontrada.");
        }
        if (venda.created_at) dataCriacao = String(venda.created_at);

        if (venda.lead_id) {
          const { data: leadDaVenda } = await supabase
            .from("leads")
            .select("cidade, estado, bairro")
            .eq("id", venda.lead_id)
            .limit(1)
            .maybeSingle();

          if (leadDaVenda) {
            if (leadDaVenda.cidade) cidade = String(leadDaVenda.cidade).trim();
            if (leadDaVenda.estado) estado = String(leadDaVenda.estado).trim();
            if (leadDaVenda.bairro) bairro = String(leadDaVenda.bairro).trim();
          }
        }
      }

      const finalCity = cidade || "Seu endereço";
      const finalState = cidade ? estado : "";

      searchCtxRef.current = {
        code: codeToSearch,
        finalCity,
        finalState,
        bairro,
        dataCriacao,
      };

      const { data: statusData, error: statusFnError } = await supabase.functions.invoke("check-pix-status", {
        body: { trackingCode: codeToSearch },
      });
      if (statusFnError) {
        console.warn("[rastreio] check-pix-status:", statusFnError.message);
      }
      const taxaJaPaga = Boolean(statusData?.taxaPaga ?? false);

      const pc = typeof statusData?.pixCode === "string" ? statusData.pixCode.trim() : "";
      const qb64 = typeof statusData?.qrCodeBase64 === "string" ? statusData.qrCodeBase64.trim().replace(/\s/g, "") : "";
      if (pc && !taxaJaPaga) {
        setTaxPix({ pixCode: pc, qrBase64: qb64 });
      }

      const generatedTimeline = generateTimeline(
        codeToSearch,
        finalCity,
        finalState,
        bairro,
        dataCriacao,
        taxaJaPaga
      );

      if (generatedTimeline.length === 0) {
        setError("Ainda não há atualizações para este objeto.");
        setTimeline(null);
        return;
      }

      setTimeline(generatedTimeline);
      setError("");
      router.replace(`/rastreio?code=${encodeURIComponent(codeToSearch)}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro interno ao processar rastreio.";
      setTimeline(null);
      setError(msg === "Encomenda não encontrada." ? msg : "Erro interno ao processar rastreio.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const raw = code.trim().toUpperCase();
    const ctx = searchCtxRef.current;
    if (!timeline?.length || loading || !ctx || ctx.code !== raw) return;

    const top = timeline[0]?.status ?? "";
    const needsTax =
      top.includes("Aguardando pagamento") && top.toLowerCase().includes("retido");

    if (!needsTax) {
      taxEnsureRequestedRef.current = "";
      setTaxPix(null);
      return;
    }

    if (taxPix?.pixCode?.trim()) return;

    if (taxEnsureRequestedRef.current === raw) return;
    taxEnsureRequestedRef.current = raw;

    let cancelled = false;
    void (async () => {
      try {
        const { data, error: fnErr } = await supabase.functions.invoke("check-pix-status", {
          body: { trackingCode: raw, ensureCharge: true },
        });
        if (cancelled) return;
        if (fnErr) {
          console.warn("[rastreio] ensureCharge:", fnErr.message);
          taxEnsureRequestedRef.current = "";
          return;
        }
        if (data?.taxaPaga && ctx) {
          setTimeline(generateTimeline(ctx.code, ctx.finalCity, ctx.finalState, ctx.bairro, ctx.dataCriacao, true));
          setTaxPix(null);
          return;
        }
        const ensuredPix = typeof data?.pixCode === "string" ? data.pixCode.trim() : "";
        const ensuredB64 =
          typeof data?.qrCodeBase64 === "string" ? data.qrCodeBase64.trim().replace(/\s/g, "") : "";
        if (ensuredPix) {
          setTaxPix({ pixCode: ensuredPix, qrBase64: ensuredB64 });
        } else {
          taxEnsureRequestedRef.current = "";
        }
      } catch {
        taxEnsureRequestedRef.current = "";
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [timeline, code, loading, taxPix?.pixCode]);

  useEffect(() => {
    if (initialCode) void performSearch(initialCode);
  }, [initialCode, performSearch]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    void performSearch(code);
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

            {taxPix?.pixCode &&
              timeline[0]?.status?.includes("Aguardando pagamento") &&
              timeline[0].status.toLowerCase().includes("retido") && (
              <div className="mb-10 rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] p-6">
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-200/90">Taxa alfandegária pendente</p>
                <p className="mt-2 text-sm leading-relaxed text-white/85">
                  Efetue o pagamento abaixo para liberação do objeto na fiscalização. Após confirmado, as atualizações de rastreio seguem automaticamente.
                </p>
                <div className="mt-6 flex flex-col items-center gap-5 sm:flex-row sm:items-start sm:justify-center">
                  <div className="relative h-44 w-44 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={
                        taxPix.qrBase64
                          ? taxPix.qrBase64.startsWith("data:")
                            ? taxPix.qrBase64
                            : `data:image/png;base64,${taxPix.qrBase64}`
                          : `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(taxPix.pixCode)}`
                      }
                      alt="QR Code Pix da taxa"
                      className="h-full w-full object-contain"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.src = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(taxPix.pixCode)}`;
                      }}
                    />
                  </div>
                  <div className="w-full min-w-0 flex-1 space-y-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Pix copia e cola</p>
                    <p className="break-all rounded-xl border border-white/10 bg-black/35 px-3 py-3 font-mono text-[11px] leading-relaxed text-white/90">
                      {taxPix.pixCode}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full border-white/15 bg-white/[0.04] font-bold uppercase tracking-widest sm:w-auto"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(taxPix.pixCode);
                          toast.success("Código Pix copiado.");
                        } catch {
                          toast.error("Não foi possível copiar. Selecione o código manualmente.");
                        }
                      }}
                    >
                      <Copy className="mr-2 h-4 w-4" aria-hidden />
                      Copiar código
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="relative pl-6 md:pl-8 space-y-10 border-l border-gold/20">
              {timeline.map((event, index) => {
                const isFirst = index === 0;
                
                const IconComp =
                  event.icon === "check"
                    ? Check
                    : event.icon === "truck"
                      ? Truck
                      : event.icon === "shield"
                        ? Shield
                        : event.icon === "alert"
                          ? AlertTriangle
                          : Package;

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