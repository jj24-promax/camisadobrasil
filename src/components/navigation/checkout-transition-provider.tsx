"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  mergeCheckoutQueryWithMarketing,
  persistMarketingSearchFromBrowser,
} from "@/lib/checkout-navigation-params";

type CheckoutTransitionContextValue = {
  /** `searchParams` sem o `?` inicial (ex.: `q=3&sizes=M%2CG%2CGG`). */
  requestCheckoutNavigation: (searchParams: string) => void;
};

const CheckoutTransitionContext =
  createContext<CheckoutTransitionContextValue | null>(null);

export function useCheckoutTransition() {
  const ctx = useContext(CheckoutTransitionContext);
  if (!ctx) {
    throw new Error(
      "useCheckoutTransition must be used within CheckoutTransitionProvider"
    );
  }
  return ctx;
}

const OVERLAY_IN_MS = 420;
const OVERLAY_OUT_MS = 480;

export function CheckoutTransitionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [phase, setPhase] = useState<"idle" | "overlay_in" | "overlay_out">("idle");
  const pending = useRef<string | null>(null);
  const pushDone = useRef(false);

  const requestCheckoutNavigation = useCallback(
    (searchParams: string) => {
      if (phase !== "idle") return;
      pending.current = searchParams;
      pushDone.current = false;
      setPhase("overlay_in");
    },
    [phase]
  );

  useEffect(() => {
    if (phase !== "overlay_in" || !pending.current || pushDone.current) return;
    const id = window.setTimeout(() => {
      pushDone.current = true;
      const merged = mergeCheckoutQueryWithMarketing(pending.current!);
      router.push(`/checkout?${merged}`, { scroll: false });
    }, OVERLAY_IN_MS);
    return () => window.clearTimeout(id);
  }, [phase, router]);

  useEffect(() => {
    persistMarketingSearchFromBrowser();
  }, [pathname]);

  useEffect(() => {
    if (!pathname.startsWith("/checkout")) return;
    if (phase === "overlay_in") {
      setPhase("overlay_out");
    }
  }, [pathname, phase]);

  useEffect(() => {
    if (phase !== "overlay_out") return;
    const id = window.setTimeout(() => {
      setPhase("idle");
      pending.current = null;
      pushDone.current = false;
    }, OVERLAY_OUT_MS);
    return () => window.clearTimeout(id);
  }, [phase]);

  return (
    <CheckoutTransitionContext.Provider value={{ requestCheckoutNavigation }}>
      {children}
      {phase !== "idle" && (
        <motion.div
          role="status"
          aria-live="polite"
          aria-label="A preparar o checkout"
          initial={{ opacity: 0 }}
          animate={{ opacity: phase === "overlay_out" ? 0 : 1 }}
          transition={{
            duration: phase === "overlay_out" ? 0.42 : 0.38,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="pointer-events-none fixed inset-0 z-[400] flex flex-col items-center justify-center gap-5 bg-[#04070d]/93 backdrop-blur-md"
        >
          <div className="h-px w-24 bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
          <p className="max-w-[min(90vw,20rem)] text-center font-display text-[10px] font-bold uppercase leading-relaxed tracking-[0.32em] text-gold-bright">
            A preparar o seu checkout
          </p>
          <motion.div
            className="h-0.5 w-32 overflow-hidden rounded-full bg-white/[0.08]"
            initial={{ opacity: 0.6 }}
            animate={
              phase === "overlay_out"
                ? { opacity: 0 }
                : { opacity: [0.5, 1, 0.5], scaleX: [0.92, 1, 0.92] }
            }
            transition={
              phase === "overlay_out"
                ? { duration: 0.35 }
                : { duration: 1.4, repeat: Infinity, ease: "easeInOut" }
            }
          >
            <div className="h-full w-full bg-gradient-to-r from-transparent via-gold to-transparent" />
          </motion.div>
        </motion.div>
      )}
    </CheckoutTransitionContext.Provider>
  );
}
