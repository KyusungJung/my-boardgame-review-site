import snapshotData from "@/data/boardlife-search-snapshots.json";
import catalogData from "@/data/boardlife-game-catalog.json";
import type { BoardlifeSearchResult } from "@/lib/types";

type SearchSnapshot = {
  query: string;
  results: BoardlifeSearchResult[];
};

function normalizeQuery(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase("ko").replace(/[^\p{L}\p{N}]+/gu, "");
}

const snapshots = snapshotData.queries as Record<string, SearchSnapshot>;
const catalog = (catalogData.games as BoardlifeSearchResult[]).map((game, rank) => ({
  game,
  rank,
  normalizedTitle: normalizeQuery(game.title),
  normalizedEnglishTitle: normalizeQuery(game.englishTitle),
}));

export function getBoardlifeSearchSnapshot(word: string) {
  const snapshot = snapshots[normalizeQuery(word)];
  return snapshot?.results.map((result) => ({ ...result }));
}

export function getBoardlifeSnapshotGame(id: string) {
  for (const snapshot of Object.values(snapshots)) {
    const result = snapshot.results.find((candidate) => candidate.id === id);
    if (result) return { ...result };
  }
  const catalogGame = catalog.find(({ game }) => game.id === id)?.game;
  return catalogGame ? { ...catalogGame } : undefined;
}

export function searchBoardlifeGameCatalog(word: string) {
  const query = normalizeQuery(word);
  if (!query) return [];

  return catalog
    .flatMap((entry) => {
      const titleIndex = entry.normalizedTitle.indexOf(query);
      const englishIndex = entry.normalizedEnglishTitle.indexOf(query);
      if (titleIndex === -1 && englishIndex === -1) return [];
      const exact = entry.normalizedTitle === query || entry.normalizedEnglishTitle === query;
      return [{ ...entry, exact }];
    })
    .sort((left, right) => Number(right.exact) - Number(left.exact) || left.rank - right.rank)
    .slice(0, 100)
    .map(({ game }) => ({ ...game }));
}
