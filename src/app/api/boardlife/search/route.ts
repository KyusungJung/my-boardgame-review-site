import { NextRequest, NextResponse } from "next/server";
import { searchBoardlife } from "@/lib/boardlife-search";

export const dynamic = "force-dynamic";
export const runtime = "edge";
export const preferredRegion = "icn1";

export async function GET(request: NextRequest) {
  const word = request.nextUrl.searchParams.get("word")?.trim() ?? "";
  if (word.length < 2) return NextResponse.json([]);

  try {
    return NextResponse.json(await searchBoardlife(word));
  } catch {
    return NextResponse.json({ message: "Boardlife 검색 결과를 가져오지 못했습니다." }, { status: 502 });
  }
}
