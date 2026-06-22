import type { Game, GamePhoto, GameTag, GameVideo, Playlist, PlaylistItem, Tag } from "@/generated/prisma/client";
import { serializeGame } from "@/lib/game-records";
import type { GamePlaylist } from "@/lib/types";

type PlaylistWithGames = Playlist & {
  items: Array<PlaylistItem & {
    game: Game & { tags: Array<GameTag & { tag: Tag }>; photos: GamePhoto[]; videos: GameVideo[] };
  }>;
};

export function serializePlaylist(playlist: PlaylistWithGames): GamePlaylist {
  return {
    id: playlist.id,
    shareId: playlist.shareId,
    title: playlist.title,
    description: playlist.description ?? undefined,
    createdAt: playlist.createdAt.toISOString(),
    updatedAt: playlist.updatedAt.toISOString(),
    games: playlist.items.toSorted((first, second) => first.position - second.position).map((item) => serializeGame(item.game)),
  };
}
