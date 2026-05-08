import { afterEach, describe, expect, it, vi } from "vitest";

const blobMocks = vi.hoisted(() => ({
  put: vi.fn()
}));

vi.mock("@vercel/blob", () => ({
  list: vi.fn(),
  put: blobMocks.put
}));

describe("admin avatars API route", () => {
  afterEach(() => {
    blobMocks.put.mockReset();
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("returns a clear non-200 error when admin upload config is missing", async () => {
    vi.stubEnv("AVATAR_ADMIN_TOKEN", "");
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "blob-token");
    vi.stubEnv("TONAL_MEMBERS_JSON", membersJson([{ id: "taylor", name: "Taylor" }]));
    const { POST } = await loadFreshRoute();

    const response = await POST(avatarRequest());
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(payload.error).toMatch(/admin token/i);
    expect(blobMocks.put).not.toHaveBeenCalled();
  });

  it("returns a clear non-200 error when Blob storage is missing", async () => {
    vi.stubEnv("AVATAR_ADMIN_TOKEN", "admin-token");
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "");
    vi.stubEnv("TONAL_MEMBERS_JSON", membersJson([{ id: "taylor", name: "Taylor" }]));
    const { POST } = await loadFreshRoute();

    const response = await POST(avatarRequest());
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(payload.error).toMatch(/blob/i);
    expect(blobMocks.put).not.toHaveBeenCalled();
  });

  it("rejects requests without the bearer admin token before checking Blob storage", async () => {
    vi.stubEnv("AVATAR_ADMIN_TOKEN", "admin-token");
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "");
    vi.stubEnv("TONAL_MEMBERS_JSON", membersJson([{ id: "taylor", name: "Taylor" }]));
    const { POST } = await loadFreshRoute();

    const response = await POST(avatarRequest({ authorization: null }));
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.error).toMatch(/unauthorized/i);
    expect(blobMocks.put).not.toHaveBeenCalled();
  });

  it("rejects unknown members, oversized files, and SVG uploads", async () => {
    vi.stubEnv("AVATAR_ADMIN_TOKEN", "admin-token");
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "blob-token");
    vi.stubEnv("TONAL_MEMBERS_JSON", membersJson([{ id: "taylor", name: "Taylor" }]));
    const { POST } = await loadFreshRoute();

    const unknownMember = await POST(avatarRequest({ memberId: "casey" }));
    const svg = await POST(avatarRequest({ file: new File(["<svg />"], "avatar.svg", { type: "image/svg+xml" }) }));
    const oversized = await POST(avatarRequest({ file: new File(["x".repeat(1024 * 1024 + 1)], "avatar.png", { type: "image/png" }) }));

    expect(unknownMember.status).toBe(400);
    await expect(unknownMember.json()).resolves.toMatchObject({ error: expect.stringMatching(/unknown member/i) });
    expect(svg.status).toBe(400);
    await expect(svg.json()).resolves.toMatchObject({ error: expect.stringMatching(/jpeg|png|webp|gif/i) });
    expect(oversized.status).toBe(413);
    await expect(oversized.json()).resolves.toMatchObject({ error: expect.stringMatching(/1 mb/i) });
    expect(blobMocks.put).not.toHaveBeenCalled();
  });

  it("uploads a valid public avatar to Vercel Blob", async () => {
    vi.stubEnv("AVATAR_ADMIN_TOKEN", "admin-token");
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "blob-token");
    vi.stubEnv("TONAL_MEMBERS_JSON", membersJson([{ id: "taylor", name: "Taylor" }]));
    blobMocks.put.mockResolvedValue({ url: "https://blob.example/avatars/taylor.png" });
    const { POST } = await loadFreshRoute();

    const response = await POST(avatarRequest());
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const [pathname, uploadedFile, options] = blobMocks.put.mock.calls[0];
    expect(pathname).toBe("avatars/taylor.png");
    expect(uploadedFile).toBeInstanceOf(File);
    expect(uploadedFile).toMatchObject({ name: "avatar.png", type: "image/png" });
    expect(options).toEqual(expect.objectContaining({
      access: "public",
      allowOverwrite: true,
      addRandomSuffix: false,
      contentType: "image/png",
      token: "blob-token"
    }));
    expect(payload).toEqual({ memberId: "taylor", url: "https://blob.example/avatars/taylor.png" });
  });
});

async function loadFreshRoute() {
  vi.resetModules();
  return import("./route");
}

function avatarRequest(options: {
  authorization?: string | null;
  file?: File;
  memberId?: string;
} = {}) {
  const {
    file = new File(["avatar"], "avatar.png", { type: "image/png" }),
    memberId = "taylor"
  } = options;
  const authorization = Object.prototype.hasOwnProperty.call(options, "authorization") ? options.authorization : "Bearer admin-token";
  const formData = new FormData();
  formData.set("memberId", memberId);
  formData.set("file", file);
  const headers = new Headers();
  if (authorization) headers.set("Authorization", authorization);
  return { formData: async () => formData, headers } as Request;
}

function membersJson(members: Array<{ id: string; name: string }>) {
  return JSON.stringify(members.map((member) => ({ ...member, refreshToken: "refresh-token" })));
}
