import { describe, expect, it } from "vitest";
import {
  getPersonalTrendBadges,
  groupActivitiesByWeek,
  latestDashboardTimestamp,
  normalizeStrengthHistory,
  normalizeStrengthScores,
  rankMembersByAllTimeVolume,
  rankMembersForCategory,
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

  it("normalizes Tonal strength history chronologically", () => {
    expect(
      normalizeStrengthHistory([
        { activityTime: "2026-03-15T12:00:00Z", overall: 525, upper: 560, core: 510, lower: 505 },
        { activityTime: "invalid", overall: 999, upper: 999, core: 999, lower: 999 },
        { activityTime: "2026-01-15T12:00:00Z", overall: 470, upper: 500, core: 455, lower: 465 }
      ])
    ).toEqual([
      { activityTime: "2026-01-15T12:00:00Z", overall: 470, upper: 500, core: 455, lower: 465 },
      { activityTime: "2026-03-15T12:00:00Z", overall: 525, upper: 560, core: 510, lower: 505 }
    ]);
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

  it("ranks alternate leaderboard categories with inferred prior-period movement", () => {
    const now = new Date("2026-05-14T12:00:00Z");
    const ranked = rankMembersForCategory(
      [
        {
          member: { id: "taylor", name: "Taylor" },
          allTime: { totalVolume: 250000, totalWorkouts: 20, totalReps: 2400, totalDuration: 72000 },
          weeklyVolume: [
            { week: "2026-W19", workouts: 2, volume: 14000 },
            { week: "2026-W20", workouts: 1, volume: 8000 }
          ],
          strength: { overall: 520 },
          strengthHistory: []
        },
        {
          member: { id: "casey", name: "Casey" },
          allTime: { totalVolume: 125000, totalWorkouts: 12, totalReps: 1200, totalDuration: 36000 },
          weeklyVolume: [
            { week: "2026-W19", workouts: 1, volume: 2000 },
            { week: "2026-W20", workouts: 3, volume: 12000 }
          ],
          strength: { overall: 480 },
          strengthHistory: []
        }
      ],
      "thisWeekVolume",
      now
    );

    expect(ranked.map((entry) => entry.member.id)).toEqual(["casey", "taylor"]);
    expect(ranked.map((entry) => entry.rankMovementLabel)).toEqual(["↑ 1", "↓ 1"]);
    expect(ranked[0].leaderboardDisplay).toBe("12,000");
    expect(ranked[0].leaderboardSuffix).toBe("lb this week");
  });

  it("generates personal trend badges from weekly and strength history signals", () => {
    const badges = getPersonalTrendBadges(
      {
        member: { id: "casey", name: "Casey" },
        allTime: { totalVolume: 125000, totalWorkouts: 12, totalReps: 1200, totalDuration: 36000 },
        weeklyVolume: [
          { week: "2026-W18", workouts: 1, volume: 2500 },
          { week: "2026-W19", workouts: 1, volume: 6000 },
          { week: "2026-W20", workouts: 3, volume: 12000 }
        ],
        strength: { overall: 480 },
        strengthHistory: [
          { activityTime: "2026-04-01T10:00:00Z", overall: 450 },
          { activityTime: "2026-05-01T10:00:00Z", overall: 480 }
        ]
      },
      new Date("2026-05-14T12:00:00Z")
    );

    expect(badges.map((badge) => `${badge.label}: ${badge.value}`)).toEqual([
      "This week: 12,000 lb",
      "Week trend: +100% vs prior week",
      "Streak: 3-week streak",
      "Strength: +30 strength"
    ]);
  });

  it("finds the latest dashboard fetch timestamp across family members", () => {
    expect(
      latestDashboardTimestamp([
        { member: { id: "a", name: "A" }, fetchedAt: "2026-05-14T10:00:00Z" },
        { member: { id: "b", name: "B" }, fetchedAt: "2026-05-14T10:05:00Z" },
        { member: { id: "bad", name: "Bad" }, fetchedAt: "not-a-date" }
      ])?.toISOString()
    ).toBe("2026-05-14T10:05:00.000Z");
  });
});
