import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

describe("dashboard API route", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("sets shared cache headers so auto-refreshes are cheap across viewers", async () => {
    vi.stubEnv("TONAL_MEMBERS_JSON", "");

    const response = await GET();

    expect(response.headers.get("cache-control")).toBe("public, max-age=0, s-maxage=900, stale-while-revalidate=900");
  });
});
