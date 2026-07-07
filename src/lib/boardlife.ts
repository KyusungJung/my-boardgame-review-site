import * as cheerio from "cheerio";
import type { BoardGameMetadata, BoardlifeSearchResult } from "@/lib/types";

const BOARDLIFE_BASE_URL = "https://boardlife.co.kr";
const SEARCH_CACHE_TTL = 1000 * 60 * 10;
const DETAIL_CACHE_TTL = 1000 * 60 * 60 * 12;
const cache = new Map<string, { expiresAt: number; value: unknown }>();

type BoardlifeApiItem = {
  number?: string | number;
  title?: string;
  engtitle?: string;
  years?: string | number;
  bbs_img?: string;
  photo?: string;
};

type BoardlifeDetailSeed = Partial<Pick<BoardlifeSearchResult, "title" | "englishTitle" | "year" | "thumbnail" | "image">>;

function getCached<T>(key: string): T | undefined {
  const entry = cache.get(key);
  if (!entry || entry.expiresAt < Date.now()) {
    cache.delete(key);
    return undefined;
  }
  return entry.value as T;
}

function setCached<T>(key: string, value: T, ttl: number) {
  cache.set(key, { value, expiresAt: Date.now() + ttl });
}

function numberFrom(value?: string) {
  const match = value?.match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : undefined;
}

function rangeFrom(value?: string) {
  const match = value?.match(/(\d+)\s*[-~]\s*(\d+)/);
  return match ? { min: Number(match[1]), max: Number(match[2]) } : undefined;
}

function textAfterLabel(bodyText: string, label: string, stopLabels: string[]) {
  const start = bodyText.indexOf(label);
  if (start === -1) return undefined;
  const after = bodyText.slice(start + label.length);
  const stops = stopLabels
    .map((stopLabel) => after.indexOf(stopLabel))
    .filter((position) => position >= 0);
  return after.slice(0, stops.length ? Math.min(...stops) : 180).replace(/\s+/g, " ").trim();
}

function uniqueTags(tags: string[]) {
  return [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))];
}

function gameDescriptionFromText(bodyText: string) {
  const description = textAfterLabel(bodyText, "게임 설명", ["+ 더보기", "관련 게임", "카테고리", "테마", "진행방식", "그룹", "게임 정보", "비슷한 게임", "댓글", "추천 게임", "리뷰"])
    ?.replace(/^[:\-]\s*/, "")
    .trim();

  return description && description !== "설명글" ? description.slice(0, 1500) : undefined;
}

function gameDescriptionFromReaderText(markdown: string) {
  const lines = markdown.split(/\r?\n/).map((line) => line.trim());
  const descriptionStart = lines.findIndex((line) => line === "게임 설명");
  if (descriptionStart === -1) return undefined;

  const descriptionLines: string[] = [];
  for (let index = descriptionStart + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line) continue;
    if (
      line === "+ 더보기" ||
      /^\[평가\b/.test(line) ||
      /^\[관련 게임\]/.test(line) ||
      /^\[정보\]/.test(line) ||
      ["카테고리", "테마", "진행방식", "그룹"].includes(line)
    ) {
      break;
    }
    if (/^\[설명글\]\(https?:\/\/[^)]+\)$/.test(line)) continue;
    descriptionLines.push(line);
  }

  const description = descriptionLines
    .join(" ")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();

  return description.length >= 20 ? description.slice(0, 1500) : undefined;
}

function metadataSummaryDescription({
  title,
  englishTitle,
  minPlayers,
  maxPlayers,
  minAge,
  playTime,
  complexity,
}: Pick<BoardGameMetadata, "title" | "englishTitle" | "minPlayers" | "maxPlayers" | "minAge" | "playTime" | "complexity">) {
  const titleWithEnglish = englishTitle ? `${title}(${englishTitle})` : title;
  const players = minPlayers && maxPlayers ? `${minPlayers}-${maxPlayers}명` : "여러 명";
  const age = minAge ? `, ${minAge}세 이상` : "";
  const duration = playTime ? ` ${playTime} 동안` : "";
  const difficulty = complexity ? ` 난이도는 ${complexity.toFixed(2)}점입니다.` : "";
  return `${titleWithEnglish}은(는) Boardlife 등록 정보 기준 ${players}${age}이${duration} 즐길 수 있는 보드게임입니다.${difficulty}`;
}

