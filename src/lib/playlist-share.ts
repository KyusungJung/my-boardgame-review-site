import { randomInt } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const SHARE_CODE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const SHARE_CODE_LENGTH = 8;
const MAX_SHARE_CODE_ATTEMPTS = 12;

function createShareCode() {
  return Array.from({ length: SHARE_CODE_LENGTH }, () => SHARE_CODE_ALPHABET[randomInt(SHARE_CODE_ALPHABET.length)]).join("");
}

function isUniqueConstraintError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export async function allocatePlaylistShareCode() {
  for (let attempt = 0; attempt < MAX_SHARE_CODE_ATTEMPTS; attempt += 1) {
    const shareCode = createShareCode();
    const existing = await prisma.playlist.findUnique({ where: { shareCode }, select: { id: true } });
    if (!existing) return shareCode;
  }
  throw new Error("공유 링크를 생성하지 못했습니다. 다시 시도해 주세요.");
}

export async function ensurePlaylistShareCode(playlistId: string) {
  const playlist = await prisma.playlist.findUnique({ where: { id: playlistId }, select: { shareCode: true } });
  if (playlist?.shareCode) return playlist.shareCode;

  for (let attempt = 0; attempt < MAX_SHARE_CODE_ATTEMPTS; attempt += 1) {
    const shareCode = await allocatePlaylistShareCode();
    try {
      await prisma.playlist.update({ where: { id: playlistId }, data: { shareCode } });
      return shareCode;
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;
    }
  }
  throw new Error("공유 링크를 생성하지 못했습니다. 다시 시도해 주세요.");
}

export async function ensurePlaylistShareCodes() {
  const playlists = await prisma.playlist.findMany({ where: { shareCode: null }, select: { id: true } });
  await Promise.all(playlists.map((playlist) => ensurePlaylistShareCode(playlist.id)));
}

export async function createPlaylistWithShareCode<T>(create: (shareCode: string) => Promise<T>) {
  for (let attempt = 0; attempt < MAX_SHARE_CODE_ATTEMPTS; attempt += 1) {
    const shareCode = await allocatePlaylistShareCode();
    try {
      return await create(shareCode);
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;
    }
  }
  throw new Error("공유 링크를 생성하지 못했습니다. 다시 시도해 주세요.");
}
