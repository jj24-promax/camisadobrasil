"use client";

import type { ReactNode } from "react";
import { CheckoutTransitionProvider } from "@/components/navigation/checkout-transition-provider";
import { SessionContextProvider } from "@/components/auth/SessionContextProvider";
import { AntiCloneGuard } from "@/components/security/anti-clone-guard";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionContextProvider>
      <CheckoutTransitionProvider>
        <AntiCloneGuard />
        {children}
      </CheckoutTransitionProvider>
    </SessionContextProvider>
  );
}