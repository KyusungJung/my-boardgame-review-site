import { NextRequest, NextResponse } from "next/server";
import { getBoardlifeGame } from "@/lib/boardlife";
import { hasUsableGameDescription } from "@/lib/game-description";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const preferredRegion = "icn1";

function descriptionFromStoredMetadata(game: { title: string; englishTitle: string; minPlayers: number | null; maxPlayers: number | null; minAge: number | null; playTime: string | null; complexity: number | null }) {
  const title = game.englishTitle ? `${game.title}(${game.englishTitle})` : game.title;
  const players = game.minPlayers && game.maxPlayers ? `${game.minPlayers}-${game.maxPlayers}명` : "여러 명";
  const age = game.minAge ? `, ${game.minAge}세 이상` : "";
  const playTime = game.playTime ? ` ${game.playTime} 동안` : "";
  const complexity = game.complexity ? ` 난이도는 ${game.complexity.toFixed(2)}점입니다.` : "";
  return `${title}은(는) ${players}${age}이${playTime} 즐길 수 있는 보드게임입니다.${complexity}`;
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) return NextResponse.json({ message: "올바른 게임 ID가 아닙니다." }, { status: 400 });

  try {
    const game = await prisma.game.findUnique({ where: { boardlifeId: id }, select: { title: true, englishTitle: true, year: true, image: true, minPlayers: true, maxPlayers: true, minAge: true, playTime: true, complexity: true, description: true } });
    if (!game) return NextResponse.json({ message: "등록된 게임을 찾지 못했습니다." }, { status: 404 });
    if (hasUsableGameDescription(game.description)) return NextResponse.json({ description: game.description, source: "database" });

    let description = descriptionFromStoredMetadata(game);
    let source: "boardlife" | "metadata" = "metadata";
    try {
      const metadata = await getBoardlifeGame(id, true, { title: game.title, englishTitle: game.englishTitle, year: game.year ?? undefined, image: game.image ?? undefined, thumbnail: game.image ?? undefined });
      if (hasUsableGameDescription(metadata.description)) {
        description = metadata.description ?? description;
        source = "boardlife";
      }
    } catch {
      // Boardlife can block server requests; preserve a useful local description instead.
    }

    const updatedGame = source === "boardlife" ? await prisma.game.update({
      where: { boardlifeId: id },
      data: { description },
      select: { updatedAt: true },
    }).catch((error) => {
      console.error("Failed to cache game description", error);
      return null;
    }) : null;
    return NextResponse.json({ description, source, updatedAt: updatedGame?.updatedAt.toISOString() });
  } catch {
    return NextResponse.json({ message: "게임 설명을 불러오지 못했습니다." }, { status: 502 });
  }
}
