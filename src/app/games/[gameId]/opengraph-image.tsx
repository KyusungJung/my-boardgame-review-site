import { ImageResponse } from "next/og";
import { Buffer } from "node:buffer";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const preferredRegion = "icn1";
export const alt = "Board Shelf 게임 포스터";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function imageFetchUrl(imageUrl: string) {
  try {
    if (new URL(imageUrl).hostname === "img.boardlife.co.kr") {
      return `https://external-content.duckduckgo.com/iu/?u=${encodeURIComponent(imageUrl)}&f=1&nofb=1`;
    }
  } catch {
    return imageUrl;
  }
  return imageUrl;
}

async function toImageDataUrl(imageUrl?: string | null) {
  if (!imageUrl) return undefined;
  try {
    const response = await fetch(imageFetchUrl(imageUrl), {
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

export default async function GameOpenGraphImage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  const game = await prisma.game.findUnique({
    where: { boardlifeId: gameId },
    include: { tags: { include: { tag: true } } },
  });
  const poster = await toImageDataUrl(game?.image);
  const tags = game?.tags.slice(0, 4).map((entry) => entry.tag.name) ?? [];

  return new ImageResponse(
    (
      <div style={{ alignItems: "center", background: "linear-gradient(135deg, #001529 0%, #0958d9 100%)", color: "white", display: "flex", height: "100%", overflow: "hidden", padding: "56px 68px", position: "relative", width: "100%" }}>
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 620, zIndex: 1 }}>
          <div style={{ color: "#91caff", display: "flex", fontSize: 26, fontWeight: 700 }}>Board Shelf 게임 소개</div>
          <div style={{ display: "flex", fontSize: game?.title && game.title.length > 18 ? 50 : 64, fontWeight: 850, letterSpacing: -2, lineHeight: 1.16, marginTop: 24 }}>{game?.title ?? "게임을 찾지 못했습니다."}</div>
          {game?.englishTitle && <div style={{ color: "#d6e4ff", display: "flex", fontSize: 28, fontWeight: 600, lineHeight: 1.35, marginTop: 16 }}>{game.englishTitle}{game.year ? ` · ${game.year}` : ""}</div>}
          <div style={{ display: "flex", gap: 10, marginTop: 28 }}>
            {tags.map((tag) => <div key={tag} style={{ background: "rgba(255,255,255,.16)", border: "1px solid rgba(255,255,255,.26)", borderRadius: 18, color: "#f0f5ff", display: "flex", fontSize: 20, fontWeight: 700, padding: "8px 14px" }}>{tag}</div>)}
          </div>
          <div style={{ color: "#bae0ff", display: "flex", fontSize: 23, fontWeight: 700, marginTop: 32 }}>내 보드게임 컬렉션에서 공유한 게임</div>
        </div>
        <div style={{ alignItems: "center", display: "flex", justifyContent: "center", marginLeft: "auto", width: 360 }}>
          {poster ? <img src={poster} width={300} height={420} style={{ border: "6px solid rgba(255,255,255,.78)", borderRadius: 18, boxShadow: "0 28px 70px rgba(0,0,0,.36)", objectFit: "cover" }} /> : <div style={{ alignItems: "center", background: "#d6e4ff", borderRadius: 18, color: "#0958d9", display: "flex", fontSize: 42, fontWeight: 850, height: 420, justifyContent: "center", textAlign: "center", width: 300 }}>{game?.title.slice(0, 4) ?? "Board"}</div>}
        </div>
      </div>
    ),
    size,
  );
}
