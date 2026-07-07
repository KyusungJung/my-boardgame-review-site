import type { BoardlifeSearchResult } from "@/lib/types";

const BOARDLIFE_BASE_URL = "https://boardlife.co.kr";
const REQUEST_TIMEOUT_MS = 8_000;

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

function mapSearchItems(items: BoardlifeApiItem[]): BoardlifeSearchResult[] {
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

function parseSearchItems(body: string) {
  const firstBracket = body.search(/\[\s*\{/);
  const lastBracket = body.lastIndexOf("}]");
  if (firstBracket === -1 || lastBracket <= firstBracket) throw new Error(`Boardlife returned an invalid search response: ${body.slice(0, 80)}`);
  return JSON.parse(body.slice(firstBracket, lastBracket + 2)) as BoardlifeApiItem[];
}

async function fetchSearchItems(url: string) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
      Accept: "application/json, text/javascript, */*; q=0.01",
      "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
      Referer: "https://boardlife.co.kr/",
      "X-Requested-With": "XMLHttpRequest",
      Cookie: "happy_mobile=off",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Boardlife request failed (${response.status})`);
  return parseSearchItems(await response.text());
}

async function fetchSearchItemsThroughReader(boardlifeUrl: string) {
  const response = await fetch(`https://r.jina.ai/http://${boardlifeUrl.replace(/^https?:\/\//, "")}`, { cache: "no-store", signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  if (!response.ok) throw new Error(`Boardlife fallback request failed (${response.status})`);

  const body = await response.text();
  return parseSearchItems(body);
}

export async function searchBoardlife(word: string): Promise<BoardlifeSearchResult[]> {
  const normalizedWord = word.trim();
  if (!normalizedWord) return [];

  const boardlifeUrl = `${BOARDLIFE_BASE_URL}/get_auto_search.php?word=${encodeURIComponent(normalizedWord)}`;
  try {
    return mapSearchItems(await fetchSearchItems(boardlifeUrl));
  } catch {
    return mapSearchItems(await fetchSearchItemsThroughReader(boardlifeUrl));
  }
}
