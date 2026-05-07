import { describe, expect, it } from "vitest";
import { groupActivitiesByWeek, normalizeStrengthScores, topReadyMuscles } from "./metrics";

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
});
