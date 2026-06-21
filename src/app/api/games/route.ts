import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { gameDataFromInput, serializeGame } from "@/lib/game-records";
import { prisma } from "@/lib/prisma";
import type { CollectionGame } from "@/lib/types";

const includeTags = { tags: { include: { tag: true } }, photos: { orderBy: { createdAt: "desc" } } } as const;

function saveErrorResponse(error: unknown) {
  console.error("Failed to save board game", error);
  const code = typeof error === "object" && error !== null && "code" in error && typeof error.code === "string" ? error.code : "UNKNOWN";
  const message = code === "P2021"
    ? "데이터베이스 테이블을 찾지 못했습니다. Prisma 스키마를 다시 적용하세요."
    : code === "P2002"
      ? "같은 이름의 태그를 처리하는 중 충돌했습니다. 다시 시도하세요."
      : `게임을 저장하지 못했습니다. (오류 코드: ${code})`;
  return NextResponse.json({ message, errorCode: code }, { status: 500 });
}

export async function GET() {
  try {
    const games = await prisma.game.findMany({ include: includeTags, orderBy: { createdAt: "desc" } });
    return NextResponse.json(games.map(serializeGame));
  } catch {
    return NextResponse.json({ message: "컬렉션 데이터베이스에 연결하지 못했습니다." }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ message: "관리자 로그인이 필요합니다." }, { status: 401 });

  const input = await request.json() as CollectionGame;
  if (!input.id || !input.title?.trim() || !input.sourceUrl) {
    return NextResponse.json({ message: "게임 기본 정보가 부족합니다." }, { status: 400 });
  }

  const tags = [...new Set((input.tags ?? []).map((tag) => tag.trim()).filter(Boolean))];
  const tagRelations = tags.map((name) => ({ tag: { connectOrCreate: { where: { name }, create: { name } } } }));

  try {
    const game = await prisma.game.upsert({
      where: { boardlifeId: input.id },
      create: { boardlifeId: input.id, ...gameDataFromInput(input), tags: { create: tagRelations } },
      update: { ...gameDataFromInput(input), tags: { deleteMany: {}, create: tagRelations } },
      include: includeTags,
    });
    return NextResponse.json(serializeGame(game));
  } catch (error) {
    return saveErrorResponse(error);
  }
}
