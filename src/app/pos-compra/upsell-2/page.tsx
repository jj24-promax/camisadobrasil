"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { PostPurchaseUpsellShell } from "@/components/pos-compra/post-purchase-upsell-shell";
import { POS_COMPRA } from "@/lib/pos-compra-routes";
import { UPSELL_BAG_CENTS } from "@/lib/pos-compra-upsell-pricing";

function UpsellBagContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const capAccepted = searchParams.get("cap") === "1";

  const nextRoute = (bagAccepted: boolean) => {
    const p = new URLSearchParams();
    if (capAccepted) p.set("cap", "1");
    if (bagAccepted) p.set("bag", "1");
    const s = p.toString();
    return s ? `${POS_COMPRA.upsell3}?${s}` : POS_COMPRA.upsell3;
  };

  const formattedPrice = new Intl.NumberFormat("pt-BR", { 
    style: "currency", 
    currency: "BRL" 
  }).format(UPSELL_BAG_CENTS / 100);

  return (
    <PostPurchaseUpsellShell
      stepLabel="Etapa 2 de 3 · Oferta especial"
      headline="Leve tudo com estilo: Shoulder Bag Exclusiva"
      subheadline="Praticidade e design único para acompanhar a sua camisa no dia a dia."
      priceDisplay={`+ ${formattedPrice}`}
      acceptLabel="Sim, adicionar a Shoulder Bag"
      declineLabel="Não, continuar pedido"
      onAccept={() => router.push(nextRoute(true))}
      onDecline={() => router.push(nextRoute(false))}
      visual={
        <div className="relative aspect-[4/4] md:aspect-[16/11] w-full overflow-hidden bg-[#020408]">
          <Image
            src="/images/upsells/shoulderbag.webp"
            alt="Shoulder Bag Oficial Alpha Brasil"
            fill
            className="z-0 object-cover object-center opacity-90"
            sizes="(max-width: 768px) 100vw, 480px"
            priority
          />
          <div className="absolute inset-0 z-[1] bg-gradient-to-t from-[#04070d] via-transparent to-transparent" />
        </div>
      }
    />
  );
}

export default function UpsellBagPage() {
  return (
    <Suspense>
      <UpsellBagContent />
    </Suspense>
  );
}