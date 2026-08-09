# 게임 카탈로그 통합 API 아키텍처

## 목적

BoardShelf가 배포된 Vercel 환경에서도 Boardlife 게임 ID와 현재 화면에서 사용하는 메타데이터를 안정적으로 조회한다. 검색 결과와 상세 결과는 기존 `BoardlifeSearchResult`, `BoardGameMetadata` 형태를 유지해 화면과 저장 로직의 변경 범위를 줄인다.

필수 검증 사례는 `뒤집어줘`, `하나비`, `이레이저`, `아게모니아` 검색 시 Boardlife autocomplete와 동일한 ID·제목·영문 제목·연도·표지를 동일한 순서로 반환하는 것이다.

| Boardlife ID | 한글 제목 | 영문 제목 | BGG ID |
| --- | --- | --- | --- |
| `18905` | 뒤집어줘! 캡틴 | Captain Flip | `393325` |
| `19591` | 뒤집어줘! 캡틴: 크라켄의 턱 | Captain Flip: In the Jaws of the Kraken | `413556` |
| `21862` | 뒤집어줘! 캡틴: 폭탄 섬 | Captain Flip: Isla Bomba | `458424` |
| `518` | 하나비 | Hanabi | `98778` |
| `8373` | 하나비: 거대한 불꽃 | Hanabi: Grands Feux | `290357` |
| `7771` | 하나비: 마스터 장인 확장 | Hanabi: Master Artisan Expansion | `183833` |
| `21483` | 이레이저 | Eraser | - |

## 확인한 문제와 시도한 방법

### Boardlife 자동완성 API 직접 호출

- 원본 엔드포인트: `https://boardlife.co.kr/search_autocomplete.php?query=...`
- 로컬 개발 환경에서는 정상 JSON을 반환했고 `뒤집어줘`에 대해 위 3개 ID를 확인했다.
- Vercel에서는 응답에 `cf-mitigated: challenge`가 포함되거나 `Just a moment...` HTML이 반환됐다. 즉, 애플리케이션 파싱 문제가 아니라 Cloudflare가 데이터센터 IP 요청을 브라우저 검증 페이지로 전환하는 문제였다.
- 홈페이지를 먼저 요청해 쿠키를 얻는 방식도 Cloudflare 세션 쿠키가 발급되지 않아 실패했다.
- Vercel 실행 리전을 서울과 미국으로 바꿔 확인했지만 결과는 같았다.
- 별도 Edge Runtime에서도 `403`, `cf-mitigated: challenge`, `Just a moment...`가 재현되어 Node 런타임이나 실행 리전 문제가 아님을 확인했다.
- `limit=100`은 동작하지만 `page`, `offset`, `start`는 모두 무시되므로 autocomplete 한 호출로 전체 카탈로그를 복제할 수 없다.

### 브라우저에서 Boardlife 직접 호출

- 실제 페이지에서 `fetch`를 실행하면 Boardlife가 BoardShelf origin을 허용하는 CORS 헤더를 제공하지 않아 `TypeError: Failed to fetch`가 발생했다.
- `no-cors` 요청은 opaque response가 되어 상태와 본문을 읽을 수 없으므로 검색 JSON 파싱에 사용할 수 없다.

### Reader, 검색 엔진, sitemap

- Jina Reader를 통한 Boardlife 접근도 Cloudflare 검증 페이지 또는 사용할 수 없는 본문을 반환했다.
- Naver/Ecosia 인덱스 fallback은 일부 게임을 누락했고 검색 링크의 접근성 문구인 `사진`, `보드게임 평점·리뷰·가격` 등을 원본 제목으로 오인했다. 검색엔진 문서는 Boardlife의 검색 응답이 아니므로 문자열 정제를 계속 추가해도 결과 수·순서·연도·신규 등록 게임을 보장할 수 없다.
- 따라서 검색엔진 HTML fallback을 검색 경로에서 완전히 제거했다. 이 결정으로 잘못된 결과를 반환하는 문제는 재발하지 않으며, 공식 데이터가 없는 검색은 추측하지 않고 빈 결과로 실패 폐쇄한다.
- Boardlife sitemap에서 `/game/18905` 존재는 확인할 수 있었지만 sitemap에는 URL과 수정일만 있고 제목이 없어, 검색어에서 ID를 역으로 찾는 카탈로그 역할을 할 수 없었다.

