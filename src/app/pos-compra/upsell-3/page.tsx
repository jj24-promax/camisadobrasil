"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { PostPurchaseUpsellShell } from "@/components/pos-compra/post-purchase-upsell-shell";
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
        <div className="relative aspect-[4/4] md:aspect-[16/11] w-full overflow-hidden bg-[#020408]">
          <Image
            src="/images/upsells/cup.webp"
            alt="Copo Térmico Edição Sagrada"
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

export default function UpsellCupPage() {
  return (
    <Suspense>
      <UpsellCupContent />
    </Suspense>
  );
}