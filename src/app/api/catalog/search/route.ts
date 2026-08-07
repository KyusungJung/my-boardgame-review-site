import { NextRequest, NextResponse } from "next/server";
import { searchGameCatalog } from "@/lib/game-catalog";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const word = request.nextUrl.searchParams.get("word")?.trim() ?? "";
  if (word.length < 2) return NextResponse.json([]);

  try {
    return NextResponse.json(await searchGameCatalog(word));
  } catch (error) {
    console.error("Game catalog search failed", error);
    return NextResponse.json({ message: "게임 검색 결과를 가져오지 못했습니다." }, { status: 502 });
  }
}
