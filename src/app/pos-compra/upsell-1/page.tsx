"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { PostPurchaseUpsellShell } from "@/components/pos-compra/post-purchase-upsell-shell";
import { POS_COMPRA } from "@/lib/pos-compra-routes";
import { UPSELL_CAP_CENTS } from "@/lib/pos-compra-upsell-pricing";

export default function UpsellCapPage() {
  const router = useRouter();

  const formattedPrice = new Intl.NumberFormat("pt-BR", { 
    style: "currency", 
    currency: "BRL" 
  }).format(UPSELL_CAP_CENTS / 100);

  return (
    <PostPurchaseUpsellShell
      stepLabel="Etapa 1 de 3 · Oferta especial"
      headline="Complete o visual com o Boné Oficial"
      subheadline="Edição premium com o brasão e o Cristo Redentor texturizado."
      priceDisplay={`+ ${formattedPrice}`}
      acceptLabel="Sim, quero adicionar o boné"
      declineLabel="Não, continuar pedido"
      onAccept={() => {
        router.push(`${POS_COMPRA.upsell2}?cap=1`);
      }}
      onDecline={() => {
        router.push(POS_COMPRA.upsell2);
      }}
      visual={
        <div className="relative aspect-[4/4] md:aspect-[16/11] w-full overflow-hidden bg-[#020408]">
          <Image
            src="/images/upsells/cap.webp"
            alt="Boné Oficial Alpha Brasil"
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