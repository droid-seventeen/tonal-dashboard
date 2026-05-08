import { afterEach, describe, expect, it, vi } from "vitest";

const blobMocks = vi.hoisted(() => ({
  list: vi.fn()
}));

vi.mock("@vercel/blob", () => ({
  list: blobMocks.list,
  put: vi.fn()
}));

describe("avatars API route", () => {
  afterEach(() => {
    blobMocks.list.mockReset();
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("returns an empty public mapping when Blob is not configured", async () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "");
    vi.stubEnv("TONAL_MEMBERS_JSON", membersJson([{ id: "taylor", name: "Taylor" }]));
    const { GET } = await loadFreshRoute();

    const response = await GET();
    const payload = await response.json();

    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(payload).toEqual({ configured: false, avatars: {} });
    expect(blobMocks.list).not.toHaveBeenCalled();
  });

  it("lists only configured member avatar URLs", async () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "blob-token");
    vi.stubEnv("TONAL_MEMBERS_JSON", membersJson([{ id: "taylor", name: "Taylor" }, { id: "casey", name: "Casey" }]));
    blobMocks.list.mockResolvedValue({
      blobs: [
        { pathname: "avatars/taylor.png", url: "https://blob.example/taylor.png" },
        { pathname: "avatars/old-member.webp", url: "https://blob.example/old-member.webp" },
        { pathname: "misc/casey.png", url: "https://blob.example/misc-casey.png" }
      ]
    });
    const { GET } = await loadFreshRoute();

    const response = await GET();
    const payload = await response.json();

    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(blobMocks.list).toHaveBeenCalledWith(expect.objectContaining({ prefix: "avatars/", token: "blob-token" }));
    expect(payload).toEqual({ configured: true, avatars: { taylor: "https://blob.example/taylor.png" } });
  });
});

async function loadFreshRoute() {
  vi.resetModules();
  return import("./route");
}

function membersJson(members: Array<{ id: string; name: string }>) {
  return JSON.stringify(members.map((member) => ({ ...member, refreshToken: "refresh-token" })));
}
