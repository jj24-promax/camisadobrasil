"use client";

import { Suspense, useMemo } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ShoppingBag, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PRODUCT, PRODUCT_IMAGE_CLEAN_SRC, getProductModelById } from "@/lib/product";
import { parseOrderModels, parseOrderSizes } from "@/lib/cart-sizes";
import { replaceCheckoutProductLines } from "@/lib/checkout-product-query";
import { useCheckoutTransition } from "@/components/navigation/checkout-transition-provider";
import { leve3Pague2DiscountFromLinePricesCents } from "@/lib/offer-pricing";

function CarrinhoContent() {
  const { requestCheckoutNavigation } = useCheckoutTransition();
  const searchParams = useSearchParams();
  const rawQ = parseInt(searchParams.get("q") || "1", 10);
  const quantity = Number.isFinite(rawQ) && rawQ > 0 ? rawQ : 1;
  const orderModels = parseOrderModels(searchParams, quantity);
  const orderSizes = parseOrderSizes(searchParams, quantity);

  const primaryModel = getProductModelById(orderModels[0]);

  const pricing = useMemo(() => {
    const linePriceCents = orderModels.map((modelId) => Math.round(getProductModelById(modelId).price * 100));
    const subtotal = linePriceCents.reduce((a, b) => a + b, 0);
    const itemDiscount = leve3Pague2DiscountFromLinePricesCents(linePriceCents);
    const totalCents = subtotal - itemDiscount;
    const format = (cents: number) =>
      new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
    return {
      subtotalFormatted: format(subtotal),
      discountValue: itemDiscount,
      discountFormatted: format(itemDiscount),
      totalFormatted: format(totalCents),
    };
  }, [quantity, orderModels]);

  const checkoutQueryString = replaceCheckoutProductLines(
    new URLSearchParams(searchParams.toString()),
    quantity,
    orderModels,
    orderSizes
  );

  return (
    <motion.div
      className="min-h-screen bg-[#04070d] pb-20 text-foreground"
      initial={{ opacity: 0.9 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <header className="border-b border-white/5 bg-navy-deep/50 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
          <Link href="/" className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-gold">
            <ChevronLeft size={18} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Voltar à loja</span>
          </Link>
          <p className="font-display text-xs font-bold tracking-[0.3em] text-gold-bright">ALPHA BRASIL</p>
          <ShoppingBag size={18} className="text-gold/60" aria-hidden />
        </div>
      </header>

      <main className="mx-auto mt-8 max-w-3xl px-5 lg:mt-12">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold text-navy-deep">
            <ShoppingBag size={18} strokeWidth={2.25} />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold uppercase tracking-tight text-white md:text-2xl">Carrinho</h1>
            <p className="text-xs text-muted-foreground">Revise o seu pedido antes de finalizar</p>
          </div>
        </div>

        <div className="glass-dark overflow-hidden rounded-[2rem] p-6 md:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="relative mx-auto aspect-square w-full max-w-[200px] shrink-0 overflow-hidden rounded-2xl border border-white/10 sm:mx-0">
              <Image
                src={primaryModel.images.checkout ?? PRODUCT_IMAGE_CLEAN_SRC}
                alt={primaryModel.fullName ?? PRODUCT.name}
                fill
                className="object-contain transition-transform duration-300 p-2 scale-[1.02]"
                sizes="200px"
                loading="lazy"
              />
            </div>

            <div className="min-w-0 flex-1 space-y-3">
              <h2 className="font-display text-lg font-bold uppercase tracking-tight text-white">{PRODUCT.name}</h2>
              <div className="space-y-2 text-sm">
                {quantity === 1 ? (
                  <>
                    <p>
                      <span className="text-muted-foreground">Edição: </span>
                      <span className="font-bold text-gold-bright">{primaryModel.name}</span>
                    </p>
                    <p>
                      <span className="text-muted-foreground">Tamanho: </span>
                      <span className="font-bold text-gold-bright">{orderSizes[0]}</span>
                    </p>
                  </>
                ) : (
                  <ul className="space-y-2">
                    {orderModels.map((mid, i) => {
                      const m = getProductModelById(mid);
                      const sz = orderSizes[i] ?? orderSizes[0];
                      return (
                        <li key={`${mid}-${i}`} className="flex flex-wrap items-baseline gap-x-2 gap-y-1 border-b border-white/[0.05] pb-2 last:border-0 last:pb-0">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Camisa {i + 1}</span>
                          <span className="font-bold text-white">{m.name}</span>
                          <span className="text-muted-foreground">·</span>
                          <span className="font-bold text-gold-bright">Tam. {sz}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <p>
                  <span className="text-muted-foreground">Quantidade: </span>
                  <span className="font-bold text-white">{quantity}</span>
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 text-xs text-muted-foreground">
                <Truck className="h-4 w-4 shrink-0 text-gold" aria-hidden />
                <span>Frete grátis no checkout para este pedido.</span>
              </div>
            </div>
          </div>

          <div className="mt-8 space-y-4 border-t border-white/10 pt-8">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal ({quantity} un)</span>
              <span className="text-white">{pricing.subtotalFormatted}</span>
            </div>
            {pricing.discountValue > 0 && (
              <div className="flex justify-between text-sm font-bold text-green-400">
                <span>Oferta Leve 3, Pague 2 (cumulativa)</span>
                <span>- {pricing.discountFormatted}</span>
              </div>
            )}
            <div className="h-px bg-white/10" />
            <div className="flex items-end justify-between">
              <span className="font-display text-lg font-bold text-white">Total</span>
              <span className="price-gold-glow font-display text-2xl font-bold tracking-tight text-gold-bright">{pricing.totalFormatted}</span>
            </div>
          </div>

          <Button
            type="button"
            size="xl"
            className="mt-8 w-full rounded-2xl py-7 font-bold uppercase tracking-widest"
            onClick={() => requestCheckoutNavigation(checkoutQueryString)}
          >
            Ir para o checkout
          </Button>
        </div>
      </main>
    </motion.div>
  );
}

export default function CarrinhoPage() {
  return (
    <Suspense fallback={<CarrinhoLoadingFallback />}>
      <CarrinhoContent />
    </Suspense>
  );
}

function CarrinhoLoadingFallback() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[#04070d] px-6">
      <div className="h-px w-24 bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
      <p className="text-center font-display text-[10px] font-bold uppercase tracking-[0.32em] text-gold-bright">A carregar o carrinho</p>
      <div className="h-0.5 w-32 animate-pulse rounded-full bg-gold/30" />
    </div>
  );
}
