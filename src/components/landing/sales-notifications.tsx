"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

const NAMES = ["João S.", "Maria V.", "Ricardo F.", "Fernanda M.", "Lucas A.", "Beatriz R.", "Rafael C.", "Juliana P.", "Gustavo T.", "Ana L."];
const CITIES = ["São Paulo, SP", "Rio de Janeiro, RJ", "Belo Horizonte, MG", "Curitiba, PR", "Porto Alegre, RS", "Salvador, BA", "Fortaleza, CE", "Brasília, DF"];

type SalesNotificationsProps = {
  isVisible: boolean;
};

export function SalesNotifications({ isVisible }: SalesNotificationsProps) {
  const [notification, setNotification] = useState<{ name: string; city: string } | null>(null);
  const [hideOnMobileColorSelection, setHideOnMobileColorSelection] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const target = document.getElementById("hero-color-selector");
    if (!target) return;

    const mq = window.matchMedia("(max-width: 767px)");
    const updateByIntersect = (isIntersecting: boolean) => {
      if (!mq.matches) {
        setHideOnMobileColorSelection(false);
        return;
      }
      setHideOnMobileColorSelection(isIntersecting);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        updateByIntersect(Boolean(entry?.isIntersecting));
      },
      { threshold: 0.2 }
    );
    observer.observe(target);

    const onMediaChange = () => {
      if (!mq.matches) setHideOnMobileColorSelection(false);
    };
    mq.addEventListener("change", onMediaChange);

    return () => {
      observer.disconnect();
      mq.removeEventListener("change", onMediaChange);
    };
  }, []);

  const effectiveVisible = isVisible && !hideOnMobileColorSelection;

  useEffect(() => {
    // Se a barra não estiver visível, limpamos qualquer notificação ativa e não fazemos nada
    if (!effectiveVisible) {
      setNotification(null);
      return;
    }

    const showNotification = () => {
      const name = NAMES[Math.floor(Math.random() * NAMES.length)];
      const city = CITIES[Math.floor(Math.random() * CITIES.length)];
      setNotification({ name, city });

      setTimeout(() => {
        setNotification(null);
      }, isMobile ? 2800 : 4000);
    };

    // Agenda a primeira notificação após 1.5s de a barra aparecer
    const initialTimer = setTimeout(showNotification, isMobile ? 2200 : 1500);

    const interval = setInterval(() => {
      showNotification();
    }, (isMobile ? 13000 : 8000) + Math.random() * (isMobile ? 9000 : 7000));

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [effectiveVisible, isMobile]);

  return (
    <div className="fixed bottom-24 left-4 z-[60] md:bottom-6 md:left-6">
      <AnimatePresence>
        {effectiveVisible && notification && (
          <motion.div
            initial={
              isMobile || reduced
                ? { opacity: 0 }
                : { opacity: 0, x: -20, scale: 0.95 }
            }
            animate={
              isMobile || reduced
                ? { opacity: 1 }
                : { opacity: 1, x: 0, scale: 1 }
            }
            exit={
              isMobile || reduced
                ? { opacity: 0 }
                : { opacity: 0, x: -20, scale: 0.95 }
            }
            className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#060a12]/90 p-3 shadow-2xl backdrop-blur-xl md:gap-4 md:p-4"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-500/20 text-green-500 md:h-10 md:w-10">
              <CheckCircle2 size={18} className="md:size-5" />
            </div>
            <div className="pr-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-green-500 md:text-[11px]">
                Compra Aprovada
              </p>
              <p className="mt-0.5 text-xs font-semibold text-white md:text-sm">
                {notification.name} — {notification.city}
              </p>
              <p className="text-[9px] text-muted-foreground md:text-[10px]">
                Acabou de garantir a Edição Sagrada
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}