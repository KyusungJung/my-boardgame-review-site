import type { CollectionGame, MeetingRecommendation } from "@/lib/types";

const HOTNESS_URL = "https://r.jina.ai/http://boardgamegeek.com/hotness";
const HOTNESS_CACHE_TTL = 1000 * 60 * 30;

type HotnessCache = { expiresAt: number; titles: string[]; fetchedAt: string };

let hotnessCache: HotnessCache | undefined;

export type MeetingRecommendationOptions = {
  people: number;
  familyGameOnly: boolean;
  playStyle: "strategy" | "balanced" | "party";
  preferredMechanisms: string[];
  limitMode: "duration" | "count";
  duration: number;
  count: number;
};

const strategyTags = ["전략게임", "자원 승점", "엔진 빌딩", "일꾼 놓기", "덱,백,풀 빌딩", "영역 건설"];
const partyTags = ["파티게임", "파티 게임", "운걸기", "주사위 굴림", "협력 게임", "어린이게임"];
const familyTags = ["가족게임", "가족 게임", "어린이게임", "어린이 게임"];
const mechanismTags: Record<string, string[]> = {
  "일꾼 놓기": ["일꾼 놓기"], "오픈 드래프팅": ["오픈 드래프팅", "드래프팅"], "운과 주사위": ["운걸기", "주사위 굴림", "주사위"], "덱 빌딩": ["덱,백,풀 빌딩"], "타일 놓기": ["타일 놓기", "영역 건설"], "셋 컬렉션": ["셋 컬렉션"], "협력 게임": ["협력 게임"], "카드 게임": ["카드 게임", "핸드 관리"],
};

function normalizedTitle(value: string) {
  return value.toLocaleLowerCase("en").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function estimatePlayTimeMinutes(playTime?: string) {
  const values = playTime?.match(/\d+/g)?.map(Number).filter((value) => Number.isFinite(value) && value > 0) ?? [];
  return values.length >= 2 ? Math.round((values[0] + values[1]) / 2) : values[0] ?? 30;
}

function hasAnyTag(game: CollectionGame, tags: string[]) {
  return game.tags.some((tag) => tags.includes(tag));
}

export async function getBoardGameGeekHotness(forceRefresh = false) {
  if (!forceRefresh && hotnessCache && hotnessCache.expiresAt > Date.now()) return { available: true, titles: hotnessCache.titles, fetchedAt: hotnessCache.fetchedAt };
  try {
    const response = await fetch(HOTNESS_URL, { cache: "no-store", signal: AbortSignal.timeout(12_000) });
    if (!response.ok) throw new Error("BoardGameGeek Hotness request failed.");
    const markdown = await response.text();
    const titles = [...new Set([...markdown.matchAll(/## \[([^\]]+)\]\(https:\/\/boardgamegeek\.com\/boardgame(?:expansion)?\/\d+\/[^)]+\)/g)].map((match) => match[1].trim()).filter(Boolean))].slice(0, 100);
    if (!titles.length) throw new Error("BoardGameGeek Hotness returned no games.");
    const fetchedAt = new Date().toISOString();
    hotnessCache = { titles, fetchedAt, expiresAt: Date.now() + HOTNESS_CACHE_TTL };
    return { available: true, titles, fetchedAt };
  } catch {
    return { available: false, titles: [], fetchedAt: new Date().toISOString() };
  }
}

export function rankMeetingGames(games: CollectionGame[], options: MeetingRecommendationOptions, hotnessTitles: string[]): MeetingRecommendation[] {
  const hotnessRank = new Map(hotnessTitles.map((title, index) => [normalizedTitle(title), index + 1]));
  const ranked = games.filter((game) => game.status === "owned" && (game.minPlayers ?? 1) <= options.people && (game.maxPlayers ?? 99) >= options.people && (!options.familyGameOnly || hasAnyTag(game, familyTags))).map((game) => {
    const hasStrategyTag = hasAnyTag(game, strategyTags);
    const hasPartyTag = hasAnyTag(game, partyTags);
    const matchedMechanisms = options.preferredMechanisms.filter((mechanism) => (mechanismTags[mechanism] ?? []).some((tag) => game.tags.includes(tag)));
    const hotnessPosition = hotnessRank.get(normalizedTitle(game.englishTitle)) ?? hotnessRank.get(normalizedTitle(game.title));
    const weightBreakdown = {
      playerFit: game.bestPlayers === options.people ? 10 : 5,
      personalRating: (game.personalRating ?? 0) * 2,
      playHistory: Math.min(game.plays, 12) * 0.5,
      metadataRating: Math.min(game.boardlifeRating ?? 0, 10) * 0.7,
      mechanism: matchedMechanisms.length * 5,
      playStyle: options.playStyle === "strategy" ? (hasStrategyTag ? 6 : 0) : options.playStyle === "party" ? (hasPartyTag ? 6 : 0) : (hasStrategyTag ? 2 : 0) + (hasPartyTag ? 2 : 0),
      externalTrend: hotnessPosition ? Math.max(1, 7 - Math.floor((hotnessPosition - 1) / 15)) : 0,
    };
    const recommendationWeight = Math.min(3, Math.max(0.25, game.recommendationWeight ?? 1));
    const score = Number((Object.values(weightBreakdown).reduce((sum, value) => sum + value, 0) * recommendationWeight).toFixed(2));
    const reasons = [game.bestPlayers === options.people ? `${options.people}명 베스트` : `${game.minPlayers ?? 1}-${game.maxPlayers ?? "?"}명 가능`, ...matchedMechanisms, ...(hotnessPosition ? [`BGG Hotness ${hotnessPosition}위`] : []), ...(recommendationWeight !== 1 ? [`추천 가중치 ${recommendationWeight.toFixed(2)}x`] : [])];
    if (reasons.length === 1) reasons.push(options.playStyle === "strategy" && hasStrategyTag ? "전략형 성향" : options.playStyle === "party" && hasPartyTag ? "파티형 성향" : "균형 성향");
    return { game, score, reasons, weightBreakdown };
  });
  const sorted = ranked.toSorted((first, second) => second.score - first.score || (second.game.personalRating ?? 0) - (first.game.personalRating ?? 0) || second.game.plays - first.game.plays);
  if (options.limitMode === "count") return sorted.slice(0, options.count);
  let usedMinutes = 0;
  const selected: MeetingRecommendation[] = [];
  for (const recommendation of sorted) {
    const minutes = estimatePlayTimeMinutes(recommendation.game.playTime);
    if (selected.length > 0 && usedMinutes + minutes > options.duration) continue;
    selected.push(recommendation);
    usedMinutes += minutes;
    if (usedMinutes >= options.duration) break;
  }
  return selected;
}
