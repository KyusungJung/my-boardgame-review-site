import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { serializePlaylist } from "@/lib/playlist-records";
import { prisma } from "@/lib/prisma";

const playlistInclude = {
  items: {
    orderBy: { position: "asc" },
    include: { game: { include: { tags: { include: { tag: true } }, photos: { orderBy: { createdAt: "desc" } }, videos: { orderBy: { createdAt: "desc" } } } } },
  },
} as const;

type PlaylistInput = { title?: string; description?: string; gameIds?: string[] };

async function resolveItems(gameIds: string[]) {
  const uniqueIds = [...new Set(gameIds.filter(Boolean))];
  const games = await prisma.game.findMany({ where: { boardlifeId: { in: uniqueIds } }, select: { id: true, boardlifeId: true } });
  const gameIdByBoardlifeId = new Map(games.map((game) => [game.boardlifeId, game.id]));
  return uniqueIds.flatMap((boardlifeId, position) => {
    const gameId = gameIdByBoardlifeId.get(boardlifeId);
    return gameId ? [{ gameId, position }] : [];
  });
}

export async function GET() {
  const playlists = await prisma.playlist.findMany({ include: playlistInclude, orderBy: { updatedAt: "desc" } });
  return NextResponse.json(playlists.map(serializePlaylist));
}

export async function POST(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ message: "관리자 로그인이 필요합니다." }, { status: 401 });
  const input = await request.json() as PlaylistInput;
  const title = input.title?.trim();
  if (!title) return NextResponse.json({ message: "플레이리스트 이름을 입력하세요." }, { status: 400 });
  const items = await resolveItems(input.gameIds ?? []);
  if (!items.length) return NextResponse.json({ message: "플레이리스트에 게임을 하나 이상 추가하세요." }, { status: 400 });
  const playlist = await prisma.playlist.create({ data: { title, description: input.description?.trim() || null, items: { create: items } }, include: playlistInclude });
  return NextResponse.json(serializePlaylist(playlist), { status: 201 });
}
