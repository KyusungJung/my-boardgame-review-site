# 게임 카탈로그 통합 API 아키텍처

## 목적

BoardShelf가 배포된 Vercel 환경에서도 Boardlife 게임 ID와 현재 화면에서 사용하는 메타데이터를 안정적으로 조회한다. 검색 결과와 상세 결과는 기존 `BoardlifeSearchResult`, `BoardGameMetadata` 형태를 유지해 화면과 저장 로직의 변경 범위를 줄인다.

필수 검증 사례는 `뒤집어줘` 검색 시 다음 세 게임을 서버 검색 결과로 반환하는 것이다.

| Boardlife ID | 한글 제목 | 영문 제목 | BGG ID |
| --- | --- | --- | --- |
| `18905` | 뒤집어줘! 캡틴 | Captain Flip | `393325` |
| `19591` | 뒤집어줘! 캡틴: 크라켄의 턱 | Captain Flip: In the Jaws of the Kraken | `413556` |
| `21862` | 뒤집어줘! 캡틴: 폭탄 섬 | Captain Flip: Isla Bomba | `458424` |

## 확인한 문제와 시도한 방법

### Boardlife 자동완성 API 직접 호출

- 원본 엔드포인트: `https://boardlife.co.kr/search_autocomplete.php?query=...`
- 로컬 개발 환경에서는 정상 JSON을 반환했고 `뒤집어줘`에 대해 위 3개 ID를 확인했다.
- Vercel에서는 응답에 `cf-mitigated: challenge`가 포함되거나 `Just a moment...` HTML이 반환됐다. 즉, 애플리케이션 파싱 문제가 아니라 Cloudflare가 데이터센터 IP 요청을 브라우저 검증 페이지로 전환하는 문제였다.
- 홈페이지를 먼저 요청해 쿠키를 얻는 방식도 Cloudflare 세션 쿠키가 발급되지 않아 실패했다.
- Vercel 실행 리전을 서울과 미국으로 바꿔 확인했지만 결과는 같았다.

### 브라우저에서 Boardlife 직접 호출

- 실제 페이지에서 `fetch`를 실행하면 Boardlife가 BoardShelf origin을 허용하는 CORS 헤더를 제공하지 않아 `TypeError: Failed to fetch`가 발생했다.
- `no-cors` 요청은 opaque response가 되어 상태와 본문을 읽을 수 없으므로 검색 JSON 파싱에 사용할 수 없다.

### Reader, 검색 엔진, sitemap

- Jina Reader를 통한 Boardlife 접근도 Cloudflare 검증 페이지 또는 사용할 수 없는 본문을 반환했다.
- Naver/Ecosia 인덱스 fallback은 `19591`, `21862`를 찾았지만 기본판 `18905`를 찾지 못했다. 검색 결과 제목에 `사진` 같은 페이지 문구가 붙는 문제도 있었다.
- Boardlife sitemap에서 `/game/18905` 존재는 확인할 수 있었지만 sitemap에는 URL과 수정일만 있고 제목이 없어, 검색어에서 ID를 역으로 찾는 카탈로그 역할을 할 수 없었다.

### BoardGameGeek

- BGG XML API는 인증 없이 호출하면 `Unauthorized`를 반환하므로 현재 배포 환경에서 공개 통합 API로 바로 사용할 수 없었다.
- 검색 엔진으로 BGG 상세 페이지를 추정하면 기본판과 확장판 제목이 비슷한 경우 잘못된 페이지를 고를 수 있었다.
- 따라서 검증된 항목에는 정확한 BGG ID와 slug를 저장하고 해당 상세 페이지만 조회하도록 했다.

## 선택한 구조

```text
클라이언트
  ├─ GET /api/catalog/search?word=...
  │    ├─ 검증된 로컬 카탈로그 일치 → 즉시 반환
  │    └─ 불일치 → 기존 Boardlife 직접 호출 및 검색 인덱스 fallback
  └─ GET /api/catalog/games/:id
       ├─ 검증된 ID → Boardlife 기본 필드 + 정확한 BGG ID 메타데이터
       └─ 미등록 ID → 기존 Boardlife 상세 조회 및 fallback
```

로컬 카탈로그는 전체 Boardlife 데이터베이스의 복제본이 아니다. Vercel에서 원본 호출이 막힐 때도 반드시 정확해야 하는 항목의 ID 연결 정보만 보관하는 검증 계층이다. 검증된 검색어가 일치하면 원본 요청의 타임아웃을 기다리지 않고 결과를 반환한다. 그 외 검색은 기존 실시간 공급자 흐름을 그대로 사용한다.

## API 계약

### `GET /api/catalog/search?word={검색어}`

- 두 글자 미만: `200 []`
- 성공: `200 BoardlifeSearchResult[]`
- 공급자 전체 실패: `502 { "message": string }`

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

## 데이터 추가 절차

1. 로컬에서 Boardlife 자동완성 원본 응답으로 ID, 제목, 영문 제목, 연도, 표지 URL을 확인한다.
2. BGG 공식 상세 페이지에서 동일 게임인지 확인하고 BGG ID와 slug를 기록한다.
3. `src/lib/game-catalog.ts`의 `VERIFIED_GAME_CATALOG`에 항목을 추가한다.
4. 통합 검색 API가 검색어로 올바른 Boardlife ID를 반환하는지 확인한다.
5. 통합 상세 API가 같은 ID와 제목을 유지하면서 메타데이터를 반환하는지 확인한다.

## 제한과 후속 선택지

- Boardlife가 서버 호출을 공식 허용하거나 인증 가능한 API를 제공하면 실시간 공급자를 다시 1순위로 올릴 수 있다.
- 전체 카탈로그가 필요해지면 검증된 항목을 코드 상수 대신 DB 테이블로 옮기고, 관리자 승인 기반 수집 작업으로 갱신해야 한다.
- 외부 페이지 구조나 번역 서비스 변경으로 BGG 보강 필드 일부가 비어도 검색 ID와 Boardlife 기본 메타데이터는 유지된다.

## 검증 기준

- `npm run typecheck` 성공
- 로컬 `/api/catalog/search?word=뒤집어줘`가 `18905`, `19591`, `21862`를 순서대로 반환
- 세 상세 API가 각각 자신의 Boardlife ID, 제목, 표지와 메타데이터를 반환
- 로컬 화면에서 세 검색 후보가 표시되고 선택 시 상세 필드가 채워짐
- 배포 후 운영 API와 실제 게임 추가 화면에서도 같은 결과 확인
