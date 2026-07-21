/** @type {import('next').NextConfig} */
module.exports = {
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'thebestspeaker.com.br' }],
  },
  // ioredis (TCP) e xlsx (CJS, usa APIs de Node) — fora do bundle do route handler.
  experimental: { serverComponentsExternalPackages: ['ioredis', 'xlsx'] },
};
