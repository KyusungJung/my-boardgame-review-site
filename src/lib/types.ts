export type BoardlifeSearchResult = {
  id: string;
  title: string;
  englishTitle: string;
  year?: number;
  thumbnail?: string;
  image?: string;
};

export type BoardGameMetadata = BoardlifeSearchResult & {
  sourceUrl: string;
  minPlayers?: number;
  maxPlayers?: number;
  bestPlayers?: number;
  recommendedPlayers?: string;
  minAge?: number;
  playTime?: string;
  complexity?: number;
  boardlifeRating?: number;
  languageDependency?: string;
  description?: string;
  autoTags?: string[];
  sourceFetchedAt: string;
};

export type CollectionGame = BoardGameMetadata & {
  tags: string[];
  personalRating?: number;
  recommendationWeight?: number;
  bgtiWeights?: {
    speed: number;
    django: number;
    light: number;
    heavy: number;
    peaceful: number;
    aggressive: number;
    thematic: number;
    mechanic: number;
  };
  review?: string;
  plays: number;
  status: "owned" | "wishlist" | "played";
  createdAt: string;
  updatedAt: string;
  photos: PlayPhoto[];
  videos: GameVideo[];
};

export type MeetingRecommendation = {
  game: CollectionGame;
  score: number;
  reasons: string[];
  weightBreakdown: Record<string, number>;
};

export type MeetingRecommendationResponse = {
  recommendations: MeetingRecommendation[];
  externalSource: {
    available: boolean;
    fetchedAt: string;
    name: string;
  };
};

export type PlayPhoto = { id: string; url: string; caption?: string; createdAt: string };

export type GameVideo = {
  id?: string;
  youtubeId: string;
  url: string;
  title: string;
  thumbnail?: string;
  channelName?: string;
  publishedAt?: string;
  createdAt?: string;
};

export type GamePlaylist = {
  id: string;
  shareId: string;
  title: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  games: CollectionGame[];
};
