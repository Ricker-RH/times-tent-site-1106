import { NextResponse } from "next/server";
import { getUpload } from "@/server/uploads";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: { id: string } }) {
  const id = context?.params?.id;
  if (!id || typeof id !== "string" || id.trim().length === 0) {
    return NextResponse.json({ error: "缺少图片ID" }, { status: 400 });
  }

  const data = await getUpload(id);
  if (!data) {
    return NextResponse.json({ error: "图片不存在" }, { status: 404 });
  }

  return new Response(data.data, {
    headers: {
      "Content-Type": data.mimeType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
