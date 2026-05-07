import { NextResponse } from "next/server";
import { createSessionCookieValue, passwordMatches, sessionCookieName, sessionCookieOptions } from "@/lib/session";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { password?: string };
  if (!passwordMatches(body.password ?? "")) {
    return NextResponse.json({ error: "Incorrect dashboard password." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(sessionCookieName(), createSessionCookieValue(), sessionCookieOptions());
  return response;
}
