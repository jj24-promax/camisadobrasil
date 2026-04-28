"use client";

import { Suspense, useEffect, useMemo, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { Copy, Loader2, Lock, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { extractPixGatewayPayload, qrDataUrlForImg } from "@/lib/pix-gateway-response";
import { readPosCompraPixClient } from "@/lib/pos-compra-pix-storage";
import { computeUpsellAddonCents, UPSELL_CARD_CENTS, UPSELL_VIP_CENTS } from "@/lib/pos-compra-upsell-pricing";
import { posCompraObrigadoQuery } from "@/lib/pos-compra-routes";
import { usePixPaymentConfirmation } from "@/hooks/use-pix-payment-confirmation";
import { supabaseEdgeInvokeHeaders } from "@/lib/supabase/edge-invoke-headers";
import { extractTrackingFromSearch, sendUtmifyPaidOrderOnce } from "@/lib/utmify-client";

type PixState = {
  paymentCode: string;
  paymentCodeBase64: string;
  idTransaction?: string;
} | null;

function cacheKey(vip: boolean, card: boolean) {
  return `alpha_pos_compra_addon_pix_${vip ? "v" : ""}${card ? "c" : ""}`;
}

function PixAddonsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const vip = searchParams.get("vip") === "1";
  const card = searchParams.get("card") === "1";

  const addonCents = useMemo(() => computeUpsellAddonCents(vip, card), [vip, card]);
  const [pixResult, setPixResult] = useState<PixState>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [missingClient, setMissingClient] = useState(false);
  const fetchStartedFor = useRef<string | null>(null);

  const qrDataUrl = useMemo(
    () => (pixResult?.paymentCodeBase64 ? qrDataUrlForImg(pixResult.paymentCodeBase64) : null),
    [pixResult?.paymentCodeBase64]
  );

  const { confirmed: pixPaymentConfirmed, trackingAvailable: pixTrackingAvailable } =
    usePixPaymentConfirmation(pixResult?.idTransaction);

  const pixAwaitingConfirm = pixResult != null;
  const pixMissingTransactionId = pixAwaitingConfirm && !(pixResult?.idTransaction ?? "").trim();
  const pixContinueDisabled =
    loading ||
    (pixAwaitingConfirm &&
      (pixMissingTransactionId || !pixTrackingAvailable || !pixPaymentConfirmed));

  useEffect(() => {
    if (addonCents === 0) {
      router.replace(posCompraObrigadoQuery(vip, card));
    }
  }, [addonCents, vip, card, router]);

  const pixAddonAutoRedirectDoneRef = useRef(false);
  useEffect(() => {
    pixAddonAutoRedirectDoneRef.current = false;
  }, [pixResult?.idTransaction]);

  useEffect(() => {
    if (loading) return;
    if (!pixResult?.paymentCode?.trim()) return;
    if (!(pixResult.idTransaction ?? "").trim()) return;
    if (!pixTrackingAvailable || !pixPaymentConfirmed) return;
    if (pixAddonAutoRedirectDoneRef.current) return;
    const tx = (pixResult.idTransaction ?? "").trim();
    if (!tx) return;
    pixAddonAutoRedirectDoneRef.current = true;
    const client = readPosCompraPixClient();
    if (client) {
      void sendUtmifyPaidOrderOnce({
        orderId: tx,
        paymentMethod: "pix",
        status: "paid",
        createdAt: new Date().toISOString(),
        approvedDate: new Date().toISOString(),
        customer: {
          name: client.name,
          email: client.email,
          phone: client.telefone,
        },
        totalPriceInCents: addonCents,
        trackingParameters: extractTrackingFromSearch(searchParams),
        products: [
          {
            name: "Adicionais pós-compra",
            priceInCents: addonCents,
            quantity: 1,
          },
        ],
      }).catch(() => {
        // Falha no postback não bloqueia a navegação.
      });
    }
    toast.success("Pagamento confirmado!");
    router.push(posCompraObrigadoQuery(vip, card));
  }, [
    loading,
    pixResult?.paymentCode,
    pixResult?.idTransaction,
    pixTrackingAvailable,
    pixPaymentConfirmed,
    vip,
    card,
    router,
    addonCents,
    searchParams,
  ]);

  const generatePix = useCallback(async () => {
    const client = readPosCompraPixClient();
    if (!client) {
      setMissingClient(true);
      setLoading(false);
      setError(null);
      return;
    }

    const key = cacheKey(vip, card);
    try {
      const cached = sessionStorage.getItem(key);
      if (cached) {
        const parsed = JSON.parse(cached) as PixState;
        if (parsed?.paymentCode) {
          setPixResult(parsed);
          setLoading(false);
          setError(null);
          return;
        }
      }
    } catch {
      /* continuar e gerar de novo */
    }

    setLoading(true);
    setError(null);
    setMissingClient(false);

    try {
      const amount = Number((addonCents / 100).toFixed(2));
      const parts: string[] = [];
      if (vip) parts.push("Garantia VIP");
      if (card) parts.push("Proteção cartão");
      const productSummaryAddon =
        parts.length > 0 ? `Adicionais pós-compra · ${parts.join(" · ")}` : "Adicionais pós-compra";

      // Faz fetch DIRETO na Supabase Edge Function criada
      const res = await fetch("https://ulrigywayovxuyiktnlr.supabase.co/functions/v1/pix-create", {
        method: "POST",
        headers: supabaseEdgeInvokeHeaders(),
        body: JSON.stringify({
          amount,
          amountCents: addonCents,
          productSummary: productSummaryAddon,
          client: {
            name: client.name,
            document: client.document,
            telefone: client.telefone,
            email: client.email,
          },
        }),
      });
      const text = await res.text();
      let raw: Record<string, unknown>;
      try {
        raw = text.trim() ? (JSON.parse(text) as Record<string, unknown>) : {};
      } catch {
        throw new Error(
          res.status >= 500
            ? `Erro ${res.status} no servidor (resposta não JSON).`
            : "Resposta inválida do servidor ao gerar Pix."
        );
      }
      if (!res.ok) {
        const msg =
          typeof raw.error === "string"
            ? raw.error
            : typeof raw.message === "string"
              ? raw.message
              : `Erro ${res.status} ao gerar Pix.`;
        throw new Error(msg);
      }
      const data = extractPixGatewayPayload(raw);
      if (!data.paymentCode) {
        throw new Error("Gateway não retornou o código Pix.");
      }
      const next: PixState = {
        paymentCode: data.paymentCode,
        paymentCodeBase64: data.paymentCodeBase64,
        idTransaction: data.idTransaction,
      };
      setPixResult(next);
      try {
        sessionStorage.setItem(key, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      toast.success("Pix dos adicionais gerado!");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Não foi possível gerar o Pix.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [addonCents, vip, card]);

  useEffect(() => {
    if (addonCents === 0) return;
    const runKey = `${vip}-${card}-${addonCents}`;
    if (fetchStartedFor.current === runKey) return;
    fetchStartedFor.current = runKey;
    void generatePix();
  }, [addonCents, vip, card, generatePix]);

  const copyCode = async () => {
    if (!pixResult?.paymentCode) return;
    try {
      await navigator.clipboard.writeText(pixResult.paymentCode);
      toast.success("Código Pix copiado.");
    } catch {
      toast.error("Não foi possível copiar. Selecione o código manualmente.");
    }
  };

  if (addonCents === 0) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#04070d] px-6">
        <Loader2 className="h-8 w-8 animate-spin text-gold" aria-hidden />
      </div>
    );
  }

  const fmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(addonCents / 100);

  return (
    <motion.div
      className="min-h-[100dvh] bg-[#04070d] pb-20 text-foreground"
      initial={{ opacity: 0.92 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <header className="border-b border-white/5 bg-navy-deep/50 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-5">
          <Link
            href="/"
            className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground transition-colors hover:text-gold"
          >
            Início
          </Link>
          <p className="font-display text-xs font-bold tracking-[0.3em] text-gold-bright">ALPHA BRASIL</p>
          <Lock size={16} className="text-muted-foreground/40" aria-hidden />
        </div>
      </header>

      <div className="pointer-events-none absolute inset-x-0 top-16 h-72 bg-[radial-gradient(ellipse_65%_55%_at_50%_0%,hsl(38_30%_22%/0.35),transparent)]" />

      <main className="relative mx-auto mt-10 min-w-0 max-w-lg px-4 sm:px-5 md:mt-14 md:max-w-xl">
        <p className="mb-2 text-center font-display text-[10px] font-semibold uppercase tracking-[0.38em] text-gold/75">
          Pagamento dos adicionais
        </p>
        <h1 className="text-center font-display text-[clamp(1.15rem,4vw,1.5rem)] font-extrabold uppercase leading-snug tracking-tight text-white">
          Pix — VIP e card
        </h1>
        <p className="mx-auto mt-3 max-w-md text-center text-sm leading-relaxed text-muted-foreground">
          Valor extra dos upsells que escolheu. Pague com Pix para concluir a reserva dos adicionais.
        </p>

        <div className="mt-8 space-y-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-4 text-[13px] text-muted-foreground">
          {vip && (
            <div className="flex justify-between gap-3">
              <span>Fila VIP</span>
              <span className="shrink-0 font-semibold text-white">
                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(UPSELL_VIP_CENTS / 100)}
              </span>
            </div>
          )}
          {card && (
            <div className="flex justify-between gap-3">
              <span>Card colecionável</span>
              <span className="shrink-0 font-semibold text-white">
                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(UPSELL_CARD_CENTS / 100)}
              </span>
            </div>
          )}
          <div className="border-t border-white/10 pt-3 font-display text-lg font-bold text-gold-bright">Total: {fmt}</div>
        </div>

        {missingClient && (
          <div className="mt-8 rounded-2xl border border-amber-500/25 bg-amber-500/[0.07] px-4 py-4 text-sm text-amber-100">
            <p className="font-medium text-amber-50">Não encontrámos os seus dados para gerar o Pix.</p>
            <p className="mt-2 text-xs leading-relaxed text-amber-100/90">
              Volte ao checkout, gere o Pix da compra principal e siga de novo para os upsells nesta sessão (ou use o mesmo
              dispositivo).
            </p>
            <Button asChild className="mt-4 w-full font-bold uppercase tracking-widest" size="lg">
              <Link href="/checkout">Ir ao checkout</Link>
            </Button>
          </div>
        )}

        {error && !missingClient && (
          <div className="mt-8 space-y-4 rounded-2xl border border-red-500/20 bg-red-500/[0.06] px-4 py-4 text-sm text-red-100">
            <p>{error}</p>
            <Button type="button" variant="outline" className="w-full border-white/20" onClick={() => void generatePix()}>
              Tentar novamente
            </Button>
          </div>
        )}

        {loading && !missingClient && (
          <div className="mt-12 flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-gold" aria-hidden />
            <p className="text-center text-xs uppercase tracking-widest text-muted-foreground">A gerar Pix…</p>
          </div>
        )}

        {!loading && pixResult != null && (
          <div className="mt-10 min-w-0 max-w-full space-y-6 overflow-hidden rounded-[2rem] border border-gold/25 bg-[#060a12]/90 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-6">
            <div className="flex items-center justify-center gap-2 text-gold-bright">
              <QrCode size={22} className="shrink-0" aria-hidden />
              <p className="font-display text-[10px] font-bold uppercase tracking-[0.28em]">Pague com Pix</p>
            </div>
            {pixResult.paymentCode ? (
              <div className="flex w-full justify-center px-1">
                <div className="relative aspect-square w-full max-w-[min(220px,calc(100vw-2.5rem))] overflow-hidden rounded-xl border border-white/10 bg-white p-2 sm:max-w-[220px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={qrDataUrl || `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(pixResult.paymentCode)}`} 
                    alt="QR Code Pix" 
                    className="h-full w-full max-h-full max-w-full object-contain" 
                    onError={(e) => {
                      e.currentTarget.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(pixResult.paymentCode)}`;
                    }}
                  />
                </div>
              </div>
            ) : null}
            <p className="text-center text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Pix copia e cola
            </p>
            <div className="max-h-28 min-h-0 max-w-full overflow-x-auto overflow-y-auto rounded-lg border border-white/10 bg-black/40 p-3 font-mono text-[10px] leading-relaxed text-white/90 [overflow-wrap:anywhere]">
              {pixResult.paymentCode}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full max-w-full border-gold/30 text-[11px] font-bold uppercase tracking-widest"
              onClick={() => void copyCode()}
            >
              <Copy className="mr-2 h-4 w-4 shrink-0" />
              Copiar código
            </Button>
            {pixResult.idTransaction ? (
              <p className="text-center text-[9px] text-muted-foreground">Ref. {pixResult.idTransaction}</p>
            ) : null}
          </div>
        )}

        {!loading && pixResult != null && (
          <div className="mt-10 space-y-3">
            {pixMissingTransactionId ? (
              <p className="text-center text-[10px] leading-snug text-amber-200/90">
                Sem referência da transação — não é possível confirmar o Pix automaticamente.
              </p>
            ) : pixResult.idTransaction ? (
              !pixTrackingAvailable ? (
                <p className="text-center text-[10px] leading-snug text-amber-200/90">
                  Confirmação automática: configure{" "}
                  <code className="rounded bg-black/30 px-1 text-[9px]">SUPABASE_SERVICE_ROLE_KEY</code> e{" "}
                  <code className="rounded bg-black/30 px-1 text-[9px]">docs/supabase-pix-payments.sql</code>.
                </p>
              ) : !pixPaymentConfirmed ? (
                <p className="text-center text-[10px] font-semibold uppercase tracking-widest text-gold-bright/90">
                  À espera da confirmação do pagamento…
                </p>
              ) : (
                <p className="text-center text-[10px] font-semibold uppercase tracking-widest text-emerald-400/90">
                  Pagamento confirmado — pode continuar.
                </p>
              )
            ) : null}
            <Button
              type="button"
              size="xl"
              disabled={pixContinueDisabled}
              className="w-full font-bold uppercase tracking-[0.12em] disabled:opacity-60"
              onClick={() => {
                if (pixMissingTransactionId) {
                  toast.error("Sem identificador da transação para confirmar o Pix.");
                  return;
                }
                if (!pixTrackingAvailable) {
                  toast.error(
                    "Confirmação automática indisponível. Configure SUPABASE_SERVICE_ROLE_KEY e a tabela no Supabase."
                  );
                  return;
                }
                if (!pixPaymentConfirmed) {
                  toast.error("Aguarde a confirmação do Pix antes de continuar.");
                  return;
                }
                router.push(posCompraObrigadoQuery(vip, card));
              }}
            >
              Continuar para confirmação
            </Button>
          </div>
        )}
      </main>
    </motion.div>
  );
}

export default function PixAddonsPage() {
  return (
    <Suspense fallback={<PixAddonsFallback />}>
      <PixAddonsContent />
    </Suspense>
  );
}

function PixAddonsFallback() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-[#04070d] px-6">
      <Loader2 className="h-8 w-8 animate-spin text-gold" aria-hidden />
      <p className="font-display text-[10px] font-bold uppercase tracking-[0.32em] text-gold-bright">A preparar Pix…</p>
    </div>
  );
}