import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { getBoardGameGeekDescription } from "@/lib/boardgamegeek";
import { getGameCatalogMetadata, searchGameCatalog } from "@/lib/game-catalog";
import { hasUsableGameDescription } from "@/lib/game-description";
import { serializeGame } from "@/lib/game-records";
import { prisma } from "@/lib/prisma";

const includeGameRelations = { tags: { include: { tag: true } }, photos: { orderBy: { createdAt: "desc" } }, videos: { orderBy: { createdAt: "desc" } } } as const;

function normalizedTitle(value: string) {
  return value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function isImageUrl(value?: string) {
  return Boolean(value && /^https?:\/\//i.test(value));
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(request)) return NextResponse.json({ message: "관리자 로그인이 필요합니다." }, { status: 401 });

  const { id } = await params;
  if (!/^\d+$/.test(id)) return NextResponse.json({ message: "올바른 게임 ID가 아닙니다." }, { status: 400 });

  const body = await request.json().catch(() => ({})) as { fields?: string[] };
  const fields = new Set(body.fields?.filter((field): field is "description" | "image" => field === "description" || field === "image") ?? []);
  if (!fields.size) return NextResponse.json({ message: "갱신할 정보를 선택하세요." }, { status: 400 });

  const game = await prisma.game.findUnique({ where: { boardlifeId: id }, include: includeGameRelations });
  if (!game) return NextResponse.json({ message: "등록된 게임을 찾지 못했습니다." }, { status: 404 });

  try {
    const seed = { title: game.title, englishTitle: game.englishTitle, year: game.year ?? undefined, image: game.image ?? undefined, thumbnail: game.image ?? undefined };
    const [metadata, searchResults] = await Promise.all([
      getGameCatalogMetadata(id, true, seed),
      fields.has("image") ? searchGameCatalog(game.title).catch(() => []) : Promise.resolve([]),
    ]);
    const matchedSearchResult = searchResults.find((result) => result.id === id)
      ?? searchResults.find((result) => normalizedTitle(result.title) === normalizedTitle(game.title));
    const image = matchedSearchResult?.image ?? matchedSearchResult?.thumbnail ?? metadata.image ?? metadata.thumbnail;
    const description = hasUsableGameDescription(metadata.description)
      ? metadata.description
      : await getBoardGameGeekDescription(game.englishTitle || game.title).catch(() => undefined);

    if (fields.has("description") && !hasUsableGameDescription(description)) {
      return NextResponse.json({ message: "신뢰할 수 있는 게임 설명을 찾지 못했습니다. 기존 설명은 유지했습니다." }, { status: 502 });
    }
    if (fields.has("image") && !isImageUrl(image)) {
      return NextResponse.json({ message: "새 표지 사진을 찾지 못했습니다. 기존 사진은 유지했습니다." }, { status: 502 });
    }

    const updatedGame = await prisma.game.update({
      where: { id: game.id },
      data: {
        ...(fields.has("description") ? { description: description?.trim() } : {}),
        ...(fields.has("image") ? { image } : {}),
        sourceFetchedAt: new Date(),
      },
      include: includeGameRelations,
    });
    return NextResponse.json({ game: serializeGame(updatedGame) });
  } catch (error) {
    console.error("Failed to refresh game metadata", error);
    return NextResponse.json({ message: "Boardlife에서 최신 정보를 가져오지 못했습니다. 잠시 후 다시 시도하세요." }, { status: 502 });
  }
}
