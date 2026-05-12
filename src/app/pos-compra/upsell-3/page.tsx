"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PostPurchaseUpsellShell } from "@/components/pos-compra/post-purchase-upsell-shell";
import { HoverZoomProductImage } from "@/components/ui/hover-zoom-product-image";
import { posCompraObrigadoQuery, posCompraPixAddonsQuery } from "@/lib/pos-compra-routes";
import { UPSELL_CUP_CENTS } from "@/lib/pos-compra-upsell-pricing";

function UpsellCupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const capAccepted = searchParams.get("cap") === "1";
  const bagAccepted = searchParams.get("bag") === "1";

  const goProximoPasso = (cupAccepted: boolean) => {
    if (capAccepted || bagAccepted || cupAccepted) {
      router.push(posCompraPixAddonsQuery(capAccepted, bagAccepted, cupAccepted));
      return;
    }
    router.push(posCompraObrigadoQuery(false, false, false));
  };

  const formattedPrice = new Intl.NumberFormat("pt-BR", { 
    style: "currency", 
    currency: "BRL" 
  }).format(UPSELL_CUP_CENTS / 100);

  return (
    <PostPurchaseUpsellShell
      stepLabel="Etapa 3 de 3 · Última oferta"
      headline="Copo Térmico Edição Sagrada"
      subheadline="Mantenha a temperatura da sua bebida com a identidade oficial da coleção."
      priceDisplay={`+ ${formattedPrice}`}
      acceptLabel="Sim, quero o copo térmico"
      declineLabel="Não, finalizar meu pedido"
      onAccept={() => goProximoPasso(true)}
      onDecline={() => goProximoPasso(false)}
      visual={
        <HoverZoomProductImage
          src="/images/upsells/cup.webp"
          alt="Copo Térmico Edição Sagrada"
          className="aspect-[4/4] md:aspect-[16/11]"
          priority
          overlay={
            <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-[#04070d] via-transparent to-transparent" />
          }
        />
      }
    />
  );
}

export default function UpsellCupPage() {
  return (
    <Suspense>
      <UpsellCupContent />
    </Suspense>
  );
}