import { NextResponse } from "next/server";
import { listPublicAvatars } from "@/lib/avatars";

export const dynamic = "force-dynamic";

const AVATAR_CACHE_CONTROL = "no-store";

export async function GET() {
  try {
    return avatarJson(await listPublicAvatars());
  } catch {
    return avatarJson({ configured: false, avatars: {}, error: "Avatar storage is unavailable." });
  }
}

function avatarJson(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": AVATAR_CACHE_CONTROL
    },
    status
  });
}
