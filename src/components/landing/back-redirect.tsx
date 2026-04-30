"use client";

import { useEffect, useRef } from "react";
import {
  consumeHomeBackRedirectOnce,
  hasConsumedHomeBackRedirect,
  hasVisitedCheckoutThisSession,
} from "@/lib/checkout-retention-storage";

type BackRedirectProps = {
  link: string;
};

export function BackRedirect({ link }: BackRedirectProps) {
  const initialized = useRef(false);
  const STATE_KEY = "__ab_back_redirect";

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (initialized.current) return;
    if (!hasVisitedCheckoutThisSession()) return;
    if (hasConsumedHomeBackRedirect()) return;
    initialized.current = true;

    let urlBackRedirect = link.trim();
    // Repassa os parâmetros da URL atual (UTMs) para o link de redirect
    urlBackRedirect =
      urlBackRedirect +
      (urlBackRedirect.indexOf("?") > 0 ? "&" : "?") +
      window.location.search.replace("?", "");

    window.history.pushState({ [STATE_KEY]: 1 }, "", window.location.href);
    window.history.pushState({ [STATE_KEY]: 1 }, "", window.location.href);
    window.history.pushState({ [STATE_KEY]: 1 }, "", window.location.href);

    const onPopState = (event: PopStateEvent) => {
      const shouldRedirect = Boolean(
        event.state &&
          typeof event.state === "object" &&
          (event.state as Record<string, unknown>)[STATE_KEY] === 1
      );
      if (!shouldRedirect) return;
      consumeHomeBackRedirectOnce();
      setTimeout(() => {
        window.location.href = urlBackRedirect;
      }, 1);
    };

    window.addEventListener("popstate", onPopState);

    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, [link]);

  return null;
}