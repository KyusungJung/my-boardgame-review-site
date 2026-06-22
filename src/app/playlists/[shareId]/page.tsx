import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function SharedPlaylistPage({ params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = await params;
  const playlist = await prisma.playlist.findUnique({
    where: { shareId },
    include: {
      items: {
        orderBy: { position: "asc" },
        include: { game: { include: { tags: { include: { tag: true } } } } },
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
      <section className="shared-playlist-games">
        {playlist.items.map((item, index) => <article key={item.gameId}>
          <span className="shared-playlist-position">{index + 1}</span>
          {item.game.image ? <img src={item.game.image} alt={`${item.game.title} 표지`} /> : <div className="shared-playlist-cover-fallback">{item.game.title.slice(0, 2)}</div>}
          <div>
            <h2>{item.game.title}</h2>
            <p>{item.game.minPlayers ?? 1}-{item.game.maxPlayers ?? "?"}명 · {item.game.playTime ?? "플레이 시간 미입력"}</p>
            <div>{item.game.tags.slice(0, 4).map((entry) => <span key={entry.tagId}>{entry.tag.name}</span>)}</div>
          </div>
        </article>)}
      </section>
    </main>
  );
}
