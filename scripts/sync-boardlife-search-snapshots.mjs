import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const snapshotPath = path.join(process.cwd(), "src/data/boardlife-search-snapshots.json");
const argumentsList = process.argv.slice(2);
const checkOnly = argumentsList[0] === "--check";
const requestedQueries = checkOnly ? argumentsList.slice(1) : argumentsList;

function normalizeQuery(value) {
  return value.normalize("NFKC").toLocaleLowerCase("ko").replace(/[^\p{L}\p{N}]+/gu, "");
}

function mapResults(payload) {
  if (!Array.isArray(payload.results)) throw new Error("Boardlife returned an invalid search response.");
  return payload.results.map((item) => ({
    id: String(item.number),
    title: item.title,
    englishTitle: item.eng ?? item.engtitle ?? "",
    ...(Number(item.year ?? item.years) ? { year: Number(item.year ?? item.years) } : {}),
    ...(item.thumb ?? item.bbs_img ? { thumbnail: item.thumb ?? item.bbs_img } : {}),
    ...(item.photo ? { image: item.photo } : {}),
  }));
}

async function fetchOfficialResults(query) {
  const response = await fetch(`https://boardlife.co.kr/search_autocomplete.php?query=${encodeURIComponent(query)}`, {
    headers: {
      Accept: "application/json, text/javascript, */*; q=0.01",
      "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
      Referer: "https://boardlife.co.kr/",
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
      "X-Requested-With": "XMLHttpRequest",
    },
  });
  if (!response.ok) throw new Error(`Boardlife request failed for ${query} (${response.status}).`);
  return mapResults(await response.json());
}

const snapshot = JSON.parse(await readFile(snapshotPath, "utf8"));
const queries = checkOnly && !requestedQueries.length
  ? Object.values(snapshot.queries).map(({ query }) => query)
  : requestedQueries;
if (!queries.length) {
  console.error("Usage: npm run catalog:sync -- <query...>");
  process.exit(1);
}
let failed = false;

for (const query of queries) {
  const key = normalizeQuery(query);
  const officialResults = await fetchOfficialResults(query);
  if (checkOnly) {
    const storedResults = snapshot.queries[key]?.results;
    const matches = JSON.stringify(storedResults) === JSON.stringify(officialResults);
    console.log(`${matches ? "MATCH" : "MISMATCH"} ${query}: official=${officialResults.length}, snapshot=${storedResults?.length ?? 0}`);
    failed ||= !matches;
  } else {
    snapshot.queries[key] = { query, results: officialResults };
    console.log(`SYNCED ${query}: ${officialResults.length}`);
  }
}

if (checkOnly) {
  if (failed) process.exit(1);
} else {
  snapshot.generatedAt = new Date().toISOString();
  const sortedQueries = Object.fromEntries(Object.entries(snapshot.queries).sort(([left], [right]) => left.localeCompare(right, "ko")));
  await writeFile(snapshotPath, `${JSON.stringify({ ...snapshot, queries: sortedQueries }, null, 2)}\n`);
}
