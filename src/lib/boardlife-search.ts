import type { BoardlifeSearchResult } from "@/lib/types";

const BOARDLIFE_SEARCH_URL = "https://boardlife.co.kr/search_autocomplete.php";
const REQUEST_TIMEOUT_MS = 8_000;

type BoardlifeApiItem = {
  number?: string | number;
  title?: string;
  eng?: string;
  engtitle?: string;
  year?: string | number;
  years?: string | number;
  thumb?: string;
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
      englishTitle: item.eng ?? item.engtitle ?? "",
      year: numberFrom(String(item.year ?? item.years ?? "")),
      thumbnail: item.thumb ?? item.bbs_img,
      image: item.photo,
    }));
}

export async function searchBoardlife(word: string): Promise<BoardlifeSearchResult[]> {
  const normalizedWord = word.trim();
  if (!normalizedWord) return [];

  const response = await fetch(`${BOARDLIFE_SEARCH_URL}?query=${encodeURIComponent(normalizedWord)}`, {
    cache: "no-store",
    headers: {
      Accept: "application/json, text/javascript, */*; q=0.01",
      "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
      Referer: "https://boardlife.co.kr/",
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
      "X-Requested-With": "XMLHttpRequest",
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (response.headers.get("cf-mitigated") === "challenge") {
    throw new Error("Boardlife returned a Cloudflare challenge page.");
  }
  if (!response.ok) throw new Error(`Boardlife request failed (${response.status}).`);

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error(`Boardlife returned an unexpected content type (${contentType || "unknown"}).`);
  }

  const payload = await response.json() as { results?: BoardlifeApiItem[] };
  if (!Array.isArray(payload.results)) throw new Error("Boardlife returned an invalid search response.");
  return mapSearchItems(payload.results);
}
