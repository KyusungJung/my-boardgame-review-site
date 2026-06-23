import { ImageResponse } from "next/og";
import { Buffer } from "node:buffer";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const alt = "Board Shelf 플레이리스트";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function toImageDataUrl(imageUrl?: string | null) {
  if (!imageUrl) return undefined;
  try {
    const response = await fetch(imageUrl, {
      headers: {
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "User-Agent": "Mozilla/5.0 (compatible; BoardShelfOG/1.0)",
      },
    });
    const mimeType = response.headers.get("content-type")?.split(";")[0] || (imageUrl.endsWith(".png") ? "image/png" : "image/jpeg");
    if (!response.ok || !mimeType.startsWith("image/")) return undefined;
    return `data:${mimeType};base64,${Buffer.from(await response.arrayBuffer()).toString("base64")}`;
  } catch {
    return undefined;
  }
}

export default async function PlaylistOpenGraphImage({ params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = await params;
  const playlist = await prisma.playlist.findFirst({
    where: { OR: [{ shareCode: shareId }, { shareId }] },
    include: { items: { orderBy: { position: "asc" }, take: 5, include: { game: { select: { title: true, image: true } } } } },
  });

  const gameImages = await Promise.all((playlist?.items.map(async (item) => ({ title: item.game.title, image: await toImageDataUrl(item.game.image) })) ?? []));
  return new ImageResponse(
    (
      <div style={{ alignItems: "center", background: "linear-gradient(135deg, #001529 0%, #0958d9 100%)", color: "white", display: "flex", height: "100%", overflow: "hidden", padding: "56px 64px", position: "relative", width: "100%" }}>
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 590, zIndex: 1 }}>
          <div style={{ color: "#91caff", display: "flex", fontSize: 26, fontWeight: 700 }}>Board Shelf 플레이리스트</div>
          <div style={{ display: "flex", fontSize: playlist?.title && playlist.title.length > 22 ? 48 : 60, fontWeight: 800, letterSpacing: -2, lineHeight: 1.2, marginTop: 22 }}>{playlist?.title ?? "플레이리스트를 찾지 못했습니다."}</div>
          <div style={{ color: "#d6e4ff", display: "flex", fontSize: 25, lineHeight: 1.45, marginTop: 22 }}>{playlist?.description || `게임 ${gameImages.length}개를 순서대로 즐겨보세요.`}</div>
          <div style={{ alignItems: "center", background: "rgba(255,255,255,.14)", borderRadius: 18, display: "flex", fontSize: 22, fontWeight: 700, justifyContent: "center", marginTop: 28, padding: "10px 16px", width: 132 }}>게임 {gameImages.length}개</div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, justifyContent: "flex-end", marginLeft: "auto", width: 420 }}>
          {gameImages.map((game, index) => game.image ? <img key={game.title} src={game.image} width={index === 0 ? 190 : 96} height={index === 0 ? 260 : 130} style={{ border: "4px solid rgba(255,255,255,.72)", borderRadius: 12, objectFit: "cover" }} /> : <div key={game.title} style={{ alignItems: "center", background: "#d6e4ff", borderRadius: 12, color: "#0958d9", display: "flex", fontSize: 20, fontWeight: 700, height: index === 0 ? 260 : 130, justifyContent: "center", textAlign: "center", width: index === 0 ? 190 : 96 }}>{game.title.slice(0, 4)}</div>)}
        </div>
      </div>
    ),
    size,
  );
}
