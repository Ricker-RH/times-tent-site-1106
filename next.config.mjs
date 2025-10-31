/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
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
