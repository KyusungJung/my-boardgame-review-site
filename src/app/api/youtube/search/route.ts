import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import type { GameVideo } from "@/lib/types";

type YouTubeSearchResponse = {
  nextPageToken?: string;
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
  const pageToken = request.nextUrl.searchParams.get("pageToken")?.trim();
  if (!title) return NextResponse.json({ message: "게임명이 필요합니다." }, { status: 400 });
  if (!process.env.YOUTUBE_API_KEY) return NextResponse.json({ message: "YOUTUBE_API_KEY를 설정하면 YouTube 영상 자동 검색을 사용할 수 있습니다." }, { status: 503 });

  async function searchVideos(query: string, nextPageToken?: string) {
    const searchParams = new URLSearchParams({
      key: process.env.YOUTUBE_API_KEY!,
      part: "snippet",
      type: "video",
      maxResults: "12",
      order: "relevance",
      videoEmbeddable: "true",
      relevanceLanguage: "ko",
      q: query,
    });
    if (nextPageToken) searchParams.set("pageToken", nextPageToken);
    const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${searchParams}`, nextPageToken ? { cache: "no-store" } : { next: { revalidate: 3600 } });
    const payload = await response.json() as YouTubeSearchResponse;
    if (!response.ok) throw new Error(payload.error?.message ?? "YouTube 검색에 실패했습니다.");
    return payload;
  }

  try {
    let result = await searchVideos(`${title} 보드게임`, pageToken);
    if (!result.items?.length && !pageToken && englishTitle && englishTitle.toLocaleLowerCase() !== title.toLocaleLowerCase()) {
      result = await searchVideos(`${englishTitle} board game review`);
    }
    const items = result.items ?? [];
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
    console.info("YouTube video search completed", { title, resultCount: videos.length, hasNextPage: Boolean(result.nextPageToken) });
    return NextResponse.json({ videos, nextPageToken: result.nextPageToken });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "YouTube 검색에 실패했습니다." }, { status: 502 });
  }
}
