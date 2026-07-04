import fs from "fs/promises";
import path from "path";
import sharp from "sharp";

const PUBLIC_DIR = path.resolve(process.cwd(), "public");
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png"]);
const MAX_DISPLAY_DIMENSION = 1920;

async function listImages(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return listImages(fullPath);
      }
      if (entry.isFile() && IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
        return [fullPath];
      }
      return [];
    }),
  );
  return files.flat();
}

function formatMb(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(2)}MB`;
}

async function optimizeFile(filePath: string): Promise<{ original: number; stored: number; updated: boolean }> {
  const original = await fs.readFile(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const image = sharp(original, { animated: false, limitInputPixels: 80_000_000 }).rotate().resize({
    width: MAX_DISPLAY_DIMENSION,
    height: MAX_DISPLAY_DIMENSION,
    fit: "inside",
    withoutEnlargement: true,
  });

  const optimized =
    ext === ".png"
      ? await image.png({ compressionLevel: 9, adaptiveFiltering: true, effort: 10 }).toBuffer()
      : await image.jpeg({ quality: 78, mozjpeg: true }).toBuffer();

  if (optimized.length >= original.length) {
    return { original: original.length, stored: original.length, updated: false };
  }

  await fs.writeFile(filePath, optimized);
  return { original: original.length, stored: optimized.length, updated: true };
}

async function main() {
  const files = await listImages(PUBLIC_DIR);
  let updated = 0;
  let skipped = 0;
  let failed = 0;
  let originalBytes = 0;
  let storedBytes = 0;

  for (const filePath of files) {
    try {
      const result = await optimizeFile(filePath);
      originalBytes += result.original;
      storedBytes += result.stored;
      if (result.updated) {
        updated += 1;
        console.log(
          `UPDATE ${path.relative(process.cwd(), filePath)} ${formatMb(result.original)} -> ${formatMb(result.stored)}`,
        );
      } else {
        skipped += 1;
      }
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`SKIP ${path.relative(process.cwd(), filePath)} ${message}`);
    }
  }

  console.log(
    JSON.stringify(
      {
        scanned: files.length,
        updated,
        skipped,
        failed,
        original: formatMb(originalBytes),
        stored: formatMb(storedBytes),
        saved: formatMb(originalBytes - storedBytes),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
