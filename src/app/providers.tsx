"use client";

import type { ReactNode } from "react";
import { CheckoutTransitionProvider } from "@/components/navigation/checkout-transition-provider";
import { SessionContextProvider } from "@/components/auth/SessionContextProvider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionContextProvider>
      <CheckoutTransitionProvider>
        {children}
      </CheckoutTransitionProvider>
    </SessionContextProvider>
  );
}