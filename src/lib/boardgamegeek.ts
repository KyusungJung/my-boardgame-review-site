import type { BoardGameMetadata, BoardlifeSearchResult } from "@/lib/types";

const REQUEST_TIMEOUT_MS = 12_000;
const RETRY_DELAY_MS = 250;

type BoardGameGeekMetadata = Partial<Pick<BoardGameMetadata, "year" | "image" | "thumbnail" | "minPlayers" | "maxPlayers" | "bestPlayers" | "minAge" | "playTime" | "complexity" | "boardlifeRating">>;

function numberFrom(value?: string) {
  const match = value?.match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : undefined;
}

function normalizedTitle(value: string) {
  return value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function titleTokens(value: string) {
  return normalizedTitle(value).split(/\s+/).filter((token) => token.length > 1);
}

function bestBoardGameGeekLink(markdown: string, query: string) {
  const tokens = titleTokens(query);
  const links = [...markdown.matchAll(/https?:\/\/boardgamegeek\.com\/boardgame(?:expansion)?\/(\d+)\/([a-z0-9-]+)/g)].map((match) => ({
    id: match[1],
    slug: match[2],
    url: match[0],
  }));

  const exactLink = links.find((link) => {
    const slugText = normalizedTitle(link.slug);
    return tokens.length > 0 && tokens.every((token) => slugText.includes(token));
  });
  return exactLink ?? (tokens.length ? undefined : links[0]);
}

async function findBoardGameGeekLink(query: string) {
  const searchUrl = `https://r.jina.ai/http://www.ecosia.org/search?q=${encodeURIComponent(`${query} boardgamegeek`)}`;
  const response = await fetchWithRetry(searchUrl);
  if (!response.ok) throw new Error(`BoardGameGeek search fallback failed (${response.status})`);
  const ecosiaLink = bestBoardGameGeekLink(await response.text(), query);
  if (ecosiaLink) return ecosiaLink;

  const naverResponse = await fetch(`https://search.naver.com/search.naver?query=${encodeURIComponent(`"${query}" boardgamegeek`)}`, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36", "Accept-Language": "en-US,en;q=0.9" },
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!naverResponse.ok) throw new Error(`BoardGameGeek Naver fallback failed (${naverResponse.status})`);
  return bestBoardGameGeekLink(await naverResponse.text(), query);
}

async function fetchWithRetry(url: string) {
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
      if (response.ok || attempt === 1) return response;
    } catch (error) {
      lastError = error;
      if (attempt === 1) throw error;
    }

    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
  }

  throw lastError ?? new Error("BoardGameGeek request failed.");
}

function parseBoardGameGeekMarkdown(markdown: string): BoardGameGeekMetadata {
  const titleLine = markdown.match(/^# \[[^\]]+\]\(https?:\/\/boardgamegeek\.com\/boardgame(?:expansion)?\/\d+\/[^)]+\)\s*\((19\d{2}|20\d{2})\)/m);
  const coverImage = markdown.match(/\[!\[[^\]]*Cover Artwork[^\]]*\]\((https:\/\/cf\.geekdo-images\.com\/[^\n]+?pic\d+\.(?:jpg|png|webp))\)\]/i)?.[1]
    ?? markdown.match(/https:\/\/cf\.geekdo-images\.com\/[^\s\]]*pic\d+\.(?:jpg|png|webp)/i)?.[0];
  const playerMatch = markdown.match(/(\d+)\s*[–-]\s*(\d+)\s*Players/i);
  const bestMatch = markdown.match(/Best:\s*(\d+)/i);
  const playTimeMatch = markdown.match(/(\d+)\s*Min\s*\n\s*Playing Time/i);
  const ageMatch = markdown.match(/Age:\s*(\d+)\+/i);
  const complexityMatch = markdown.match(/Weight:\s*[^0-9]*(\d+(?:\.\d+)?)\s*\/\s*5/i);
  const ratingMatch = markdown.match(/\[(\d+(?:\.\d+)?)\s*--\]\(https?:\/\/boardgamegeek\.com\/boardgame\/\d+\/[^)]+\/ratings/);

  return {
    year: numberFrom(titleLine?.[1]),
    image: coverImage,
    thumbnail: coverImage,
    minPlayers: numberFrom(playerMatch?.[1]),
    maxPlayers: numberFrom(playerMatch?.[2]),
    bestPlayers: numberFrom(bestMatch?.[1]),
    minAge: numberFrom(ageMatch?.[1]),
    playTime: playTimeMatch?.[1] ? `${playTimeMatch[1]}분` : undefined,
    complexity: numberFrom(complexityMatch?.[1]),
    boardlifeRating: numberFrom(ratingMatch?.[1]),
  };
}

