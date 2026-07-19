import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import type { GameVideo } from "@/lib/types";

type YouTubeSearchResponse = {
  items?: Array<{
    id?: { videoId?: string };
    snippet?: {
      title?: string;
      channelTitle?: string;
      publishedAt?: string;
      thumbnails?: { high?: { url?: string }; medium?: { url?: string }; default?: { url?: string } };
    };
  }>;
  error?: { message?: string };
};

export async function GET(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ message: "관리자 로그인이 필요합니다." }, { status: 401 });

  const title = request.nextUrl.searchParams.get("title")?.trim();
  const englishTitle = request.nextUrl.searchParams.get("englishTitle")?.trim();
  const refresh = request.nextUrl.searchParams.get("refresh") === "1";
  if (!title) return NextResponse.json({ message: "게임명이 필요합니다." }, { status: 400 });
  if (!process.env.YOUTUBE_API_KEY) return NextResponse.json({ message: "YOUTUBE_API_KEY를 설정하면 YouTube 영상 자동 검색을 사용할 수 있습니다." }, { status: 503 });

  async function searchVideos(query: string) {
    const searchParams = new URLSearchParams({
      key: process.env.YOUTUBE_API_KEY!,
      part: "snippet",
      type: "video",
      maxResults: "6",
      order: "relevance",
      videoEmbeddable: "true",
      relevanceLanguage: "ko",
      q: query,
    });
    const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${searchParams}`, refresh ? { cache: "no-store" } : { next: { revalidate: 3600 } });
    const payload = await response.json() as YouTubeSearchResponse;
    if (!response.ok) throw new Error(payload.error?.message ?? "YouTube 검색에 실패했습니다.");
    return payload.items ?? [];
  }

  try {
    let items = await searchVideos(`${title} 보드게임`);
    if (!items.length && englishTitle && englishTitle.toLocaleLowerCase() !== title.toLocaleLowerCase()) {
      items = await searchVideos(`${englishTitle} board game review`);
    }
    const videos: GameVideo[] = items.flatMap((item) => {
      const youtubeId = item.id?.videoId;
      const snippet = item.snippet;
      if (!youtubeId || !snippet?.title) return [];
      return [{
        youtubeId,
        url: `https://www.youtube.com/watch?v=${youtubeId}`,
        title: snippet.title,
        thumbnail: snippet.thumbnails?.high?.url ?? snippet.thumbnails?.medium?.url ?? snippet.thumbnails?.default?.url,
        channelName: snippet.channelTitle,
        publishedAt: snippet.publishedAt,
      }];
    });
    console.info("YouTube video search completed", { title, resultCount: videos.length });
    return NextResponse.json(videos);
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "YouTube 검색에 실패했습니다." }, { status: 502 });
  }
}
