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
import { ArrowRight, ChevronLeft, ChevronRight, Star, Clock, ShieldCheck, RefreshCcw } from "lucide-react";

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
    enabled: !heroVideoFailed && heroItem.kind === "video",
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
      <div className="relative z-10 mx-auto flex max-w-[1600px] flex-col items-center px-4 pb-20 pt-[5rem] md:px-10 md:pb-24 md:pt-28 xl:px-14">
        
        {/* LOGO CENTRALIZADO */}
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="relative mb-6 flex w-full justify-center px-2 py-3 sm:px-4 sm:py-5 md:mb-12"
        >
          <div
            className="relative h-44 w-full max-w-[500px] md:h-[220px] md:max-w-[800px] lg:h-[260px] lg:max-w-[950px] [filter:drop-shadow(0_0_6px_hsl(var(--gold-bright)_/_0.55))_drop-shadow(0_0_20px_hsl(var(--gold)_/_0.35))_drop-shadow(0_0_42px_hsl(var(--gold-bright)_/_0.18))]"
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

        {/* TÍTULO - ISOLADO E CENTRALIZADO NO TOPO */}
        <div className="mb-6 w-full text-center md:mb-12">
          <motion.h1
            id="hero-heading"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display font-extrabold tracking-tight"
          >
            <span className="block text-[clamp(2.2rem,6.5vw,4.5rem)] leading-[1.05] text-white md:leading-[0.9]">
              A Identidade que
            </span>
            <span className="mt-1 block bg-gradient-to-r from-gold-bright via-gold to-gold-muted bg-clip-text text-[clamp(2.3rem,7vw,4.5rem)] leading-[1.1] text-transparent md:mt-2">
              Protege e Une.
            </span>
          </motion.h1>
        </div>

        {/* GRELHA PRINCIPAL: ESQUERDA (COMPRA) | DIREITA (VÍDEO) LADO A LADO */}
        <div className="grid w-full grid-cols-[1fr_135px] items-stretch gap-3 sm:grid-cols-[1fr_180px] md:grid-cols-2 lg:grid-cols-[1.1fr_0.9fr] md:gap-14">
          
          {/* COLUNA ESQUERDA: AVALIAÇÕES + BUY BOX */}
          <div className="order-1 flex flex-col justify-start text-left">
            
            <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] p-3.5 shadow-luxe backdrop-blur-xl sm:p-5 md:rounded-[2rem] md:p-10">
              
              {/* ESTRELAS */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mb-3 flex flex-wrap items-center gap-1.5 md:mb-6 md:gap-2"
              >
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-2.5 w-2.5 fill-gold text-gold md:h-3 md:w-3" />
                  ))}
                </div>
                <span className="text-[8px] font-bold uppercase tracking-wider text-gold/90 md:text-[10px] md:tracking-[0.2em]">
                  +4.8K AVALIAÇÕES
                </span>
              </motion.div>

              {/* CORES */}
              <div className="mb-4 flex flex-col gap-2 md:mb-6 md:gap-4">
                <p className="font-display text-[9px] font-bold uppercase tracking-[0.2em] text-gold/80 md:text-[10px]">
                  Escolha sua Edição:
                </p>
                <div className="flex flex-wrap gap-2.5 md:gap-4">
                  {HERO_EDITIONS.map((edition) => {
                    const isActive = selectedEdition === edition.id;
                    return (
                      <button
                        key={edition.id}
                        type="button"
                        onClick={() => onEditionChange(edition.id)}
                        className={cn(
                          "group relative h-9 w-9 overflow-hidden rounded-xl border-2 transition-all duration-300 md:h-12 md:w-12",
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
                            <div className="h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_8px_white] md:h-2 md:w-2" />
                          </motion.div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* TEXTOS DA EDIÇÃO (SEM AnimatePresence para garantir que nunca desaparecem) */}
                <div className="mt-1 flex min-h-[3rem] flex-col gap-1 md:min-h-[3.5rem] md:gap-1.5">
                  <p className="font-display text-[11px] font-bold uppercase tracking-widest text-white md:text-sm">
                    {selectedEditionData.name}
                  </p>
                  <p className="text-[10px] font-medium leading-snug text-muted-foreground/90 md:text-[13px] md:leading-relaxed">
                    {selectedEditionData.shortDescription}
                  </p>
                </div>

                {selectedEditionData.inProduction && (
                  <div className="mt-1 flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-2 md:mt-2 md:px-4 md:py-3">
                    <Clock className="h-3 w-3 animate-pulse text-amber-400 md:h-4 md:w-4" />
                    <p className="text-[8px] font-bold uppercase tracking-widest text-amber-100 md:text-xs">
                      Em produção
                    </p>
                  </div>
                )}
              </div>

              {/* SEÇÃO DE PREÇO, TAMANHO E BOTÃO (Apenas se disponível) */}
              {!selectedEditionData.inProduction && (
                <>
                  <div className="mb-4 h-px w-full bg-white/[0.06] md:mb-6" />

                  <div className="mb-4 flex flex-col gap-4 md:mb-6 md:flex-row md:items-end md:justify-between">
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground md:text-[10px]">
                        Preço Exclusivo
                      </p>
                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="text-[10px] text-muted-foreground line-through md:text-sm">R$ 149,00</span>
                        <span className="price-gold-glow font-display text-2xl font-bold text-gold-bright md:text-4xl">
                          {PRODUCT.priceFormatted}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex-1 md:text-left">
                      <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-muted-foreground md:text-[10px]">
                        Tamanho
                      </p>
                      <div className="flex flex-wrap gap-1.5 md:gap-2">
                        {SIZES.map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => onSizeChange(s)}
                            className={cn(
                              "group relative flex h-8 min-w-[2rem] items-center justify-center rounded-lg px-1.5 text-[10px] font-bold transition-all duration-300 md:h-12 md:min-w-[3rem] md:rounded-xl md:text-xs",
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
                  </div>

                  <div className="mt-auto pt-2">
                    <Button 
                      size="default" 
                      className="shimmer-btn h-11 w-full text-xs font-bold uppercase tracking-tight shadow-[0_0_30px_-5px_hsl(var(--gold)/0.4)] md:h-14 md:text-base md:tracking-normal" 
                      onClick={onBuyNow}
                    >
                      <ArrowRight className="mr-2 h-4 w-4 shrink-0 md:mr-3 md:h-5 md:w-5" />
                      {selectedEditionData.ctaLabel}
                    </Button>
                  </div>
                </>
              )}

              {/* TRUST BLOCK MOBILE (Minimalista para caber bem) */}
              {!selectedEditionData.inProduction && (
                <div className="mt-3 flex items-center justify-center gap-3 text-[8px] uppercase tracking-wider text-muted-foreground md:hidden">
                  <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3 text-gold/80"/> Compra Segura</span>
                  <span className="flex items-center gap-1"><RefreshCcw className="h-3 w-3 text-gold/80"/> 7 Dias Garantia</span>
                </div>
              )}

              {/* TRUST BLOCK DESKTOP */}
              <div className="hidden md:block md:mt-6">
                <PurchaseTrustBlock variant="hero" />
              </div>
            </div>

            <div className="hidden md:block">
              <TrustBadges />
            </div>
          </div>

          {/* COLUNA DIREITA: VÍDEO QUE ESTICA COM A CAIXA */}
          <motion.div
            style={{ y: imgY }}
            className="order-2 flex h-full w-full"
          >
            <div className="hero-product-frame relative h-full min-h-[260px] w-full overflow-hidden rounded-2xl bg-[#02050a] backdrop-blur-sm md:rounded-[2.5rem]">
              <div className="absolute -inset-4 bg-gold/5 blur-3xl" />
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                  key={selectedEditionData.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                  className="absolute inset-0 h-full w-full"
                >
                  {heroItem.kind === "image" || heroVideoFailed ? (
                    <>
                      <Image
                        src={activeEditionImageSrc ?? heroItem.src}
                        alt={heroItem.alt}
                        fill
                        className="object-cover"
                        sizes="(max-width: 1024px) 45vw, 500px"
                        priority
                      />
                      {canNavigateEditionGallery ? (
                        <div className="pointer-events-none absolute inset-x-0 top-1/2 z-10 flex -translate-y-1/2 items-center justify-between px-2 md:px-3">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedEditionImageIndex((prev) =>
                                prev === 0 ? selectedEditionGallery.length - 1 : prev - 1
                              )
                            }
                            className="pointer-events-auto inline-flex h-7 w-7 items-center justify-center rounded-full border border-gold/40 bg-[#04070d]/70 text-gold-bright backdrop-blur-md transition hover:border-gold/70 hover:bg-[#04070d]/90 md:h-9 md:w-9"
                            aria-label="Imagem anterior da edição"
                          >
                            <ChevronLeft className="h-3 w-3 md:h-4 md:w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedEditionImageIndex((prev) =>
                                prev === selectedEditionGallery.length - 1 ? 0 : prev + 1
                              )
                            }
                            className="pointer-events-auto inline-flex h-7 w-7 items-center justify-center rounded-full border border-gold/40 bg-[#04070d]/70 text-gold-bright backdrop-blur-md transition hover:border-gold/70 hover:bg-[#04070d]/90 md:h-9 md:w-9"
                            aria-label="Próxima imagem da edição"
                          >
                            <ChevronRight className="h-3 w-3 md:h-4 md:w-4" />
                          </button>
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <video
                      ref={heroVideoRef}
                      key={`${selectedEditionData.id}-video`}
                      className="video-embed-no-native-ui absolute inset-0 h-full w-full object-cover"
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
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}