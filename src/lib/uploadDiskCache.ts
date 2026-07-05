import { promises as fs } from "fs";
import path from "path";

export interface UploadDiskCacheWriteInput {
  fileName?: string;
  mimeType: string;
  data: Buffer;
}

export interface UploadDiskCacheRecord {
  mimeType: string;
  data: Buffer;
}

export interface UploadDiskCacheIndexEntry {
  id: string;
  fileName: string;
  sourceFileName?: string;
  mimeType: string;
  size: number;
  cachedAt: string;
}

export type UploadDiskCacheIndex = Record<string, UploadDiskCacheIndexEntry>;

const CACHE_DIR = path.join(".local", "upload-cache");
const INDEX_FILE = "index.json";
const DEFAULT_CACHE_DIR = path.join(/*turbopackIgnore: true*/ process.cwd(), CACHE_DIR);

let writeQueue: Promise<void> = Promise.resolve();

export function getUploadDiskCachePaths(rootDir?: string) {
  const dir = rootDir ? path.join(/*turbopackIgnore: true*/ rootDir, CACHE_DIR) : DEFAULT_CACHE_DIR;
  return {
    dir,
    indexFile: path.join(dir, INDEX_FILE),
  };
}

function sanitizeCacheId(id: string): string {
  const safe = id.replace(/[^a-zA-Z0-9._-]/g, "_");
  return safe || "upload";
}

function extensionFromMime(mimeType: string): string {
  const normalized = mimeType.toLowerCase().split(";")[0]?.trim();
  switch (normalized) {
    case "image/jpeg":
    case "image/jpg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/avif":
      return "avif";
    case "image/gif":
      return "gif";
    case "image/svg+xml":
      return "svg";
    default:
      return "bin";
  }
}

function cacheFileNameFor(id: string, mimeType: string): string {
  return `${sanitizeCacheId(id)}.${extensionFromMime(mimeType)}`;
}

async function ensureUploadDiskCache(rootDir?: string) {
  const paths = getUploadDiskCachePaths(rootDir);
  await fs.mkdir(paths.dir, { recursive: true });
  try {
    await fs.access(paths.indexFile);
  } catch {
    await fs.writeFile(paths.indexFile, "{}", "utf8");
  }
  return paths;
}

export async function readUploadDiskCacheIndex(rootDir?: string): Promise<UploadDiskCacheIndex> {
  try {
    const paths = await ensureUploadDiskCache(rootDir);
    const raw = await fs.readFile(paths.indexFile, "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as UploadDiskCacheIndex) : {};
  } catch {
    return {};
  }
}

async function writeUploadDiskCacheIndex(index: UploadDiskCacheIndex, rootDir?: string): Promise<void> {
  const paths = await ensureUploadDiskCache(rootDir);
  const tempFile = `${paths.indexFile}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tempFile, JSON.stringify(index, null, 2), "utf8");
  await fs.rename(tempFile, paths.indexFile);
}

async function writeUploadDiskCacheRecordNow(
  id: string,
  input: UploadDiskCacheWriteInput,
  rootDir?: string,
): Promise<void> {
  const paths = await ensureUploadDiskCache(rootDir);
  const index = await readUploadDiskCacheIndex(rootDir);
  const previousFileName = index[id]?.fileName;
  const fileName = cacheFileNameFor(id, input.mimeType);

  await fs.writeFile(path.join(/*turbopackIgnore: true*/ paths.dir, fileName), input.data);

  index[id] = {
    id,
    fileName,
    sourceFileName: input.fileName,
    mimeType: input.mimeType,
    size: input.data.length,
    cachedAt: new Date().toISOString(),
  };
  await writeUploadDiskCacheIndex(index, rootDir);

  if (previousFileName && previousFileName !== fileName) {
    await fs.rm(path.join(/*turbopackIgnore: true*/ paths.dir, path.basename(previousFileName)), { force: true });
  }
}

export async function writeUploadDiskCacheRecord(
  id: string,
  input: UploadDiskCacheWriteInput,
  rootDir?: string,
): Promise<void> {
  const nextWrite = writeQueue
    .catch(() => undefined)
    .then(() => writeUploadDiskCacheRecordNow(id, input, rootDir));
  writeQueue = nextWrite.catch(() => undefined);
  return nextWrite;
}

export async function readUploadDiskCacheRecord(
  id: string,
  rootDir?: string,
): Promise<UploadDiskCacheRecord | null> {
  const index = await readUploadDiskCacheIndex(rootDir);
  const entry = index[id];
  if (!entry?.fileName || !entry.mimeType) {
    return null;
  }

  try {
    const paths = getUploadDiskCachePaths(rootDir);
    const data = await fs.readFile(path.join(/*turbopackIgnore: true*/ paths.dir, path.basename(entry.fileName)));
    if (entry.size > 0 && data.length !== entry.size) {
      return null;
    }
    return {
      mimeType: entry.mimeType,
      data,
    };
  } catch {
    return null;
  }
}
