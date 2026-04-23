import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/dashboard", destination: "/admin", permanent: true },
      { source: "/dashboard/:path*", destination: "/admin/:path*", permanent: true },
      { source: "/retencao", destination: "/checkout/retencao", permanent: true },
    ];
  },
  /**
   * O Segment Explorer (default em Next 15.5) injeta `SegmentViewNode` no RSC e tem causado
   * erros de manifest / `__webpack_modules__` em dev, com páginas sem CSS após Fast Refresh.
   */
  experimental: {
    devtoolSegmentExplorer: false,
  },
  /** Evita confusão de raiz quando existe outro lockfile na pasta pai (ex.: Camisa V2). */
  outputFileTracingRoot: path.join(__dirname),
  images: {
    /** Entrega WebP via otimizador do Next (melhor em 4G); fontes podem ser PNG. */
    formats: ["image/webp"],
    // Configura as qualidades permitidas para evitar avisos de versões futuras do Next.js
    qualities: [75, 90, 95],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "randomuser.me",
        pathname: "/api/portraits/**",
      },
    ],
  },
};

export default nextConfig;