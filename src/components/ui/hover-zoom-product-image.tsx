"use client";

import Image, { type StaticImageData } from "next/image";
import { useCallback, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { cn } from "@/lib/utils";

function subscribeReducedMotion(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

function getReducedMotionSnapshot() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getReducedMotionServerSnapshot() {
  return false;
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(subscribeReducedMotion, getReducedMotionSnapshot, getReducedMotionServerSnapshot);
}

type HoverZoomProductImageProps = {
  src: string | StaticImageData;
  alt: string;
  className?: string;
  imgClassName?: string;
  sizes?: string;
  priority?: boolean;
  /** Above the image; use pointer-events-none. */
  overlay?: ReactNode;
  /** Scale while hovering (1 = none). */
  zoom?: number;
};

const DEFAULT_ZOOM = 1.62;

export function HoverZoomProductImage({
  src,
  alt,
  className,
  imgClassName,
  sizes = "(max-width: 768px) 100vw, 480px",
  priority,
  overlay,
  zoom = DEFAULT_ZOOM,
}: HoverZoomProductImageProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const reduceMotion = usePrefersReducedMotion();
  const [hover, setHover] = useState(false);
  const [origin, setOrigin] = useState({ xPct: 50, yPct: 50 });

  const onMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (reduceMotion) return;
      const el = rootRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const xPct = Math.min(100, Math.max(0, ((e.clientX - r.left) / r.width) * 100));
      const yPct = Math.min(100, Math.max(0, ((e.clientY - r.top) / r.height) * 100));
      setOrigin({ xPct, yPct });
    },
    [reduceMotion]
  );

  const onEnter = useCallback(() => {
    if (!reduceMotion) setHover(true);
  }, [reduceMotion]);

  const onLeave = useCallback(() => {
    setHover(false);
    setOrigin({ xPct: 50, yPct: 50 });
  }, []);

  const scale = reduceMotion ? 1 : hover ? zoom : 1;

  return (
    <div
      ref={rootRef}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onMouseMove={onMove}
      className={cn(
        "relative w-full cursor-[zoom-in] overflow-hidden bg-[#020408] motion-reduce:cursor-default",
        className
      )}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className={cn(
          "z-0 object-cover object-center opacity-90",
          "transition-[transform] duration-200 ease-out motion-reduce:transition-none",
          imgClassName
        )}
        style={{
          transform: `scale(${scale})`,
          transformOrigin: `${origin.xPct}% ${origin.yPct}%`,
        }}
      />
      {overlay}
    </div>
  );
}
