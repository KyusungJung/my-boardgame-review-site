import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "img.boardlife.co.kr" },
      { protocol: "https", hostname: "boardlife.co.kr" },
    ],
  },
};

export default nextConfig;