function readerTags(bodyText: string) {
  return uniqueTags([...bodyText.matchAll(/\[([^\]]+)\]\(https?:\/\/boardlife\.co\.kr\/info\/(?:type|category|mechanisms)\/\d+\)/g)].map((match) => match[1]));
}

function isChallengePageText(text: string) {
  return /just a moment|performing security verification|cloudflare|cf-browser-verification|enable javascript/i.test(text);
}

function isUsableBoardlifeGamePage($: cheerio.CheerioAPI, id: string, bodyText: string) {
  const canonical = $("link[rel='canonical']").attr("href") ?? "";
  const description = $("meta[name='description']").attr("content") ?? "";
  const ogTitle = $("meta[property='og:title']").attr("content") ?? "";
  return !isChallengePageText(bodyText) && canonical.includes(`/game/${id}`) && Boolean(description || ogTitle);
}

function isUsableMetadata(metadata: BoardGameMetadata) {
  return metadata.title !== "이름 없음" && metadata.englishTitle !== "boardlife.co.kr";
}

function yearFromGameText(text: string, title?: string, englishTitle?: string) {
  const escapedTitle = title?.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedEnglishTitle = englishTitle?.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const titleYearMatch = escapedTitle ? text.match(new RegExp(`${escapedTitle}.{0,80}?(19\\d{2}|20\\d{2})년`)) : undefined;
  const englishYearMatch = escapedEnglishTitle ? text.match(new RegExp(`${escapedEnglishTitle}.{0,40}?(19\\d{2}|20\\d{2})년`)) : undefined;
  const genericYearMatch = text.match(/\b(19\d{2}|20\d{2})년\s*게임평점/);
  return numberFrom(titleYearMatch?.[1] ?? englishYearMatch?.[1] ?? genericYearMatch?.[1]);
}

function metadataFromSeed(id: string, seed?: BoardlifeDetailSeed): BoardGameMetadata | undefined {
  const title = seed?.title?.trim();
  if (!title) return undefined;

  const result: BoardGameMetadata = {
    id,
    title,
    englishTitle: seed?.englishTitle?.trim() ?? "",
    year: seed?.year,
    image: seed?.image,
    thumbnail: seed?.thumbnail ?? seed?.image,
    sourceUrl: `${BOARDLIFE_BASE_URL}/game/${id}`,
    description: metadataSummaryDescription({
      title,
      englishTitle: seed?.englishTitle?.trim() ?? "",
    }),
    autoTags: [],
    sourceFetchedAt: new Date().toISOString(),
  };
  setCached(`detail:${id}`, result, DETAIL_CACHE_TTL);
  return result;
}

function parseBoardlifeSummary(id: string, summary: string, seed?: BoardlifeDetailSeed): BoardGameMetadata | undefined {
  if (!summary.includes("보드게임 종합")) return metadataFromSeed(id, seed);
  const titleMatch = summary.match(/^(.+?)(?:\(([^)]+)\))?은/);
  const title = titleMatch?.[1]?.trim() || seed?.title?.trim();
  if (!title) return undefined;

  const playerRange = rangeFrom(summary.match(/(\d+\s*[-~]\s*\d+)\s*명/)?.[1]);
  const playTime = summary.match(/(\d+\s*[-~]\s*\d+\s*분|\d+\s*분)\s*동안/)?.[1]?.replace(/\s+/g, "");
  const minAge = numberFrom(summary.match(/(\d+)\s*세\s*이상/)?.[1]);
  const complexity = numberFrom(summary.match(/난이도\s*(\d+(?:\.\d+)?)\s*점/)?.[1]);
  const boardlifeRating = numberFrom(summary.match(/게임평점\s*(\d+(?:\.\d+)?)\s*점/)?.[1]);
  const image = seed?.image ?? seed?.thumbnail;
  const englishTitle = titleMatch?.[2]?.trim() ?? seed?.englishTitle?.trim() ?? "";

  return {
    id,
    title,
    englishTitle,
    year: seed?.year ?? yearFromGameText(summary, title, englishTitle),
    image,
    thumbnail: seed?.thumbnail ?? image,
    sourceUrl: `${BOARDLIFE_BASE_URL}/game/${id}`,
    minPlayers: playerRange?.min,
    maxPlayers: playerRange?.max,
    minAge,
    playTime,
    complexity,
    boardlifeRating,
    description: summary.slice(0, 1500),
    autoTags: [],
    sourceFetchedAt: new Date().toISOString(),
  };
}

