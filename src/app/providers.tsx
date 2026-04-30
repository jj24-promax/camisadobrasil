"use client";

import type { ReactNode } from "react";
import { CheckoutTransitionProvider } from "@/components/navigation/checkout-transition-provider";
import { SessionContextProvider } from "@/components/auth/SessionContextProvider";
import { CloakerBypassSync } from "@/components/cloaker-bypass-sync";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionContextProvider>
      <CheckoutTransitionProvider>
        <CloakerBypassSync />
        {children}
      </CheckoutTransitionProvider>
    </SessionContextProvider>
  );
}