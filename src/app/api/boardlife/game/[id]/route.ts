import { NextRequest, NextResponse } from "next/server";
import { getBoardlifeGame } from "@/lib/boardlife";

export const dynamic = "force-dynamic";
export const preferredRegion = "icn1";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) return NextResponse.json({ message: "올바른 게임 ID가 아닙니다." }, { status: 400 });

  try {
    return NextResponse.json(await getBoardlifeGame(id, request.nextUrl.searchParams.get("refresh") === "1"));
  } catch {
    return NextResponse.json({ message: "게임 상세 정보를 가져오지 못했습니다." }, { status: 502 });
  }
}
