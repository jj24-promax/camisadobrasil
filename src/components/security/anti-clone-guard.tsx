"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Dificulta cópia casual: atalhos, menu de contexto, seleção e arraste fora de formulários.
 * Exclui /admin. Não impede: DevTools pelo menu, curl, leitor sem JS, extensões.
 */
/** Nome de classe no `<html>` (válido em CSS; exibe a mensagem no inspetor / ver código). */
export const ANTI_CLONE_HTML_CLASS = "se-clonar-a-oferta-eu-vou-te-achar";

function isFormLikeTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof Node)) return false;
  if (!(target instanceof Element)) {
    return target.parentNode instanceof Element
      ? isFormLikeTarget(target.parentNode)
      : false;
  }
  return Boolean(
    target.closest("input, textarea, select, [contenteditable='true'], [data-allow-user-select]")
  );
}

const LETTERS = new Set("abcdefghijklmnopqrstuvwxyz".split(""));

/** Atalhos de aba/janela/recarregar — não intercetar para não atrapalhar o browser. */
const BROWSER_CHROME_MOD_SHIFT = new Set(["t", "w", "n", "r"]);

export function AntiCloneGuard() {
  const pathname = usePathname();
  const skip = pathname != null && pathname.startsWith("/admin");

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle(ANTI_CLONE_HTML_CLASS, !skip);
    return () => {
      document.documentElement.classList.remove(ANTI_CLONE_HTML_CLASS);
    };
  }, [skip]);

  useEffect(() => {
    if (skip) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;

      const inForm = isFormLikeTarget(e.target);
      const mod = e.ctrlKey || e.metaKey;
      const k = e.key;
      const ch = k.length === 1 ? k.toLowerCase() : "";

      if (k === "F12") {
        e.preventDefault();
        return;
      }

      if (k === "PrintScreen") {
        e.preventDefault();
        return;
      }

      if (!mod) return;

      if (inForm) {
        if (e.shiftKey && ch && LETTERS.has(ch)) {
          if (ch === "z" || ch === "y" || BROWSER_CHROME_MOD_SHIFT.has(ch)) return;
          e.preventDefault();
          return;
        }
        if (!e.shiftKey && (ch === "s" || ch === "i" || ch === "p" || ch === "u" || ch === "g")) {
          e.preventDefault();
        }
        return;
      }

      if (e.shiftKey && ch && LETTERS.has(ch) && !BROWSER_CHROME_MOD_SHIFT.has(ch)) {
        e.preventDefault();
        return;
      }
      if (!e.shiftKey && (ch === "a" || ch === "c" || ch === "s" || ch === "i" || ch === "p" || ch === "u")) {
        e.preventDefault();
      }
    };

    const onContextMenu = (e: Event) => {
      if (isFormLikeTarget((e as MouseEvent).target)) return;
      e.preventDefault();
    };

    const onCopy = (e: ClipboardEvent) => {
      if (isFormLikeTarget((e as ClipboardEvent).target)) return;
      e.preventDefault();
    };

    const onCut = (e: ClipboardEvent) => {
      if (isFormLikeTarget((e as ClipboardEvent).target)) return;
      e.preventDefault();
    };

    const onSelectStart = (e: Event) => {
      if (isFormLikeTarget((e as Event).target)) return;
      e.preventDefault();
    };

    const onDragStart = (e: Event) => {
      if (isFormLikeTarget((e as Event).target)) return;
      e.preventDefault();
    };

    const capture = true;
    document.addEventListener("keydown", onKeyDown, capture);
    document.addEventListener("contextmenu", onContextMenu, capture);
    document.addEventListener("copy", onCopy, capture);
    document.addEventListener("cut", onCut, capture);
    document.addEventListener("selectstart", onSelectStart, capture);
    document.addEventListener("dragstart", onDragStart, capture);

    return () => {
      document.removeEventListener("keydown", onKeyDown, capture);
      document.removeEventListener("contextmenu", onContextMenu, capture);
      document.removeEventListener("copy", onCopy, capture);
      document.removeEventListener("cut", onCut, capture);
      document.removeEventListener("selectstart", onSelectStart, capture);
      document.removeEventListener("dragstart", onDragStart, capture);
    };
  }, [skip]);

  return null;
}
