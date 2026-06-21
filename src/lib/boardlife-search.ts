import type { BoardlifeSearchResult } from "@/lib/types";

const BOARDLIFE_BASE_URL = "https://boardlife.co.kr";

type BoardlifeApiItem = {
  number?: string | number;
  title?: string;
  engtitle?: string;
  years?: string | number;
  bbs_img?: string;
  photo?: string;
};

function numberFrom(value?: string) {
  const match = value?.match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : undefined;
}

export async function searchBoardlife(word: string): Promise<BoardlifeSearchResult[]> {
  const normalizedWord = word.trim();
  if (!normalizedWord) return [];

  const response = await fetch(`${BOARDLIFE_BASE_URL}/get_auto_search.php?word=${encodeURIComponent(normalizedWord)}`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Safari/537.36",
      Accept: "application/json,text/plain,*/*",
      "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
    },
    cache: "no-store",
  });

  if (!response.ok) throw new Error(`Boardlife request failed (${response.status})`);
  const items = (await response.json()) as BoardlifeApiItem[];
  return items
    .filter((item) => item.number && item.title)
    .map((item) => ({
      id: String(item.number),
      title: item.title ?? "이름 없음",
      englishTitle: item.engtitle ?? "",
      year: numberFrom(String(item.years ?? "")),
      thumbnail: item.bbs_img,
      image: item.photo,
    }));
}
