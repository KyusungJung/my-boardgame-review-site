import { del, put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(request)) return NextResponse.json({ message: "관리자 로그인이 필요합니다." }, { status: 401 });
  const { id } = await params;
  const game = await prisma.game.findUnique({ where: { boardlifeId: id } });
  if (!game) return NextResponse.json({ message: "등록된 게임을 찾지 못했습니다." }, { status: 404 });

  const formData = await request.formData();
  const file = formData.get("file");
  const caption = String(formData.get("caption") ?? "").trim();
  if (!(file instanceof File) || !file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) return NextResponse.json({ message: "5MB 이하의 이미지 파일만 업로드할 수 있습니다." }, { status: 400 });

  const blob = await put(`game-photos/${id}/${file.name}`, file, { access: "public", addRandomSuffix: true });
  const photo = await prisma.gamePhoto.create({ data: { gameId: game.id, url: blob.url, pathname: blob.pathname, caption: caption || null } });
  return NextResponse.json({ id: photo.id, url: photo.url, caption: photo.caption ?? undefined, createdAt: photo.createdAt.toISOString() });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(request)) return NextResponse.json({ message: "관리자 로그인이 필요합니다." }, { status: 401 });
  const { id } = await params;
  const photoId = request.nextUrl.searchParams.get("photoId");
  if (!photoId) return NextResponse.json({ message: "사진 ID가 필요합니다." }, { status: 400 });
  const photo = await prisma.gamePhoto.findFirst({ where: { id: photoId, game: { boardlifeId: id } } });
  if (!photo) return NextResponse.json({ message: "사진을 찾지 못했습니다." }, { status: 404 });
  await del(photo.url);
  await prisma.gamePhoto.delete({ where: { id: photo.id } });
  return NextResponse.json({ ok: true });
}
