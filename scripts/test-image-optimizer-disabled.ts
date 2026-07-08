// next.config.mjs is authored as an ES module config file and has no TS declaration.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import nextConfig from "../next.config.mjs";

const images = nextConfig.images ?? {};

if (images.unoptimized !== true) {
  throw new Error("Expected Next image optimization to be disabled for Vercel deployment.");
}

console.log("Image optimizer config check passed");
