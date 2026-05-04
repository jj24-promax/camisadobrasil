"use client";

import type { ReactNode } from "react";
import { CheckoutTransitionProvider } from "@/components/navigation/checkout-transition-provider";
import { SessionContextProvider } from "@/components/auth/SessionContextProvider";
import { FloatingWhatsAppButton } from "@/components/landing/floating-whatsapp-button";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionContextProvider>
      <CheckoutTransitionProvider>
        {children}
        <FloatingWhatsAppButton />
      </CheckoutTransitionProvider>
    </SessionContextProvider>
  );
}