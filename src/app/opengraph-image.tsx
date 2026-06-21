import { ImageResponse } from "next/og";

export const alt = "Board Shelf 보드게임 컬렉션";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "linear-gradient(135deg, #001f3d 0%, #063d70 58%, #1677ff 100%)",
          color: "white",
          display: "flex",
          height: "100%",
          overflow: "hidden",
          padding: "76px 88px",
          position: "relative",
          width: "100%",
        }}
      >
        <div
          style={{
            background: "rgba(255, 255, 255, 0.08)",
            border: "1px solid rgba(255, 255, 255, 0.18)",
            borderRadius: 42,
            display: "flex",
            height: 390,
            position: "absolute",
            right: -70,
            top: -108,
            transform: "rotate(-17deg)",
            width: 560,
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", position: "relative" }}>
          <div style={{ color: "#8ec5ff", display: "flex", fontSize: 38, fontWeight: 700, letterSpacing: -1 }}>
            Board <span style={{ color: "#ffffff", marginLeft: 10 }}>Shelf</span>
          </div>
          <div style={{ display: "flex", fontSize: 78, fontWeight: 800, letterSpacing: -5, marginTop: 42 }}>
            보드게임 컬렉션
          </div>
          <div style={{ color: "#d7e9ff", display: "flex", fontSize: 32, marginTop: 26 }}>
            기록하고, 리뷰하고, 함께 즐기는 나만의 게임 선반
          </div>
        </div>
        <div
          style={{
            bottom: 60,
            display: "flex",
            gap: 18,
            position: "absolute",
            right: 76,
          }}
        >
          {["PLAY", "REVIEW", "SHARE"].map((label, index) => (
            <div
              key={label}
              style={{
                alignItems: "center",
                background: index === 1 ? "#1677ff" : "rgba(255, 255, 255, 0.14)",
                border: "1px solid rgba(255, 255, 255, 0.26)",
                borderRadius: 22,
                display: "flex",
                fontSize: 19,
                fontWeight: 700,
                height: 96,
                justifyContent: "center",
                width: 96,
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
