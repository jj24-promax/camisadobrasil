"use client";

import { useEffect, useRef } from "react";

type BackRedirectProps = {
  link: string;
};

export function BackRedirect({ link }: BackRedirectProps) {
  const initialized = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (initialized.current) return;
    initialized.current = true;

    let urlBackRedirect = link.trim();
    // Repassa os parâmetros da URL atual (UTMs) para o link de redirect
    urlBackRedirect =
      urlBackRedirect +
      (urlBackRedirect.indexOf("?") > 0 ? "&" : "?") +
      window.location.search.replace("?", "");

    window.history.pushState({}, "", window.location.href);
    window.history.pushState({}, "", window.location.href);
    window.history.pushState({}, "", window.location.href);

    const onPopState = () => {
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