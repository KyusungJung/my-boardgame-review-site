import { GameStatus, type Game, type GamePhoto, type GameTag, type GameVideo, type Tag } from "@/generated/prisma/client";
import type { CollectionGame } from "@/lib/types";

type GameWithTags = Game & { tags: Array<GameTag & { tag: Tag }>; photos: GamePhoto[]; videos: GameVideo[] };

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
    description: game.description ?? undefined,
    sourceFetchedAt: game.sourceFetchedAt?.toISOString() ?? "",
    tags: game.tags.map((entry) => entry.tag.name),
    personalRating: game.personalRating ?? undefined,
    recommendationWeight: game.recommendationWeight,
    review: game.review ?? undefined,
    plays: game.plays,
    status: game.status.toLowerCase() as CollectionGame["status"],
    createdAt: game.createdAt.toISOString(),
    updatedAt: game.updatedAt.toISOString(),
    photos: game.photos.map((photo) => ({ id: photo.id, url: photo.url, caption: photo.caption ?? undefined, createdAt: photo.createdAt.toISOString() })),
    videos: game.videos.map((video) => ({ id: video.id, youtubeId: video.youtubeId, url: video.url, title: video.title, thumbnail: video.thumbnail ?? undefined, channelName: video.channelName ?? undefined, publishedAt: video.publishedAt?.toISOString(), createdAt: video.createdAt.toISOString() })),
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
    description: input.description?.trim() || null,
    sourceFetchedAt: input.sourceFetchedAt ? new Date(input.sourceFetchedAt) : null,
    personalRating: input.personalRating ?? null,
    recommendationWeight: Math.min(3, Math.max(0.25, Number.isFinite(input.recommendationWeight) ? input.recommendationWeight as number : 1)),
    review: input.review?.trim() || null,
    plays: Math.max(0, input.plays ?? 0),
    status: Object.values(GameStatus).includes(status) ? status : GameStatus.OWNED,
  };
}

export function gameVideosFromInput(input: CollectionGame) {
  const uniqueVideos = new Map<string, CollectionGame["videos"][number]>();
  for (const video of input.videos ?? []) {
    const youtubeId = video.youtubeId?.trim();
    const title = video.title?.trim();
    const url = video.url?.trim();
    if (youtubeId && title && url && !uniqueVideos.has(youtubeId)) uniqueVideos.set(youtubeId, video);
  }
  return [...uniqueVideos.values()].map((video) => ({
    youtubeId: video.youtubeId.trim(),
    url: video.url.trim(),
    title: video.title.trim(),
    thumbnail: video.thumbnail?.trim() || null,
    channelName: video.channelName?.trim() || null,
    publishedAt: video.publishedAt ? new Date(video.publishedAt) : null,
  }));
}
