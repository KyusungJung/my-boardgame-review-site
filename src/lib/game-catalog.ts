import { getBoardGameGeekGameById } from "@/lib/boardgamegeek";
import { getBoardlifeGame } from "@/lib/boardlife";
import { searchBoardlife } from "@/lib/boardlife-search";
import type { BoardGameMetadata, BoardlifeSearchResult } from "@/lib/types";

const BOARDLIFE_BASE_URL = "https://boardlife.co.kr";

type GameCatalogEntry = BoardlifeSearchResult & {
  bggId: string;
  bggSlug: string;
};

export type GameMetadataSeed = Partial<Pick<BoardlifeSearchResult, "title" | "englishTitle" | "year" | "thumbnail" | "image">>;

// Verified against Boardlife's autocomplete response and the corresponding BGG pages.
const VERIFIED_GAME_CATALOG: GameCatalogEntry[] = [
  {
    id: "18905",
    title: "뒤집어줘! 캡틴",
    englishTitle: "Captain Flip",
    year: 2024,
    thumbnail: "https://img.boardlife.co.kr/data/photo/2024/10/22/1729536110-255312_w100.png",
    image: "https://img.boardlife.co.kr/data/photo/2024/10/22/1729536110-255312_w300.png",
    bggId: "393325",
    bggSlug: "captain-flip",
  },
  {
    id: "19591",
    title: "뒤집어줘! 캡틴: 크라켄의 턱",
    englishTitle: "Captain Flip: In the Jaws of the Kraken",
    year: 2024,
    thumbnail: "https://img.boardlife.co.kr/data/photo/2024/07/08/1720448183-313703_w100.jpg",
    image: "https://img.boardlife.co.kr/data/photo/2024/07/08/1720448183-313703_w300.jpg",
    bggId: "413556",
    bggSlug: "captain-flip-in-the-jaws-of-the-kraken",
  },
  {
    id: "21862",
    title: "뒤집어줘! 캡틴: 폭탄 섬",
    englishTitle: "Captain Flip: Isla Bomba",
    year: 2026,
    thumbnail: "https://img.boardlife.co.kr/data/photo/2026/02/28/1772238774-68621_w100.jpeg",
    image: "https://img.boardlife.co.kr/data/photo/2026/02/28/1772238774-68621_w300.jpeg",
    bggId: "458424",
    bggSlug: "captain-flip-isla-bomba",
  },
];

function normalizedSearchText(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase("ko").replace(/[^\p{L}\p{N}]+/gu, "");
}

function catalogSearchResults(word: string) {
  const query = normalizedSearchText(word);
  if (!query) return [];
  return VERIFIED_GAME_CATALOG.filter((entry) => normalizedSearchText(`${entry.title} ${entry.englishTitle}`).includes(query));
}

export async function searchGameCatalog(word: string): Promise<BoardlifeSearchResult[]> {
  const verifiedResults = catalogSearchResults(word);
  if (verifiedResults.length) {
    return verifiedResults.map(({ bggId: _bggId, bggSlug: _bggSlug, ...result }) => result);
  }
  return searchBoardlife(word);
}

function fallbackDescription(entry: GameCatalogEntry) {
  const year = entry.year ? `${entry.year}년작 ` : "";
  return `${entry.title}(${entry.englishTitle})은(는) ${year}보드게임이며, Boardlife 게임 ID ${entry.id}로 등록되어 있습니다.`;
}

export async function getGameCatalogMetadata(id: string, forceRefresh = false, seed?: GameMetadataSeed): Promise<BoardGameMetadata> {
  const entry = VERIFIED_GAME_CATALOG.find((candidate) => candidate.id === id);
  if (!entry) return getBoardlifeGame(id, forceRefresh, seed);

  const bggData = await getBoardGameGeekGameById(entry.bggId, entry.bggSlug).catch((error) => {
    console.warn(`Exact BoardGameGeek metadata failed for Boardlife game ${id}`, error);
    return undefined;
  });
  const metadata = bggData?.metadata;

  return {
    id: entry.id,
    title: entry.title,
    englishTitle: entry.englishTitle,
    year: entry.year ?? metadata?.year,
    thumbnail: entry.thumbnail,
    image: entry.image,
    sourceUrl: `${BOARDLIFE_BASE_URL}/game/${entry.id}`,
    minPlayers: metadata?.minPlayers,
    maxPlayers: metadata?.maxPlayers,
    bestPlayers: metadata?.bestPlayers,
    minAge: metadata?.minAge,
    playTime: metadata?.playTime,
    complexity: metadata?.complexity,
    boardlifeRating: metadata?.boardlifeRating,
    description: bggData?.description ?? fallbackDescription(entry),
    autoTags: [],
    sourceFetchedAt: new Date().toISOString(),
  };
}
