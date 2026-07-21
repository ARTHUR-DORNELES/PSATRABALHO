/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: "15mb",
    },
    // Todas as páginas aqui são dinâmicas e mudam a cada upload/geração —
    // sem isso, o Router Cache do Next guarda uma versão antiga por até
    // 30s ao navegar entre páginas, dando a impressão de que dado sumiu.
    staleTimes: {
      dynamic: 0,
      static: 0,
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
