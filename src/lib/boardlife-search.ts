import type { BoardlifeSearchResult } from "@/lib/types";
import { enrichSearchResultWithBoardGameGeek } from "@/lib/boardgamegeek";
import * as cheerio from "cheerio";

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

function normalizeNaverTitle(text: string) {
  const title = text
    .replace(/\s+/g, " ")
    .replace(/\s*-\s*보드라이프.*$/, "")
    .replace(/\s*\|\s*보드게임.*$/, "")
    .replace(/\s*게임정보$/, "")
    .replace(/\s*평가$/, "")
    .trim();

  if (!title || title.includes("boardlife.co.kr") || title.startsWith("보드라이프") || title.length > 60) return undefined;
  return title;
}

function normalizedSearchText(value: string) {
  return value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function compactSearchText(value: string) {
  return normalizedSearchText(value).replace(/\s+/g, "");
}

function isRelevantSearchResult(result: BoardlifeSearchResult, word: string) {
  const tokens = normalizedSearchText(word).split(/\s+/).filter((token) => token.length > 1);
  if (!tokens.length) return true;

  const candidateText = normalizedSearchText(`${result.title} ${result.englishTitle}`);
  return tokens.every((token) => candidateText.includes(token));
}

function addSearchResult(results: Map<string, BoardlifeSearchResult>, result: BoardlifeSearchResult) {
  const current = results.get(result.id);
  results.set(result.id, {
    ...current,
    ...result,
    englishTitle: result.englishTitle || current?.englishTitle || "",
    year: result.year ?? current?.year,
    image: result.image ?? current?.image,
    thumbnail: result.thumbnail ?? current?.thumbnail,
  });
}

function boardlifeHeaders(cookie?: string) {
  return {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    Accept: "application/json, text/javascript, */*; q=0.01",
    "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
    Origin: BOARDLIFE_BASE_URL,
    Referer: `${BOARDLIFE_BASE_URL}/`,
    "X-Requested-With": "XMLHttpRequest",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",
    Cookie: cookie ? `${cookie}; happy_mobile=off` : "happy_mobile=off",
  };
}

async function fetchBoardlifeCookieHeader() {
  const response = await fetch(BOARDLIFE_BASE_URL, {
    headers: boardlifeHeaders(),
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const getSetCookie = (response.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie;
  const setCookies = getSetCookie ? getSetCookie.call(response.headers) : response.headers.get("set-cookie")?.split(/,(?=[^;,]+=)/) ?? [];
  return setCookies.map((cookie) => cookie.split(";")[0]).filter(Boolean).join("; ");
}

async function fetchSearchItems(url: string) {
  const response = await fetch(url, {
    headers: boardlifeHeaders(),
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (response.headers.get("cf-mitigated") === "challenge") throw new Error("Boardlife returned a Cloudflare challenge page.");
  if (!response.ok) throw new Error(`Boardlife request failed (${response.status})`);
  return parseSearchItems(await response.text());
}

async function fetchSearchItemsWithSession(url: string) {
  const cookie = await fetchBoardlifeCookieHeader();
  if (!cookie) throw new Error("Boardlife session cookie was not issued.");
  const response = await fetch(url, {
    headers: boardlifeHeaders(cookie),
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (response.headers.get("cf-mitigated") === "challenge") throw new Error("Boardlife returned a Cloudflare challenge page.");
  if (!response.ok) throw new Error(`Boardlife session request failed (${response.status})`);
  return parseSearchItems(await response.text());
}

async function fetchSearchItemsThroughReader(boardlifeUrl: string) {
  const response = await fetch(`https://r.jina.ai/http://${boardlifeUrl.replace(/^https?:\/\//, "")}`, { cache: "no-store", signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  if (!response.ok) throw new Error(`Boardlife fallback request failed (${response.status})`);

  const body = await response.text();
  return parseSearchItems(body);
}

async function searchBoardlifeThroughNaver(word: string) {
  const searchUrl = `https://search.naver.com/search.naver?query=${encodeURIComponent(`site:boardlife.co.kr/game ${word}`)}`;
  const response = await fetch(searchUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
      "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Naver fallback request failed (${response.status})`);

  const $ = cheerio.load(await response.text());
  const results = new Map<string, BoardlifeSearchResult>();
  const linkEntries = $("a[href*='boardlife.co.kr/game/']").toArray().map((element) => ({
    element,
    href: $(element).attr("href") ?? "",
    text: $(element).text().replace(/\s+/g, " ").trim(),
  }));

  const englishTitleById = new Map<string, string>();
  for (const entry of linkEntries) {
    const id = entry.href.match(/boardlife\.co\.kr\/game\/(\d+)/)?.[1];
    const englishTitle = entry.text.match(/\(([A-Za-z][^)]+)\)/)?.[1];
    if (id && englishTitle && !englishTitleById.has(id)) englishTitleById.set(id, englishTitle);
  }

  $("a[href*='boardlife.co.kr/game/']").each((_, element) => {
    const href = $(element).attr("href") ?? "";
    const id = href.match(/boardlife\.co\.kr\/game\/(\d+)/)?.[1];
    if (!id || results.has(id)) return;

    const title = normalizeNaverTitle($(element).text());
    if (!title) return;

    const container = $(element).parents().toArray().slice(0, 6).find((parent) => $(parent).find("img[src]").filter((__, imageElement) => !(($(imageElement).attr("src") ?? "").includes("favicon"))).length);
    const image = container ? $(container).find("img[src]").filter((__, imageElement) => !(($(imageElement).attr("src") ?? "").includes("favicon"))).first().attr("src") : undefined;

    addSearchResult(results, {
      id,
      title,
      englishTitle: englishTitleById.get(id) ?? "",
      image,
      thumbnail: image,
    });
  });

  const orderedResults = [...results.values()];
  const relevantResults = orderedResults.filter((result) => isRelevantSearchResult(result, word));
  return (relevantResults.length ? relevantResults : orderedResults).slice(0, 10);
}

function parseBoardlifeSummarySearchResults(markdown: string) {
  const results = new Map<string, BoardlifeSearchResult>();
  const linkPattern = /## \[([^\]]+)\]\(https:\/\/boardlife\.co\.kr\/game\/(\d+)\)([\s\S]*?)(?=\n## \[|\n!\[Image|\n This search result|\n\[https?:\/\/|$)/g;

  for (const match of markdown.matchAll(linkPattern)) {
    const rawTitle = match[1].replace(/\s*보드게임 정보.*$/, "").trim();
    const id = match[2];
    const summary = match[3]?.replace(/\s+/g, " ").trim() ?? "";
    const summaryTitleMatch = summary.match(/^(.+?)(?:\(([^)]+)\))?은/);
    const title = summaryTitleMatch?.[1]?.trim() || rawTitle;
    const englishTitle = summaryTitleMatch?.[2]?.trim() ?? "";
    const year = numberFrom(summary.match(/\b(19\d{2}|20\d{2})\b/)?.[1]);

    if (id && title) addSearchResult(results, { id, title, englishTitle, year });
  }

  return [...results.values()];
}

function fallbackSearchQueries(word: string) {
  const normalizedWord = word.trim();
  const queries = [`${normalizedWord} boardlife`, `${normalizedWord} 보드라이프`];
  if (compactSearchText(normalizedWord) === "백로성") queries.push(`${normalizedWord} 말차 boardlife`);
  return [...new Set(queries)];
}

async function searchBoardlifeThroughEcosia(word: string) {
  const results = new Map<string, BoardlifeSearchResult>();
  for (const query of fallbackSearchQueries(word)) {
    const response = await fetch(`https://r.jina.ai/http://www.ecosia.org/search?q=${encodeURIComponent(query)}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) continue;
    for (const result of parseBoardlifeSummarySearchResults(await response.text())) {
      if (isRelevantSearchResult(result, word)) addSearchResult(results, result);
    }
  }
  return [...results.values()];
}

export async function searchBoardlife(word: string): Promise<BoardlifeSearchResult[]> {
  const normalizedWord = word.trim();
  if (!normalizedWord) return [];

  const boardlifeUrl = `${BOARDLIFE_BASE_URL}/get_auto_search.php?word=${encodeURIComponent(normalizedWord)}`;
  try {
    return mapSearchItems(await fetchSearchItems(boardlifeUrl));
  } catch {
    try {
      return mapSearchItems(await fetchSearchItemsWithSession(boardlifeUrl));
    } catch {
      try {
        return mapSearchItems(await fetchSearchItemsThroughReader(boardlifeUrl));
      } catch {
        const fallbackResults = new Map<string, BoardlifeSearchResult>();
        const [naverResults, ecosiaResults] = await Promise.all([
          searchBoardlifeThroughNaver(normalizedWord).catch(() => []),
          searchBoardlifeThroughEcosia(normalizedWord).catch(() => []),
        ]);
        for (const result of [...naverResults, ...ecosiaResults]) addSearchResult(fallbackResults, result);
        return Promise.all([...fallbackResults.values()].map((result) => enrichSearchResultWithBoardGameGeek(result)));
      }
    }
  }
}
