import path from "path";
import sharp from "sharp";

const OPTIMIZABLE_MIME_TYPES = new Set([
  "image/avif",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/tiff",
  "image/webp",
]);

const MAX_DISPLAY_DIMENSION = 1920;
const WEBP_QUALITY = 78;

export interface OptimizedImageResult {
  data: Buffer;
  fileName: string;
  mimeType: string;
  optimized: boolean;
}

function withWebpExtension(fileName: string): string {
  const parsed = path.parse(fileName);
  return `${parsed.name || "upload"}.webp`;
}

export async function optimizeUploadedImage(input: {
  data: Buffer;
  fileName: string;
  mimeType: string;
}): Promise<OptimizedImageResult> {
  const mimeType = input.mimeType.toLowerCase();
  if (!OPTIMIZABLE_MIME_TYPES.has(mimeType)) {
    return { ...input, optimized: false };
  }

  try {
    const image = sharp(input.data, { animated: false, limitInputPixels: 80_000_000 });
    const metadata = await image.metadata();
    if (!metadata.width || !metadata.height) {
      return { ...input, optimized: false };
    }

    const optimized = await image
      .rotate()
      .resize({
        width: MAX_DISPLAY_DIMENSION,
        height: MAX_DISPLAY_DIMENSION,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: WEBP_QUALITY, effort: 4 })
      .toBuffer();

    if (optimized.length >= input.data.length) {
      return { ...input, optimized: false };
    }

    return {
      data: optimized,
      fileName: withWebpExtension(input.fileName),
      mimeType: "image/webp",
      optimized: true,
    };
  } catch {
    return { ...input, optimized: false };
  }
}
