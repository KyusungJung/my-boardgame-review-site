# Board Shelf

개인 보드게임 컬렉션을 기록하고, Boardlife 메타데이터로 빠르게 등록하며, 인원과 연령에 맞춰 게임을 추천하는 Next.js 앱입니다.

## 주요 기능

- Boardlife 게임명 자동완성과 상세 메타데이터 입력
- Neon Postgres에 저장되는 게임, 태그, 평점, 리뷰, 플레이 횟수
- 전체 컬렉션 공개 조회와 관리자 전용 등록·수정
- 참가 인원과 최연소 연령을 기준으로 한 게임 추천

## 로컬 실행

```bash
npm install
cp .env.example .env
npm run db:push
npm run dev
```

`.env`의 `DATABASE_URL`, `ADMIN_PASSWORD`, `SESSION_SECRET`을 실제 값으로 바꿔야 합니다.

YouTube 관련 영상 자동 검색을 사용하려면 Google Cloud에서 **YouTube Data API v3**를 활성화하고 `YOUTUBE_API_KEY`를 추가하세요. Vercel에서는 프로젝트 **Settings → Environment Variables**에 Production과 Preview 환경 모두 추가합니다.

## Vercel + Neon 배포

1. Vercel에서 이 GitHub 저장소를 Import합니다.
2. 프로젝트의 **Storage** 또는 **Marketplace**에서 [Neon](https://vercel.com/marketplace/neon)을 연결해 Postgres 데이터베이스를 만듭니다. `DATABASE_URL`은 Vercel에 자동으로 추가됩니다.
3. Vercel 프로젝트의 **Settings → Environment Variables**에서 다음 값을 Production과 Preview에 추가합니다.
   - `ADMIN_PASSWORD`: 관리자 로그인에 사용할 긴 비밀번호
   - `SESSION_SECRET`: 32자 이상의 임의 문자열
4. Neon 연결 문자열을 로컬 `.env`에도 복사한 뒤 아래 명령으로 스키마를 적용합니다.

```bash
npm run db:push
```

5. `main`에 푸시하거나 Vercel에서 Redeploy합니다. 배포 빌드는 Prisma 스키마 동기화를 실행해 필요한 테이블을 자동 생성합니다.

Vercel 빌드는 자동으로 `prisma generate`, `prisma db push` 후 Next.js를 빌드합니다. Neon에 연결하지 않은 상태에서는 공개 화면이 예시 컬렉션을 표시하고, 게임 저장 API는 실패합니다.

## 데이터 보안

- 모든 읽기 API는 공개되어 전체 컬렉션을 공유할 수 있습니다.
- 게임 등록과 수정 API는 HTTP 전용 관리자 세션으로 보호합니다.
- `ADMIN_PASSWORD`, `SESSION_SECRET`, `DATABASE_URL`은 절대 Git에 커밋하지 않습니다.
