import { NextRequest, NextResponse } from "next/server";
import { getBoardlifeGame } from "@/lib/boardlife";
import { hasUsableGameDescription } from "@/lib/game-description";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const preferredRegion = "icn1";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) return NextResponse.json({ message: "올바른 게임 ID가 아닙니다." }, { status: 400 });

  try {
    const game = await prisma.game.findUnique({ where: { boardlifeId: id }, select: { description: true } });
    if (!game) return NextResponse.json({ message: "등록된 게임을 찾지 못했습니다." }, { status: 404 });
    if (hasUsableGameDescription(game.description)) return NextResponse.json({ description: game.description, source: "database" });

    const metadata = await getBoardlifeGame(id);
    if (!hasUsableGameDescription(metadata.description)) return NextResponse.json({ description: null, source: "boardlife" });

    await prisma.game.update({
      where: { boardlifeId: id },
      data: { description: metadata.description, sourceFetchedAt: new Date(metadata.sourceFetchedAt) },
    });
    return NextResponse.json({ description: metadata.description, source: "boardlife" });
  } catch {
    return NextResponse.json({ message: "게임 설명을 불러오지 못했습니다." }, { status: 502 });
  }
}
