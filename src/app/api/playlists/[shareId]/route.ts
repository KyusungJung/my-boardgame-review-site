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

export async function GET(_request: NextRequest, { params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = await params;
  const playlist = await prisma.playlist.findFirst({ where: { OR: [{ shareCode: shareId }, { shareId }] }, include: playlistInclude });
  if (!playlist) return NextResponse.json({ message: "플레이리스트를 찾지 못했습니다." }, { status: 404 });
  return NextResponse.json(serializePlaylist(playlist));
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ shareId: string }> }) {
  if (!isAdmin(request)) return NextResponse.json({ message: "관리자 로그인이 필요합니다." }, { status: 401 });
  const { shareId } = await params;
  const input = await request.json() as PlaylistInput;
  const title = input.title?.trim();
  if (!title) return NextResponse.json({ message: "플레이리스트 이름을 입력하세요." }, { status: 400 });
  const items = await resolveItems(input.gameIds ?? []);
  if (!items.length) return NextResponse.json({ message: "플레이리스트에 게임을 하나 이상 추가하세요." }, { status: 400 });
  const existing = await prisma.playlist.findFirst({ where: { OR: [{ shareCode: shareId }, { shareId }] }, select: { id: true } });
  if (!existing) return NextResponse.json({ message: "플레이리스트를 찾지 못했습니다." }, { status: 404 });
  const playlist = await prisma.playlist.update({ where: { id: existing.id }, data: { title, description: input.description?.trim() || null, items: { deleteMany: {}, create: items } }, include: playlistInclude });
  return NextResponse.json(serializePlaylist(playlist));
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ shareId: string }> }) {
  if (!isAdmin(request)) return NextResponse.json({ message: "관리자 로그인이 필요합니다." }, { status: 401 });
  const { shareId } = await params;
  const playlist = await prisma.playlist.findFirst({ where: { OR: [{ shareCode: shareId }, { shareId }] }, select: { id: true } });
  if (playlist) await prisma.playlist.delete({ where: { id: playlist.id } });
  return NextResponse.json({ ok: true });
}
