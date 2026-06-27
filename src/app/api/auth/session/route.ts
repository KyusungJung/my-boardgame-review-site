import { NextRequest, NextResponse } from "next/server";
import { adminCookie, verifyAdminSession } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  const session = verifyAdminSession(request);
  const response = NextResponse.json({ authenticated: session.authenticated, expiresAt: session.expiresAt });
  if (session.expired) response.cookies.set(adminCookie.name, "", { ...adminCookie.options, maxAge: 0 });
  return response;
}
