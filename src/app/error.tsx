"use client";

import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main style={{ display: "grid", minHeight: "100vh", placeItems: "center", padding: 24, background: "#f5f7fa" }}>
      <section style={{ maxWidth: 420, padding: 28, border: "1px solid #edf0f3", borderRadius: 12, background: "#fff", textAlign: "center" }}>
        <h1 style={{ marginTop: 0 }}>화면을 불러오지 못했습니다.</h1>
        <p style={{ color: "rgba(0, 0, 0, .65)" }}>잠시 후 다시 시도해 주세요.</p>
        <button type="button" onClick={reset} style={{ padding: "9px 16px", border: 0, borderRadius: 6, background: "#1677ff", color: "#fff", cursor: "pointer" }}>다시 시도</button>
      </section>
    </main>
  );
}
