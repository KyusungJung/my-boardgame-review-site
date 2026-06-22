import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

function gameIntroduction(game: { review: string | null; minPlayers: number | null; maxPlayers: number | null; tags: Array<{ tag: { name: string } }> }) {
  if (game.review) return game.review;
  const playerRange = `${game.minPlayers ?? 1}-${game.maxPlayers ?? "?"}명이`;
  const tagNames = game.tags.slice(0, 3).map((entry) => entry.tag.name).join(" · ");
  return `${playerRange} 함께 즐기기 좋은 ${tagNames || "보드게임"}입니다.`;
}

export default async function SharedPlaylistPage({ params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = await params;
  const playlist = await prisma.playlist.findUnique({
    where: { shareId },
    include: {
      items: {
        orderBy: { position: "asc" },
        include: { game: { include: { tags: { include: { tag: true } }, videos: { orderBy: { createdAt: "desc" } } } } },
      },
    },
  });
  if (!playlist) notFound();

  return (
    <main className="shared-playlist-page">
      <section className="shared-playlist-header">
        <span>Board Shelf 플레이리스트</span>
        <h1>{playlist.title}</h1>
        {playlist.description && <p>{playlist.description}</p>}
        <small>게임 {playlist.items.length}개 · 순서대로 즐겨보세요.</small>
      </section>
      <section className="shared-playlist-games" aria-label={`${playlist.title} 게임 목록`}>
        {playlist.items.map((item, index) => {
          const { game } = item;
          const metadata = [
            `${game.minPlayers ?? 1}-${game.maxPlayers ?? "?"}명`,
            game.bestPlayers ? `베스트 ${game.bestPlayers}명` : null,
            game.minAge ? `${game.minAge}세 이상` : null,
            game.playTime,
            game.complexity ? `난이도 ${game.complexity.toFixed(1)}` : null,
          ].filter(Boolean);

          return <article className="shared-playlist-game-card" key={item.gameId}>
            <span className="shared-playlist-position">{index + 1}</span>
            <section className="shared-playlist-game-main">
              {game.image ? <img src={game.image} alt={`${game.title} 표지`} /> : <div className="shared-playlist-cover-fallback">{game.title.slice(0, 2)}</div>}
              <div className="shared-playlist-game-content">
                <div>
                  <h2>{game.title}</h2>
                  {game.englishTitle && <p className="shared-playlist-english-title">{game.englishTitle}{game.year ? ` · ${game.year}` : ""}</p>}
                </div>
                <p className="shared-playlist-introduction">{gameIntroduction(game)}</p>
                <ul className="shared-playlist-metadata">{metadata.map((entry) => <li key={entry}>{entry}</li>)}</ul>
                <div className="shared-playlist-tags">{game.tags.slice(0, 6).map((entry) => <span key={entry.tagId}>{entry.tag.name}</span>)}</div>
              </div>
            </section>
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
          </article>;
        })}
      </section>
    </main>
  );
}
