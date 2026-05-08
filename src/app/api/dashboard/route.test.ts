import type { TonalDashboard } from "@/lib/tonal";
import { afterEach, describe, expect, it, vi } from "vitest";

const tonalMocks = vi.hoisted(() => ({
  getFamilyDashboard: vi.fn()
}));

vi.mock("@/lib/tonal", () => ({
  getFamilyDashboard: tonalMocks.getFamilyDashboard
}));

describe("dashboard API route", () => {
  afterEach(() => {
    tonalMocks.getFamilyDashboard.mockReset();
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it("keeps browser and edge caching disabled", async () => {
    vi.stubEnv("TONAL_MEMBERS_JSON", "");
    const { GET } = await loadFreshRoute();

    const response = await GET();

    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(tonalMocks.getFamilyDashboard).not.toHaveBeenCalled();
  });

  it("serves a warm dashboard snapshot for five minutes without calling Tonal again", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-08T10:00:00.000Z"));
    vi.stubEnv("TONAL_MEMBERS_JSON", membersJson([{ id: "taylor", name: "Taylor" }]));
    let fetchCount = 0;
    tonalMocks.getFamilyDashboard.mockImplementation(async (member) =>
      dashboardFor(member.id, member.name, `fetch-${++fetchCount}`)
    );
    const { GET } = await loadFreshRoute();

    const first = await GET();
    const firstPayload = await first.json();

    vi.setSystemTime(new Date("2026-05-08T10:04:59.000Z"));
    const second = await GET();
    const secondPayload = await second.json();

    expect(tonalMocks.getFamilyDashboard).toHaveBeenCalledTimes(1);
    expect(firstPayload.members[0].fetchedAt).toBe("fetch-1");
    expect(secondPayload).toEqual(firstPayload);
  });

  it("refreshes Tonal data after the five-minute warm cache window", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-08T10:00:00.000Z"));
    vi.stubEnv("TONAL_MEMBERS_JSON", membersJson([{ id: "casey", name: "Casey" }]));
    let fetchCount = 0;
    tonalMocks.getFamilyDashboard.mockImplementation(async (member) =>
      dashboardFor(member.id, member.name, `fetch-${++fetchCount}`)
    );
    const { GET } = await loadFreshRoute();

    await GET();
    vi.setSystemTime(new Date("2026-05-08T10:05:01.000Z"));
    const response = await GET();
    const payload = await response.json();

    expect(tonalMocks.getFamilyDashboard).toHaveBeenCalledTimes(2);
    expect(payload.members[0].fetchedAt).toBe("fetch-2");
  });
});

async function loadFreshRoute() {
  vi.resetModules();
  return import("./route");
}

function membersJson(members: Array<{ id: string; name: string }>) {
  return JSON.stringify(members.map((member) => ({ ...member, refreshToken: "refresh-token" })));
}

function dashboardFor(id: string, name: string, fetchedAt: string): TonalDashboard {
  return {
    member: { id, name },
    fetchedAt,
    strength: {},
    strengthHistory: [],
    readiness: {},
    topReady: [],
    allTime: { totalVolume: 0, totalWorkouts: 0, totalReps: 0, totalDuration: 0 },
    activities: [],
    recentWorkoutDetails: [],
    weeklyVolume: [],
    calendarDays: [],
    errors: []
  };
}
