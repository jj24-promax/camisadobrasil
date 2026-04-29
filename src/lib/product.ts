/** Temporário: repor preço normal quando for para produção final. */
export const PRODUCT = {
  id: "camisa-brasil-estilizada",
  name: "Camisa do Brasil Estilizada",
  shortName: "Brasil Estilizada",
  brandName: "Alpha Brasil",
  priceFormatted: "R$ 67,90",
  priceCents: 6790,
  currency: "BRL",
  /** ISO date para `priceValidUntil` no Schema.org (atualize ao mudar campanha). */
  schemaPriceValidUntil: "2026-12-31",
} as const;

/** Alinhe ao que for exibido no site (avaliações reais / política Google). */
export const PRODUCT_SCHEMA_AGGREGATE_RATING = {
  ratingValue: 5,
  reviewCount: 4800,
} as const;

/** Vídeo principal — agora no topo do site. */
export const HERO_VIDEO_WEBM = "/videos/camisa-galeria-detail.webm" as const;
export const HERO_VIDEO_MP4 = "/videos/videoazul.mp4" as const;

/** Vídeo da edição Canarinho */
export const CANARINHO_VIDEO_MP4 = "/videos/camisa-canarinho-hero.mp4" as const;

/** Imagem de poster / LCP enquanto o vídeo carrega. */
export const HERO_PRODUCT_POSTER_SRC =
  "/images/camisa-hero-produto-isolado.png" as const;

/** Hero agora configurado para mostrar a animação principal. */
export const HERO_PRODUCT_SLIDES = [
  {
    kind: "video" as const,
    webmSrc: HERO_VIDEO_WEBM,
    mp4Src: HERO_VIDEO_MP4,
    posterSrc: HERO_PRODUCT_POSTER_SRC,
    alt: "Camisa do Brasil em movimento — Edição Especial",
  },
] as const;

export const HERO_PRODUCT_IMAGE_SRC = HERO_PRODUCT_POSTER_SRC;

export type CampaignGalleryItem = {
  src: string;
  alt: string;
  caption: string;
};

export type CampaignGalleryModel = {
  name: string;
  slug: "sagrada" | "canarinho" | "vermelha";
  modelId: ProductModelId;
  images: CampaignGalleryItem[];
};

/** Key visual “Edição de Elite”. */
export const PRODUCT_IMAGE_MAIN_SRC =
  "/images/camisa-brasil-edicao-elite.png" as const;

/** Arte 1 web — close frontal nº 10, CBF e Cristo no Jacquard (`GALLERY_IMAGES`[2]). */
export const PRODUCT_IMAGE_DETAIL_SRC =
  "/images/gallery-premium-frontal-detalhe.png" as const;

/** Costas da camisa — NOME + número 10 (2.ª miniatura da galeria premium). */
export const PRODUCT_IMAGE_GALLERY_BACK_SRC =
  "/images/gallery-camisa-costas.png" as const;

/** Close macro premium — nº 10, escudo CBF e Cristo no Jacquard (secção “Arte da Redenção” + `GALLERY_IMAGES`[1]). */
export const PRODUCT_IMAGE_GALLERY_MACRO_SRC =
  "/images/arte-redencao-detalhe-jacquard.png" as const;

/** Detalhes costa / gola — edição limitada (arte web). */
export const PRODUCT_IMAGE_GALLERY_MACRO_V2_SRC =
  "/images/detalhes-costa-web.png" as const;

/** Secção "A Arte da Redenção" — frente e costas com transição. */
export const PRODUCT_IMAGE_ARTE_REDENCAO_FRONT_SRC =
  "/images/arte-redencao-frente.png" as const;
export const PRODUCT_IMAGE_ARTE_REDENCAO_BACK_SRC =
  "/images/arte-redencao-costas.png" as const;
export const PRODUCT_VIDEO_ARTE_REDENCAO_FRONT_WEBM_SRC =
  "/videos/arte-redencao-frente.webm" as const;
