import * as cheerio from "cheerio";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const outputPath = path.join(process.cwd(), "src/data/boardlife-game-catalog.json");
const batchSize = 2;
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function parsePage(html) {
  const $ = cheerio.load(html);
  return $(".rank-row").toArray().flatMap((row) => {
    const element = $(row);
    const href = element.find("a.rc-game[href*='/game/']").attr("href") ?? "";
    const id = href.match(/\/game\/(\d+)/)?.[1];
    const title = element.find(".rank-title").first().text().replace(/\s+/g, " ").trim();
    if (!id || !title) return [];

    const yearText = element.find(".rank-title-year").first().text();
    const year = Number(yearText.match(/\d{4}/)?.[0]);
    const englishText = element.find(".rank-eng").first().text().replace(/\s+/g, " ").trim();
    const englishTitle = englishText.replace(/\s*\(\d{4}\)\s*$/, "").trim();
    const thumbnailStyle = element.find(".rank-thumb").first().attr("style") ?? "";
    const thumbnail = thumbnailStyle.match(/url\(['\"]?([^'\")]+)['\"]?\)/)?.[1];

    return [{
      id,
      title,
      englishTitle,
      ...(year ? { year } : {}),
      ...(thumbnail && !thumbnail.includes("no-game.webp") ? { thumbnail } : {}),
    }];
  });
}

async function fetchPage(page) {
  for (let attempt = 1; attempt <= 5; attempt++) {
    const response = await fetch(`https://boardlife.co.kr/rank_ajax.php?pg=${page}`, {
      headers: {
        Accept: "text/html, */*; q=0.01",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
        Referer: "https://boardlife.co.kr/rank",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        "X-Requested-With": "XMLHttpRequest",
      },
    });
    if (response.ok) {
      return {
        page,
        entries: parsePage(await response.text()),
        hasMore: response.headers.get("x-rank-more") === "1",
      };
    }
    if (attempt === 5) throw new Error(`Boardlife rank page ${page} failed (${response.status}).`);
    const retryAfter = Number(response.headers.get("retry-after"));
    await delay(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1_000 : attempt * 5_000);
  }
  throw new Error(`Boardlife rank page ${page} failed.`);
}

const entriesById = new Map();
let firstPage = 1;
let done = false;

while (!done) {
  const pages = Array.from({ length: batchSize }, (_, index) => firstPage + index);
  const results = await Promise.all(pages.map(fetchPage));
  for (const result of results.sort((left, right) => left.page - right.page)) {
    for (const entry of result.entries) {
      if (!entriesById.has(entry.id)) entriesById.set(entry.id, entry);
    }
    if (!result.hasMore) done = true;
  }
  console.log(`SYNCED pages ${firstPage}-${firstPage + batchSize - 1}: games=${entriesById.size}`);
  firstPage += batchSize;
  if (!done) await delay(750);
}

if (entriesById.size < 20_000) {
  throw new Error(`Catalog is unexpectedly small (${entriesById.size}); refusing to overwrite the verified catalog.`);
}

const payload = {
  generatedAt: new Date().toISOString(),
  source: "https://boardlife.co.kr/rank_ajax.php",
  games: [...entriesById.values()],
};
await writeFile(outputPath, `${JSON.stringify(payload)}\n`);
console.log(`WROTE ${outputPath}: ${payload.games.length} games`);
