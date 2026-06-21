import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Board Shelf | 나의 보드게임 컬렉션",
  description: "보드게임을 기록하고 모임에 맞는 게임을 추천받으세요.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
