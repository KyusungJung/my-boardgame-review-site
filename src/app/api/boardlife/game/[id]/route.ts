import { NextRequest, NextResponse } from "next/server";
import { getBoardlifeGame } from "@/lib/boardlife";

export const dynamic = "force-dynamic";
export const preferredRegion = "icn1";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) return NextResponse.json({ message: "올바른 게임 ID가 아닙니다." }, { status: 400 });
  const yearParam = request.nextUrl.searchParams.get("year");
  const year = yearParam ? Number(yearParam) : undefined;
  const seed = {
    title: request.nextUrl.searchParams.get("title") ?? undefined,
    englishTitle: request.nextUrl.searchParams.get("englishTitle") ?? undefined,
    image: request.nextUrl.searchParams.get("image") ?? undefined,
    thumbnail: request.nextUrl.searchParams.get("thumbnail") ?? undefined,
    year: typeof year === "number" && Number.isFinite(year) ? year : undefined,
  };

  try {
    return NextResponse.json(await getBoardlifeGame(id, request.nextUrl.searchParams.get("refresh") === "1", seed));
  } catch (error) {
    console.error("Boardlife game detail failed", error);
    return NextResponse.json({ message: "게임 상세 정보를 가져오지 못했습니다." }, { status: 502 });
  }
}
