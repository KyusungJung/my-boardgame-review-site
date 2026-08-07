import snapshotData from "@/data/boardlife-search-snapshots.json";
import type { BoardlifeSearchResult } from "@/lib/types";

type SearchSnapshot = {
  query: string;
  results: BoardlifeSearchResult[];
};

function normalizeQuery(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase("ko").replace(/[^\p{L}\p{N}]+/gu, "");
}

const snapshots = snapshotData.queries as Record<string, SearchSnapshot>;

export function getBoardlifeSearchSnapshot(word: string) {
  const snapshot = snapshots[normalizeQuery(word)];
  return snapshot?.results.map((result) => ({ ...result }));
}

export function getBoardlifeSnapshotGame(id: string) {
  for (const snapshot of Object.values(snapshots)) {
    const result = snapshot.results.find((candidate) => candidate.id === id);
    if (result) return { ...result };
  }
  return undefined;
}
