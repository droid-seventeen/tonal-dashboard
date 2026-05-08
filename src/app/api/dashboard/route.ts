import { NextResponse } from "next/server";
import { parseMembersFromEnv, type TonalMember } from "@/lib/members";
import { getFamilyDashboard, type TonalDashboard } from "@/lib/tonal";

export const dynamic = "force-dynamic";
const DASHBOARD_CACHE_CONTROL = "no-store";
const DASHBOARD_REFRESH_TTL_MS = 5 * 60 * 1000;

type DashboardPayload =
  | {
      configured: false;
      message: string;
      members: [];
    }
  | {
      configured: true;
      members: TonalDashboard[];
    };

type DashboardCacheEntry = {
  key: string;
  payload: DashboardPayload;
  refreshedAt: number;
  expiresAt: number;
};

let dashboardCache: DashboardCacheEntry | undefined;
let dashboardRefreshInFlight: { key: string; promise: Promise<DashboardCacheEntry> } | undefined;

export async function GET() {
  let members;
  try {
    members = parseMembersFromEnv();
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }

  if (!members.length) {
    return dashboardJson({
      configured: false,
      message: "Set TONAL_MEMBERS_JSON to load real family dashboard data.",
      members: []
    });
  }

  const cacheKey = dashboardCacheKey(members);
  const cached = getWarmDashboardCache(cacheKey);
  if (cached) return dashboardJson(cached.payload);

  const refreshed = await refreshDashboardCache(members, cacheKey);
  return dashboardJson(refreshed.payload);
}

function getWarmDashboardCache(cacheKey: string): DashboardCacheEntry | undefined {
  if (!dashboardCache || dashboardCache.key !== cacheKey) return undefined;
  if (dashboardCache.expiresAt <= Date.now()) return undefined;
  return dashboardCache;
}

async function refreshDashboardCache(members: TonalMember[], cacheKey: string): Promise<DashboardCacheEntry> {
  if (dashboardRefreshInFlight?.key === cacheKey) return dashboardRefreshInFlight.promise;

  const promise = buildDashboardPayload(members).then((payload) => {
    const refreshedAt = Date.now();
    const entry = {
      key: cacheKey,
      payload,
      refreshedAt,
      expiresAt: refreshedAt + DASHBOARD_REFRESH_TTL_MS
    };
    dashboardCache = entry;
    return entry;
  });

  dashboardRefreshInFlight = { key: cacheKey, promise };
  try {
    return await promise;
  } finally {
    if (dashboardRefreshInFlight?.promise === promise) dashboardRefreshInFlight = undefined;
  }
}

async function buildDashboardPayload(members: TonalMember[]): Promise<DashboardPayload> {
  const settled = await Promise.allSettled(members.map((member) => getFamilyDashboard(member)));
  return {
    configured: true,
    members: settled.map((result, index) =>
      result.status === "fulfilled"
        ? result.value
        : {
            member: { id: members[index].id, name: members[index].name },
            fetchedAt: new Date().toISOString(),
            strength: {},
            strengthHistory: [],
            readiness: {},
            topReady: [],
            allTime: { totalVolume: 0, totalWorkouts: 0, totalReps: 0, totalDuration: 0 },
            activities: [],
            recentWorkoutDetails: [],
            weeklyVolume: [],
            calendarDays: [],
            errors: [(result.reason as Error).message]
          }
    )
  };
}

function dashboardCacheKey(members: TonalMember[]): string {
  return JSON.stringify(members.map((member) => ({ id: member.id, name: member.name })));
}

function dashboardJson(payload: unknown) {
  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": DASHBOARD_CACHE_CONTROL
    }
  });
}
