"use client";

import { useRouter } from "next/navigation";
import { PostPurchaseUpsellShell } from "@/components/pos-compra/post-purchase-upsell-shell";
import { HoverZoomProductImage } from "@/components/ui/hover-zoom-product-image";
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
        <HoverZoomProductImage
          src="/images/upsells/cap.webp"
          alt="Boné Oficial Alpha Brasil"
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