import { handleUpload } from "@vercel/blob/client";
import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";

export async function POST(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ message: "관리자 로그인이 필요합니다." }, { status: 401 });
  const body = await request.json();
  const response = await handleUpload({
    body,
    request,
    onBeforeGenerateToken: async () => ({
      allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
      maximumSizeInBytes: 10 * 1024 * 1024,
      addRandomSuffix: true,
      tokenPayload: JSON.stringify({ source: "game-photo" }),
    }),
    onUploadCompleted: async () => {},
  });
  return NextResponse.json(response);
}
