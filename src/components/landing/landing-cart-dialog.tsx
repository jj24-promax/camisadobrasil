"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Minus, Plus, ShoppingBag, Truck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SIZES, getProductModelById, getSelectableProductModels, type ProductModelId } from "@/lib/product";
import type { Size } from "@/lib/types";
import { MAX_ORDER_SHIRT_QUANTITY, serializeOrderModels, serializeOrderSizes } from "@/lib/cart-sizes";
import { leve3Pague2DiscountCents } from "@/lib/offer-pricing";
import { useCheckoutTransition } from "@/components/navigation/checkout-transition-provider";
import { cn } from "@/lib/utils";
import { PurchaseTrustBlock } from "@/components/landing/purchase-trust-block";
import toast from "react-hot-toast";
import { CRO } from "@/lib/cro-copy";

type LandingCartDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedProduct: ProductModelId;
  models: ProductModelId[];
  onModelsChange: (models: ProductModelId[]) => void;
  quantity: number;
  onQuantityChange: (q: number) => void;
  sizes: Size[];
  onSizesChange: (sizes: Size[]) => void;
};

export function LandingCartDialog({
  open,
  onOpenChange,
  selectedProduct,
  models,
  onModelsChange,
  quantity,
  onQuantityChange,
  sizes,
  onSizesChange,
}: LandingCartDialogProps) {
  const { requestCheckoutNavigation } = useCheckoutTransition();
  const safeQty = quantity < 1 ? 1 : quantity;
  const lineSizes = sizes.length === safeQty ? sizes : Array.from({ length: safeQty }, (_, i) => sizes[i] ?? "M");
  const lineModels =
    models.length === safeQty ? models : Array.from({ length: safeQty }, (_, i) => models[i] ?? selectedProduct);
  const [activePreviewIndex, setActivePreviewIndex] = useState(0);
  const clampedPreviewIndex = Math.min(activePreviewIndex, Math.max(0, safeQty - 1));

  const pricing = useMemo(() => {
    const linePriceCents = lineModels.map((modelId) => Math.round(getProductModelById(modelId).price * 100));
    const subtotal = linePriceCents.reduce((sum, cents) => sum + cents, 0);
    const itemDiscount = safeQty >= 3 ? Math.min(...linePriceCents) : 0;
    const totalCents = subtotal - itemDiscount;
    const fmt = (cents: number) =>
      new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
    return {
      subtotalFormatted: fmt(subtotal),
      discountValue: itemDiscount,
      discountFormatted: fmt(itemDiscount),
      totalFormatted: fmt(totalCents),
    };
  }, [safeQty, lineModels]);

  const checkoutParams = new URLSearchParams();
  checkoutParams.set("q", String(safeQty));
  checkoutParams.set("sizes", serializeOrderSizes(lineSizes));
  checkoutParams.set("modelos", serializeOrderModels(lineModels));
  checkoutParams.set("modelo", lineModels[0] ?? selectedProduct);
  checkoutParams.set("tamanho", lineSizes[0] ?? "M");

  const bumpQty = (delta: number) => {
    onQuantityChange(Math.max(1, Math.min(MAX_ORDER_SHIRT_QUANTITY, safeQty + delta)));
  };

  const setSizeAt = (index: number, s: Size) => {
    const next = [...lineSizes];
    next[index] = s;
    onSizesChange(next);
    setActivePreviewIndex(index);
  };

  const setModelAt = (index: number, modelId: ProductModelId) => {
    const next = [...lineModels];
    next[index] = modelId;
    onModelsChange(next);
    setActivePreviewIndex(index);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        className={cn(
          "fixed left-auto right-0 top-0 flex h-[100dvh] max-h-[100dvh] w-full max-w-md translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden border-l border-white/10 bg-[#060a12] p-0 shadow-2xl",
          "data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right",
          "data-[state=open]:zoom-in-100 data-[state=closed]:zoom-out-100",
          "sm:rounded-none"
        )}
      >
        <div className="flex flex-1 flex-col overflow-y-auto">
          <DialogHeader className="border-b border-white/[0.06] px-6 pb-4 pt-6 text-left">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold text-navy-deep">
                <ShoppingBag className="h-[18px] w-[18px]" strokeWidth={2.25} aria-hidden />
              </div>
              <div>
                <DialogTitle className="font-display text-lg uppercase tracking-tight text-white">
                  Carrinho
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Revise o seu pedido antes de finalizar
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex flex-1 flex-col gap-6 px-4 sm:px-6 py-6">
            <div className="glass-dark overflow-hidden rounded-[1.5rem] border border-gold/20 p-4 sm:p-5 space-y-5">
              
              <div className="text-center sm:text-left">
                <h2 className="font-display text-sm font-bold uppercase leading-snug tracking-tight text-white">
                  Itens do Pedido
                </h2>
                <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/85">
                  Configure o modelo e tamanho de cada peça
                </p>
              </div>

              <div className="space-y-4">
                {lineSizes.map((sz, index) => {
                  const itemModel = getProductModelById(lineModels[index] ?? selectedProduct);
                  return (
                    <div
                      key={index}
                      className={cn(
                        "rounded-2xl border bg-white/[0.02] p-3.5 sm:p-4 transition-colors flex gap-4 sm:gap-5 items-center",
                        clampedPreviewIndex === index ? "border-gold/35 bg-gold/[0.02]" : "border-white/[0.06]"
                      )}
                    >
                      {/* Miniatura do modelo atual */}
                      <div className="relative aspect-square w-20 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black/40 shadow-sm sm:w-24">
                        <Image
                          src={itemModel.images.checkout}
                          alt={itemModel.fullName}
                          fill
                            className={cn(
                              "object-contain transition-transform duration-300",
                              "scale-[1.05] p-1"
                            )}
                          sizes="80px"
                        />
                      </div>
                      
                      <div className="min-w-0 flex-1 flex flex-col justify-center py-1">
                        <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-white">
                          {safeQty > 1 ? `Camisa ${index + 1}` : "Camisa"}
                        </p>
                        
                        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          Cores:
                        </p>
                        <div className="mb-3 grid grid-cols-3 gap-1.5 sm:gap-2">
                          {getSelectableProductModels().map((model) => {
                            const activeModel = lineModels[index] === model.id;
                            const swatchClass =
                              model.slug === "sagrada"
                                ? "bg-[#1a2a4a]"
                                : model.slug === "canarinho"
                                  ? "bg-[#fbbf24]"
                                  : "bg-[#b91c1c]";
                            return (
                              <button
                                key={`${index}-${model.id}`}
                                type="button"
                                onClick={() => setModelAt(index, model.id)}
                                className={cn(
                                  "flex h-10 min-w-0 items-center justify-center rounded-lg border px-1.5 transition-colors",
                                  activeModel
                                    ? "border-gold/60 bg-gold/[0.14] text-gold-bright"
                                    : "border-white/10 bg-white/[0.03] text-muted-foreground hover:border-gold/40 hover:bg-white/[0.06]"
                                )}
                                aria-label={`Selecionar cor ${model.name}`}
                              >
                                <span
                                  className={cn(
                                    "h-3.5 w-3.5 shrink-0 rounded-full border border-white/25",
                                    swatchClass
                                  )}
                                />
                              </button>
                            );
                          })}
                        </div>

                        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          Tamanhos:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {SIZES.map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setSizeAt(index, s)}
                              className={cn(
                                "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[13px] font-bold transition-all",
                                sz === s
                                  ? "bg-gold text-navy-deep shadow-[0_0_12px_rgba(212,175,55,0.4)]"
                                  : "border border-white/10 bg-white/[0.03] text-muted-foreground hover:border-gold/40 hover:bg-white/[0.08]"
                              )}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between border-t border-white/[0.06] pt-4">
                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Quantidade Total
                  </p>
                  <div className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1">
                    <button
                      type="button"
                      onClick={() => bumpQty(-1)}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-white transition-colors hover:bg-white/10"
                      aria-label="Diminuir quantidade"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="min-w-[2rem] text-center font-bold tabular-nums text-white">{safeQty}</span>
                    <button
                      type="button"
                      onClick={() => bumpQty(1)}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-white transition-colors hover:bg-white/10"
                      aria-label="Aumentar quantidade"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5 text-[11px] leading-snug text-muted-foreground">
                <Truck className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden />
                <span>Frete grátis no checkout para este pedido.</span>
              </div>
            </div>

            <div className="space-y-3 rounded-[1.25rem] border border-white/[0.06] bg-white/[0.02] px-5 py-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal ({safeQty} un)</span>
                <span className="text-white">{pricing.subtotalFormatted}</span>
              </div>
              {pricing.discountValue > 0 && (
                <div className="flex justify-between text-sm font-bold text-green-400">
                  <span>Oferta Leve 3, Pague 2 (não cumulativa)</span>
                  <span>- {pricing.discountFormatted}</span>
                </div>
              )}
              <div className="h-px bg-white/10" />
              <div className="flex items-end justify-between">
                <span className="font-display text-base font-bold text-white">Total</span>
                <span className="price-gold-glow font-display text-2xl font-bold tracking-tight text-gold-bright">
                  {pricing.totalFormatted}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-auto border-t border-white/[0.06] bg-[#04070d]/90 px-6 py-5 backdrop-blur-md">
            <Button
              type="button"
              size="xl"
              className="w-full rounded-2xl py-7 font-bold uppercase tracking-widest"
              onClick={() => {
                toast.success("Redirecionando para o checkout…", { duration: 2200 });
                onOpenChange(false);
                requestCheckoutNavigation(checkoutParams.toString());
              }}
            >
              {CRO.cartCheckoutCta}
            </Button>
            <PurchaseTrustBlock variant="compact" className="mt-4 px-0" />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}