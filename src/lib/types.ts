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
  autoTags?: string[];
  sourceFetchedAt: string;
};

export type CollectionGame = BoardGameMetadata & {
  tags: string[];
  personalRating?: number;
  review?: string;
  plays: number;
  status: "owned" | "wishlist" | "played";
  createdAt: string;
  photos: PlayPhoto[];
  videos: GameVideo[];
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
