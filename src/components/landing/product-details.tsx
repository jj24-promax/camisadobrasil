"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { SectionReveal, SectionShell, SectionSplit } from "@/components/landing/section-shell";
import {
  PRODUCT_IMAGE_ARTE_REDENCAO_BACK_SRC,
  PRODUCT_IMAGE_ARTE_REDENCAO_FRONT_SRC,
  PRODUCT_VIDEO_ARTE_REDENCAO_BACK_MP4_SRC,
  PRODUCT_VIDEO_ARTE_REDENCAO_BACK_WEBM_SRC,
  PRODUCT_VIDEO_ARTE_REDENCAO_FRONT_MP4_SRC,
  PRODUCT_VIDEO_ARTE_REDENCAO_FRONT_WEBM_SRC,
  type HeroEditionId,
  HERO_EDITIONS
} from "@/lib/product";
import { SECTION_STAGGER } from "@/hooks/use-section-motion";
import { useInlineMutedVideoAutoplay } from "@/hooks/use-inline-muted-video-autoplay";
import { ChevronLeft, ChevronRight, ShieldCheck, Sparkles, Map, Heart, CameraOff } from "lucide-react";
import { cn } from "@/lib/utils";

const benefits = [
  { icon: ShieldCheck, title: "Símbolo de Respeito", copy: "O Cristo Redentor em relevo substitui padrões polêmicos por fé e identidade." },
  { icon: Sparkles, title: "Acabamento Purificado", copy: "Textura Jacquard premium que eleva o design ao patamar de peça de colecionador." },
  { icon: Map, title: "Alma Brasileira", copy: "Cada detalhe foi pensado para representar o Brasil que nos orgulha e nos une." },
  { icon: Heart, title: "Conforto Sagrado", copy: "Tecido tecnológico respirável que oferece frescor absoluto durante todo o uso." },
];

type ProductDetailsProps = {
  selectedEdition: HeroEditionId;
  onEditionChange: (edition: HeroEditionId) => void;
};

