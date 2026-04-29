"use client";

import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { CAMPAIGN_GALLERY_BY_MODEL, type HeroEditionId } from "@/lib/product";
import { SectionReveal, SectionShell } from "@/components/landing/section-shell";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Maximize2, CameraOff } from "lucide-react";

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
  const galleryModel =
    CAMPAIGN_GALLERY_BY_MODEL[selectedEdition] ?? CAMPAIGN_GALLERY_BY_MODEL["edicao-sagrada"];
  const galleryImages = galleryModel.images || [];
  const total = galleryImages.length;
  const hasImages = total > 0;

  const editionOptions = Object.values(CAMPAIGN_GALLERY_BY_MODEL);

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
          {/* Coluna editorial — texto */}
          <SectionReveal
            delay={0}
            className="flex flex-col lg:col-span-5 lg:min-h-0 lg:pr-2 xl:pr-4"
          >
            <div
              className="mb-6 flex items-center gap-4 md:mb-8"
              aria-hidden
            >
              <span className="h-px w-10 bg-gradient-to-r from-gold/70 to-gold/0 md:w-14" />
              <span className="font-display text-[9px] font-semibold uppercase tracking-[0.48em] text-gold/55">
                Alpha Brasil
              </span>
            </div>

            <p className="font-display text-[10px] font-semibold uppercase tracking-[0.46em] text-gold/80">
              Galeria da campanha
            </p>
            <p className="mt-3 inline-flex w-fit rounded-full border border-gold/35 bg-gold/[0.12] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-gold-bright">
              Galeria: {galleryModel.name}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              {editionOptions.map((option) => {
                const isActive = option.modelId === selectedEdition;
                const isCanarinho = option.slug === "canarinho";
                const isVermelha = option.slug === "vermelha";
                
                return (
                  <button
                    key={option.slug}
                    type="button"
                    onClick={() => onEditionChange(option.modelId)}
                    className={cn(
                      "group relative inline-flex min-h-[2.5rem] items-center justify-center overflow-hidden rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#060a12]",
                      isActive
                        ? cn(
                            "border border-gold/75 text-white shadow-[0_0_0_1px_rgba(212,175,55,0.35),0_0_28px_-8px_rgba(212,175,55,0.65),0_4px_24px_-12px_rgba(0,0,0,0.5)]",
                            isCanarinho
                              ? "bg-gradient-to-br from-emerald-400/[0.22] via-gold/[0.18] to-gold/[0.06] ring-1 ring-emerald-300/45"
                              : isVermelha
                                ? "bg-gradient-to-br from-red-500/[0.22] via-gold/[0.18] to-gold/[0.06] ring-1 ring-red-400/45"
                                : "bg-gradient-to-br from-gold/[0.28] via-gold/[0.12] to-transparent ring-1 ring-gold/50"
                          )
                        : "border border-white/22 bg-black/[0.35] text-muted-foreground backdrop-blur-[2px] hover:border-gold/45 hover:bg-white/[0.06] hover:text-gold-bright hover:shadow-[0_0_22px_-10px_rgba(212,175,55,0.45)] active:scale-[0.98]"
                    )}
                    aria-pressed={isActive}
                  >
                    {isActive ? (
                      <>
                        <span
                          aria-hidden
                          className={cn(
                            "pointer-events-none absolute -inset-px rounded-full opacity-95 blur-[0.5px]",
                            isCanarinho
                              ? "bg-[radial-gradient(ellipse_at_50%_-10%,rgba(167,243,208,0.5)_0%,rgba(212,175,55,0.15)_42%,transparent_68%)]"
                              : isVermelha
                                ? "bg-[radial-gradient(ellipse_at_50%_-10%,rgba(239,68,68,0.5)_0%,rgba(212,175,55,0.15)_42%,transparent_68%)]"
                                : "bg-[radial-gradient(ellipse_at_50%_-10%,rgba(255,223,128,0.45)_0%,rgba(212,175,55,0.2)_42%,transparent_68%)]"
                          )}
                        />
                        <span
                          aria-hidden
                          className="pointer-events-none absolute inset-x-3 top-0 h-[42%] rounded-t-full bg-gradient-to-b from-white/25 via-white/[0.06] to-transparent opacity-60"
                        />
                      </>
                    ) : null}
                    <span className="relative z-[1] drop-shadow-[0_1px_8px_rgba(0,0,0,0.55)]">
                      {option.name}
                    </span>
                  </button>
                );
              })}
            </div>

            <h2
              id="gallery-heading"
              className="mt-4 font-display text-[clamp(2.15rem,4.5vw,3.35rem)] font-bold leading-[1.04] tracking-[-0.02em] text-balance md:mt-5"
            >
              Presença em{" "}
              <span className="relative inline">
                <span className="bg-gradient-to-br from-gold-bright via-gold to-gold-muted bg-clip-text text-transparent">
                  cada detalhe
                </span>
                <span className="absolute -bottom-1 left-0 right-0 h-px bg-gradient-to-r from-gold/40 via-gold/15 to-transparent opacity-80" />
              </span>
            </h2>

            <p className="mt-6 max-w-[36ch] text-[15px] leading-[1.75] text-muted-foreground/95 md:text-base md:leading-relaxed">
              Fotos reais para mostrar o caimento, a presença e a identidade
              da peça no corpo — a mesma linguagem visual da campanha Alpha
              Brasil.
            </p>

            <div className="mt-8 hidden items-center gap-3 border-t border-white/[0.06] pt-8 lg:flex">
              <div className="h-1 w-1 rounded-full bg-gold/50" />
              <p className="max-w-[32ch] text-xs leading-relaxed text-muted-foreground/75">
                Selecione uma imagem ao lado para explorar os enquadramentos da
                coleção.
              </p>
            </div>
          </SectionReveal>

          {/* Vitrine — imagem + thumbs */}
          <SectionReveal
            delay={0.06}
            className="relative lg:col-span-7"
          >
            <div className="flex flex-col gap-6 sm:gap-7 lg:flex-row lg:items-start lg:justify-end lg:gap-6 xl:gap-8">
              {/* Moldura premium — centro nobre */}
              <div className="relative mx-auto w-full max-w-[400px] sm:max-w-[430px] lg:mx-0 lg:max-w-[min(100%,448px)] lg:flex-1">
                {/* Halo + profundidade */}
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
                      <div className="flex flex-col items-center gap-4 text-center px-8">
                        <CameraOff className="h-10 w-10 text-white/20" strokeWidth={1.5} />
                        <div>
                          <p className="text-sm font-semibold text-white/60">Edição em Produção</p>
                          <p className="mt-2 text-xs text-muted-foreground/60 leading-relaxed">
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

              {/* Miniaturas — navegação de campanha */}
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
                    {/* Fade nas bordas — mobile */}
                    <div
                      className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-[#04070d] via-[#04070d]/90 to-transparent lg:hidden"
                      aria-hidden
                    />
                    <div
                      className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-[#04070d] via-[#04070d]/90 to-transparent lg:hidden"
                      aria-hidden
                    />

                    {visibleThumbs.map((img, i) => {
                      const isActive = active === i;
                      return (
                        <button
                          key={img.src}
                          type="button"
                          aria-pressed={isActive}
                          aria-label={`Mostrar foto ${i + 1} da campanha`}
                          onClick={() => {
                            setActive(i);
                            setLightboxOpen(false);
                          }}
                          className={cn(
                            "group/thumb relative shrink-0 snap-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#04070d]",
                            "transition-[transform,opacity] duration-300 ease-out",
                            isActive ? "scale-[1.02] lg:scale-100" : "opacity-[0.52] hover:opacity-100"
                          )}
                        >
                          <div
                            className={cn(
                              "relative overflow-hidden rounded-2xl p-[1.5px] transition-shadow duration-300",
                              isActive
                                ? "bg-gradient-to-b from-gold/45 via-gold/15 to-gold/5 shadow-[0_0_0_1px_rgba(212,175,55,0.25),0_12px_36px_-16px_rgba(0,0,0,0.85),0_0_28px_-12px_rgba(196,169,122,0.2)]"
                                : "bg-gradient-to-b from-white/[0.08] to-white/[0.02] shadow-[0_8px_24px_-18px_rgba(0,0,0,0.7)] hover:from-white/[0.14] hover:to-white/[0.05] hover:shadow-[0_12px_32px_-14px_rgba(0,0,0,0.75)]"
                            )}
                          >
                            <div
                              className={cn(
                                "relative aspect-[4/5] h-[4.5rem] overflow-hidden rounded-[13px] bg-[#05080f] sm:h-[5rem]",
                                "lg:h-auto lg:w-full"
                              )}
                            >
                              <Image
                                src={img.src}
                                alt=""
                                fill
                                sizes="(max-width: 1024px) 80px, 92px"
                                loading={i === 0 ? undefined : "lazy"}
                                quality={75}
                                className={cn(
                                  "object-cover object-center transition-transform duration-500 ease-out",
                                  isActive ? "scale-100" : "scale-[1.03] group-hover/thumb:scale-105"
                                )}
                              />
                              {isActive && (
                                <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/10" />
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {!showAllThumbs && galleryImages.length > visibleThumbs.length ? (
                    <button
                      type="button"
                      onClick={() => setShowAllThumbs(true)}
                      className="mt-3 w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground transition-colors hover:border-gold/25 hover:text-gold-bright lg:mt-4"
                    >
                      Ver mais
                    </button>
                  ) : null}
                </div>
              )}
            </div>

            {hasImages && activeItem && (
              <>
                <p className="mt-5 text-center text-sm text-muted-foreground/90 lg:text-left">
                  {activeItem.caption}
                </p>
                <p className="mt-3 text-center text-[10px] uppercase tracking-[0.34em] text-muted-foreground/70 lg:mt-4 lg:text-left lg:tracking-[0.3em]">
                  Toque para navegar ·{" "}
                  <span className="text-muted-foreground/50">{galleryModel.name}</span>
                </p>
              </>
            )}
          </SectionReveal>
        </div>
      </div>

      {lightboxOpen && activeItem ? (
        <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
          <DialogContent
            className={cn(
              "flex max-h-[min(92dvh,960px)] w-[min(calc(100vw-1.25rem),920px)] max-w-none flex-col gap-0 overflow-hidden border border-white/[0.09] bg-[#05080f]/[0.98] p-2 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.95),0_0_0_1px_rgba(212,175,55,0.08)] backdrop-blur-2xl sm:p-3 md:p-4",
              "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-2xl sm:rounded-[1.35rem]"
            )}
          >
            <DialogTitle className="sr-only">{activeItem.alt}</DialogTitle>
            <DialogDescription className="sr-only">
              Visualização ampliada da foto da campanha.
            </DialogDescription>
            <div className="relative flex min-h-0 w-full flex-1 items-center justify-center rounded-xl bg-gradient-to-b from-[#03060c] to-[#050a12]">
              <div className="relative h-[min(82dvh,880px)] w-full">
                <Image
                  src={activeItem.src}
                  alt={activeItem.alt}
                  fill
                  className="object-contain object-center"
                  sizes="(max-width: 920px) 96vw, 880px"
                  loading="lazy"
                  quality={95}
                />
              </div>
            </div>
            <p className="mt-2 px-1 text-center text-[10px] uppercase tracking-[0.28em] text-muted-foreground/85 sm:mt-3">
              Esc · clique fora ou ✕ para fechar
            </p>
          </DialogContent>
        </Dialog>
      ) : null}
    </SectionShell>
  );
}