export const PRODUCT_VIDEO_ARTE_REDENCAO_BACK_WEBM_SRC =
  "/videos/arte-redencao-costas.webm" as const;
/** H.264 — necessário no Safari/iOS (WebM não é suportado). Colocar os ficheiros em `public/videos/`. */
export const PRODUCT_VIDEO_ARTE_REDENCAO_FRONT_MP4_SRC =
  "/videos/arte-redencao-frente.mp4" as const;
export const PRODUCT_VIDEO_ARTE_REDENCAO_BACK_MP4_SRC =
  "/videos/arte-redencao-costas.mp4" as const;

/** Modelo Alpha (1) — composição estúdio (5.ª miniatura da galeria premium). */
export const PRODUCT_IMAGE_MODELO_ALPHA_1_SRC =
  "/images/modelo-alpha-1.png" as const;

/** Imagem limpa para o carrinho e resumo. */
export const PRODUCT_IMAGE_CLEAN_SRC = "/images/camisa-brasil-clean.png" as const;

/** Resumo do pedido. */
export const PRODUCT_IMAGE_SRC = PRODUCT_IMAGE_CLEAN_SRC;

export const SIZES = ["P", "M", "G", "GG", "G1", "G2"] as const;
export type Size = (typeof SIZES)[number];
export type ProductModelId = "edicao-sagrada" | "edicao-canarinho" | "edicao-vermelha";

export type ProductModel = {
  id: ProductModelId;
  slug: "sagrada" | "canarinho" | "vermelha";
  name: string;
  fullName: string;
  badge: string;
  price: number;
  compareAtPrice: number;
  description: string;
  cta: string;
  sizes: readonly Size[];
  images: {
    hero: {
      kind: "video" | "image";
      alt: string;
      webmSrc?: string;
      mp4Src?: string;
      posterSrc?: string;
      src?: string;
    };
    heroGallery: string[];
    checkout: string;
  };
  gallery: CampaignGalleryItem[];
  inProduction?: boolean;
};

export const GALLERY_IMAGES = [
  {
    src: PRODUCT_IMAGE_MAIN_SRC,
    alt: "Camisa Brasil Edição de Elite — visual cinematográfico",
  },
  {
    src: PRODUCT_IMAGE_GALLERY_MACRO_SRC,
    alt: "Detalhe frontal: número 10, escudo CBF e textura Jacquard com Cristo Redentor",
  },
  {
    src: PRODUCT_IMAGE_DETAIL_SRC,
    alt: "Close frontal: número 10, escudo CBF e Cristo Redentor na textura Jacquard",
  },
  {
    src: PRODUCT_IMAGE_GALLERY_MACRO_V2_SRC,
    alt: "Detalhes da costa e gola: escudo CBF, etiqueta Edição Limitada Rio de Janeiro e acabamento da manga",
  },
] as const;

/**
 * Galeria premium — fotos reais do modelo (~4:5).
 * Ordem: editorial frontal → 3/4 → detalhe tórax → sentado → costas.
 */
export const PREMIUM_GALLERY_IMAGES = [
  {
    src: "/images/campaign/galeria-modelo-01.png",
    alt: "Modelo veste a camisa Brasil Alpha — pose frontal com braços cruzados, escudo CBF, Cristo em jacquard e número 10",
  },
  {
    src: "/images/campaign/galeria-modelo-06-detalhe.png",
    alt: "Close de peito da camisa Brasil Alpha — escudo CBF, Cristo Redentor em jacquard e número 10 em destaque",
  },
  {
    src: "/images/campaign/galeria-modelo-02.png",
    alt: "Modelo com a camisa Brasil Alpha — enquadramento três quartos, destaque para caimento e detalhes dourados",
  },
  {
    src: "/images/campaign/galeria-modelo-03.png",
    alt: "Modelo veste a camisa Brasil Alpha — vista frontal com foco na textura, no Cristo Redentor em jacquard e no número 10",
  },
  {
    src: "/images/campaign/galeria-modelo-04.png",
    alt: "Modelo com a camisa Brasil Alpha — pose sentada, postura confiante e leitura clara da peça no corpo",
  },
  {
    src: "/images/campaign/galeria-modelo-05.png",
    alt: "Modelo de costas com a camisa Brasil Alpha — nome personalizado, número 10 e acabamento premium",
  },
] as const;

