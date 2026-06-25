import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://my-boardgame-review-site.vercel.app"),
  title: "Board Shelf | 보드게임 컬렉션",
  description: "보드게임을 기록하고 모임에 맞는 게임을 추천받으세요.",
  icons: {
    icon: "/icon.svg",
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "Board Shelf",
    title: "Board Shelf | 보드게임 컬렉션",
    description: "보드게임을 기록하고 모임에 맞는 게임을 추천받으세요.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Board Shelf 보드게임 컬렉션",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Board Shelf | 보드게임 컬렉션",
    description: "보드게임을 기록하고 모임에 맞는 게임을 추천받으세요.",
    images: ["/opengraph-image"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
