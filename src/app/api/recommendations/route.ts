import { NextRequest, NextResponse } from "next/server";
import { serializeGame } from "@/lib/game-records";
import { getBoardGameGeekHotness, rankMeetingGames, type MeetingRecommendationOptions } from "@/lib/meeting-recommendations";
import { prisma } from "@/lib/prisma";

const includeTags = { tags: { include: { tag: true } }, photos: { orderBy: { createdAt: "desc" } }, videos: { orderBy: { createdAt: "desc" } } } as const;

function readOptions(value: unknown): MeetingRecommendationOptions | undefined {
  if (!value || typeof value !== "object") return undefined;
  const input = value as Partial<MeetingRecommendationOptions>;
  const people = input.people;
  if (typeof people !== "number" || !Number.isInteger(people) || !["strategy", "balanced", "party"].includes(input.playStyle ?? "") || !["duration", "count"].includes(input.limitMode ?? "") || !Array.isArray(input.preferredMechanisms)) return undefined;
  return { people: Math.min(12, Math.max(1, people)), familyGameOnly: Boolean(input.familyGameOnly), playStyle: input.playStyle as MeetingRecommendationOptions["playStyle"], preferredMechanisms: input.preferredMechanisms.filter((item): item is string => typeof item === "string").slice(0, 8), limitMode: input.limitMode as MeetingRecommendationOptions["limitMode"], duration: Math.min(600, Math.max(30, Number(input.duration) || 120)), count: Math.min(12, Math.max(1, Number(input.count) || 5)) };
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => undefined) as { options?: unknown; refresh?: boolean; excludeGameIds?: unknown } | undefined;
  const options = readOptions(body?.options);
  if (!options) return NextResponse.json({ message: "추천 조건이 올바르지 않습니다." }, { status: 400 });
  try {
    const [games, hotness] = await Promise.all([prisma.game.findMany({ include: includeTags, orderBy: { createdAt: "desc" } }), getBoardGameGeekHotness(Boolean(body?.refresh))]);
    const excludeGameIds = Array.isArray(body?.excludeGameIds) ? body.excludeGameIds.filter((id): id is string => typeof id === "string").slice(0, 12) : [];
    return NextResponse.json({ recommendations: rankMeetingGames(games.map(serializeGame), options, hotness.titles, excludeGameIds), externalSource: { available: hotness.available, fetchedAt: hotness.fetchedAt, name: "BoardGameGeek Hotness" } });
  } catch (error) {
    console.error("Meeting recommendation failed", error);
    return NextResponse.json({ message: "추천을 갱신하지 못했습니다." }, { status: 503 });
  }
}
