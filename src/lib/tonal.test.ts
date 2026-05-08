import { afterEach, describe, expect, it, vi } from "vitest";
import { getFamilyDashboard } from "./tonal";

describe("getFamilyDashboard", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("requests enough strength score history for the all-time family strength chart", async () => {
    const requestedUrls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        requestedUrls.push(url);
        if (url === "https://tonal.auth0.com/oauth/token") {
          return jsonResponse({ id_token: "test-id-token", expires_in: 3600 });
        }
        if (url.endsWith("/v6/users/userinfo")) {
          return jsonResponse({ id: "user-taylor" });
        }
        if (url.includes("/v6/users/user-taylor/strength-scores/current")) {
          return jsonResponse([{ strengthBodyRegion: "Overall", score: 520 }]);
        }
        if (url.includes("/v6/users/user-taylor/strength-scores/history")) {
          return jsonResponse([{ activityTime: "2025-01-02T10:00:00Z", overall: 390 }]);
        }
        if (url.includes("/v6/users/user-taylor/muscle-readiness/current")) {
          return jsonResponse({});
        }
        if (url.includes("/v6/users/user-taylor/activities")) {
          return jsonResponse([]);
        }
        if (url.includes("/v6/users/user-taylor/workout-activities")) {
          return jsonResponse([], { "pg-total": "0" });
        }
        throw new Error(`Unexpected fetch ${url}`);
      })
    );

    const dashboard = await getFamilyDashboard({ id: "taylor", name: "Taylor", refreshToken: "refresh-token" });

    expect(dashboard.strengthHistory).toEqual([{ activityTime: "2025-01-02T10:00:00Z", overall: 390 }]);
    expect(requestedUrls).toContain("https://api.tonal.com/v6/users/user-taylor/strength-scores/history?limit=500");
  });
});

function jsonResponse(body: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json", ...headers }
  });
}
