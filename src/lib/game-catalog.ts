import { getBoardGameGeekGameById } from "@/lib/boardgamegeek";
import { getBoardlifeGame } from "@/lib/boardlife";
import { searchBoardlife } from "@/lib/boardlife-search";
import { getBoardlifeSearchSnapshot, getBoardlifeSnapshotGame, searchBoardlifeGameCatalog } from "@/lib/boardlife-search-snapshots";
import type { BoardGameMetadata, BoardlifeSearchResult } from "@/lib/types";

const BOARDLIFE_BASE_URL = "https://boardlife.co.kr";

type GameCatalogEntry = BoardlifeSearchResult & {
  bggId?: string;
  bggSlug?: string;
  metadata?: Partial<Pick<BoardGameMetadata, "minPlayers" | "maxPlayers" | "bestPlayers" | "minAge" | "playTime" | "complexity" | "boardlifeRating" | "description" | "autoTags">>;
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
  {
    id: "518",
    title: "하나비",
    englishTitle: "Hanabi",
    year: 2010,
    thumbnail: "https://img.boardlife.co.kr/wys2/swf_upload/2022/01/12/1641926946514587_lg_w100.jpg",
    image: "https://img.boardlife.co.kr/wys2/swf_upload/2022/01/12/1641926946514587_lg_w300.jpg",
    bggId: "98778",
    bggSlug: "hanabi",
  },
  {
    id: "8373",
    title: "하나비: 거대한 불꽃",
    englishTitle: "Hanabi: Grands Feux",
    year: 2015,
    thumbnail: "https://img.boardlife.co.kr/wys2/swf_upload/2023/07/31/1690734168223555_lg_w100.jpg",
    image: "https://img.boardlife.co.kr/wys2/swf_upload/2023/07/31/1690734168223555_lg_w300.jpg",
    bggId: "290357",
    bggSlug: "hanabi-deluxe-what-a-show",
  },
  {
    id: "7771",
    title: "하나비: 마스터 장인 확장",
    englishTitle: "Hanabi: Master Artisan Expansion",
    year: 2015,
    thumbnail: "https://img.boardlife.co.kr/wys2/swf_upload/2023/04/21/1682017528336369_lg_w100.jpg",
    image: "https://img.boardlife.co.kr/wys2/swf_upload/2023/04/21/1682017528336369_lg_w300.jpg",
    bggId: "183833",
    bggSlug: "hanabi-master-artisan-expansion",
  },
  {
    id: "21483",
    title: "이레이저",
    englishTitle: "Eraser",
    year: 2024,
    thumbnail: "https://img.boardlife.co.kr/data/photo/2026/07/24/1784828105-519122_w100.png",
    image: "https://img.boardlife.co.kr/data/photo/2026/07/24/1784828105-519122_w300.png",
    metadata: {
      minPlayers: 3,
      maxPlayers: 6,
      minAge: 14,
      playTime: "30분",
      boardlifeRating: 8,
      autoTags: ["의사소통 제한", "추론", "파티 게임"],
    },
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
  const snapshotResults = getBoardlifeSearchSnapshot(word);
  if (snapshotResults) return snapshotResults;

  const verifiedResults = catalogSearchResults(word);
  if (verifiedResults.length) {
    return verifiedResults.map(({ bggId: _bggId, bggSlug: _bggSlug, metadata: _metadata, ...result }) => result);
  }

  const catalogResults = searchBoardlifeGameCatalog(word);
  if (catalogResults.length) return catalogResults;

  try {
    return await searchBoardlife(word);
  } catch (error) {
    console.warn("Boardlife live search unavailable; returning no unverified results.", error);
    return [];
  }
}

function fallbackDescription(entry: GameCatalogEntry) {
  const year = entry.year ? `${entry.year}년작 ` : "";
  return `${entry.title}(${entry.englishTitle})의 Boardlife 등록 정보입니다. ${year}보드게임이며 게임 ID는 ${entry.id}입니다.`;
}

export async function getGameCatalogMetadata(id: string, forceRefresh = false, seed?: GameMetadataSeed): Promise<BoardGameMetadata> {
  const entry: GameCatalogEntry | undefined = VERIFIED_GAME_CATALOG.find((candidate) => candidate.id === id) ?? getBoardlifeSnapshotGame(id);
  if (!entry) return getBoardlifeGame(id, forceRefresh, seed);

  const bggData = entry.bggId && entry.bggSlug
    ? await getBoardGameGeekGameById(entry.bggId, entry.bggSlug).catch((error) => {
      console.warn(`Exact BoardGameGeek metadata failed for Boardlife game ${id}`, error);
      return undefined;
    })
    : undefined;
  const metadata = bggData?.metadata;

  return {
    id: entry.id,
    title: entry.title,
    englishTitle: entry.englishTitle,
    year: entry.year ?? metadata?.year,
    thumbnail: entry.thumbnail,
    image: entry.image,
    sourceUrl: `${BOARDLIFE_BASE_URL}/game/${entry.id}`,
    minPlayers: entry.metadata?.minPlayers ?? metadata?.minPlayers,
    maxPlayers: entry.metadata?.maxPlayers ?? metadata?.maxPlayers,
    bestPlayers: entry.metadata?.bestPlayers ?? metadata?.bestPlayers,
    minAge: entry.metadata?.minAge ?? metadata?.minAge,
    playTime: entry.metadata?.playTime ?? metadata?.playTime,
    complexity: entry.metadata?.complexity ?? metadata?.complexity,
    boardlifeRating: entry.metadata?.boardlifeRating ?? metadata?.boardlifeRating,
    description: entry.metadata?.description ?? bggData?.description ?? fallbackDescription(entry),
    autoTags: entry.metadata?.autoTags ?? [],
    sourceFetchedAt: new Date().toISOString(),
  };
}
