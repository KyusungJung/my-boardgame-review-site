import { NextRequest, NextResponse } from "next/server";
import type { GameVideo } from "@/lib/types";

const recommendedGames = new Set([
  "딕싯", "텔레스트레이션", "저스트 원", "캐스캐디아", "윙스팬", "아줄", "바퀴벌레 포커", "뱅!", "러브 레터",
  "스플렌더", "쇼텐토텐", "하이브", "네메시스", "좀비사이드", "엘드리치 호러", "테라포밍 마스", "아크 노바", "비티컬처",
  "듄: 임페리움", "사이쓰", "코스믹 인카운터", "브라스: 버밍엄", "한자 테우토니카", "푸드 체인 거물", "에버델", "캔버스", "팍스 파미르",
  "캘리코", "패치워크", "사그라다", "스컬", "레지스탕스 아발론", "더 게임", "산토리니", "쿼리도", "체스",
  "글룸헤이븐", "테인티드 그레일", "7대륙", "가이아 프로젝트", "온 마스", "라세르다 시리즈", "황혼의 투쟁", "루트", "제국주의 2030",
  "바라지", "테라 미스티카", "쓰루 디 에이지스",
]);

type YouTubeSearchResponse = {
  items?: Array<{
    id?: { videoId?: string };
    snippet?: { title?: string; channelTitle?: string; publishedAt?: string; thumbnails?: { high?: { url?: string }; medium?: { url?: string }; default?: { url?: string } } };
  }>;
};

async function findVideo(game: string): Promise<GameVideo | null> {
  const searchParams = new URLSearchParams({ key: process.env.YOUTUBE_API_KEY!, part: "snippet", type: "video", maxResults: "1", order: "relevance", videoEmbeddable: "true", relevanceLanguage: "ko", q: `${game} 보드게임 리뷰 설명` });
  const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${searchParams}`, { next: { revalidate: 3600 } });
  if (!response.ok) return null;
  const item = (await response.json() as YouTubeSearchResponse).items?.[0];
  const youtubeId = item?.id?.videoId;
  const snippet = item?.snippet;
  if (!youtubeId || !snippet?.title) return null;
  return { youtubeId, url: `https://www.youtube.com/watch?v=${youtubeId}`, title: snippet.title, thumbnail: snippet.thumbnails?.high?.url ?? snippet.thumbnails?.medium?.url ?? snippet.thumbnails?.default?.url, channelName: snippet.channelTitle, publishedAt: snippet.publishedAt };
}

export async function GET(request: NextRequest) {
  const games = request.nextUrl.searchParams.get("games")?.split(",").map((game) => game.trim()).filter(Boolean) ?? [];
  if (!games.length || games.length > 3 || games.some((game) => !recommendedGames.has(game))) return NextResponse.json({ message: "BGTI 추천 게임을 최대 3개까지 요청할 수 있습니다." }, { status: 400 });
  if (!process.env.YOUTUBE_API_KEY) return NextResponse.json({ message: "YouTube 영상을 불러올 수 없습니다." }, { status: 503 });
  return NextResponse.json(await Promise.all(games.map(async (game) => ({ game, video: await findVideo(game) }))));
}
