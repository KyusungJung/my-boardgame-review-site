const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

// Run the server helpers without Next.js or a database connection.
const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...args) {
  return resolve.call(this, request.startsWith('@/') ? path.resolve(__dirname, '../src', request.slice(2)) : request, ...args);
};
require.extensions['.ts'] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText, filename);
};

const { getBoardlifeGame } = require('../src/lib/boardlife.ts');
const { getBoardGameGeekMetadata } = require('../src/lib/boardgamegeek.ts');
const { getGameCatalogMetadata } = require('../src/lib/game-catalog.ts');
const { hasUsableGameDescription } = require('../src/lib/game-description.ts');
const originalFetch = global.fetch;

(async () => {
  let searches = 0;
  global.fetch = async (url) => {
    if (String(url).startsWith('https://search.naver.com')) {
      searches += 1;
      return new Response(searches === 1 ? '<html>No results</html>' : '<a href="https://boardlife.co.kr/game/999999">테스트(Test)은 보드게임 종합 3위, 게임평점 8.4점, 난이도 2.83점으로 13세 이상 2-4명이 60분 동안 즐길 수 있는 보드게임입니다.</a>');
    }
    return new Response('Unavailable', { status: 503 });
  };
  const metadata = await getBoardlifeGame('999999', true, { title: '테스트', englishTitle: 'Test' });
  assert.equal(metadata.minPlayers, 2);
  assert.equal(metadata.maxPlayers, 4);
  assert.equal(metadata.playTime, '60분');
  assert.ok(searches >= 2, 'Empty first search must not terminate fallback search');

  let naverUsed = false;
  global.fetch = async (url) => {
    if (String(url).includes('ecosia.org')) throw new Error('Search unavailable');
    if (String(url).startsWith('https://search.naver.com')) {
      naverUsed = true;
      return new Response('https://boardgamegeek.com/boardgame/123/test-game');
    }
    return new Response('2–4 Players\n60 Min\nPlaying Time\nAge: 13+');
  };
  const bgg = await getBoardGameGeekMetadata('Test Game');
  assert.ok(naverUsed, 'Primary search failure must still try Naver');
  assert.equal(bgg.minPlayers, 2);

  global.fetch = async () => new Response('Unavailable', { status: 503 });
  const catalog = await getGameCatalogMetadata('5572', true);
  assert.equal(catalog.minPlayers, 2);
  assert.equal(catalog.maxPlayers, 4);
  assert.equal(catalog.minAge, 13);
  assert.equal(catalog.playTime, '60분');
  assert.ok(hasUsableGameDescription(catalog.description));
  assert.equal(hasUsableGameDescription('테스트(Test)의 Boardlife 등록 정보입니다. 2015년작 보드게임이며 게임 ID는 1입니다.'), false);

  global.fetch = async () => new Response('<link rel="canonical" href="https://boardlife.co.kr/game/999998"><meta name="description" content="Test은 보드게임 종합 1위, 13세 이상 2-4명이 60분 동안 즐길 수 있는 보드게임입니다."><h1>Test</h1><h2>Test Game</h2><section>게임 설명 도움말 텍스트<div class="game-description">실제 게임 설명입니다. 협력해서 목표를 달성합니다.</div></section>');
  const direct = await getBoardlifeGame('999998', true);
  assert.equal(direct.description, '실제 게임 설명입니다. 협력해서 목표를 달성합니다.');
  assert.equal(direct.minPlayers, 2);
  console.log('Metadata regression checks passed (fallback search, BGG failover, offline catalog, description parsing).');
})().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => { global.fetch = originalFetch; });
