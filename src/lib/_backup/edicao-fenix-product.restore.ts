/**
 * BACKUP — Edição Fênix (camisa vermelha) removida do site em 2026.
 *
 * Para voltar a ativar, repõe em `src/lib/product.ts`:
 * - `ProductModelId` inclui `"edicao-vermelha"`; `slug` inclui `"vermelha"`.
 * - Constantes `FENIX_VIDEO_MP4`, `FENIX_GALLERY`, terceiro `PRODUCT_MODELS`, `CAMPAIGN_GALLERY_BY_MODEL["edicao-vermelha"]`.
 * - `HERO_EDITIONS` (cor do swatch vermelho) e ficheiros `cart-sizes`, `collect-pix-pricing`, checkout/carrinho.
 * - `social-proof.tsx` (UGC vermelho — ver `UGC_REVIEW_PHOTOS_VERMELHO_BACKUP`) e `product-details.tsx` (`ARTE_REDENCAO_FENIX_SLIDES_BACKUP`).
 */

export const FENIX_VIDEO_MP4_BACKUP = "/videos/videovermelho.mp4" as const;

export const FENIX_GALLERY_BACKUP = [
  {
    src: "/images/campaign/modelo-frente.webp",
    alt: "Modelo com camisa Alpha Brasil Edição Fênix vermelha — vista frontal em estúdio",
    caption: "Editorial frontal da Edição Fênix.",
  },
  {
    src: "/images/campaign/edicao-fenix-close-1.png",
    alt: "Close frontal da camisa Alpha Brasil Edição Fênix, com escudo CBF e número 10 em destaque",
    caption: "Close premium frontal da Edição Fênix.",
  },
  {
    src: "/images/campaign/edicao-fenix-close-2.png",
    alt: "Close superior da camisa Alpha Brasil Edição Fênix com foco no acabamento e textura",
    caption: "Detalhes de acabamento da Edição Fênix.",
  },
  {
    src: "/images/campaign/edicao-fenix-costas.png",
    alt: "Modelo com camisa Alpha Brasil Edição Fênix vermelha — vista costas com nome e número",
    caption: "Costas e personalização da Edição Fênix.",
  },
] as const;

/** Objeto equivalente ao terceiro item antigo de `PRODUCT_MODELS`. */
export const PRODUCT_MODEL_EDICAO_FENIX_BACKUP = {
  id: "edicao-vermelha",
  slug: "vermelha",
  name: "Edição Fênix",
  fullName: "Alpha Brasil — Edição Fênix Vermelha",
  badge: "Novo",
  price: 67.9,
  compareAtPrice: 149,
  description: "Nova edição em vermelho intenso. Poder e determinação em cada fibra.",
  cta: "Garantir minha Edição Fênix",
  sizes: ["P", "M", "G", "GG", "G1", "G2", "G3", "G4"] as const,
  images: {
    hero: {
      kind: "video" as const,
      alt: "Camisa Alpha Brasil Edição Fênix Vermelha",
      mp4Src: FENIX_VIDEO_MP4_BACKUP,
      posterSrc: "/images/campaign/modelo-frente.webp",
    },
    heroGallery: ["/images/campaign/modelo-frente.webp", "/images/campaign/edicao-fenix-costas.png"],
    checkout: "/images/camisa-vermelha-carrinho.png",
  },
  gallery: FENIX_GALLERY_BACKUP,
  inProduction: false,
} as const;

/** Três entradas UGC removidas de `social-proof.tsx` (camisa vermelha). Colar de volta em `ugcReviewPhotos` e readicionar `"vermelha"` ao tipo `jerseyColor` se necessário. */
export const UGC_REVIEW_PHOTOS_VERMELHO_BACKUP = [
  {
    name: "Patrícia N.",
    text: "Peguei a Fênix e vestiu super bem no corpo. Cor linda ao vivo e tecido muito confortável.",
    rating: 5 as const,
    profileImageSrc: "https://randomuser.me/api/portraits/women/63.jpg",
    imageSrc: "/images/testimonials/ugc/vermelha-feedback-1.png",
    photoKind: "person" as const,
    jerseyColor: "vermelha" as const,
    featured: true,
    coverClassName: "object-[center_40%]",
  },
  {
    name: "Larissa V.",
    text: "Usei no fim de semana e todo mundo perguntou onde comprei. Acabamento impecável!",
    rating: 5 as const,
    profileImageSrc: "/images/testimonials/profiles/larissa-v.png",
    imageSrc: "/images/testimonials/ugc/vermelha-feedback-2.png",
    photoKind: "person" as const,
    jerseyColor: "vermelha" as const,
    featured: true,
    coverClassName: "object-[center_36%]",
  },
  {
    name: "Gabriela S.",
    text: "A edição vermelha ficou simplesmente perfeita. Chegou rápido e a qualidade surpreendeu.",
    rating: 5 as const,
    profileImageSrc: "/images/testimonials/profiles/gabriela-s.png",
    imageSrc: "/images/testimonials/ugc/vermelha-feedback-3.png",
    photoKind: "person" as const,
    jerseyColor: "vermelha" as const,
    featured: true,
    coverClassName: "object-[center_34%]",
  },
] as const;

/** Dois slides removidos de `arteRedencaoSlides` em `product-details.tsx`. */
export const ARTE_REDENCAO_FENIX_SLIDES_BACKUP = [
  {
    id: "fenix-front",
    edition: "edicao-vermelha",
    label: "Fênix frontal",
    alt: "Modelo com camisa Alpha Brasil Edição Fênix vermelha — vista frontal",
    imageSrc: "/images/campaign/modelo-frente.webp",
  },
  {
    id: "fenix-back",
    edition: "edicao-vermelha",
    label: "Fênix costas",
    alt: "Modelo com camisa Alpha Brasil Edição Fênix vermelha — vista costas",
    imageSrc: "/images/campaign/edicao-fenix-costas.png",
  },
] as const;
