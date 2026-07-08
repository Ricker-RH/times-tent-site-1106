/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Vercel Image Optimization can return 402 when the project quota/billing is unavailable.
    // Uploaded assets are already compressed before serving, so avoid the optimizer endpoint.
    unoptimized: true,
    deviceSizes: [640, 750, 828, 1080, 1200, 1600, 1920],
    imageSizes: [32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "cdn2.ettoday.net",
      },
      {
        protocol: "https",
        hostname: "space.bilibili.com",
      },
      {
        protocol: "https",
        hostname: "www.linkedin.com",
      },
      {
        protocol: "https",
        hostname: "maps.app.goo.gl",
      },
    ],
  },
};

export default nextConfig;
