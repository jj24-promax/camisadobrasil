"use client";

import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { CAMPAIGN_GALLERY_BY_MODEL, type HeroEditionId, HERO_EDITIONS } from "@/lib/product";
import { SectionReveal, SectionShell } from "@/components/landing/section-shell";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Maximize2 } from "lucide-react";

const EASE = [0.22, 1, 0.36, 1] as const;

const MAIN_SIZES =
  "(max-width: 640px) 100vw, (max-width: 1024px) min(440px, 100vw), min(500px, 46vw)";

function CampaignBackground() {
  return (
    <>
      <div
        className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_85%_55%_at_50%_-5%,hsl(38_28%_16%/0.16),transparent_58%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_70%_50%_at_0%_35%,hsl(220_42%_22%/0.11),transparent_55%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_55%_45%_at_100%_70%,hsl(38_22%_12%/0.07),transparent_52%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[min(45%,320px)] bg-gradient-to-t from-[hsl(222_48%_3%/0.55)] via-transparent to-transparent"
        aria-hidden
      />
    </>
  );
}

type PremiumGalleryProps = {
  selectedEdition: HeroEditionId;
  onEditionChange: (edition: HeroEditionId) => void;
};

export function PremiumGallery({ selectedEdition, onEditionChange }: PremiumGalleryProps) {
  const [active, setActive] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [showAllThumbs, setShowAllThumbs] = useState(false);
  const reduced = useReducedMotion();
  
  const selectedEditionData = HERO_EDITIONS.find((e) => e.id === selectedEdition) ?? HERO_EDITIONS[0];
  const galleryModel =
    CAMPAIGN_GALLERY_BY_MODEL[selectedEdition] ?? CAMPAIGN_GALLERY_BY_MODEL["edicao-sagrada"];
  const galleryImages = galleryModel.images || [];
  const total = galleryImages.length;
  const hasImages = total > 0;

  /** Pré-carrega fotos da campanha para a troca não esperar rede após o clique. */
  useEffect(() => {
    if (!hasImages) return;
    for (const item of galleryImages) {
      const img = new window.Image();
      img.src = item.src;
    }
  }, [galleryImages, hasImages]);

  useEffect(() => {
    setActive(0);
    setShowAllThumbs(false);
    setLightboxOpen(false);
  }, [selectedEdition]);

  const activeItem = hasImages ? (galleryImages[active] ?? galleryImages[0]) : null;
  const visibleThumbs = showAllThumbs
    ? galleryImages
    : galleryImages.slice(0, 4);

  return (
    <SectionShell
      id="galeria"
      aria-labelledby="gallery-heading"
      variant="highlight"
      grain="low"
      className="scroll-mt-24"
      contentClassName="py-20 md:py-28 xl:py-32"
      backgroundSlot={<CampaignBackground />}
    >
      <div className="mx-auto max-w-[1280px]">
        <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-12 lg:gap-x-10 xl:gap-x-14 lg:gap-y-0">
          
          {/* Coluna editorial (Cor + Textos) -> Topo no Mobile, Direita no Desktop */}
          <SectionReveal className="order-1 lg:order-2 flex flex-col lg:col-span-5 lg:pr-2 xl:pr-4 text-center lg:text-left">
            {/* Seletor de Cores */}
            <div className="mb-8 lg:mb-10 space-y-4">
              <p className="font-display text-[10px] font-semibold uppercase tracking-[0.46em] text-gold/80">
                Explore as edições
              </p>
              <div className="flex flex-wrap justify-center lg:justify-start gap-5">
                {HERO_EDITIONS.map((edition) => {
                  const isActive = selectedEdition === edition.id;
                  return (
                    <div key={edition.id} className="flex flex-col items-center gap-2">
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
                            layoutId="gallery-color-check"
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
            </div>

            <div className="mb-5 flex items-center justify-center lg:justify-start gap-4 md:mb-8" aria-hidden>
              <span className="hidden lg:block h-px w-10 bg-gradient-to-r from-gold/70 to-gold/0 md:w-14" />
              <span className="font-display text-[9px] font-semibold uppercase tracking-[0.48em] text-gold/55">
                Alpha Brasil
              </span>
            </div>

            {/* Título e Descrição Dinâmicos da Galeria */}
            <motion.div
              key={selectedEdition}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <h2 id="gallery-heading" className="font-display text-[clamp(2.15rem,4.5vw,3.35rem)] font-bold leading-[1.04] tracking-[-0.02em] text-balance md:mt-2">
                 <span className="bg-gradient-to-br from-gold-bright via-gold to-gold-muted bg-clip-text text-transparent">
                  {selectedEditionData.name}
                </span>
              </h2>

              <p className="mx-auto lg:mx-0 mt-5 lg:mt-6 max-w-[36ch] text-[15px] leading-[1.75] text-muted-foreground/95 md:text-base">
                {selectedEditionData.shortDescription}
              </p>
            </motion.div>

            <div className="mt-8 hidden items-center gap-3 border-t border-white/[0.06] pt-8 lg:flex">
              <div className="h-1 w-1 rounded-full bg-gold/50" />
              <p className="max-w-[32ch] text-xs leading-relaxed text-muted-foreground/75">
                Selecione uma imagem ao lado para explorar os enquadramentos da coleção.
              </p>
            </div>
          </SectionReveal>

          {/* Coluna de Mídia -> Order 2 no Mobile, Order 1 no Desktop */}
          <SectionReveal
            delay={0.06}
            className="relative order-2 lg:order-1 lg:col-span-7"
          >
            <div className="flex flex-col gap-6 sm:gap-7 lg:flex-row lg:items-start lg:justify-end lg:gap-6 xl:gap-8">
              {/* Moldura premium */}
              <div className="relative mx-auto w-full max-w-[400px] sm:max-w-[430px] lg:mx-0 lg:max-w-[min(100%,448px)] lg:flex-1">
                <div
                  className="pointer-events-none absolute -inset-3 rounded-[2rem] bg-[radial-gradient(ellipse_at_50%_0%,hsl(38_35%_45%/0.09),transparent_62%)] blur-xl sm:-inset-4 sm:rounded-[2.15rem]"
                  aria-hidden
                />
                <div
                  className="pointer-events-none absolute -inset-1 rounded-[1.85rem] bg-gradient-to-br from-white/[0.14] via-white/[0.04] to-transparent opacity-50"
                  aria-hidden
                />
                <div
                  className="pointer-events-none absolute inset-0 rounded-[1.75rem] shadow-[0_32px_100px_-28px_rgba(0,0,0,0.92),0_0_0_1px_rgba(212,175,55,0.1),inset_0_1px_0_0_rgba(255,255,255,0.07)]"
                  aria-hidden
                />

                <motion.div
                  layout
                  className="relative overflow-hidden rounded-[1.75rem] border border-white/[0.09] bg-[#03060d] shadow-[0_8px_40px_-12px_rgba(0,0,0,0.75)] ring-1 ring-white/[0.04] sm:rounded-[1.85rem]"
                >
                  <div className="relative aspect-[4/5] w-full flex items-center justify-center">
                    {hasImages && activeItem ? (
                      <>
                        <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-[#0a1024]/20 via-transparent to-[#02050c]/55" />
                        <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(ellipse_90%_60%_at_50%_100%,rgba(0,0,0,0.35),transparent_65%)]" />

                        <AnimatePresence mode="sync" initial={false}>
                          <motion.div
                            key={`${selectedEdition}-${active}`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{
                              duration: reduced ? 0.08 : 0.2,
                              ease: EASE,
                            }}
                            className="absolute inset-0"
                          >
                            <Image
                              src={activeItem.src}
                              alt={activeItem.alt}
                              fill
                              priority={active === 0}
                              loading="eager"
                              fetchPriority="high"
                              quality={90}
                              sizes={MAIN_SIZES}
                              className="object-cover object-center"
                            />
                          </motion.div>
                        </AnimatePresence>
                      </>
                    ) : (
                      <div className="absolute inset-0 flex h-full w-full flex-col items-center justify-center bg-[#05080f]">
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.05),transparent_70%)]" />
                        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-8 backdrop-blur-md text-center max-w-[80%] z-10 shadow-luxe">
                          <p className="text-[11px] font-bold uppercase tracking-widest text-white">Edição em Produção</p>
                          <p className="mt-3 mx-auto text-[13px] leading-relaxed text-muted-foreground/80">
                            Estamos finalizando as fotos exclusivas desta peça. Disponível em breve.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {hasImages && (
                    <>
                      <div className="pointer-events-none absolute bottom-5 left-5 z-20 font-display text-[10px] tabular-nums tracking-[0.32em] text-white/35 sm:bottom-6 sm:left-6">
                        <span className="text-gold/75">
                          {String(active + 1).padStart(2, "0")}
                        </span>
                        <span className="mx-1.5 text-white/20">/</span>
                        <span>{String(total).padStart(2, "0")}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setLightboxOpen(true)}
                        className="group/ampliar absolute bottom-4 right-4 z-20 flex items-center gap-2 rounded-full border border-white/[0.09] bg-[#050912]/82 px-3 py-2 text-[9px] font-medium uppercase tracking-[0.26em] text-white/88 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] backdrop-blur-md transition-all duration-300 hover:border-gold/30 hover:bg-[#060d18]/92 hover:text-white hover:shadow-[0_0_24px_-8px_rgba(196,169,122,0.22)] sm:bottom-5 sm:right-5 sm:px-3.5 sm:py-2 sm:text-[10px] sm:tracking-[0.22em]"
                      >
                        <Maximize2
                          className="h-3 w-3 text-gold/65 transition-colors group-hover/ampliar:text-gold/90"
                          aria-hidden
                          strokeWidth={1.75}
                        />
                        Ampliar
                      </button>
                    </>
                  )}
                </motion.div>
              </div>

              {/* Miniaturas */}
              {hasImages && (
                <div className="relative w-full lg:w-[5.25rem] lg:flex-shrink-0 xl:w-[5.75rem]">
                  <p className="mb-3 hidden text-[9px] font-medium uppercase tracking-[0.28em] text-muted-foreground/55 lg:block">
                    Olhar
                  </p>
                  <div
                    className={cn(
                      "relative flex gap-3 overflow-x-auto pb-1 pl-0.5 pt-0.5 [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-3.5",
                      "lg:flex-col lg:overflow-visible lg:pb-0 lg:pl-0 lg:pt-0",
                      "[&::-webkit-scrollbar]:hidden"
                    )}
                    aria-label="Miniaturas da galeria"
                  >
                    {visibleThumbs.map((img, i) => {
                      const isActive = active === i;
                      return (
                        <button
                          key={img.src}
                          type="button"
                          aria-pressed={isActive}
                          onClick={() => {
                            setActive(i);
                            setLightboxOpen(false);
                          }}
                          className={cn(
                            "group/thumb relative shrink-0 snap-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 transition-[transform,opacity] duration-300 ease-out",
                            isActive ? "scale-[1.02] lg:scale-100" : "opacity-[0.52] hover:opacity-100"
                          )}
                        >
                          <div
                            className={cn(
                              "relative overflow-hidden rounded-2xl p-[1.5px] transition-shadow duration-300",
                              isActive
                                ? "bg-gradient-to-b from-gold/45 via-gold/15 to-gold/5 shadow-luxe"
                                : "bg-gradient-to-b from-white/[0.08] to-white/[0.02] shadow-sm"
                            )}
                          >
                            <div className="relative aspect-[4/5] h-[4.5rem] overflow-hidden rounded-[13px] bg-[#05080f] sm:h-[5rem] lg:h-auto lg:w-full">
                              <Image
                                src={img.src}
                                alt=""
                                fill
                                sizes="92px"
                                loading="lazy"
                                className={cn(
                                  "object-cover transition-transform duration-500",
                                  isActive ? "scale-100" : "scale-[1.03] group-hover/thumb:scale-105"
                                )}
                              />
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </SectionReveal>

        </div>
      </div>

      {lightboxOpen && activeItem ? (
        <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
          <DialogContent className="max-w-4xl border-none bg-transparent p-0 shadow-none">
            <div className="relative aspect-[4/5] w-full">
              <Image src={activeItem.src} alt={activeItem.alt} fill className="object-contain" />
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </SectionShell>
  );
}