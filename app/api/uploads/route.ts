import { NextResponse } from "next/server";
import crypto from "crypto";
import path from "path";
import { saveUpload } from "@/server/uploads";
import { optimizeUploadedImage } from "@/server/imageOptimization";

export const runtime = "nodejs";

const MAX_UPLOAD_SIZE = 25 * 1024 * 1024; // Safety cap; images are optimized before storage.
const ALLOWED_MIME_PREFIX = "image/";

function ensureExtension(fileName: string, mimeType: string): string {
  const ext = path.extname(fileName);
  if (ext) return ext;
  const fromMime = mimeType.split("/")[1];
  if (fromMime) {
    return `.${fromMime}`;
  }
  return ".png";
}

export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "请使用表单上传图片" }, { status: 400 });
  }

  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "未选择文件" }, { status: 400 });
  }

  if (!file.type.startsWith(ALLOWED_MIME_PREFIX)) {
    return NextResponse.json({ error: "仅支持图片文件上传" }, { status: 400 });
  }

  if (file.size > MAX_UPLOAD_SIZE) {
    return NextResponse.json({ error: "图片大小不能超过 25MB" }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const id = crypto.randomUUID();
  const extension = ensureExtension(file.name, file.type).toLowerCase();
  const safeName = `${Date.now()}-${id}${extension}`;
  const optimized = await optimizeUploadedImage({
    data: buffer,
    fileName: safeName,
    mimeType: file.type,
  });

  await saveUpload({
    id,
    fileName: optimized.fileName,
    mimeType: optimized.mimeType,
    size: optimized.data.length,
    data: optimized.data,
  });

  const url = `/api/uploads/${id}`;
  return NextResponse.json({
    url,
    optimized: optimized.optimized,
    originalSize: file.size,
    storedSize: optimized.data.length,
  });
}
