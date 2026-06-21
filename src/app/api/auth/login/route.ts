import { NextRequest, NextResponse } from "next/server";
import { adminCookie, createAdminSession, isAdminPassword } from "@/lib/admin-auth";

export async function POST(request: NextRequest) {
  const { password } = await request.json() as { password?: string };
  if (!password || !isAdminPassword(password)) {
    return NextResponse.json({ message: "비밀번호가 올바르지 않습니다." }, { status: 401 });
  }

  const response = NextResponse.json({ authenticated: true });
  response.cookies.set(adminCookie.name, createAdminSession(), adminCookie.options);
  return response;
}
