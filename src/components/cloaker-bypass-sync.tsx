"use client";

import { useEffect } from "react";
import { CLOAKER_COOKIE, CLOAKER_STORAGE_KEY } from "@/lib/cloaker";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=")[1] ?? "") : null;
}

export function CloakerBypassSync() {
  useEffect(() => {
    try {
      const cookieValue = readCookie(CLOAKER_COOKIE);
      const stored = window.localStorage.getItem(CLOAKER_STORAGE_KEY);

      if (cookieValue === "1" && stored !== "1") {
        window.localStorage.setItem(CLOAKER_STORAGE_KEY, "1");
      } else if (cookieValue !== "1" && stored === "1") {
        // Reidrata o cookie a partir do localStorage (1 ano)
        document.cookie = `${CLOAKER_COOKIE}=1; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax`;
      }
    } catch {
      // localStorage pode falhar em modo privado — ignora
    }
  }, []);

  return null;
}
