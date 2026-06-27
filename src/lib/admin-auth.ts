import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "board-shelf-admin";
export const SESSION_MAX_AGE = 60 * 60;
type AdminJwtPayload = { role: "admin"; iat: number; exp: number };

function base64UrlEncode(value: string) {
  return Buffer.from(value).toString("base64url");
}

function signature(value: string) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return "";
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function decodePayload(value: string) {
  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<AdminJwtPayload>;
  } catch {
    return null;
  }
}

export function isAdminPassword(password: string) {
  const configuredPassword = process.env.ADMIN_PASSWORD;
  if (!configuredPassword) return false;
  const supplied = Buffer.from(password);
  const expected = Buffer.from(configuredPassword);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export function createAdminSession() {
  if (!process.env.SESSION_SECRET) return null;
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + SESSION_MAX_AGE;
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64UrlEncode(JSON.stringify({ role: "admin", iat: issuedAt, exp: expiresAt } satisfies AdminJwtPayload));
  const tokenBody = `${header}.${payload}`;
  return { token: `${tokenBody}.${signature(tokenBody)}`, expiresAt };
}

export function verifyAdminSession(request: NextRequest) {
  const session = request.cookies.get(SESSION_COOKIE)?.value;
  if (!session || !process.env.SESSION_SECRET) return { authenticated: false, expired: false, expiresAt: null };
  const tokenParts = session.split(".");
  if (tokenParts.length !== 3) return { authenticated: false, expired: false, expiresAt: null };
  const [header, payload, providedSignature] = tokenParts;
  if (!header || !payload || !providedSignature) return { authenticated: false, expired: false, expiresAt: null };
  const expectedSignature = signature(`${header}.${payload}`);
  const provided = Buffer.from(providedSignature);
  const expected = Buffer.from(expectedSignature);
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return { authenticated: false, expired: false, expiresAt: null };
  const decodedPayload = decodePayload(payload);
  const expiresAt = typeof decodedPayload?.exp === "number" ? decodedPayload.exp : null;
  if (decodedPayload?.role !== "admin" || !expiresAt) return { authenticated: false, expired: false, expiresAt: null };
  if (expiresAt <= Math.floor(Date.now() / 1000)) return { authenticated: false, expired: true, expiresAt };
  return { authenticated: true, expired: false, expiresAt };
}

export function isAdmin(request: NextRequest) {
  return verifyAdminSession(request).authenticated;
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