export function ProductDetails({ selectedEdition, onEditionChange }: ProductDetailsProps) {
  const allSlides = [
    {
      id: "sagrada-front",
      edition: "edicao-sagrada",
      label: "Vista frontal",
      alt: "Modelo com camisa Brasil Alpha vista frontal",
      imageSrc: PRODUCT_IMAGE_ARTE_REDENCAO_FRONT_SRC,
      videoMp4Src: PRODUCT_VIDEO_ARTE_REDENCAO_FRONT_MP4_SRC,
      videoWebmSrc: PRODUCT_VIDEO_ARTE_REDENCAO_FRONT_WEBM_SRC,
    },
    {
      id: "sagrada-back",
      edition: "edicao-sagrada",
      label: "Vista costas",
      alt: "Modelo com camisa Brasil Alpha vista costas",
      imageSrc: PRODUCT_IMAGE_ARTE_REDENCAO_BACK_SRC,
      videoMp4Src: PRODUCT_VIDEO_ARTE_REDENCAO_BACK_MP4_SRC,
      videoWebmSrc: PRODUCT_VIDEO_ARTE_REDENCAO_BACK_WEBM_SRC,
    },
    {
      id: "canarinho-front",
      edition: "edicao-canarinho",
      label: "Canarinho frontal",
      alt: "Modelo com camisa canarinho amarela vista frontal",
      imageSrc: "/images/camisa-detalhe-canarinho-frente.png",
    },
    {
      id: "canarinho-back",
      edition: "edicao-canarinho",
      label: "Canarinho costas",
      alt: "Modelo com camisa canarinho amarela vista costas",
      imageSrc: "/images/camisa-detalhe-canarinho-costas.png",
    },
  ] as const;

  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [videoFailed, setVideoFailed] = useState(false);
  const arteVideoRef = useRef<HTMLVideoElement | null>(null);
  const artePointerUnlock = useRef(false);

  const selectedEditionData = useMemo(() => 
    HERO_EDITIONS.find((e) => e.id === selectedEdition) ?? HERO_EDITIONS[0],
    [selectedEdition]
  );

  const slides = useMemo(() => {
    const filtered = allSlides.filter(s => s.edition === selectedEdition);
    return filtered.length > 0 ? filtered : [];
  }, [selectedEdition, allSlides]);

  const activeSlide = slides[activeSlideIndex] ?? null;
  const activeIsVideo = activeSlide && 'videoMp4Src' in activeSlide;
  const activeVideoSources = activeIsVideo ? { mp4: activeSlide.videoMp4Src, webm: activeSlide.videoWebmSrc } : null;

  useInlineMutedVideoAutoplay(arteVideoRef, {
    enabled: !!activeSlide && activeIsVideo && !videoFailed,
    mediaKey: activeSlide ? `${activeSlide.id}-${activeSlide.imageSrc}` : 'empty',
  });

  useEffect(() => {
    setActiveSlideIndex(0);
    setVideoFailed(false);
    artePointerUnlock.current = false;
  }, [selectedEdition]);

  const goPrev = () => {
    setActiveSlideIndex((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  const goNext = () => {
    setActiveSlideIndex((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
  };

  const onArtePointerDown = useCallback(() => {
    if (artePointerUnlock.current) return;
    artePointerUnlock.current = true;
    const v = arteVideoRef.current;
    if (!v) return;
    v.muted = true;
    v.volume = 0;
    void v.play().catch(() => {});
  }, []);

  return (
    <SectionShell id="detalhes" variant="default" grain="low" className="py-24 md:py-32">
      <SectionSplit>
        <div className="grid gap-16 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-6">
            <SectionReveal>
              <p className="text-xs font-bold uppercase tracking-[0.4em] text-gold">A Arte da Redenção</p>
              <h2 className="mt-6 font-display text-[clamp(2.5rem,5vw,3.75rem)] font-extrabold leading-[1.1] tracking-tight text-white">
                Design que <span className="text-gold-bright">honra</span> a nossa história.
              </h2>
              <p className="mt-8 text-lg leading-relaxed text-muted-foreground md:text-xl">
                Diferente de lançamentos recentes que geraram desconforto, nossa edição foca na clareza. Utilizamos a silhueta do Cristo Redentor como elemento central de proteção e orgulho nacional.
              </p>
            </SectionReveal>

            <ul className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-1">
              {benefits.map(({ icon: Icon, title, copy }, i) => (
                <motion.li
                  key={title}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * SECTION_STAGGER }}
                  className="flex gap-5"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gold/10 text-gold shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
                    <Icon size={20} />
                  </span>
                  <div>
                    <h3 className="text-lg font-bold text-white tracking-tight">{title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{copy}</p>
                  </div>
                </motion.li>
              ))}
            </ul>
          </div>

          <SectionReveal className="lg:col-span-5 lg:col-start-8">
            {/* Quadrante de Informações — Card apenas na Web */}
            <div className={cn(
              "mb-10 space-y-6 text-center lg:text-left transition-all",
              "lg:rounded-[2rem] lg:border lg:border-white/[0.08] lg:bg-white/[0.02] lg:p-10 lg:shadow-luxe lg:backdrop-blur-xl"
            )}>
              <div>
                <p className="font-display text-[10px] font-semibold uppercase tracking-[0.38em] text-gold/75 mb-4">
                  Escolha sua Edição:
                </p>
                <div className="flex flex-wrap justify-center gap-5 lg:justify-start">
                  {HERO_EDITIONS.map((edition) => {
                    const isActive = selectedEdition === edition.id;
                    return (
                      <button
                        key={edition.id}
                        type="button"
                        onClick={() => onEditionChange(edition.id)}
                        className={cn(
                          "group relative h-12 w-12 overflow-hidden rounded-xl border-2 transition-all duration-300",
                          isActive
                            ? "border-gold scale-110 shadow-[0_0_15px_rgba(212,175,55,0.4)]"
                            : "border-white/10 hover:border-white/30"
                        )}
                        aria-label={`Ver detalhes da cor ${edition.name}`}
                      >
                        <div 
                          className="h-full w-full" 
                          style={{ backgroundColor: edition.color }}
                        />
                        {isActive && (
                          <motion.div 
                            layoutId="details-color-check"
                            className="absolute inset-0 flex items-center justify-center bg-black/20"
                          >
                            <div className="h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_8px_white]" />
                          </motion.div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Nome e Descrição Dinâmicos do Modelo */}
              <div className="min-h-[4rem] lg:min-h-0">
                {/* Removido AnimatePresence para garantir que o texto não "suma" */}
                <motion.div
                  key={selectedEdition}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="space-y-2"
                >
                  <p className="font-display text-[14px] font-bold uppercase tracking-[0.24em] text-gold-bright">
                    {selectedEditionData.name}
                  </p>
                  <p className="mx-auto max-w-[32ch] text-[15px] font-medium leading-relaxed text-white/80 lg:mx-0 lg:max-w-none">
                    {selectedEditionData.shortDescription}
                  </p>
                </motion.div>
              </div>
            </div>

            <div
              className="group relative mx-auto aspect-[3/4] max-w-[420px] overflow-hidden rounded-[3rem] shadow-luxe transition-all duration-700 hover:shadow-gold/20"
              onPointerDownCapture={onArtePointerDown}
            >
              <div className="absolute inset-0 z-10 bg-gradient-to-t from-navy-deep/80 via-transparent to-transparent opacity-60 transition-opacity group-hover:opacity-40" />
              
              <AnimatePresence mode="sync">
                {activeSlide ? (
                  <motion.div
                    key={activeSlide.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute inset-0"
                  >
                    {!activeIsVideo || videoFailed ? (
                      <Image
                        src={activeSlide.imageSrc}
                        alt={activeSlide.alt}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 90vw, 420px"
                        loading="lazy"
                      />
                    ) : activeVideoSources ? (
                      <video
                        ref={arteVideoRef}
                        key={`${activeSlide.id}-video`}
                        className="video-embed-no-native-ui h-full w-full object-cover"
                        muted
                        loop
                        playsInline
                        preload="metadata"
                        poster={activeSlide.imageSrc}
                        aria-label={activeSlide.alt}
                        controls={false}
                        disablePictureInPicture
                        controlsList="nodownload noremoteplayback nofullscreen"
                        onError={() => setVideoFailed(true)}
                      >
                        <source src={activeVideoSources.mp4} type="video/mp4" />
                        <source src={activeVideoSources.webm} type="video/webm" />
                      </video>
                    ) : null}
                  </motion.div>
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-navy-deep/40 px-8 text-center">
                    <CameraOff className="h-10 w-10 text-white/20" strokeWidth={1.5} />
                    <p className="text-sm font-semibold text-white/60">Edição em Produção</p>
                  </div>
                )}
              </AnimatePresence>

              {slides.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={goPrev}
                    className="absolute left-4 top-1/2 z-20 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white/85 backdrop-blur transition-colors hover:border-gold/40 hover:text-gold-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40 md:h-10 md:w-10"
                    aria-label="Mostrar foto anterior"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={goNext}
                    className="absolute right-4 top-1/2 z-20 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white/85 backdrop-blur transition-colors hover:border-gold/40 hover:text-gold-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40 md:h-10 md:w-10"
                    aria-label="Mostrar próxima foto"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </>
              )}

              {activeSlide && (
                <div className="absolute bottom-8 left-8 right-8 z-20">
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-gold-bright">
                    {activeSlide.label}
                  </p>
                  {slides.length > 1 && (
                    <p className="mt-1 text-sm font-medium text-white/90">
                      Toque nas setas para alternar
                    </p>
                  )}
                </div>
              )}
            </div>
          </SectionReveal>
        </div>
      </SectionSplit>
    </SectionShell>
  );
}