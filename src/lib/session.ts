import { createHmac, randomBytes, timingSafeEqual } from "crypto";

const COOKIE_NAME = "tonal_family_session";
const ONE_WEEK_SECONDS = 60 * 60 * 24 * 7;

export function sessionCookieName(): string {
  return COOKIE_NAME;
}

export function dashboardPasswordConfigured(): boolean {
  return Boolean(process.env.DASHBOARD_PASSWORD);
}

export function createSessionCookieValue(now = Date.now()): string {
  const secret = sessionSecret();
  const payload = Buffer.from(
    JSON.stringify({ exp: now + ONE_WEEK_SECONDS * 1000, nonce: randomBytes(12).toString("hex") })
  ).toString("base64url");
  const signature = sign(payload, secret);
  return `${payload}.${signature}`;
}

export function verifySessionCookieValue(cookieValue?: string | null, now = Date.now()): boolean {
  if (!dashboardPasswordConfigured()) return true;
  if (!cookieValue) return false;
  const [payload, signature] = cookieValue.split(".");
  if (!payload || !signature) return false;
  const expected = sign(payload, sessionSecret());
  if (!safeEqual(signature, expected)) return false;

  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { exp?: number };
    return typeof decoded.exp === "number" && decoded.exp > now;
  } catch {
    return false;
  }
}

export function passwordMatches(candidate: string): boolean {
  const configured = process.env.DASHBOARD_PASSWORD;
  if (!configured) return true;
  return safeEqual(candidate, configured);
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: ONE_WEEK_SECONDS,
    path: "/"
  };
}

function sessionSecret(): string {
  return process.env.SESSION_SECRET || process.env.DASHBOARD_PASSWORD || "local-dev-secret-change-me";
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
