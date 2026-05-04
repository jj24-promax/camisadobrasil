"use client";

import { Suspense, useEffect, useMemo, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { Copy, Loader2, Lock, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { qrDataUrlForImg } from "@/lib/pix-gateway-response";
import { readPosCompraPixClient } from "@/lib/pos-compra-pix-storage";
import { computeUpsellAddonCents, UPSELL_CAP_CENTS, UPSELL_BAG_CENTS, UPSELL_CUP_CENTS } from "@/lib/pos-compra-upsell-pricing";
import { grantMetaPurchasePixelAfterConfirmedPix } from "@/lib/meta-purchase-gate";
import { posCompraObrigadoQuery } from "@/lib/pos-compra-routes";

type PixState = {
  paymentCode: string;
  paymentCodeBase64: string;
} | null;

function cacheKey(cap: boolean, bag: boolean, cup: boolean) {
  return `alpha_pos_compra_addon_pix_${cap ? "c" : ""}${bag ? "b" : ""}${cup ? "u" : ""}`;
}

function PixAddonsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cap = searchParams.get("cap") === "1";
  const bag = searchParams.get("bag") === "1";
  const cup = searchParams.get("cup") === "1";

  const addonCents = useMemo(() => computeUpsellAddonCents(cap, bag, cup), [cap, bag, cup]);
  const [pixResult, setPixResult] = useState<PixState>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [missingClient, setMissingClient] = useState(false);
  const fetchStartedFor = useRef<string | null>(null);

  const qrDataUrl = useMemo(
    () => (pixResult?.paymentCodeBase64 ? qrDataUrlForImg(pixResult.paymentCodeBase64) : null),
    [pixResult?.paymentCodeBase64]
  );

  useEffect(() => {
    if (addonCents === 0) {
      router.replace(posCompraObrigadoQuery(cap, bag, cup));
    }
  }, [addonCents, cap, bag, cup, router]);

  // Mangofy Fast API — mesmo fluxo do checkout principal
  useEffect(() => {
    if (!pixResult?.paymentCode?.trim()) return;

    (window as unknown as { paymentApproved?: () => void }).paymentApproved = () => {
      grantMetaPurchasePixelAfterConfirmedPix();
      toast.success("Pagamento confirmado!");
      router.push(posCompraObrigadoQuery(cap, bag, cup));
    };

    return () => {
      delete (window as unknown as { paymentApproved?: () => void }).paymentApproved;
    };
  }, [pixResult?.paymentCode, cap, bag, cup, router]);

  const generatePix = useCallback(async () => {
    const clientRef = readPosCompraPixClient();
    const snap = clientRef?.mangofyCustomer;
    if (!snap) {
      setMissingClient(true);
      setLoading(false);
      setError(null);
      return;
    }

    const key = cacheKey(cap, bag, cup);
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
      /* ignore */
    }

    setLoading(true);
    setError(null);
    setMissingClient(false);

    try {
      const amount = Number((addonCents / 100).toFixed(2));
      const parts: string[] = [];
      if (cap) parts.push("Boné Alpha");
      if (bag) parts.push("Shoulder Bag");
      if (cup) parts.push("Copo Térmico");
      const productSummaryAddon = parts.length > 0 ? `Adicionais pós-compra · ${parts.join(" · ")}` : "Adicionais pós-compra";

      const gen = (window as unknown as { generatePix?: (c: unknown) => Promise<unknown> }).generatePix;
      if (typeof gen !== "function") {
        throw new Error("Forma de pagamento ainda a carregar. Atualize a página e tente de novo.");
      }

      const config = {
        total_price: amount,
        customer: {
          name: snap.name,
          document: snap.docDigits,
          email: snap.email,
          phone: snap.phoneDigits,
        },
        shipping: {
          zip_code: snap.cep,
          street: snap.street,
          city: snap.city,
          state: snap.state,
          country: "BR",
        },
        metadata: Object.fromEntries(searchParams.entries()),
        items: [{ name: productSummaryAddon, price: amount, quantity: 1 }],
      };

      const response = (await gen(config)) as {
        success?: boolean;
        message?: string;
        pixCode?: string;
        qrCodeImage?: string;
      };

      if (response && response.success && response.pixCode && response.qrCodeImage) {
        const next: PixState = {
          paymentCode: response.pixCode,
          paymentCodeBase64: response.qrCodeImage,
        };
        setPixResult(next);
        try {
          sessionStorage.setItem(key, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        toast.success("Pix dos adicionais gerado!");
      } else {
        throw new Error(response?.message || "Erro ao gerar Pix. Verifique os dados e tente novamente.");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Não foi possível gerar o Pix.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [addonCents, cap, bag, cup, searchParams]);

  useEffect(() => {
    if (addonCents === 0) return;
    const runKey = `${cap}-${bag}-${cup}-${addonCents}`;
    if (fetchStartedFor.current === runKey) return;
    fetchStartedFor.current = runKey;
    void generatePix();
  }, [addonCents, cap, bag, cup, generatePix]);

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
          <Link href="/" className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground transition-colors hover:text-gold">
            Início
          </Link>
          <p className="font-display text-xs font-bold tracking-[0.3em] text-gold-bright">ALPHA BRASIL</p>
          <Lock size={16} className="text-muted-foreground/40" aria-hidden />
        </div>
      </header>

      <main className="relative mx-auto mt-10 min-w-0 max-w-lg px-4 sm:px-5 md:mt-14 md:max-w-xl">
        <p className="mb-2 text-center font-display text-[10px] font-semibold uppercase tracking-[0.38em] text-gold/75">Pagamento dos adicionais</p>
        <h1 className="text-center font-display text-[clamp(1.15rem,4vw,1.5rem)] font-extrabold uppercase leading-snug tracking-tight text-white">Pix — Extras</h1>
        <p className="mx-auto mt-3 max-w-md text-center text-sm leading-relaxed text-muted-foreground">
          Valor extra dos itens que escolheu. Pague com Pix para concluir a reserva. Após o pagamento confirmado, será redirecionado automaticamente.
        </p>

        <div className="mt-8 space-y-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-4 text-[13px] text-muted-foreground">
          {cap && (
            <div className="flex justify-between gap-3">
              <span>Boné Oficial</span>
              <span className="shrink-0 font-semibold text-white">
                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(UPSELL_CAP_CENTS / 100)}
              </span>
            </div>
          )}
          {bag && (
            <div className="flex justify-between gap-3">
              <span>Shoulder Bag</span>
              <span className="shrink-0 font-semibold text-white">
                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(UPSELL_BAG_CENTS / 100)}
              </span>
            </div>
          )}
          {cup && (
            <div className="flex justify-between gap-3">
              <span>Copo Térmico</span>
              <span className="shrink-0 font-semibold text-white">
                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(UPSELL_CUP_CENTS / 100)}
              </span>
            </div>
          )}
          <div className="border-t border-white/10 pt-3 font-display text-lg font-bold text-gold-bright">Total: {fmt}</div>
        </div>

        {missingClient && (
          <div className="mt-8 rounded-2xl border border-amber-500/25 bg-amber-500/[0.07] px-4 py-4 text-sm text-amber-100">
            <p className="font-medium text-amber-50">Não encontramos os dados da sua compra neste dispositivo.</p>
            <p className="mt-2 text-xs leading-relaxed text-amber-100/90">
              Gere o Pix principal no checkout neste mesmo navegador e volte aos adicionais, ou refaça o checkout para continuar.
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
                  <img
                    src={
                      qrDataUrl ||
                      `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(pixResult.paymentCode)}`
                    }
                    alt="QR Code Pix"
                    className="h-full w-full max-h-full max-w-full object-contain"
                    onError={(e) => {
                      e.currentTarget.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(pixResult.paymentCode)}`;
                    }}
                  />
                </div>
              </div>
            ) : null}
            <div className="max-h-28 min-h-0 max-w-full overflow-x-auto overflow-y-auto rounded-lg border border-white/10 bg-black/40 p-3 font-mono text-[10px] leading-relaxed text-white/90 [overflow-wrap:anywhere]">
              {pixResult.paymentCode}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full max-w-full shrink-0 border-gold/30 text-[11px] font-bold uppercase tracking-widest"
              onClick={copyCode}
            >
              <Copy className="mr-2 h-4 w-4 shrink-0" /> Copiar código
            </Button>
          </div>
        )}

        {!loading && pixResult != null && (
          <p className="mt-8 text-center text-[10px] font-semibold uppercase tracking-widest text-gold-bright/90">
            À espera da confirmação do pagamento…
          </p>
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
      <p className="font-display text-[10px] font-bold uppercase tracking-[0.32em] text-gold-bright">
        A preparar Pix…
      </p>
    </div>
  );
}
