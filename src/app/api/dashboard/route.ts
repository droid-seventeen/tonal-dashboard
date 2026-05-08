import { NextResponse } from "next/server";
import { parseMembersFromEnv } from "@/lib/members";
import { getFamilyDashboard } from "@/lib/tonal";

export const dynamic = "force-dynamic";
const DASHBOARD_CACHE_CONTROL = "no-store";

export async function GET() {
  let members;
  try {
    members = parseMembersFromEnv();
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }

  if (!members.length) {
    return cachedDashboardJson({
      configured: false,
      message: "Set TONAL_MEMBERS_JSON to load real family dashboard data.",
      members: []
    });
  }

  const settled = await Promise.allSettled(members.map((member) => getFamilyDashboard(member)));
  return cachedDashboardJson({
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
            errors: [(result.reason as Error).message]
          }
    )
  });
}

function cachedDashboardJson(payload: unknown) {
  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": DASHBOARD_CACHE_CONTROL
    }
  });
}
