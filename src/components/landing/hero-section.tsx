"use client";

import { motion, useScroll, useTransform, useReducedMotion, AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { TrustBadges } from "./trust-badges";
import { PurchaseTrustBlock } from "./purchase-trust-block";
import { PRODUCT, SIZES, HERO_EDITIONS, type HeroEditionId } from "@/lib/product";
import type { Size } from "@/lib/types";
import { useMobileParallaxOff } from "@/hooks/use-is-mobile-parallax";
import { useInlineMutedVideoAutoplay } from "@/hooks/use-inline-muted-video-autoplay";
import { cn } from "@/lib/utils";
import { ArrowRight, ChevronLeft, ChevronRight, Star, Clock } from "lucide-react";

type HeroSectionProps = {
  selectedSize: Size;
  onSizeChange: (s: Size) => void;
  onBuyNow: () => void;
  selectedEdition: HeroEditionId;
  onEditionChange: (edition: HeroEditionId) => void;
};

export function HeroSection({
  selectedSize,
  onSizeChange,
  onBuyNow,
  selectedEdition,
  onEditionChange,
}: HeroSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const mobileOff = useMobileParallaxOff();
  const reduced = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  const imgY = useTransform(
    scrollYProgress,
    [0, 1],
    mobileOff || reduced ? [0, 0] : [0, 48]
  );

  const [selectedEditionImageIndex, setSelectedEditionImageIndex] = useState(0);
  const selectedEditionData = HERO_EDITIONS.find((edition) => edition.id === selectedEdition) ?? HERO_EDITIONS[0];
  const heroItem = selectedEditionData.media;
  const selectedEditionGallery =
    "imageGallery" in selectedEditionData &&
    Array.isArray(selectedEditionData.imageGallery) &&
    selectedEditionData.imageGallery.length > 0
      ? selectedEditionData.imageGallery
      : [];
  const canNavigateEditionGallery = heroItem.kind === "image" && selectedEditionGallery.length > 1;
  const activeEditionImageSrc =
    heroItem.kind === "image"
      ? selectedEditionGallery[selectedEditionImageIndex] ?? heroItem.src
      : null;

  const heroVideoRef = useRef<HTMLVideoElement | null>(null);
  const [heroVideoFailed, setHeroVideoFailed] = useState(false);
  const heroPointerUnlockDone = useRef(false);

  useInlineMutedVideoAutoplay(heroVideoRef, {
    enabled: !heroVideoFailed && heroItem.kind === "video" && !selectedEditionData.inProduction,
    mediaKey: heroItem.kind === "video" ? heroItem.mp4Src : selectedEditionData.id,
  });

  useEffect(() => {
    setSelectedEditionImageIndex(0);
    setHeroVideoFailed(false);
  }, [selectedEdition]);

  const onHeroPointerDown = useCallback(() => {
    if (heroPointerUnlockDone.current) return;
    heroPointerUnlockDone.current = true;
    const v = heroVideoRef.current;
    if (!v) return;
    v.muted = true;
    v.volume = 0;
    void v.play().catch(() => {});
  }, []);

  return (
    <section
      id="inicio"
      ref={sectionRef}
      className="relative min-h-[100dvh] overflow-hidden bg-[#04070d]"
      aria-labelledby="hero-heading"
      onPointerDownCapture={onHeroPointerDown}
    >
      <div className="relative z-10 mx-auto flex max-w-[1600px] flex-col items-center px-5 pb-20 pt-[6rem] md:px-10 md:pb-24 md:pt-28 xl:px-14">
        
        {/* Logo Centralizado */}
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="relative mb-6 flex w-full justify-center px-2 py-3 sm:px-4 sm:py-5 md:mb-12"
        >
          <div
            className="relative h-48 w-full max-w-[580px] md:h-[220px] md:max-w-[800px] lg:h-[260px] lg:max-w-[950px] [filter:drop-shadow(0_0_6px_hsl(var(--gold-bright)_/_0.55))_drop-shadow(0_0_20px_hsl(var(--gold)_/_0.35))_drop-shadow(0_0_42px_hsl(var(--gold-bright)_/_0.18))]"
          >
            <Image
              src="/images/alpha-brasil-gold-logo.png"
              alt="Alpha Brasil"
              fill
              className="object-contain"
              priority
              sizes="(max-width: 768px) 100vw, 950px"
            />
          </div>
        </motion.div>

        <div className="grid w-full grid-cols-1 gap-10 md:gap-14 lg:grid-cols-[1.1fr_0.9fr] lg:items-start lg:gap-14">
          
          {/* TÍTULO - Centralizado no topo */}
          <div className="order-1 text-center lg:col-start-1 lg:row-start-1 lg:text-left">
            <motion.h1
              id="hero-heading"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="font-display font-extrabold tracking-tight"
            >
              <span className="block text-[clamp(2.5rem,7vw,4.5rem)] leading-[0.9] text-white">
                A Identidade que
              </span>
              <span className="mt-2 block bg-gradient-to-r from-gold-bright via-gold to-gold-muted bg-clip-text text-[clamp(2.5rem,7vw,4.5rem)] leading-[1] text-transparent">
                Protege e Une.
              </span>
            </motion.h1>
          </div>

          {/* VÍDEO/GIF - Direita (Desktop) / Cima (Mobile) */}
          <motion.div
            style={{ y: imgY }}
            className="order-2 flex items-center justify-center lg:col-start-2 lg:row-start-1 lg:row-span-2"
          >
            <div className="relative w-full max-w-[380px] lg:max-w-[500px]">
              <div className="absolute -inset-4 rounded-[3rem] bg-gold/5 blur-3xl" />
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="hero-product-frame relative aspect-[4/5] overflow-hidden rounded-[2.5rem] bg-[#02050a] backdrop-blur-sm"
              >
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.div
                    key={selectedEditionData.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                    className="absolute inset-0 h-full w-full"
                  >
                    {selectedEditionData.inProduction ? (
                      <div className="absolute inset-0 flex h-full w-full flex-col items-center justify-center bg-[#05080f]">
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.05),transparent_70%)]" />
                        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-8 backdrop-blur-md text-center max-w-[80%] z-10 shadow-luxe">
                          <p className="text-[11px] font-bold uppercase tracking-widest text-white">Edição em Produção</p>
                          <p className="mt-3 mx-auto text-[13px] leading-relaxed text-muted-foreground/80">
                            Estamos finalizando as fotos exclusivas desta peça. Disponível em breve.
                          </p>
                        </div>
                      </div>
                    ) : heroItem.kind === "image" || heroVideoFailed ? (
                      <>
                        <Image
                          src={activeEditionImageSrc ?? heroItem.src}
                          alt={heroItem.alt}
                          fill
                          className="object-cover"
                          sizes="(max-width: 1024px) 90vw, 500px"
                          priority
                        />
                        {canNavigateEditionGallery ? (
                          <div className="pointer-events-none absolute inset-x-0 top-1/2 z-10 flex -translate-y-1/2 items-center justify-between px-3">
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedEditionImageIndex((prev) =>
                                  prev === 0 ? selectedEditionGallery.length - 1 : prev - 1
                                )
                              }
                              className="pointer-events-auto inline-flex h-9 w-9 items-center justify-center rounded-full border border-gold/40 bg-[#04070d]/70 text-gold-bright backdrop-blur-md transition hover:border-gold/70 hover:bg-[#04070d]/90"
                              aria-label="Imagem anterior da edição"
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedEditionImageIndex((prev) =>
                                  prev === selectedEditionGallery.length - 1 ? 0 : prev + 1
                                )
                              }
                              className="pointer-events-auto inline-flex h-9 w-9 items-center justify-center rounded-full border border-gold/40 bg-[#04070d]/70 text-gold-bright backdrop-blur-md transition hover:border-gold/70 hover:bg-[#04070d]/90"
                              aria-label="Próxima imagem da edição"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <video
                        ref={heroVideoRef}
                        key={`${selectedEditionData.id}-video`}
                        className="video-embed-no-native-ui h-full w-full object-cover"
                        muted
                        loop
                        playsInline
                        autoPlay
                        preload="auto"
                        aria-label={heroItem.alt}
                        controls={false}
                        disablePictureInPicture
                        controlsList="nodownload noremoteplayback nofullscreen"
                        onError={() => setHeroVideoFailed(true)}
                      >
                        <source src={heroItem.mp4Src} type="video/mp4" />
                        <source src={heroItem.webmSrc} type="video/webm" />
                      </video>
                    )}
                  </motion.div>
                </AnimatePresence>
              </motion.div>
            </div>
          </motion.div>

          {/* CAIXA DE COMPRA E AVALIAÇÃO - Coluna Esquerda */}
          <div className="order-3 flex flex-col gap-8 lg:col-start-1 lg:row-start-2">
            
            {/* SELO DE SATISFAÇÃO */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex items-center justify-center gap-2 lg:justify-start"
            >
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-3 w-3 fill-gold text-gold" />
                ))}
              </div>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold/90">
                +4.800 CLIENTES SATISFEITOS
              </span>
            </motion.div>

            {/* QUADRANTE DE COMPRA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex flex-col gap-6"
            >
              <div className="relative overflow-hidden rounded-[2rem] border border-white/[0.08] bg-white/[0.02] p-5 sm:p-6 shadow-luxe backdrop-blur-xl md:p-10">
                {/* Ajuste nos gaps e margens (gap-4 em vez de gap-8/6) para compactar no mobile */}
                <div className="flex flex-col gap-5 md:gap-6">
                  
                  {/* SEÇÃO 1: CORES E INFORMAÇÕES DA EDIÇÃO */}
                  <div className="flex flex-col gap-3 md:gap-4">
                    <p className="text-center font-display text-[10px] font-bold uppercase tracking-[0.2em] text-gold/80 sm:text-left">
                      Escolha sua Edição:
                    </p>
                    <div className="flex flex-wrap justify-center gap-4 sm:justify-start">
                      {HERO_EDITIONS.map((edition) => {
                        const isActive = selectedEdition === edition.id;
                        return (
                          <div key={edition.id} className="flex flex-col items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => onEditionChange(edition.id)}
                              className={cn(
                                "group relative h-12 w-12 overflow-hidden rounded-full border-2 transition-all duration-300",
                                isActive
                                  ? "border-gold scale-110 shadow-[0_0_15px_rgba(212,175,55,0.4)]"
                                  : "border-white/10 hover:border-white/30"
                              )}
                              aria-label={`Selecionar cor ${edition.name}`}
                            >
                              <div 
                                className="h-full w-full" 
                                style={{ backgroundColor: edition.color }}
                              />
                              {isActive && (
                                <motion.div 
                                  layoutId="buybox-color-check"
                                  className="absolute inset-0 flex items-center justify-center bg-black/20"
                                >
                                  <div className="h-2 w-2 rounded-full bg-white shadow-[0_0_8px_white]" />
                                </motion.div>
                              )}
                            </button>
                            <span className={cn("text-[8px] font-bold uppercase tracking-widest transition-colors", isActive ? "text-gold-bright" : "text-muted-foreground/60")}>
                              {edition.name.split(' ')[1]}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-1 text-center sm:text-left">
                      <motion.div
                        key={selectedEdition}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col gap-1"
                      >
                        <p className="font-display text-sm font-bold uppercase tracking-widest text-white">
                          {selectedEditionData.name}
                        </p>
                        <p className="mx-auto max-w-sm text-xs font-medium leading-relaxed text-muted-foreground/90 sm:mx-0 sm:text-[13px]">
                          {selectedEditionData.shortDescription}
                        </p>
                      </motion.div>
                    </div>

                    {selectedEditionData.inProduction ? (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 sm:justify-start"
                      >
                        <Clock className="h-4 w-4 text-amber-400 animate-pulse" />
                        <p className="text-xs font-bold uppercase tracking-widest text-amber-100">
                          Em produção — Disponível em breve
                        </p>
                      </motion.div>
                    ) : null}
                  </div>

                  <div className="h-px w-full bg-white/[0.06]" />

                  {/* SEÇÃO 2: PREÇO E TAMANHOS */}
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                    <div className="text-center sm:text-left">
                      {!selectedEditionData.inProduction && (
                        <>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Preço Exclusivo</p>
                          <div className="mt-1 flex items-baseline justify-center gap-2 sm:mt-2 sm:justify-start">
                            <span className="text-sm text-muted-foreground line-through">R$ 149,00</span>
                            <span className="price-gold-glow font-display text-4xl font-bold text-gold-bright">{PRODUCT.priceFormatted}</span>
                          </div>
                        </>
                      )}
                    </div>
                    
                    {!selectedEditionData.inProduction && (
                      <div className="flex-1">
                        <p className="mb-2 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground sm:mb-3 sm:text-left">Selecione seu Tamanho</p>
                        <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
                          {SIZES.map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => onSizeChange(s)}
                              className={cn(
                                "group relative flex h-10 sm:h-12 min-w-10 sm:min-w-12 items-center justify-center rounded-xl px-2 text-xs font-bold transition-all duration-300",
                                selectedSize === s
                                  ? "bg-gold text-navy-deep"
                                  : "border border-white/10 bg-white/[0.03] text-muted-foreground hover:border-gold/40"
                              )}
                            >
                              <span className="relative z-10">{s}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-1 md:mt-2">
                    <Button 
                      size="xl" 
                      disabled={selectedEditionData.inProduction}
                      className={cn(
                        "w-full text-sm sm:text-base font-bold uppercase tracking-tight sm:tracking-normal transition-all duration-300",
                        selectedEditionData.inProduction 
                          ? "bg-white/5 text-muted-foreground border-white/10" 
                          : "shimmer-btn shadow-[0_0_30px_-5px_hsl(var(--gold)/0.4)]"
                      )} 
                      onClick={onBuyNow}
                    >
                      {!selectedEditionData.inProduction && <ArrowRight className="mr-3 h-5 w-5 shrink-0" />}
                      {selectedEditionData.ctaLabel}
                    </Button>
                  </div>

                  <PurchaseTrustBlock variant="hero" />
                </div>
                
                <TrustBadges />
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}