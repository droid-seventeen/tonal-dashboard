import { NextResponse } from "next/server";
import { AVATAR_MAX_FILE_SIZE, uploadAvatar, validateAvatarFile } from "@/lib/avatars";
import { parseMembersFromEnv } from "@/lib/members";

export const dynamic = "force-dynamic";

const AVATAR_CACHE_CONTROL = "no-store";

export async function POST(request: Request) {
  const adminToken = process.env.AVATAR_ADMIN_TOKEN?.trim();
  if (!adminToken) return avatarJson({ error: "Avatar admin token is not configured." }, 503);

  if (request.headers.get("authorization") !== `Bearer ${adminToken}`) {
    return avatarJson({ error: "Unauthorized avatar upload." }, 401);
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
    return avatarJson({ error: "Vercel Blob is not configured. Set BLOB_READ_WRITE_TOKEN before uploading avatars." }, 503);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return avatarJson({ error: "Upload request must be multipart form data." }, 400);
  }

  const memberIdValue = formData.get("memberId");
  const fileValue = formData.get("file");
  if (typeof memberIdValue !== "string" || !memberIdValue.trim()) {
    return avatarJson({ error: "memberId is required." }, 400);
  }
  if (!isFileLike(fileValue)) return avatarJson({ error: "Avatar file is required." }, 400);

  const memberId = memberIdValue.trim();
  let memberName = memberId;
  try {
    const member = parseMembersFromEnv().find((candidate) => candidate.id === memberId);
    if (!member) return avatarJson({ error: `Unknown member id: ${memberId}` }, 400);
    memberName = member.name;
  } catch (error) {
    return avatarJson({ error: (error as Error).message }, 500);
  }

  const validationError = validateAvatarFile(fileValue);
  if (validationError) {
    return avatarJson({ error: validationError }, fileValue.size > AVATAR_MAX_FILE_SIZE ? 413 : 400);
  }

  try {
    const url = await uploadAvatar(memberId, fileValue);
    return avatarJson({ memberId, url });
  } catch (error) {
    return avatarJson({ error: `Could not upload avatar for ${memberName}: ${(error as Error).message}` }, 502);
  }
}

function isFileLike(value: FormDataEntryValue | null): value is File {
  return typeof value === "object" && value !== null && "arrayBuffer" in value && "size" in value && "type" in value;
}

function avatarJson(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": AVATAR_CACHE_CONTROL
    },
    status
  });
}
