import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "board-shelf-admin";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

function signature(value: string) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return "";
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function isAdminPassword(password: string) {
  const configuredPassword = process.env.ADMIN_PASSWORD;
  if (!configuredPassword) return false;
  const supplied = Buffer.from(password);
  const expected = Buffer.from(configuredPassword);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export function createAdminSession() {
  const issuedAt = Math.floor(Date.now() / 1000).toString();
  return `${issuedAt}.${signature(issuedAt)}`;
}

export function isAdmin(request: NextRequest) {
  const session = request.cookies.get(SESSION_COOKIE)?.value;
  if (!session || !process.env.SESSION_SECRET) return false;
  const [issuedAt, providedSignature] = session.split(".");
  if (!issuedAt || !providedSignature) return false;
  if (Number(issuedAt) + SESSION_MAX_AGE < Math.floor(Date.now() / 1000)) return false;
  const expectedSignature = signature(issuedAt);
  const provided = Buffer.from(providedSignature);
  const expected = Buffer.from(expectedSignature);
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

export const adminCookie = {
  name: SESSION_COOKIE,
  options: {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  },
};
