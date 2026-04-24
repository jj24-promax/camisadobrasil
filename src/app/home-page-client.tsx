"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { ShoppingBag } from "lucide-react";
import { HeroSection } from "@/components/landing/hero-section";
import { SiteNavDesktop, SiteNavMobile } from "@/components/landing/site-nav";
import { AnnouncementBar } from "@/components/landing/announcement-bar";
import type { Size } from "@/lib/types";

// Importações estáticas para secções (evita Hydration Mismatch e dessincronização do useId())
import { ProductDetails } from "@/components/landing/product-details";
import { PromoBundle } from "@/components/landing/promo-bundle";
import { PremiumGallery } from "@/components/landing/premium-gallery";
import { SocialProof } from "@/components/landing/social-proof";
import { GuaranteeSection } from "@/components/landing/guarantee-section";
import { SizeChart } from "@/components/landing/size-chart";
import { FaqSection } from "@/components/landing/faq-section";
import { FeedbackSection } from "@/components/landing/feedback-section";
import { FinalCta } from "@/components/landing/final-cta";

// UI Dinâmica e Modais (sem server-side rendering para poupar recursos de servidor e não encravar a hidratação)
const StickyBuyBar = dynamic(() => import("@/components/landing/sticky-buy-bar").then(m => m.StickyBuyBar), { ssr: false });
const SalesNotifications = dynamic(() => import("@/components/landing/sales-notifications").then(m => m.SalesNotifications), { ssr: false });
const LandingCartDialog = dynamic(() => import("@/components/landing/landing-cart-dialog").then(m => m.LandingCartDialog), { ssr: false });

export function HomePageClient() {
  const backRedirectUrl = process.env.NEXT_PUBLIC_UTMIFY_BACK_REDIRECT_URL?.trim() ?? "";
  const [selectedSize, setSelectedSize] = useState<Size>("M");
  const [isStickyVisible, setIsStickyVisible] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartQty, setCartQty] = useState(1);
  const [cartSizes, setCartSizes] = useState<Size[]>(["M"]);

  const openCart = (quantity: number) => {
    setCartQty(quantity);
    setCartSizes(Array(quantity).fill(selectedSize));
    setCartOpen(true);
  };

  const handleCartQtyChange = (q: number) => {
    setCartQty(q);
    setCartSizes((prev) => {
      if (q === prev.length) return prev;
      if (q > prev.length) {
        const fill = prev[prev.length - 1] ?? selectedSize;
        return [...prev, ...Array.from({ length: q - prev.length }, () => fill)];
      }
      return prev.slice(0, q);
    });
  };

  const handleCartSizesChange = (next: Size[]) => {
    setCartSizes(next);
    if (next.length === 1) {
      setSelectedSize(next[0]);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      const threshold = window.innerHeight * 0.5;
      setIsStickyVisible(window.scrollY > threshold);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!backRedirectUrl) return;

    const query = window.location.search.replace("?", "").trim();
    const destination = `${backRedirectUrl}${backRedirectUrl.includes("?") ? "&" : "?"}${query}`;

    history.pushState({}, "", location.href);
    history.pushState({}, "", location.href);
    history.pushState({}, "", location.href);

    const onPopState = () => {
      window.setTimeout(() => {
        location.href = destination;
      }, 1);
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [backRedirectUrl]);

  return (
    <>
      <header className="fixed left-0 right-0 top-0 z-40 border-b border-white/[0.05] bg-[hsl(222,48%,3%)]/82 backdrop-blur-2xl">
        <AnnouncementBar />
        <div className="mx-auto flex h-[3.75rem] max-w-[1600px] items-center gap-3 px-5 md:gap-6 md:px-10 xl:px-14">
          <a
            href="#inicio"
            className="shrink-0 font-display text-sm font-bold tracking-[0.3em] text-gold-bright transition-opacity hover:opacity-80"
          >
            ALPHA BRASIL
          </a>
          <div className="hidden min-w-0 flex-1 justify-center md:flex">
            <SiteNavDesktop />
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-4">
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-gold/90 transition-colors hover:border-gold/30 hover:bg-white/[0.06] hover:text-gold-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40"
              aria-label="Abrir carrinho"
            >
              <ShoppingBag className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </button>
            <SiteNavMobile />
          </div>
        </div>
      </header>

      <main id="main" className="relative flex-1 pb-24 md:pb-0 pt-8 sm:pt-10">
        <HeroSection
          selectedSize={selectedSize}
          onSizeChange={setSelectedSize}
          onBuyNow={() => openCart(1)}
        />
        <ProductDetails />
        <PromoBundle onBuyBundle={() => openCart(3)} />
        <PremiumGallery />
        <SocialProof />
        <GuaranteeSection />
        <SizeChart />
        <FaqSection />
        <FeedbackSection />
        <FinalCta onBuyNow={() => openCart(1)} />
      </main>

      <footer className="relative border-t border-white/[0.05] bg-gradient-to-b from-transparent to-[#04070d]/90 py-14 text-center">
        <p className="text-[12px] uppercase tracking-[0.28em] text-muted-foreground">
          © {new Date().getFullYear()} Alpha Brasil
        </p>
      </footer>

      <StickyBuyBar isVisible={isStickyVisible} onBuyNow={() => openCart(1)} />
      <SalesNotifications isVisible={isStickyVisible} />

      <LandingCartDialog
        open={cartOpen}
        onOpenChange={setCartOpen}
        quantity={cartQty}
        onQuantityChange={handleCartQtyChange}
        sizes={cartSizes}
        onSizesChange={handleCartSizesChange}
      />
    </>
  );
}