async function fetchBoardlife(path: string) {
  const response = await fetch(`${BOARDLIFE_BASE_URL}${path}`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,application/json,text/plain,*/*;q=0.8",
      "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
      Referer: "https://boardlife.co.kr/",
      Cookie: "happy_mobile=off",
    },
    next: { revalidate: 600 },
  });

  if (response.headers.get("cf-mitigated") === "challenge") throw new Error("Boardlife returned a Cloudflare challenge page.");
  if (!response.ok) throw new Error(`Boardlife request failed (${response.status})`);
  return response;
}

async function getBoardlifeGameThroughReader(id: string): Promise<BoardGameMetadata> {
  const sourceUrl = `${BOARDLIFE_BASE_URL}/game/${id}`;
  const response = await fetch(`https://r.jina.ai/http://${sourceUrl.replace(/^https?:\/\//, "")}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Boardlife fallback request failed (${response.status})`);

  const bodyText = await response.text();
  const titleMatches = [...bodyText.matchAll(/^# (.+?) 보드게임$/gm)];
  const title = titleMatches.at(-1)?.[1] ?? "이름 없음";
  const playerSection = textAfterLabel(bodyText, "인원", ["플레이 시간", "사용 연령", "credit 정보"]);
  const playerRange = rangeFrom(playerSection);
  const bestMatch = playerSection?.match(/베스트\s*:\s*(\d+)인/);
  const recommendedMatch = playerSection?.match(/추천\s*:\s*([^\)\s]+)/);
  const playTime = textAfterLabel(bodyText, "플레이 시간", ["사용 연령", "credit 정보", "링크 정보"]);
  const ageSection = textAfterLabel(bodyText, "사용 연령", ["credit 정보", "링크 정보", "게임 설명"]);
  const englishTitle = bodyText.match(/^## ([A-Za-z][^\n]+)$/m)?.[1] ?? "";
  const image = bodyText.match(/https?:\/\/img\.boardlife\.co\.kr\/[^\s)]+_w300\.[a-zA-Z0-9]+/)?.[0];
  const year = yearFromGameText(bodyText, title, englishTitle);
  const result: BoardGameMetadata = {
    id,
    title,
    englishTitle,
    year,
    image,
    thumbnail: image,
    sourceUrl,
    minPlayers: playerRange?.min,
    maxPlayers: playerRange?.max,
    bestPlayers: bestMatch ? Number(bestMatch[1]) : undefined,
    recommendedPlayers: recommendedMatch?.[1],
    minAge: numberFrom(ageSection),
    playTime: playTime?.slice(0, 30),
    complexity: numberFrom(bodyText.match(/난이도\s*(\d+(?:\.\d+)?)/)?.[1]),
    boardlifeRating: numberFrom(bodyText.match(/평점\s*(\d+(?:\.\d+)?)/)?.[1]),
    languageDependency: bodyText.match(/언어의존도\s*([^\n]+)/)?.[1]?.slice(0, 24),
    description: gameDescriptionFromReaderText(bodyText) ?? metadataSummaryDescription({
      title,
      englishTitle,
      minPlayers: playerRange?.min,
      maxPlayers: playerRange?.max,
      minAge: numberFrom(ageSection),
      playTime: playTime?.slice(0, 30),
      complexity: numberFrom(bodyText.match(/난이도\s*(\d+(?:\.\d+)?)/)?.[1]),
    }),
    autoTags: readerTags(bodyText),
    sourceFetchedAt: new Date().toISOString(),
  };
  if (isUsableMetadata(result)) setCached(`detail:${id}`, result, DETAIL_CACHE_TTL);
  return result;
}

async function getBoardlifeGameThroughNaver(id: string, seed?: BoardlifeDetailSeed): Promise<BoardGameMetadata> {
  const queries = [
    `https://boardlife.co.kr/game/${id}`,
    `site:boardlife.co.kr/game/${id} 보드라이프`,
    seed?.title ? `site:boardlife.co.kr/game ${seed.title}` : "",
    seed?.englishTitle ? `site:boardlife.co.kr/game ${seed.englishTitle}` : "",
  ].filter(Boolean);

  for (const query of queries) {
    const result = await getBoardlifeGameFromNaverQuery(id, query, seed).catch(() => undefined);
    if (result) return result;
  }

  const seeded = metadataFromSeed(id, seed);
  if (seeded) return seeded;
  throw new Error("Naver detail fallback returned no usable game summary.");
}

async function getBoardlifeGameFromNaverQuery(id: string, query: string, seed?: BoardlifeDetailSeed): Promise<BoardGameMetadata> {
  const searchUrl = `https://search.naver.com/search.naver?query=${encodeURIComponent(query)}`;
  const response = await fetch(searchUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
      "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
    },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Naver detail fallback request failed (${response.status})`);

  const $ = cheerio.load(await response.text());
  let image = seed?.image ?? seed?.thumbnail;
  let summary = "";

  $(`a[href*='boardlife.co.kr/game/${id}']`).each((_, element) => {
    const text = $(element).text().replace(/\s+/g, " ").trim();
    if (!summary && text.includes("보드게임 종합")) {
      summary = text;
      const container = $(element).parents().toArray().slice(0, 6).find((parent) => $(parent).find("img[src]").filter((__, imageElement) => !(($(imageElement).attr("src") ?? "").includes("favicon"))).length);
      image = container ? $(container).find("img[src]").filter((__, imageElement) => !(($(imageElement).attr("src") ?? "").includes("favicon"))).first().attr("src") : undefined;
    }
  });

  if (!summary && seed?.title) {
    const bodyText = $("body").text().replace(/\s+/g, " ");
    const titleIndex = bodyText.indexOf(seed.title);
    summary = titleIndex >= 0 ? bodyText.slice(titleIndex, titleIndex + 700) : "";
  }

  const result = parseBoardlifeSummary(id, summary, { ...seed, image });
  if (!result) throw new Error("Naver detail fallback returned no usable game summary.");
  setCached(`detail:${id}`, result, DETAIL_CACHE_TTL);
  return result;
}

async function getBoardlifeGameFallback(id: string, seed?: BoardlifeDetailSeed) {
  try {
    const readerResult = await getBoardlifeGameThroughReader(id);
    if (isUsableMetadata(readerResult)) return readerResult;
  } catch {
    // Fall through to the search-result based fallback.
  }
  return getBoardlifeGameThroughNaver(id, seed);
}

export async function searchBoardlife(word: string): Promise<BoardlifeSearchResult[]> {
  const normalizedWord = word.trim();
  if (!normalizedWord) return [];

  const key = `search:${normalizedWord.toLowerCase()}`;
  const cached = getCached<BoardlifeSearchResult[]>(key);
  if (cached) return cached;

  const response = await fetchBoardlife(`/get_auto_search.php?word=${encodeURIComponent(normalizedWord)}`);
  const items = (await response.json()) as BoardlifeApiItem[];
  const results = items
    .filter((item) => item.number && item.title)
    .map((item) => ({
      id: String(item.number),
      title: item.title ?? "이름 없음",
      englishTitle: item.engtitle ?? "",
      year: numberFrom(String(item.years ?? "")),
      thumbnail: item.bbs_img,
      image: item.photo,
    }));

  setCached(key, results, SEARCH_CACHE_TTL);
  return results;
}

export async function getBoardlifeGame(id: string, forceRefresh = false, seed?: BoardlifeDetailSeed): Promise<BoardGameMetadata> {
  const key = `detail:${id}`;
  const cached = getCached<BoardGameMetadata>(key);
  if (cached && !forceRefresh && (isUsableMetadata(cached) || !seed?.title)) return cached;

  let html: string;
  try {
    const response = await fetchBoardlife(`/game/${encodeURIComponent(id)}`);
    html = await response.text();
  } catch {
    return getBoardlifeGameFallback(id, seed);
  }
  const $ = cheerio.load(html);
  const bodyText = $("body").text().replace(/\s+/g, " ");
  if (!isUsableBoardlifeGamePage($, id, bodyText)) return getBoardlifeGameFallback(id, seed);

  const title = $("h1").first().text().replace(/보드게임$/, "").trim() || "이름 없음";
  const image = $("meta[property='og:image']").attr("content") || $("img").filter((_, imageElement) => ($(imageElement).attr("src") ?? "").includes("_w300")).first().attr("src");
  const descriptionText = $("meta[name='description']").attr("content") ?? "";
  const metadataText = `${descriptionText} ${bodyText}`;
  const playerSection = textAfterLabel(bodyText, "인원", ["플레이 시간", "사용 연령", "credit 정보"]);
  const playerRange = rangeFrom(playerSection);
  const bestMatch = playerSection?.match(/베스트\s*:\s*(\d+)인/);
  const recommendedMatch = playerSection?.match(/추천\s*:\s*([^\)\s]+)/);
  const playTime = textAfterLabel(bodyText, "플레이 시간", ["사용 연령", "credit 정보", "링크 정보"]);
  const ageSection = textAfterLabel(bodyText, "사용 연령", ["credit 정보", "링크 정보", "게임 설명"]);
  const ratingMatch = metadataText.match(/게임평점\s*(\d+(?:\.\d+)?)점/);
  const complexityMatch = metadataText.match(/난이도\s*(\d+(?:\.\d+)?)\s*점/);
  const languageDependency = textAfterLabel(bodyText, "언어의존도", ["편집", "주요 정보", "인원"]);
  const description = gameDescriptionFromText(bodyText) ?? descriptionText.trim();
  const headingTexts = $("h1, h2, h3").map((_, element) => $(element).text().trim()).get();
  const englishTitle = headingTexts.find((heading) => /[A-Za-z]{3,}/.test(heading) && heading !== title) ?? "";
  const autoTags = uniqueTags($("a").filter((_, element) => /\/info\/(type|category|mechanisms)\/\d+/.test($(element).attr("href") ?? "")).map((_, element) => $(element).text()).get());
  const year = yearFromGameText(bodyText, title, englishTitle);

  const result: BoardGameMetadata = {
    id,
    title,
    englishTitle,
    year,
    image,
    thumbnail: image,
    sourceUrl: `${BOARDLIFE_BASE_URL}/game/${id}`,
    minPlayers: playerRange?.min,
    maxPlayers: playerRange?.max,
    bestPlayers: bestMatch ? Number(bestMatch[1]) : undefined,
    recommendedPlayers: recommendedMatch?.[1],
    minAge: numberFrom(ageSection),
    playTime: playTime?.slice(0, 30),
    complexity: complexityMatch ? Number(complexityMatch[1]) : undefined,
    boardlifeRating: ratingMatch ? Number(ratingMatch[1]) : undefined,
    languageDependency: languageDependency?.slice(0, 24),
    description: description || metadataSummaryDescription({
      title,
      englishTitle,
      minPlayers: playerRange?.min,
      maxPlayers: playerRange?.max,
      minAge: numberFrom(ageSection),
      playTime: playTime?.slice(0, 30),
      complexity: complexityMatch ? Number(complexityMatch[1]) : undefined,
    }),
    autoTags,
    sourceFetchedAt: new Date().toISOString(),
  };

  setCached(key, result, DETAIL_CACHE_TTL);
  return result;
}
