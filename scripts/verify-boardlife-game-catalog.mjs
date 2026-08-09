import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const catalogPath = path.join(process.cwd(), "src/data/boardlife-game-catalog.json");
const catalog = JSON.parse(await readFile(catalogPath, "utf8")).games;
const queries = process.argv.slice(2).length ? process.argv.slice(2) : ["언락", "스플렌더", "카탄", "아크 노바"];

function normalize(value) {
  return value.normalize("NFKC").toLocaleLowerCase("ko").replace(/[^\p{L}\p{N}]+/gu, "");
}

let failed = false;
for (const query of queries) {
  const normalizedQuery = normalize(query);
  const catalogIds = catalog
    .filter((game) => normalize(game.title).includes(normalizedQuery) || normalize(game.englishTitle).includes(normalizedQuery))
    .map((game) => game.id)
    .sort();
  const response = await fetch(`https://boardlife.co.kr/search_autocomplete.php?query=${encodeURIComponent(query)}`);
  if (!response.ok) throw new Error(`Boardlife search failed for ${query} (${response.status}).`);
  const officialIds = (await response.json()).results.map((game) => String(game.number)).sort();
  const matches = JSON.stringify(catalogIds) === JSON.stringify(officialIds);
  console.log(`${matches ? "MATCH" : "MISMATCH"} ${query}: official=${officialIds.length}, catalog=${catalogIds.length}`);
  failed ||= !matches;
}

if (failed) process.exit(1);
