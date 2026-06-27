import { NextRequest, NextResponse } from "next/server";
import { adminCookie, createAdminSession, isAdminPassword } from "@/lib/admin-auth";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { password?: unknown } | null;
  const password = typeof body?.password === "string" ? body.password : "";
  if (!password || !isAdminPassword(password)) {
    return NextResponse.json({ message: "비밀번호가 올바르지 않습니다." }, { status: 401 });
  }

  const session = createAdminSession();
  if (!session) return NextResponse.json({ message: "관리자 세션 설정이 필요합니다." }, { status: 500 });
  const response = NextResponse.json({ authenticated: true, expiresAt: session.expiresAt });
  response.cookies.set(adminCookie.name, session.token, adminCookie.options);
  return response;
}
