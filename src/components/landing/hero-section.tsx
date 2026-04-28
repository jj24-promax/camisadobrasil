"use client";

import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
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
import { ArrowRight, ChevronLeft, ChevronRight, Star } from "lucide-react";
import { HeroEditionSelector } from "./hero-edition-selector";

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

  /** Primeiro toque na hero (gesto do utilizador) — iOS por vezes só aí liberta o loop. */
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
        
        {/* Logo Centralizado - Tamanho reduzido na web para maior elegância */}
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

        <div className="grid grid-cols-1 items-center gap-10 md:gap-16 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14 w-full">
          <div className="order-2 flex flex-col justify-center text-center lg:order-1 lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-5 flex items-center justify-center gap-2 lg:justify-start"
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

            <motion.h1
              id="hero-heading"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="font-display font-extrabold tracking-tight"
            >
              <span className="block text-[clamp(2.5rem,7vw,4.5rem)] leading-[0.9] text-white">
                A Identidade que
              </span>
              <span className="mt-2 block bg-gradient-to-r from-gold-bright via-gold to-gold-muted bg-clip-text text-[clamp(2.5rem,7vw,4.5rem)] leading-[1] text-transparent">
                Protege e Une.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mx-auto mt-6 max-w-xl text-lg font-medium leading-relaxed text-muted-foreground/90 lg:mx-0 md:text-xl"
            >
              {selectedEditionData.shortDescription}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="mt-10 flex flex-col gap-6"
            >
              <div className="relative overflow-hidden rounded-[2rem] border border-white/[0.08] bg-white/[0.02] p-6 shadow-luxe backdrop-blur-xl md:p-10">
                <div className="flex flex-col gap-8">
                  <HeroEditionSelector
                    options={HERO_EDITIONS}
                    selectedEdition={selectedEdition}
                    onChange={(edition) => {
                      onEditionChange(edition);
                      setHeroVideoFailed(false);
                      setSelectedEditionImageIndex(0);
                    }}
                  />

                  <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
                    <div className="text-center sm:text-left">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Modelo selecionado</p>
                      <p className="mt-1 max-w-xs text-sm font-semibold text-white">{selectedEditionData.name}</p>
                      <p className="mt-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Preço Exclusivo</p>
                      <div className="mt-2 flex items-baseline justify-center gap-2 sm:justify-start">
                        <span className="text-sm text-muted-foreground line-through">R$ 149,00</span>
                        <span className="price-gold-glow font-display text-4xl font-bold text-gold-bright">{PRODUCT.priceFormatted}</span>
                      </div>
                    </div>
                    
                    <div className="flex-1">
                      <p className="mb-3 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground sm:text-left">Selecione seu Tamanho</p>
                      <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
                        {SIZES.map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => onSizeChange(s)}
                            className={cn(
                              "group relative flex h-12 min-w-12 items-center justify-center rounded-xl px-2 text-xs font-bold transition-all duration-300",
                              selectedSize === s
                                ? "bg-gold text-navy-deep"
                                : "border border-white/10 bg-white/[0.03] text-muted-foreground hover:border-gold/40"
                            )}
                          >
                            <span className="relative z-10">{s}</span>
                          </button>
                        ))}
                      </div>
                      <a
                        href="#tabela-tamanhos"
                        className="mx-auto mt-4 flex w-fit max-w-full items-center justify-center rounded-xl border border-gold/35 bg-gold/[0.1] px-4 py-2.5 text-center text-[11px] font-semibold leading-snug text-gold-bright shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-sm transition-all hover:border-gold/55 hover:bg-gold/[0.16] hover:underline hover:underline-offset-4 sm:mx-0 sm:justify-start"
                      >
                        Não sabe seu tamanho? Descubra agora
                      </a>
                    </div>
                  </div>

                  <Button 
                    size="xl" 
                    className="shimmer-btn w-full text-sm sm:text-base font-bold uppercase tracking-tight sm:tracking-normal shadow-[0_0_30px_-5px_hsl(var(--gold)/0.4)]" 
                    onClick={onBuyNow}
                  >
                    <ArrowRight className="mr-3 h-5 w-5 shrink-0" />
                    {selectedEditionData.ctaLabel}
                  </Button>

                  <PurchaseTrustBlock variant="hero" />
                </div>
                
                <TrustBadges />
              </div>
            </motion.div>
          </div>

          <motion.div
            style={{ y: imgY }}
            className="order-1 flex items-center justify-center lg:order-2"
          >
            <div className="relative w-full max-w-[380px] lg:max-w-[500px]">
              <div className="absolute -inset-4 rounded-[3rem] bg-gold/5 blur-3xl" />
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="hero-product-frame relative aspect-[4/5] overflow-hidden rounded-[2.5rem] bg-navy-deep/40 backdrop-blur-sm"
              >
                {heroItem.kind === "image" || heroVideoFailed ? (
                  <>
                    <Image
                      src={heroItem.kind === "video" ? heroItem.posterSrc : activeEditionImageSrc ?? heroItem.src}
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
                    className="video-embed-no-native-ui h-full w-full object-cover"
                    muted
                    loop
                    playsInline
                    autoPlay
                    preload="auto"
                    poster={heroItem.posterSrc}
                    aria-label={heroItem.alt}
                    controls={false}
                    disablePictureInPicture
                    controlsList="nodownload noremoteplayback nofullscreen"
                    onError={() => setHeroVideoFailed(true)}
                  >
                    {/* MP4 primeiro: Safari/iOS não reproduz WebM */}
                    <source src={heroItem.mp4Src} type="video/mp4" />
                    <source src={heroItem.webmSrc} type="video/webm" />
                  </video>
                )}
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}