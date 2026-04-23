"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { SectionReveal, SectionShell, SectionSplit } from "@/components/landing/section-shell";
import {
  PRODUCT_IMAGE_ARTE_REDENCAO_BACK_SRC,
  PRODUCT_IMAGE_ARTE_REDENCAO_FRONT_SRC,
  PRODUCT_VIDEO_ARTE_REDENCAO_BACK_MP4_SRC,
  PRODUCT_VIDEO_ARTE_REDENCAO_BACK_WEBM_SRC,
  PRODUCT_VIDEO_ARTE_REDENCAO_FRONT_MP4_SRC,
  PRODUCT_VIDEO_ARTE_REDENCAO_FRONT_WEBM_SRC,
} from "@/lib/product";
import { SECTION_STAGGER } from "@/hooks/use-section-motion";
import { useInlineMutedVideoAutoplay } from "@/hooks/use-inline-muted-video-autoplay";
import { ChevronLeft, ChevronRight, ShieldCheck, Sparkles, Map, Heart } from "lucide-react";

const benefits = [
  { icon: ShieldCheck, title: "Símbolo de Respeito", copy: "O Cristo Redentor em relevo substitui padrões polêmicos por fé e identidade." },
  { icon: Sparkles, title: "Acabamento Purificado", copy: "Textura Jacquard premium que eleva o design ao patamar de peça de colecionador." },
  { icon: Map, title: "Alma Brasileira", copy: "Cada detalhe foi pensado para representar o Brasil que nos orgulha e nos une." },
  { icon: Heart, title: "Conforto Sagrado", copy: "Tecido tecnológico respirável que oferece frescor absoluto durante todo o uso." },
];

export function ProductDetails() {
  const [activeImage, setActiveImage] = useState<"front" | "back">("front");
  const [videoFailedFront, setVideoFailedFront] = useState(false);
  const [videoFailedBack, setVideoFailedBack] = useState(false);
  const arteVideoRef = useRef<HTMLVideoElement | null>(null);
  const artePointerUnlock = useRef(false);

  const activeVideoFailed =
    activeImage === "front" ? videoFailedFront : videoFailedBack;

  const activeVideoMp4Src =
    activeImage === "front"
      ? PRODUCT_VIDEO_ARTE_REDENCAO_FRONT_MP4_SRC
      : PRODUCT_VIDEO_ARTE_REDENCAO_BACK_MP4_SRC;
  const activeVideoWebmSrc =
    activeImage === "front"
      ? PRODUCT_VIDEO_ARTE_REDENCAO_FRONT_WEBM_SRC
      : PRODUCT_VIDEO_ARTE_REDENCAO_BACK_WEBM_SRC;
  const activeImageSrc =
    activeImage === "front"
      ? PRODUCT_IMAGE_ARTE_REDENCAO_FRONT_SRC
      : PRODUCT_IMAGE_ARTE_REDENCAO_BACK_SRC;
  const activeAlt =
    activeImage === "front"
      ? "Modelo com camisa Brasil Alpha vista frontal"
      : "Modelo com camisa Brasil Alpha vista costas com nome e número 10";

  // Hook centralizado para autoplay apenas quando visível
  useInlineMutedVideoAutoplay(arteVideoRef, {
    enabled: !activeVideoFailed,
    mediaKey: `${activeImage}-${activeVideoMp4Src}`,
  });

  useEffect(() => {
    artePointerUnlock.current = false;
  }, [activeImage]);

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
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gold/10 text-gold shadow-[inset_0_0_15px_rgba(212,175,55,0.1)]">
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
            <div
              className="group relative mx-auto aspect-[3/4] max-w-[420px] overflow-hidden rounded-[3rem] shadow-luxe transition-all duration-700 hover:shadow-gold/20"
              onPointerDownCapture={onArtePointerDown}
            >
              <div className="absolute inset-0 z-10 bg-gradient-to-t from-navy-deep/80 via-transparent to-transparent opacity-60 transition-opacity group-hover:opacity-40" />
              <AnimatePresence mode="sync">
                <motion.div
                  key={activeImage}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-0"
                >
                  {activeVideoFailed ? (
                    <Image
                      src={activeImageSrc}
                      alt={activeAlt}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 90vw, 420px"
                      loading="lazy"
                    />
                  ) : (
                    <video
                      ref={arteVideoRef}
                      key={`${activeImage}-video`}
                      className="video-embed-no-native-ui h-full w-full object-cover"
                      muted
                      loop
                      playsInline
                      preload="metadata"
                      poster={activeImageSrc}
                      aria-label={activeAlt}
                      controls={false}
                      disablePictureInPicture
                      controlsList="nodownload noremoteplayback nofullscreen"
                      onError={() =>
                        activeImage === "front"
                          ? setVideoFailedFront(true)
                          : setVideoFailedBack(true)
                      }
                    >
                      <source src={activeVideoMp4Src} type="video/mp4" />
                      <source src={activeVideoWebmSrc} type="video/webm" />
                    </video>
                  )}
                </motion.div>
              </AnimatePresence>
              <button
                type="button"
                onClick={() =>
                  setActiveImage((prev) => (prev === "front" ? "back" : "front"))
                }
                className="absolute left-4 top-1/2 z-20 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white/85 backdrop-blur transition-colors hover:border-gold/40 hover:text-gold-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40 md:h-10 md:w-10"
                aria-label="Mostrar foto anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() =>
                  setActiveImage((prev) => (prev === "front" ? "back" : "front"))
                }
                className="absolute right-4 top-1/2 z-20 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white/85 backdrop-blur transition-colors hover:border-gold/40 hover:text-gold-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40 md:h-10 md:w-10"
                aria-label="Mostrar próxima foto"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <div className="absolute bottom-8 left-8 right-8 z-20">
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-gold-bright">
                  {activeImage === "front" ? "Vista frontal" : "Vista costas"}
                </p>
                <p className="mt-1 text-sm font-medium text-white/90">
                  Toque nas setas para alternar
                </p>
              </div>
            </div>
          </SectionReveal>
        </div>
      </SectionSplit>
    </SectionShell>
  );
}