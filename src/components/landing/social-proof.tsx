import Image from "next/image";
import { SectionReveal, SectionShell } from "@/components/landing/section-shell";
import { reviewPortraitMan, reviewPortraitWoman } from "@/lib/review-portrait-urls";
import { cn } from "@/lib/utils";

/** Embaralha de forma estável (mesma ordem em cada build / hidratação). */
function shuffleDeterministic<T>(items: readonly T[], seed: number): T[] {
  const arr = [...items];
  let s = seed >>> 0;
  const next = () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

type ReviewPhotoEntry = {
  name: string;
  text: string;
  rating: 5;
  profileImageSrc: string;
  imageSrc: string;
  /** `table` = camisa/produto (ex. mesa); `person` = pessoa vestindo — intercalados no carrossel. */
  photoKind: "table" | "person";
  /** Cor predominante da camisa para misturar melhor a sequência visual. */
  jerseyColor?: "azul" | "amarela" | "vermelha" | "indefinida";
  /** Itens marcados aparecem antes no loop inicial sem quebrar mistura de cor. */
  featured?: boolean;
  /** Substitui o `object-position` padrão da foto principal (ex. `object-center`). */
  coverClassName?: string;
};

/** Fotos reais de clientes (UGC) — mesmo cartão que o restante do carrossel. */
const ugcReviewPhotos: ReviewPhotoEntry[] = [
  {
    name: "Ricardo H.",
    text: "Igual às fotos do site — no espelho ficou ainda melhor. O amarelo é super vivo e a camisa veste muito bem!",
    rating: 5,
    profileImageSrc: "/images/testimonials/profiles/ricardo-h.png",
    imageSrc: "/images/testimonials/ugc/feedback-1.webp",
    photoKind: "person",
    jerseyColor: "amarela",
  },
  {
    name: "Bruno T.",
    text: "Montei o kit completo: presença absurda e tecido leve. Nota máxima.",
    rating: 5,
    profileImageSrc: "/images/testimonials/profiles/bruno-t.jpg",
    imageSrc: "/images/testimonials/ugc/ugc-2.png",
    photoKind: "person",
    jerseyColor: "azul",
    /** Figura um pouco à direita no original — recorte para centrar no cartão. */
    coverClassName: "object-[44%_center]",
  },
  {
    name: "Letícia M.",
    text: "O Cristo no tecido é lindo ao vivo. Caimento e cores na medida certa!",
    rating: 5,
    profileImageSrc: "/images/testimonials/profiles/leticia-m.png",
    imageSrc: "/images/testimonials/ugc/ugc-3.png",
    photoKind: "person",
    jerseyColor: "azul",
    /** Selfie com muito teto em cima — baixa o ponto de ancoragem para mostrar mais rosto/camisa. */
    coverClassName: "object-[center_72%]",
  },
  {
    name: "Camila R.",
    text: "Compramos o kit pra nós dois e amamos! O caimento e a cor são perfeitos.",
    rating: 5,
    profileImageSrc: reviewPortraitWoman(12),
    imageSrc: "/images/testimonials/ugc/gemini-casal.webp",
    photoKind: "person",
    jerseyColor: "amarela",
    coverClassName: "object-[center_20%]",
  },
  {
    name: "Vinícius K.",
    text: "Foto real do pedido — bate com o anúncio. Material de primeira linha e detalhes incríveis.",
    rating: 5,
    profileImageSrc: "/images/testimonials/profiles/vinicius-k.png",
    imageSrc: "/images/testimonials/ugc/gemini-1.webp",
    photoKind: "person",
    /** Pessoa um pouco à esquerda no original — desloca o recorte para centrar no cartão 4:3. */
    coverClassName: "object-[center_24%]",
  },
  {
    name: "Matheus L.",
    text: "Comprei a edição canarinho e chegou super rápido. Qualidade impecável, recomendo!",
    rating: 5,
    profileImageSrc: "/images/testimonials/profiles/matheus-l.png",
    imageSrc: "/images/testimonials/ugc/gemini-2.webp",
    photoKind: "person",
    jerseyColor: "amarela",
  },
  {
    name: "Priscila T.",
    text: "Levei na feira no fim de semana — confortável, linda e diferente das camisas comuns.",
    rating: 5,
    profileImageSrc: reviewPortraitWoman(58),
    imageSrc: "/images/testimonials/ugc/ugc-7.png",
    photoKind: "person",
  },
  {
    name: "Murilo S.",
    text: "A versão canarinho ficou absurda ao vivo. Tecido leve e ótimo caimento pra jogar ou sair.",
    rating: 5,
    profileImageSrc: reviewPortraitMan(57),
    imageSrc: "/images/testimonials/ugc/gemini-gamer.webp",
    photoKind: "person",
    jerseyColor: "amarela",
    coverClassName: "object-[center_20%]",
  },
  {
    name: "Fernanda A.",
    text: "Vestiu super bem e a cor é linda. Já quero pedir mais uma.",
    rating: 5,
    profileImageSrc: "/images/testimonials/profiles/fernanda-a.png",
    imageSrc: "/images/testimonials/ugc/ugc-10.png",
    photoKind: "person",
    coverClassName: "object-[center_30%]",
  },
  {
    name: "Patrícia N.",
    text: "Peguei a Fênix e vestiu super bem no corpo. Cor linda ao vivo e tecido muito confortável.",
    rating: 5,
    profileImageSrc: reviewPortraitWoman(63),
    imageSrc: "/images/testimonials/ugc/vermelha-feedback-1.png",
    photoKind: "person",
    jerseyColor: "vermelha",
    featured: true,
    coverClassName: "object-[center_40%]",
  },
  {
    name: "Larissa V.",
    text: "Usei no fim de semana e todo mundo perguntou onde comprei. Acabamento impecável!",
    rating: 5,
    profileImageSrc: "/images/testimonials/profiles/larissa-v.png",
    imageSrc: "/images/testimonials/ugc/vermelha-feedback-2.png",
    photoKind: "person",
    jerseyColor: "vermelha",
    featured: true,
    coverClassName: "object-[center_36%]",
  },
  {
    name: "Gabriela S.",
    text: "A edição vermelha ficou simplesmente perfeita. Chegou rápido e a qualidade surpreendeu.",
    rating: 5,
    profileImageSrc: "/images/testimonials/profiles/gabriela-s.png",
    imageSrc: "/images/testimonials/ugc/vermelha-feedback-3.png",
    photoKind: "person",
    jerseyColor: "vermelha",
    featured: true,
    coverClassName: "object-[center_34%]",
  },
];

const stockReviewPhotos: ReviewPhotoEntry[] = [
  {
    name: "Rafael M.",
    text: "Acabamento impecável. Parece peça de coleção.",
    rating: 5,
    profileImageSrc: reviewPortraitMan(11),
    imageSrc: "/images/testimonials/1.png",
    photoKind: "table",
  },
  {
    name: "Juliana C.",
    text: "O caimento valoriza demais. Cor vibrante na medida.",
    rating: 5,
    profileImageSrc: reviewPortraitWoman(14),
    imageSrc: "/images/testimonials/2.png",
    photoKind: "table",
  },
  {
    name: "Diego A.",
    text: "Leve, confortável e com presença. Virou minha favorita.",
    rating: 5,
    profileImageSrc: reviewPortraitMan(18),
    imageSrc: "/images/testimonials/3.png",
    photoKind: "table",
  },
  {
    name: "Beatriz L.",
    text: "Qualidade surpreendente pelo preço. Recomendo!",
    rating: 5,
    profileImageSrc: reviewPortraitWoman(22),
    imageSrc: "/images/testimonials/4.png",
    photoKind: "table",
  },
  {
    name: "Lucas S.",
    text: "Design moderno, foge do óbvio. Chegou rápido.",
    rating: 5,
    profileImageSrc: reviewPortraitMan(25),
    imageSrc: "/images/testimonials/5.png",
    photoKind: "table",
  },
  {
    name: "Fernanda O.",
    text: "A estampa é muito mais bonita ao vivo. Amei!",
    rating: 5,
    profileImageSrc: reviewPortraitWoman(28),
    imageSrc: "/images/testimonials/6.png",
    photoKind: "table",
  },
  {
    name: "Carlos E.",
    text: "Material de primeira, não esquenta. Ótima compra.",
    rating: 5,
    profileImageSrc: reviewPortraitMan(31),
    imageSrc: "/images/testimonials/7.png",
    photoKind: "table",
  },
  {
    name: "Isabela P.",
    text: "Veste super bem, modelagem perfeita. Comprarei de novo.",
    rating: 5,
    profileImageSrc: reviewPortraitWoman(35),
    imageSrc: "/images/testimonials/8.png",
    photoKind: "table",
  },
  {
    name: "Gustavo F.",
    text: "Chegou antes do prazo e a qualidade é surreal. Top!",
    rating: 5,
    profileImageSrc: reviewPortraitMan(38),
    imageSrc: "/images/testimonials/9.png",
    photoKind: "table",
  },
  {
    name: "Ana B.",
    text: "A camisa é linda, o tecido é muito bom. Comprarei mais vezes.",
    rating: 5,
    profileImageSrc: reviewPortraitWoman(42),
    imageSrc: "/images/testimonials/10.png",
    photoKind: "table",
  },
  {
    name: "Thiago R.",
    text: "Impressionado com os detalhes. Vale cada centavo.",
    rating: 5,
    profileImageSrc: reviewPortraitMan(45),
    imageSrc: "/images/testimonials/11.png",
    photoKind: "table",
  },
  {
    name: "Catarina V.",
    text: "Perfeita para usar nos jogos e no dia a dia. Estilosa demais.",
    rating: 5,
    profileImageSrc: reviewPortraitWoman(49),
    imageSrc: "/images/testimonials/12.png",
    photoKind: "table",
  },
];

/**
 * Ordena para alternar foto de produto (mesa) e foto com pessoa, evitando dois “corpo” seguidos no marquee.
 * Quando um dos lados acaba, entram só cartões do outro tipo (inevitável).
 */
function interleaveTableAndPerson(
  tables: ReviewPhotoEntry[],
  persons: ReviewPhotoEntry[]
): ReviewPhotoEntry[] {
  const t = [...tables];
  const p = [...persons];
  const out: ReviewPhotoEntry[] = [];
  let last: "table" | "person" | null = null;

  const take = (kind: "table" | "person") => {
    const pool = kind === "table" ? t : p;
    if (!pool.length) return false;
    out.push(pool.shift()!);
    last = kind;
    return true;
  };

  while (t.length > 0 || p.length > 0) {
    if (last === "table") {
      if (!take("person")) take("table");
    } else if (last === "person") {
      if (!take("table")) take("person");
    } else if (!take("table")) {
      take("person");
    }
  }

  return out;
}

function dedupeByImageSrc(entries: readonly ReviewPhotoEntry[]): ReviewPhotoEntry[] {
  const seen = new Set<string>();
  const out: ReviewPhotoEntry[] = [];
  for (const e of entries) {
    if (seen.has(e.imageSrc)) continue;
    seen.add(e.imageSrc);
    out.push(e);
  }
  return out;
}

function spreadPersonsByColor(entries: readonly ReviewPhotoEntry[]): ReviewPhotoEntry[] {
  const pool = [...entries].sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)));
  const out: ReviewPhotoEntry[] = [];
  let lastColor: ReviewPhotoEntry["jerseyColor"] = undefined;

  while (pool.length > 0) {
    let idx = pool.findIndex((e) => e.featured && e.jerseyColor && e.jerseyColor !== lastColor);
    if (idx < 0) idx = pool.findIndex((e) => e.jerseyColor && e.jerseyColor !== lastColor);
    if (idx < 0) idx = 0;
    const [picked] = pool.splice(idx, 1);
    out.push(picked);
    lastColor = picked.jerseyColor;
  }

  return out;
}