### Boardlife 순위 카탈로그

- Boardlife가 실제 순위 화면에서 사용하는 `GET /rank_ajax.php?pg={page}`는 한 페이지에 100개 게임의 ID·한글 제목·영문 제목·연도·표지를 반환한다.
- `X-Rank-More` 응답 헤더를 따라 214페이지까지 조회하면 21,377개 게임을 얻을 수 있다. autocomplete와 달리 페이지네이션이 정상 동작하므로 전체 검색 카탈로그의 동기화 원본으로 사용할 수 있다.
- 첫 병렬 수집에서 90페이지 부근에 `429`가 발생했다. 동시 요청을 2개로 제한하고 배치 간 750ms 지연, `Retry-After` 및 점진 재시도를 적용해 공급자 요청 제한을 준수한다.
- 이 카탈로그는 운영 요청 때 Boardlife에 접근하지 않는다. 신뢰 가능한 네트워크에서 동기화한 결과를 Vercel 서버가 로컬 검색한다.

### BoardGameGeek

- BGG XML API는 인증 없이 호출하면 `Unauthorized`를 반환하므로 현재 배포 환경에서 공개 통합 API로 바로 사용할 수 없었다.
- 검색 엔진으로 BGG 상세 페이지를 추정하면 기본판과 확장판 제목이 비슷한 경우 잘못된 페이지를 고를 수 있었다.
- BGG에 대응 항목이 있는 검증 게임은 정확한 BGG ID와 slug를 저장하고 해당 상세 페이지만 조회한다. BGG 항목이 없는 게임은 검증한 Boardlife 메타데이터를 카탈로그에 함께 저장한다.

## 선택한 구조

```text
클라이언트
  ├─ GET /api/catalog/search?word=...
  │    ├─ 공식 JSON 스냅샷 일치 → 동일한 결과·순서로 즉시 반환
  │    ├─ 검증된 상세 메타데이터 카탈로그 일치 → 즉시 반환
  │    ├─ 전체 공식 순위 카탈로그에서 한글·영문 제목 검색
  │    ├─ 카탈로그 불일치 + 원본 접근 가능 → Boardlife autocomplete JSON 반환
  │    └─ 원본 차단 + 카탈로그 불일치 → [] (검색엔진 HTML로 결과를 만들지 않음)
  └─ GET /api/catalog/games/:id
       ├─ 스냅샷/검증된 ID → Boardlife 기본 필드 + 정확한 BGG ID가 있으면 보강
       └─ 미등록 ID → 기존 Boardlife 상세 조회 및 fallback
```

`src/data/boardlife-search-snapshots.json`은 반드시 순서까지 같아야 하는 회귀 검색어의 autocomplete 원본을 보존한다. 일반 검색은 `src/data/boardlife-game-catalog.json`의 21,377개 공식 순위 카탈로그를 사용한다. 제목을 정규화해 한글·영문 부분 일치로 검색하고 정확히 일치하는 기본판을 먼저 노출한다. 결과 집합은 autocomplete와 일치하지만 Boardlife 내부 검색 정렬 규칙은 공개되지 않아 스냅샷이 없는 검색어의 노출 순서는 다를 수 있다.

## API 계약

### `GET /api/catalog/search?word={검색어}`

- 두 글자 미만: `200 []`
- 성공: `200 BoardlifeSearchResult[]`
- 원본 접근 불가 + 스냅샷 없음: `200 []` (오염된 대체 결과 금지)

검색 결과 필드:

- `id`: Boardlife 게임 ID
- `title`, `englishTitle`, `year`
- `thumbnail`, `image`: Boardlife 이미지 URL

### `GET /api/catalog/games/{boardlifeId}`

선택 query: `title`, `englishTitle`, `year`, `thumbnail`, `image`, `refresh=1`

- 잘못된 ID: `400`
- 성공: `200 BoardGameMetadata`
- 공급자 전체 실패: `502`

