import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

describe("dashboard API route", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("disables shared caching so browser page refreshes request current Tonal data", async () => {
    vi.stubEnv("TONAL_MEMBERS_JSON", "");

    const response = await GET();

    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
