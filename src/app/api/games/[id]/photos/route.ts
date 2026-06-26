import { del } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(request)) return NextResponse.json({ message: "관리자 로그인이 필요합니다." }, { status: 401 });
  const { id } = await params;
  const game = await prisma.game.findUnique({ where: { boardlifeId: id } });
  if (!game) return NextResponse.json({ message: "등록된 게임을 찾지 못했습니다." }, { status: 404 });

  const { url, pathname, caption } = await request.json() as { url?: string; pathname?: string; caption?: string };
  if (!url || !pathname || !pathname.startsWith(`game-photos/${id}/`)) return NextResponse.json({ message: "올바른 사진 정보가 아닙니다." }, { status: 400 });
  const now = new Date();
  const [photo, updatedGame] = await prisma.$transaction([
    prisma.gamePhoto.create({ data: { gameId: game.id, url, pathname, caption: caption?.trim() || null } }),
    prisma.game.update({ where: { id: game.id }, data: { updatedAt: now }, select: { updatedAt: true } }),
  ]);
  return NextResponse.json({ id: photo.id, url: photo.url, caption: photo.caption ?? undefined, createdAt: photo.createdAt.toISOString(), updatedAt: updatedGame.updatedAt.toISOString() });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(request)) return NextResponse.json({ message: "관리자 로그인이 필요합니다." }, { status: 401 });
  const { id } = await params;
  const photoId = request.nextUrl.searchParams.get("photoId");
  if (!photoId) return NextResponse.json({ message: "사진 ID가 필요합니다." }, { status: 400 });
  const photo = await prisma.gamePhoto.findFirst({ where: { id: photoId, game: { boardlifeId: id } } });
  if (!photo) return NextResponse.json({ message: "사진을 찾지 못했습니다." }, { status: 404 });
  await del(photo.url);
  const [, updatedGame] = await prisma.$transaction([
    prisma.gamePhoto.delete({ where: { id: photo.id } }),
    prisma.game.update({ where: { id: photo.gameId }, data: { updatedAt: new Date() }, select: { updatedAt: true } }),
  ]);
  return NextResponse.json({ ok: true, updatedAt: updatedGame.updatedAt.toISOString() });
}
