import { NextRequest, NextResponse } from "next/server";
import { getBoardlifeGame } from "@/lib/boardlife";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) return NextResponse.json({ message: "올바른 게임 ID가 아닙니다." }, { status: 400 });

  try {
    return NextResponse.json(await getBoardlifeGame(id));
  } catch {
    return NextResponse.json({ message: "게임 상세 정보를 가져오지 못했습니다." }, { status: 502 });
  }
}