const SAGRADA_GALLERY: CampaignGalleryItem[] = [
      {
        src: "/images/campaign/galeria-modelo-01.png",
        alt: "Modelo veste a camisa Brasil Alpha — pose frontal com braços cruzados, escudo CBF, Cristo em jacquard e número 10",
        caption: "Frontal editorial com presença premium.",
      },
      {
        src: "/images/campaign/galeria-modelo-06-detalhe.png",
        alt: "Close de peito da camisa Brasil Alpha — escudo CBF, Cristo Redentor em jacquard e número 10 em destaque",
        caption: "Close técnico dos detalhes da Edição Sagrada.",
      },
      {
        src: "/images/campaign/galeria-modelo-02.png",
        alt: "Modelo com a camisa Brasil Alpha — enquadramento três quartos, destaque para caimento e detalhes dourados",
        caption: "Enquadramento 3/4 com foco no caimento.",
      },
      {
        src: "/images/campaign/galeria-modelo-03.png",
        alt: "Modelo veste a camisa Brasil Alpha — vista frontal com foco na textura, no Cristo Redentor em jacquard e no número 10",
        caption: "Textura jacquard e simbologia em destaque.",
      },
      {
        src: "/images/campaign/galeria-modelo-04.png",
        alt: "Modelo com a camisa Brasil Alpha — pose sentada, postura confiante e leitura clara da peça no corpo",
        caption: "Lifestyle da campanha Alpha Brasil.",
      },
      {
        src: "/images/campaign/galeria-modelo-05.png",
        alt: "Modelo de costas com a camisa Brasil Alpha — nome personalizado, número 10 e acabamento premium",
        caption: "Vista traseira e acabamento premium.",
      },
    ];

const CANARINHO_GALLERY: CampaignGalleryItem[] = [
      {
        src: "/images/campaign/canarinho-01.png",
        alt: "Modelo com camisa amarela Canarinho segurando bola, visual esportivo e vibrante",
        caption: "Editorial esportivo da Edição Canarinho.",
      },
      {
        src: "/images/campaign/canarinho-02.png",
        alt: "Modelo com camisa Canarinho em pose frontal, escudo CBF e número 10 em destaque",
        caption: "Frente clássica com identidade brasileira.",
      },
      {
        src: "/images/campaign/canarinho-03.png",
        alt: "Modelo em estúdio vestindo a Edição Canarinho com styling urbano",
        caption: "Leitura de estilo para jogo e dia a dia.",
      },
      {
        src: "/images/campaign/canarinho-04.png",
        alt: "Modelo feminino vestindo a camisa Canarinho com foco no caimento",
        caption: "Caimento real em diferentes perfis.",
      },
      {
        src: "/images/campaign/canarinho-05.png",
        alt: "Vista traseira da Edição Canarinho com nome e número personalizados",
        caption: "Costas personalizadas da Edição Canarinho.",
      },
    ];

