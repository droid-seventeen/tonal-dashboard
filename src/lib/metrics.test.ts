import { describe, expect, it } from "vitest";
import {
  groupActivitiesByWeek,
  normalizeStrengthScores,
  rankMembersByAllTimeVolume,
  summarizeAllTimeStats,
  topReadyMuscles
} from "./metrics";

describe("dashboard metrics", () => {
  it("normalizes Tonal strength scores including the overall blank region", () => {
    expect(
      normalizeStrengthScores([
        { strengthBodyRegion: "Upper", bodyRegionDisplay: "Upper", score: 525 },
        { strengthBodyRegion: "Lower", bodyRegionDisplay: "Lower", score: 490 },
        { strengthBodyRegion: "Core", bodyRegionDisplay: "Core", score: 489 },
        { strengthBodyRegion: "", bodyRegionDisplay: "", score: 501 }
      ])
    ).toEqual({ overall: 501, upper: 525, lower: 490, core: 489 });
  });

  it("sorts readiness muscles high to low", () => {
    expect(topReadyMuscles({ Chest: 55, Back: 90, Quads: 72 }, 2)).toEqual([
      ["Back", 90],
      ["Quads", 72]
    ]);
  });

  it("groups recent workout volume by ISO week", () => {
    const weeks = groupActivitiesByWeek([
      { activityTime: "2026-05-04T10:00:00Z", workoutPreview: { totalVolume: 1000 } },
      { activityTime: "2026-05-05T10:00:00Z", workoutPreview: { totalVolume: 2000 } },
      { activityTime: "2026-05-11T10:00:00Z", workoutPreview: { totalVolume: 500 } }
    ]);

    expect(weeks).toEqual([
      { week: "2026-W19", workouts: 2, volume: 3000 },
      { week: "2026-W20", workouts: 1, volume: 500 }
    ]);
  });

  it("summarizes all-time leaderboard stats from workout activities", () => {
    expect(
      summarizeAllTimeStats([
        { beginTime: "2026-01-01T10:00:00Z", totalVolume: 1000, totalReps: 40, totalDuration: 1800 },
        { beginTime: "2026-02-01T10:00:00Z", totalVolume: 2500, totalReps: 80, totalDuration: 2400 }
      ])
    ).toEqual({
      totalVolume: 3500,
      totalWorkouts: 2,
      totalReps: 120,
      totalDuration: 4200,
      firstWorkoutAt: "2026-01-01T10:00:00Z",
      lastWorkoutAt: "2026-02-01T10:00:00Z"
    });
  });

  it("ranks family members by all-time volume", () => {
    const ranked = rankMembersByAllTimeVolume([
      { member: { id: "a", name: "A" }, allTime: { totalVolume: 100 } },
      { member: { id: "b", name: "B" }, allTime: { totalVolume: 400 } },
      { member: { id: "c", name: "C" }, allTime: { totalVolume: 250 } }
    ]);

    expect(ranked.map((entry) => entry.member.id)).toEqual(["b", "c", "a"]);
    expect(ranked.map((entry) => entry.rank)).toEqual([1, 2, 3]);
  });
});