function descriptionFromBoardGameGeekMarkdown(markdown: string) {
  const classificationIndex = markdown.lastIndexOf("### Classification");
  const awardsIndex = markdown.search(/\n(?:AWARDS -|### Awards & Honors|### Official Links)/);
  if (classificationIndex === -1 || awardsIndex <= classificationIndex) return undefined;

  const paragraphs = markdown.slice(classificationIndex, awardsIndex)
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\[_?\*{0,2}([^\]]+?)_?\*{0,2}\]\([^)]+\)/g, "$1").replace(/[_*]/g, "").replace(/\s+/g, " ").trim())
    .filter((paragraph) => paragraph.length >= 80 && !paragraph.startsWith("#") && !paragraph.startsWith("*"));
  const narrativeParagraphs = paragraphs.filter((paragraph) => {
    if (!/[.!?]$/.test(paragraph)) return false;
    return !/^(?:The first printing|Contains \d+|This expansion contains)\b|\bPromo\s*\d+\b/i.test(paragraph);
  });
  const description = narrativeParagraphs.slice(0, 2).join(" ");
  return description.length >= 80 ? description.slice(0, 1500) : undefined;
}

async function translateToKorean(text: string) {
  const response = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ko&dt=t&q=${encodeURIComponent(text)}`, { cache: "no-store", signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  if (!response.ok) throw new Error(`Translation fallback failed (${response.status})`);
  const result = await response.json() as Array<Array<[string]>>;
  const translated = result[0]?.map(([segment]) => segment).join("").replace(/\s+/g, " ").trim();
  return translated?.slice(0, 1500);
}

async function getBoardGameGeekMarkdown(query?: string) {
  const normalizedQuery = query?.trim();
  if (!normalizedQuery) return undefined;
  const link = await findBoardGameGeekLink(normalizedQuery);
  if (!link) return undefined;

  const response = await fetchWithRetry(`https://r.jina.ai/http://boardgamegeek.com/boardgame/${link.id}/${link.slug}`);
  if (!response.ok) throw new Error(`BoardGameGeek detail fallback failed (${response.status})`);
  return response.text();
}

export async function getBoardGameGeekMetadata(query?: string): Promise<BoardGameGeekMetadata | undefined> {
  const markdown = await getBoardGameGeekMarkdown(query);
  if (!markdown) return undefined;
  const metadata = parseBoardGameGeekMarkdown(markdown);
  return Object.values(metadata).some((value) => value !== undefined) ? metadata : undefined;
}

export async function getBoardGameGeekDescription(query?: string) {
  const markdown = await getBoardGameGeekMarkdown(query);
  const description = markdown ? descriptionFromBoardGameGeekMarkdown(markdown) : undefined;
  if (!description) return undefined;
  return translateToKorean(description).catch(() => description);
}

export async function enrichSearchResultWithBoardGameGeek(result: BoardlifeSearchResult): Promise<BoardlifeSearchResult> {
  if ((result.year && result.image) || !result.englishTitle) return result;
  const metadata = await getBoardGameGeekMetadata(result.englishTitle).catch(() => undefined);
  return metadata ? {
    ...result,
    year: result.year ?? metadata.year,
    image: result.image ?? metadata.image,
    thumbnail: result.thumbnail ?? metadata.thumbnail ?? metadata.image,
  } : result;
}

export async function enrichMetadataWithBoardGameGeek(metadata: BoardGameMetadata): Promise<BoardGameMetadata> {
  if (metadata.minPlayers && metadata.maxPlayers && metadata.playTime && metadata.minAge) return metadata;
  const query = metadata.englishTitle || metadata.title;
  const fallback = await getBoardGameGeekMetadata(query).catch(() => undefined);
  if (!fallback) return metadata;

  return {
    ...metadata,
    year: metadata.year ?? fallback.year,
    image: metadata.image ?? fallback.image,
    thumbnail: metadata.thumbnail ?? fallback.thumbnail ?? fallback.image,
    minPlayers: metadata.minPlayers ?? fallback.minPlayers,
    maxPlayers: metadata.maxPlayers ?? fallback.maxPlayers,
    bestPlayers: metadata.bestPlayers ?? fallback.bestPlayers,
    minAge: metadata.minAge ?? fallback.minAge,
    playTime: metadata.playTime ?? fallback.playTime,
    complexity: metadata.complexity ?? fallback.complexity,
    boardlifeRating: metadata.boardlifeRating ?? fallback.boardlifeRating,
  };
}