검증된 항목은 Boardlife ID·제목·연도·표지를 카탈로그에서 가져오고, 인원·시간·연령·난이도·평점·설명은 정확한 BGG 페이지에서 보강한다. BGG 보강이 일시적으로 실패해도 Boardlife 기본 필드와 최소 설명을 반환한다.

## 공식 검색 스냅샷 동기화 및 검증

1. Boardlife 원본 접근이 가능한 네트워크에서 `npm run catalog:sync -- "검색어 1" "검색어 2"`를 실행한다.
2. 스크립트는 원본 `results`의 `number`, `title`, `eng`, `year`, `thumb`, `photo`만 통합 API 필드로 변환해 JSON에 저장한다. HTML 파싱이나 제목 정제는 수행하지 않는다.
3. `npm run catalog:verify`는 저장된 모든 검색어를 현재 원본 응답과 필드·순서까지 비교하고 차이가 있으면 종료 코드 1을 반환한다. 일부만 확인할 때는 검색어를 인자로 지정한다.
4. 플레이 인원 등 상세 보강이 필요하고 정확한 BGG 항목을 확인한 경우에만 `VERIFIED_GAME_CATALOG`에 BGG ID와 slug를 추가한다.

전체 카탈로그는 `npm run catalog:sync-all`로 갱신한다. `npm run catalog:verify-all`은 기본 회귀 검색어 `언락`, `스플렌더`, `카탄`, `아크 노바`의 ID 집합을 현재 autocomplete 원본과 비교한다. 별도 검색어도 명령 인자로 전달할 수 있다.

## 제한과 후속 선택지

- Boardlife가 서버 호출을 공식 허용하거나 인증 가능한 API를 제공하면 실시간 공급자를 다시 1순위로 올릴 수 있다.
- 순위 카탈로그에 아직 반영되지 않은 신규 등록 게임은 다음 동기화 전까지 검색되지 않을 수 있다. 완전한 실시간 처리가 필요하면 Boardlife 측 API 허용 또는 Vercel 외부의 허용된 고정-IP relay가 필요하다. Cloudflare challenge 우회 자동화는 안정적이지 않고 공급자 정책에도 어긋날 수 있어 사용하지 않는다.
- 스냅샷 규모가 커지면 JSON 대신 DB 테이블로 옮겨도 API 계약과 동기화 규칙은 동일하게 유지할 수 있다.
- 외부 페이지 구조나 번역 서비스 변경으로 BGG 보강 필드 일부가 비어도 검색 ID와 Boardlife 기본 메타데이터는 유지된다.

## 검증 기준

- `npm run typecheck` 성공
- `npm run catalog:verify -- "아게모니아" "브라스 버밍엄" "팬데믹 레거시"` 성공
- `npm run catalog:verify-all`에서 `언락` 47건, `스플렌더` 9건, `카탄` 65건, `아크 노바` 9건의 ID 집합이 원본과 일치
- 로컬 `/api/catalog/search?word=뒤집어줘`가 `18905`, `19591`, `21862`를 순서대로 반환
- 로컬 `/api/catalog/search?word=하나비`가 `518`, `8373`, `7771`을 순서대로 반환하고 제목에 `사진`이 포함되지 않음
- 로컬 `/api/catalog/search?word=이레이저`가 `21483` 한 건만 반환하고 `찌리릿`, `지우개`를 반환하지 않음
- `/api/catalog/search?word=아게모니아`가 `19006`, `22457`, `22454`, `22455`, `22456` 다섯 건을 공식 순서로 반환
- 별도 비교 게임 `브라스 버밍엄`, `팬데믹 레거시`가 Boardlife 원본과 결과 수·ID·제목·영문 제목·연도·표지·순서까지 일치
- 검증 카탈로그의 상세 API가 각각 자신의 Boardlife ID, 제목, 표지와 메타데이터를 반환
- 로컬 화면에서 검색어별 기대 후보 수가 표시되고 선택 시 상세 필드가 채워짐
- 배포 후 운영 API와 실제 게임 추가 화면에서도 같은 결과 확인
