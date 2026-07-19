import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import type { GameVideo } from "@/lib/types";

type YouTubeOEmbedResponse = {
  title?: string;
  author_name?: string;
  thumbnail_url?: string;
};

export async function GET(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ message: "관리자 로그인이 필요합니다." }, { status: 401 });

  const youtubeId = request.nextUrl.searchParams.get("youtubeId")?.trim();
  if (!youtubeId || !/^[A-Za-z0-9_-]{11}$/.test(youtubeId)) return NextResponse.json({ message: "올바른 YouTube 영상 링크가 필요합니다." }, { status: 400 });

  try {
    const url = `https://www.youtube.com/watch?v=${youtubeId}`;
    const response = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`, { cache: "no-store", signal: AbortSignal.timeout(8_000) });
    const metadata = await response.json() as YouTubeOEmbedResponse;
    if (!response.ok || !metadata.title) throw new Error("YouTube 영상 정보를 가져오지 못했습니다.");

    const video: GameVideo = {
      youtubeId,
      url,
      title: metadata.title,
      thumbnail: metadata.thumbnail_url,
      channelName: metadata.author_name,
    };
    return NextResponse.json(video);
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "YouTube 영상 정보를 가져오지 못했습니다." }, { status: 502 });
  }
}
