"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  hasSeenRetentionOffer,
  isRetentionDiscountPeriodActive,
  flagRetentionNavigationFromCheckout,
  getRetentionHref,
  getActiveRetentionDiscountCents,
  msLeftForDiscount,
} from "@/lib/checkout-retention-storage";

/**
 * Intercepta o botão "voltar" do navegador em `/checkout` (chamar dentro de `CheckoutContent`).
 *
 * - `history.pushState` empilha um estado extra na mesma URL: o primeiro "voltar" dispara `popstate`
 *   em vez de sair da página.
 * - No `popstate`, navega para `/checkout/retencao` (com a query atual) e grava `pending` no
 *   sessionStorage; ao montar a retencão, `tryCommitRetentionVisitFromCheckout` marca "já viu"
 *   e o próximo acesso ao checkout não reinstala o guard.
 * - Não uses `<a href="#…">` no mesmo `/checkout` para saltos internos: em alguns browsers isso dispara
 *   `popstate` após este `pushState` e redireciona à retencão à frente do utilizador. Preferir `scrollIntoView`.
 */
export function useCheckoutBrowserBackRetention() {
  const router = useRouter();
  /** Garante um único `pushState` por montagem real (Strict Mode remonta o efeito sem duplicar a entrada). */
  const pushedDummyState = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (hasSeenRetentionOffer() || isRetentionDiscountPeriodActive()) {
      return;
    }

    const onPopState = () => {
      if (hasSeenRetentionOffer() || isRetentionDiscountPeriodActive()) {
        return;
      }
      flagRetentionNavigationFromCheckout();
      const q = window.location.search.replace(/^\?/, "");
      router.replace(getRetentionHref(q), { scroll: false });
    };

    if (!pushedDummyState.current) {
      window.history.pushState(
        { checkoutBackRetentionGuard: 1 },
        "",
        window.location.href
      );
      pushedDummyState.current = true;
    }

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [router]);
}

/** Recalcula desconto a cada segundo para expirar no checkout. */
export function useRetentionDiscountOnTotal(baseTotalCents: number) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  return useMemo(() => {
    void tick;
    return getActiveRetentionDiscountCents(baseTotalCents);
  }, [baseTotalCents, tick]);
}

export function useRetentionBannerCountdown(untilMs: number | null) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, []);
  return useMemo(() => {
    void tick;
    if (untilMs == null) return 0;
    return msLeftForDiscount(untilMs);
  }, [untilMs, tick]);
}
