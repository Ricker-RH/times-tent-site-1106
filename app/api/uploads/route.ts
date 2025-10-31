import { NextResponse } from "next/server";
import crypto from "crypto";
import path from "path";
import { saveUpload } from "@/server/uploads";

export const runtime = "nodejs";

const MAX_UPLOAD_SIZE = 5 * 1024 * 1024; // 5MB
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
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "未选择文件" }, { status: 400 });
  }

  if (!file.type.startsWith(ALLOWED_MIME_PREFIX)) {
    return NextResponse.json({ error: "仅支持图片文件上传" }, { status: 400 });
  }

  if (file.size > MAX_UPLOAD_SIZE) {
    return NextResponse.json({ error: "图片大小不能超过 5MB" }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const id = crypto.randomUUID();
  const extension = ensureExtension(file.name, file.type).toLowerCase();
  const safeName = `${Date.now()}-${id}${extension}`;

  await saveUpload({
    id,
    fileName: safeName,
    mimeType: file.type,
    size: file.size,
    data: buffer,
  });

  const url = `/api/uploads/${id}`;
  return NextResponse.json({ url });
}
