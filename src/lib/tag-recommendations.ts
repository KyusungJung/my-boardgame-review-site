import type { CollectionGame } from "@/lib/types";

type TagRecommendationCategory = "party" | "family" | "strategy";

type TagRecommendationDefinition = {
  category: TagRecommendationCategory;
  label: string;
  tags: string[];
  acceptsMetadata: (game: CollectionGame) => boolean;
  metadataScore: (game: CollectionGame) => number;
};

export type TagRecommendationGroup = {
  tag: string;
  games: CollectionGame[];
  rankedGames: CollectionGame[];
};

const strategyTags = ["전략게임", "자원 승점", "엔진 빌딩", "일꾼 놓기", "덱,백,풀 빌딩", "영역 건설"];

function estimatedPlayTime(game: CollectionGame) {
  const minutes = game.playTime?.match(/\d+/g)?.map(Number).filter((value) => value > 0) ?? [];
  return minutes.length >= 2 ? Math.round((minutes[0] + minutes[1]) / 2) : minutes[0];
}

function hasAnyTag(game: CollectionGame, tags: string[]) {
  return game.tags.some((tag) => tags.includes(tag));
}

const tagRecommendationDefinitions: TagRecommendationDefinition[] = [
  {
    category: "party",
    label: "파티 게임",
    // Broad mechanisms such as dice rolling and co-op are deliberately excluded:
    // they describe many games that are not party games.
    tags: ["파티게임", "파티 게임"],
    acceptsMetadata: (game) => {
      const minutes = estimatedPlayTime(game);
      return (game.maxPlayers === undefined || game.maxPlayers >= 4)
        && (game.bestPlayers === undefined || game.bestPlayers >= 3)
        && (game.complexity === undefined || game.complexity <= 2.8)
        && (minutes === undefined || minutes <= 75);
    },
    metadataScore: (game) => {
      const minutes = estimatedPlayTime(game);
      return (game.bestPlayers !== undefined && game.bestPlayers >= 4 ? 12 : 0)
        + (game.maxPlayers !== undefined && game.maxPlayers >= 6 ? 8 : 0)
        + (game.complexity !== undefined && game.complexity <= 2.2 ? 6 : 0)
        + (minutes !== undefined && minutes <= 45 ? 5 : 0);
    },
  },
  {
    category: "family",
    label: "가족 게임",
    tags: ["가족게임", "가족 게임", "어린이게임", "어린이 게임"],
    acceptsMetadata: (game) => {
      const minutes = estimatedPlayTime(game);
      return (game.maxPlayers === undefined || game.maxPlayers >= 3)
        && (game.complexity === undefined || game.complexity <= 3.2)
        && (minutes === undefined || minutes <= 90);
    },
    metadataScore: (game) => {
      const minutes = estimatedPlayTime(game);
      return (game.maxPlayers !== undefined && game.maxPlayers >= 4 ? 8 : 0)
        + (game.minAge !== undefined && game.minAge <= 10 ? 6 : 0)
        + (game.complexity !== undefined && game.complexity <= 2.5 ? 5 : 0)
        + (minutes !== undefined && minutes <= 60 ? 4 : 0);
    },
  },
  {
    category: "strategy",
    label: "전략 게임",
    tags: strategyTags,
    acceptsMetadata: () => true,
    metadataScore: (game) => {
      const minutes = estimatedPlayTime(game);
      return (game.complexity !== undefined && game.complexity >= 3 ? 10 : 0)
        + (game.complexity !== undefined && game.complexity >= 2.5 ? 5 : 0)
        + (minutes !== undefined && minutes >= 60 ? 5 : 0)
        + (game.bestPlayers !== undefined ? 3 : 0);
    },
  },
];

function recommendationScore(game: CollectionGame, definition: TagRecommendationDefinition) {
  return definition.metadataScore(game) + (game.personalRating ?? 0) * 4 + Math.min(game.plays, 12);
}

export function buildTagRecommendationGroups(games: CollectionGame[]): TagRecommendationGroup[] {
  return tagRecommendationDefinitions.map((definition) => {
    const rankedGames = games
      .filter((game) => hasAnyTag(game, definition.tags) && definition.acceptsMetadata(game))
      .toSorted((first, second) => recommendationScore(second, definition) - recommendationScore(first, definition)
        || (second.personalRating ?? 0) - (first.personalRating ?? 0)
        || second.plays - first.plays);
    return { tag: definition.label, games: rankedGames.slice(0, 5), rankedGames };
  }).filter(({ rankedGames }) => rankedGames.length > 0);
}