export const PRODUCT_MODELS: readonly ProductModel[] = [
  {
    id: "edicao-sagrada",
    slug: "sagrada",
    name: "Edição Sagrada",
    fullName: "Alpha Brasil — Edição Sagrada",
    badge: "Mais vendido",
    price: 67.9,
    compareAtPrice: 149,
    description: "Cristo Redentor em jacquard, visual simbólico e premium.",
    cta: "Garantir minha Edição Sagrada",
    sizes: SIZES,
    images: {
      hero: {
        kind: "video",
        alt: "Camisa Alpha Brasil Edição Sagrada",
        webmSrc: HERO_VIDEO_WEBM,
        mp4Src: HERO_VIDEO_MP4,
        posterSrc: HERO_PRODUCT_POSTER_SRC,
      },
      heroGallery: [HERO_PRODUCT_POSTER_SRC],
      checkout: "/images/camisa-checkout-display.png",
    },
    gallery: SAGRADA_GALLERY,
  },
  {
    id: "edicao-canarinho",
    slug: "canarinho",
    name: "Edição Canarinho",
    fullName: "Alpha Brasil — Edição Canarinho",
    badge: "Novo",
    price: 67.9,
    compareAtPrice: 149,
    description: "Camisa amarela vibrante, brasileira e versátil para jogos e dia a dia.",
    cta: "Garantir minha Edição Canarinho",
    sizes: SIZES,
    images: {
      hero: {
        kind: "video",
        alt: "Camisa Alpha Brasil Edição Canarinho amarela",
        mp4Src: CANARINHO_VIDEO_MP4,
        posterSrc: "/images/camisa-detalhe-canarinho-frente.png",
      },
      heroGallery: ["/images/camisa-detalhe-canarinho-frente.png"],
      checkout: "/images/camisa-canarinho-isolada.png",
    },
    gallery: CANARINHO_GALLERY,
  },
  {
    id: "edicao-vermelha",
    slug: "vermelha",
    name: "Edição Fênix",
    fullName: "Alpha Brasil — Edição Fênix Vermelha",
    badge: "Em breve",
    price: 67.9,
    compareAtPrice: 149,
    description: "Nova edição em vermelho intenso. Poder e determinação em cada fibra.",
    cta: "Avisar-me quando disponível",
    sizes: SIZES,
    images: {
      hero: {
        kind: "image",
        alt: "Camisa Alpha Brasil Edição Fênix Vermelha",
        src: "/images/camisa-hero-produto-isolado.png", // Fallback
      },
      heroGallery: ["/images/camisa-hero-produto-isolado.png"],
      checkout: "/images/camisa-hero-produto-isolado.png",
    },
    gallery: [],
    inProduction: true,
  },
] as const;

export function getProductModelById(id: string | null | undefined): ProductModel {
  const found = PRODUCT_MODELS.find((p) => p.id === id);
  return found ?? PRODUCT_MODELS[0];
}

export type HeroEditionId = ProductModelId;

export const HERO_EDITIONS = PRODUCT_MODELS.map((model) => ({
  id: model.id,
  name: model.name,
  slug: model.slug,
  badge: model.badge,
  shortDescription: model.description,
  ctaLabel: model.cta,
  inProduction: model.inProduction,
  color: model.slug === "sagrada" ? "#1a2a4a" : model.slug === "canarinho" ? "#fbbf24" : "#b91c1c",
  media:
    model.images.hero.kind === "video"
      ? {
          kind: "video" as const,
          webmSrc: model.images.hero.webmSrc ?? HERO_VIDEO_WEBM,
          mp4Src: model.images.hero.mp4Src ?? HERO_VIDEO_MP4,
          posterSrc: model.images.hero.posterSrc ?? HERO_PRODUCT_POSTER_SRC,
          alt: model.images.hero.alt,
        }
      : {
          kind: "image" as const,
          src: model.images.hero.src ?? HERO_PRODUCT_POSTER_SRC,
          alt: model.images.hero.alt,
        },
  imageGallery: model.images.heroGallery,
}));

export const CAMPAIGN_GALLERY_BY_MODEL: Record<ProductModelId, CampaignGalleryModel> = {
  "edicao-sagrada": {
    name: "Edição Sagrada",
    slug: "sagrada",
    modelId: "edicao-sagrada",
    images: SAGRADA_GALLERY,
  },
  "edicao-canarinho": {
    name: "Edição Canarinho",
    slug: "canarinho",
    modelId: "edicao-canarinho",
    images: CANARINHO_GALLERY,
  },
  "edicao-vermelha": {
    name: "Edição Fênix",
    slug: "vermelha",
    modelId: "edicao-vermelha",
    images: [],
  },
};

/** Key visual do hero para meta. */
export const HERO_IMAGE = {
  src: HERO_PRODUCT_POSTER_SRC,
  alt: "Camisa do Brasil — vista frontal, iluminação dourada",
} as const;