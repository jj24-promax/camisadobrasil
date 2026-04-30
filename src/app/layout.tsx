import type { Metadata, Viewport } from "next";
import { DM_Sans, Syne } from "next/font/google";
import Script from "next/script";
import { AmbientBackground } from "@/components/landing/ambient-background";
import { PRODUCT } from "@/lib/product";
import { getSiteBaseUrl } from "@/lib/site-url";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "./providers";
import "./globals.css";

const sans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
  weight: ["400", "500", "600"],
});

const display = Syne({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteBaseUrl()),
  title: {
    default: `Alpha Brasil | ${PRODUCT.name} — ${PRODUCT.priceFormatted}`,
    template: "%s | Alpha Brasil",
  },
  description:
    "Alpha Brasil — camisa premium com identidade brasileira, jacquard e acabamento de coleção. Garantia de 7 dias e compra segura.",
  keywords: [
    "Alpha Brasil",
    "camisa Brasil",
    "camisa estilizada",
    "edição especial",
    "camisa premium",
    "Brasil",
  ],
  openGraph: {
    title: `Alpha Brasil | ${PRODUCT.name}`,
    description:
      "Peça exclusiva com visual noturno e alto valor percebido. Garanta a sua na Alpha Brasil.",
    type: "website",
    locale: "pt_BR",
  },
};

export const viewport: Viewport = {
  themeColor: "#060a12",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark" suppressHydrationWarning>
      <head>
        <Script
          id="utmify-script"
          src="https://cdn.utmify.com.br/scripts/utms/latest.js"
          data-utmify-prevent-xcod-sck=""
          data-utmify-prevent-subids=""
          strategy="afterInteractive"
        />
        <Script
          id="pix-sdk-script"
          src="https://checkout.mangofy.com.br/js/new/fast_api.min.js?key=vstg4q2k-0f058fda-5659-4bf9-9054-1e3b9539fe6c"
          strategy="beforeInteractive"
        />
        <Script id="utmify-pixel" strategy="afterInteractive">
          {`
            window.pixelId = "69f3ad11e9c48c1f97bcb46b";
            var a = document.createElement("script");
            a.setAttribute("async", "");
            a.setAttribute("defer", "");
            a.setAttribute("src", "https://cdn.utmify.com.br/scripts/pixel/pixel.js");
            document.head.appendChild(a);
          `}
        </Script>
        <Script id="microsoft-clarity" strategy="afterInteractive">
          {`(function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "${process.env.NEXT_PUBLIC_CLARITY_ID?.trim() || "wixx2q4mcr"}");`}
        </Script>
      </head>
      <body
        className={`${sans.variable} ${display.variable} font-sans min-h-[100dvh] bg-transparent text-foreground antialiased`}
        suppressHydrationWarning
      >
        <Providers>
          <AmbientBackground />
          <div className="relative z-10 flex min-h-[100dvh] flex-col">{children}</div>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}