/** Sem `imageSrc` repetido; mesa ↔ pessoa intercalados (variação dentro de cada grupo com seed fixo). */
const reviews = (() => {
  const all = dedupeByImageSrc([...stockReviewPhotos, ...ugcReviewPhotos]);
  const tables = shuffleDeterministic(
    all.filter((e) => e.photoKind === "table"),
    0x5441424c /* "TABL" */
  );
  const persons = shuffleDeterministic(
    all.filter((e) => e.photoKind === "person"),
    0x50455253 /* "PERS" */
  );
  return interleaveTableAndPerson(tables, spreadPersonsByColor(persons));
})();

type ReviewEntry = (typeof reviews)[number];

function StarsText({ n }: { n: number }) {
  return (
    <div
      aria-label={`${n} de 5 estrelas`}
      className="text-[11px] uppercase tracking-[0.28em] text-gold"
    >
      {"★★★★★".slice(0, n)}
    </div>
  );
}

/** Divide em duas listas maiores para evitar repetição “colada” na tela. */
const SPLIT_INDEX = Math.ceil(reviews.length / 2);
const firstRow = reviews.slice(0, SPLIT_INDEX);
const secondRow = reviews.slice(SPLIT_INDEX);

function ReviewMarquee({
  reviews,
  reverse = false,
}: {
  reviews: ReviewEntry[];
  reverse?: boolean;
}) {
  const displayReviews = reverse ? [...reviews].reverse() : reviews;
  return (
    <div
      className="relative w-full overflow-hidden"
      style={{
        maskImage: "linear-gradient(to right, transparent, black 6%, black 94%, transparent)",
        WebkitMaskImage:
          "linear-gradient(to right, transparent, black 6%, black 94%, transparent)",
      }}
    >
      <div
        className={cn(
          "flex min-w-max gap-6 md:gap-8",
          reverse ? "animate-scroll-x-reverse" : "animate-scroll-x"
        )}
      >
        {[...displayReviews, ...displayReviews].map((r, i) => (
          <figure
            key={`${r.name}-${r.imageSrc}-${i}`}
            className="glass-dark w-[300px] shrink-0 overflow-hidden rounded-2xl transition-all duration-300 hover:!border-white/[0.12] hover:!shadow-luxe-hover md:w-[340px]"
          >
            <div className="relative aspect-[4/3] w-full">
              <Image
                src={r.imageSrc}
                alt={`Foto do produto enviada por ${r.name}`}
                fill
                className={cn(
                  "object-cover",
                  r.coverClassName ??
                    (r.photoKind === "person" ? "object-[center_22%]" : undefined)
                )}
                sizes="(max-width: 768px) 80vw, 340px"
                loading="lazy"
              />
            </div>
            <div className="p-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-white/[0.04]">
                  {/* Avatar simples: reduz markup e srcset de itens repetidos */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={r.profileImageSrc}
                    alt={`Foto de perfil de ${r.name}`}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <div>
                  <p className="font-display text-sm font-semibold tracking-tight">{r.name}</p>
                  <div className="mt-1">
                    <StarsText n={r.rating} />
                  </div>
                </div>
              </div>
              <blockquote className="relative z-10 mt-4 text-[15px] leading-relaxed text-foreground/95">
                {r.text}
              </blockquote>
            </div>
          </figure>
        ))}
      </div>
    </div>
  );
}

export function SocialProof() {
  return (
    <SectionShell aria-labelledby="reviews-heading" variant="default" grain="low">
      <SectionReveal className="max-w-3xl">
        <p className="font-display text-[10px] font-semibold uppercase tracking-[0.4em] text-gold/75">
          Confiança
        </p>
        <h2
          id="reviews-heading"
          className="mt-4 font-display text-[clamp(2rem,4vw,3.25rem)] font-bold leading-[1.06] tracking-tight"
        >
          Quem vestiu,{" "}
          <span className="bg-gradient-to-r from-gold-bright to-gold-muted bg-clip-text text-transparent">
            aprovou
          </span>
        </h2>
        <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
          Depoimentos de quem busca estética, caimento e presença acima da média.
        </p>
      </SectionReveal>

      <div className="mt-16 flex flex-col gap-6 md:gap-8">
        <ReviewMarquee reviews={firstRow} />
        <ReviewMarquee reviews={secondRow} reverse />
      </div>
    </SectionShell>
  );
}