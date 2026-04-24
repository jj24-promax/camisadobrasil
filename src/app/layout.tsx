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
    <html lang="pt-BR" className="dark">
      <head>
        <Script id="meta-pixel" strategy="beforeInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '1603071560994242');
            fbq('track', 'PageView');
          `}
        </Script>
        <Script
          id="utmify-utms"
          src="https://cdn.utmify.com.br/scripts/utms/latest.js"
          data-utmify-prevent-xcod-sck
          data-utmify-prevent-subids
          strategy="afterInteractive"
        />
        <Script id="utmify-pixel" strategy="afterInteractive">
          {`
            window.pixelId = "69eb28195fcbfcd8ee84f184";
            var a = document.createElement("script");
            a.setAttribute("async", "");
            a.setAttribute("defer", "");
            a.setAttribute("src", "https://cdn.utmify.com.br/scripts/pixel/pixel.js");
            document.head.appendChild(a);
          `}
        </Script>
      </head>
      <body
        className={`${sans.variable} ${display.variable} font-sans min-h-[100dvh] bg-transparent text-foreground antialiased`}
      >
        <noscript>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src="https://www.facebook.com/tr?id=1603071560994242&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>
        <Providers>
          <AmbientBackground />
          <div className="relative z-10 flex min-h-[100dvh] flex-col">{children}</div>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}