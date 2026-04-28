"use client";

import { useEffect, useRef, useState } from "react";
import { supabaseEdgeInvokeHeaders } from "@/lib/supabase/edge-invoke-headers";

const POLL_MS = 2000;

export type PixPaymentConfirmation = {
  confirmed: boolean;
  trackingAvailable: boolean;
};

export function usePixPaymentConfirmation(transactionId: string | undefined): PixPaymentConfirmation {
  const [confirmed, setConfirmed] = useState(false);
  const [trackingAvailable, setTrackingAvailable] = useState(true);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!transactionId?.trim()) {
      setConfirmed(false);
      setTrackingAvailable(true);
      return;
    }

    setConfirmed(false);
    setTrackingAvailable(true);

    let cancelled = false;

    const clearPoll = () => {
      if (intervalRef.current != null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    const poll = async () => {
      try {
        // Chamada direta à Edge Function do Supabase
        const res = await fetch(
          `https://ulrigywayovxuyiktnlr.supabase.co/functions/v1/pix-status?transactionId=${encodeURIComponent(transactionId.trim())}`,
          { cache: "no-store", headers: supabaseEdgeInvokeHeaders(false) }
        );
        const j = (await res.json()) as { paid?: boolean; trackingAvailable?: boolean };
        if (cancelled) return;
        if (j.trackingAvailable === false) {
          setTrackingAvailable(false);
        }
        if (j.paid === true) {
          setConfirmed(true);
          clearPoll();
        }
      } catch {
        if (!cancelled) setTrackingAvailable(false);
      }
    };

    void poll();
    intervalRef.current = window.setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearPoll();
    };
  }, [transactionId]);

  return { confirmed, trackingAvailable };
}