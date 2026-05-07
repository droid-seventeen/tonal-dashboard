import { NextResponse } from "next/server";
import { parseMembersFromEnv } from "@/lib/members";
import { getFamilyDashboard } from "@/lib/tonal";

export const dynamic = "force-dynamic";

export async function GET() {
  let members;
  try {
    members = parseMembersFromEnv();
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }

  if (!members.length) {
    return NextResponse.json({
      configured: false,
      message: "Set TONAL_MEMBERS_JSON to load real family dashboard data.",
      members: []
    });
  }

  const settled = await Promise.allSettled(members.map((member) => getFamilyDashboard(member)));
  return NextResponse.json({
    configured: true,
    members: settled.map((result, index) =>
      result.status === "fulfilled"
        ? result.value
        : {
            member: { id: members[index].id, name: members[index].name },
            fetchedAt: new Date().toISOString(),
            strength: {},
            readiness: {},
            topReady: [],
            allTime: { totalVolume: 0, totalWorkouts: 0, totalReps: 0, totalDuration: 0 },
            activities: [],
            weeklyVolume: [],
            errors: [(result.reason as Error).message]
          }
    )
  });
}
