import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

const OG_IMAGE_VERSION = "1";

function gameIntroduction(game: { description: string | null; review: string | null; minPlayers: number | null; maxPlayers: number | null; tags: Array<{ tag: { name: string } }> }) {
  if (game.review) return game.review;
  if (game.description) return game.description;
  const playerRange = `${game.minPlayers ?? 1}-${game.maxPlayers ?? "?"}명이`;
  const tagNames = game.tags.slice(0, 3).map((entry) => entry.tag.name).join(" · ");
  return `${playerRange} 함께 즐기기 좋은 ${tagNames || "보드게임"}입니다.`;
}

function metadataEntries(game: { minPlayers: number | null; maxPlayers: number | null; bestPlayers: number | null; minAge: number | null; playTime: string | null; complexity: number | null }) {
  return [
    `${game.minPlayers ?? 1}-${game.maxPlayers ?? "?"}명`,
    game.bestPlayers ? `베스트 ${game.bestPlayers}명` : null,
    game.minAge ? `${game.minAge}세 이상` : null,
    game.playTime,
    game.complexity ? `난이도 ${game.complexity.toFixed(1)}` : null,
  ].filter(Boolean) as string[];
}

export async function generateMetadata({ params }: { params: Promise<{ gameId: string }> }): Promise<Metadata> {
  const { gameId } = await params;
  const game = await prisma.game.findUnique({
    where: { boardlifeId: gameId },
    include: { tags: { include: { tag: true } } },
  });
  if (!game) return {};

  const title = `${game.title} | Board Shelf`;
  const description = gameIntroduction(game).slice(0, 160);
  const imageUrl = `/games/${encodeURIComponent(game.boardlifeId)}/opengraph-image?v=${OG_IMAGE_VERSION}`;
  return {
    title,
    description,
    alternates: { canonical: `/games/${game.boardlifeId}` },
    openGraph: {
      type: "website",
      locale: "ko_KR",
      siteName: "Board Shelf",
      title,
      description,
      images: [{ url: imageUrl, width: 1200, height: 630, alt: `${game.title} 게임 포스터` }],
    },
    twitter: { card: "summary_large_image", title, description, images: [imageUrl] },
  };
}

export default async function SharedGamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  const game = await prisma.game.findUnique({
    where: { boardlifeId: gameId },
    include: { tags: { include: { tag: true } }, videos: { orderBy: { createdAt: "desc" } } },
  });
  if (!game) notFound();

  const entries = metadataEntries(game);
  const introduction = gameIntroduction(game);

  return (
    <main className="shared-game-page">
      <section className="shared-game-hero">
        <Link className="shared-playlist-home" href="/">← 홈으로</Link>
        <span>Board Shelf 게임 소개</span>
        <article className="shared-game-card">
          {game.image ? <img className="shared-game-cover" src={game.image} alt={`${game.title} 포스터`} /> : <div className="shared-game-cover-fallback">{game.title.slice(0, 2)}</div>}
          <div className="shared-game-content">
            <h1>{game.title}</h1>
            {game.englishTitle && <p className="shared-playlist-english-title">{game.englishTitle}{game.year ? ` · ${game.year}` : ""}</p>}
            <p className="shared-game-introduction">{introduction}</p>
            <ul className="shared-playlist-metadata">{entries.map((entry) => <li key={entry}>{entry}</li>)}</ul>
            <div className="shared-playlist-tags">{game.tags.slice(0, 8).map((entry) => <span key={entry.tagId}>{entry.tag.name}</span>)}</div>
            <div className="shared-game-actions">
              <Link href={`/?game=${game.boardlifeId}`}>앱에서 상세 보기</Link>
              <a href={game.sourceUrl} target="_blank" rel="noreferrer">Boardlife 원본</a>
            </div>
          </div>
          <aside className="shared-playlist-game-aside">
            <section className="shared-playlist-rating" aria-label="개인 평가">
              <span>나의 평가</span>
              {game.personalRating ? <strong><b aria-hidden="true">★</b> {game.personalRating.toFixed(1)}<small>/ 5</small></strong> : <em>아직 평가 없음</em>}
              <small>플레이 {game.plays}회</small>
            </section>
            {game.videos.length > 0 && <section className="shared-playlist-videos">
              <h3>관련 YouTube 영상</h3>
              {game.videos.slice(0, 2).map((video) => <a href={video.url} target="_blank" rel="noreferrer" key={video.youtubeId}>
                {video.thumbnail && <img src={video.thumbnail} alt="" />}
                <span><strong>{video.title}</strong>{video.channelName && <small>{video.channelName}</small>}</span>
              </a>)}
            </section>}
          </aside>
        </article>
      </section>
    </main>
  );
}
