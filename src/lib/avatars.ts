import { list, put } from "@vercel/blob";
import { parseMembersFromEnv } from "./members";

export const AVATAR_MAX_FILE_SIZE = 1024 * 1024;
export const AVATAR_PREFIX = "avatars/";

const AVATAR_EXTENSIONS: Record<string, string> = {
  "image/gif": "gif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
};

export type AvatarMap = Record<string, string>;

export function blobToken(): string {
  return process.env.BLOB_READ_WRITE_TOKEN?.trim() ?? "";
}

export function avatarExtensionForContentType(contentType: string): string | undefined {
  return AVATAR_EXTENSIONS[contentType.toLowerCase().split(";")[0].trim()];
}

export function validateAvatarFile(file: File): string | undefined {
  if (file.size > AVATAR_MAX_FILE_SIZE) return "Avatar file must be 1 MB or smaller.";
  if (!avatarExtensionForContentType(file.type)) return "Avatar file must be a jpeg, png, webp, or gif image.";
  return undefined;
}

export async function listPublicAvatars(): Promise<{ configured: boolean; avatars: AvatarMap }> {
  const token = blobToken();
  if (!token) return { configured: false, avatars: {} };

  const memberIds = configuredMemberIds();
  if (!memberIds.size) return { configured: true, avatars: {} };

  const result = await list({ prefix: AVATAR_PREFIX, token });
  const avatars: AvatarMap = {};

  for (const blob of result.blobs) {
    const memberId = memberIdFromAvatarPath(blob.pathname);
    if (memberId && memberIds.has(memberId)) avatars[memberId] = blob.url;
  }

  return { configured: true, avatars };
}

export async function uploadAvatar(memberId: string, file: File): Promise<string> {
  const extension = avatarExtensionForContentType(file.type);
  if (!extension) throw new Error("Avatar file must be a jpeg, png, webp, or gif image.");

  const blob = await put(`${AVATAR_PREFIX}${memberId}.${extension}`, file, {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: file.type,
    token: blobToken()
  });

  return blob.url;
}

function configuredMemberIds(): Set<string> {
  try {
    return new Set(parseMembersFromEnv().map((member) => member.id));
  } catch {
    return new Set();
  }
}

function memberIdFromAvatarPath(pathname: string): string | undefined {
  if (!pathname.startsWith(AVATAR_PREFIX)) return undefined;
  const filename = pathname.slice(AVATAR_PREFIX.length);
  const match = /^([a-zA-Z0-9_-]+)\.(?:gif|jpe?g|png|webp)$/i.exec(filename);
  return match?.[1];
}
