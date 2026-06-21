import { GameStatus, type Game, type GamePhoto, type GameTag, type Tag } from "@/generated/prisma/client";
import type { CollectionGame } from "@/lib/types";

type GameWithTags = Game & { tags: Array<GameTag & { tag: Tag }>; photos: GamePhoto[] };

export function serializeGame(game: GameWithTags): CollectionGame {
  return {
    id: game.boardlifeId,
    title: game.title,
    englishTitle: game.englishTitle,
    year: game.year ?? undefined,
    image: game.image ?? undefined,
    thumbnail: game.image ?? undefined,
    sourceUrl: game.sourceUrl,
    minPlayers: game.minPlayers ?? undefined,
    maxPlayers: game.maxPlayers ?? undefined,
    bestPlayers: game.bestPlayers ?? undefined,
    recommendedPlayers: game.recommendedPlayers ?? undefined,
    minAge: game.minAge ?? undefined,
    playTime: game.playTime ?? undefined,
    complexity: game.complexity ?? undefined,
    boardlifeRating: game.boardlifeRating ?? undefined,
    languageDependency: game.languageDependency ?? undefined,
    sourceFetchedAt: game.sourceFetchedAt?.toISOString() ?? "",
    tags: game.tags.map((entry) => entry.tag.name),
    personalRating: game.personalRating ?? undefined,
    review: game.review ?? undefined,
    plays: game.plays,
    status: game.status.toLowerCase() as CollectionGame["status"],
    createdAt: game.createdAt.toISOString(),
    photos: game.photos.map((photo) => ({ id: photo.id, url: photo.url, caption: photo.caption ?? undefined, createdAt: photo.createdAt.toISOString() })),
  };
}

export function gameDataFromInput(input: CollectionGame) {
  const status = (input.status ?? "owned").toUpperCase() as GameStatus;
  return {
    title: input.title.trim(),
    englishTitle: input.englishTitle?.trim() ?? "",
    year: input.year ?? null,
    image: input.image ?? input.thumbnail ?? null,
    sourceUrl: input.sourceUrl,
    minPlayers: input.minPlayers ?? null,
    maxPlayers: input.maxPlayers ?? null,
    bestPlayers: input.bestPlayers ?? null,
    recommendedPlayers: input.recommendedPlayers ?? null,
    minAge: input.minAge ?? null,
    playTime: input.playTime?.trim() || null,
    complexity: input.complexity ?? null,
    boardlifeRating: input.boardlifeRating ?? null,
    languageDependency: input.languageDependency?.trim() || null,
    sourceFetchedAt: input.sourceFetchedAt ? new Date(input.sourceFetchedAt) : null,
    personalRating: input.personalRating ?? null,
    review: input.review?.trim() || null,
    plays: Math.max(0, input.plays ?? 0),
    status: Object.values(GameStatus).includes(status) ? status : GameStatus.OWNED,
  };
}
