import { describe, expect, it } from "vitest";
import {
  getMemberDetailInsights,
  getPersonalTrendBadges,
  groupActivitiesByWeek,
  latestDashboardTimestamp,
  normalizeStrengthHistory,
  normalizeStrengthScores,
  rankMembersByAllTimeVolume,
  rankMembersForCategory,
  summarizeCalendarDays,
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

  it("normalizes daily training calendar volume with intensity levels", () => {
    expect(
      summarizeCalendarDays([
        { beginTime: "2026-05-01T10:00:00Z", totalVolume: 1000, totalReps: 20, totalDuration: 1200 },
        { beginTime: "2026-05-01T18:00:00Z", totalVolume: 2000, totalReps: 50, activeDuration: 900 },
        { beginTime: "2026-05-03T10:00:00Z", totalVolume: 500, totalReps: 30, totalDuration: 600 }
      ])
    ).toEqual([
      { date: "2026-05-01", workouts: 2, volume: 3000, reps: 70, duration: 2100, intensity: 4 },
      { date: "2026-05-03", workouts: 1, volume: 500, reps: 30, duration: 600, intensity: 1 }
    ]);
  });

  it("derives member-detail records, movement favorites, balance, style, and best recent sessions", () => {
    const insights = getMemberDetailInsights({
      member: { id: "taylor", name: "Taylor" },
      fetchedAt: "2026-05-04T12:00:00Z",
      strength: { overall: 535 },
      strengthHistory: [
        { activityTime: "2026-04-01T12:00:00Z", overall: 500 },
        { activityTime: "2026-05-01T12:00:00Z", overall: 535 }
      ],
      allTime: { totalVolume: 14800, totalWorkouts: 3, totalReps: 262, totalDuration: 6300 },
      weeklyVolume: [{ week: "2026-W18", workouts: 3, volume: 14800 }],
      calendarDays: [
        { date: "2026-05-01", workouts: 1, volume: 6200, reps: 82, duration: 1800, intensity: 4 },
        { date: "2026-05-02", workouts: 1, volume: 3200, reps: 120, duration: 2400, intensity: 2 },
        { date: "2026-05-03", workouts: 1, volume: 5400, reps: 60, duration: 2100, intensity: 3 }
      ],
      activities: [
        {
          activityId: "upper-density",
          activityTime: "2026-05-01T10:00:00Z",
          workoutPreview: { workoutTitle: "Upper Density", targetArea: "Upper Body", totalDuration: 1800, totalVolume: 6200 }
        },
        {
          activityId: "core-builder",
          activityTime: "2026-05-02T10:00:00Z",
          workoutPreview: { workoutTitle: "Core Builder", targetArea: "Core", totalDuration: 2400, totalVolume: 3200 }
        },
        {
          activityId: "lower-strength",
          activityTime: "2026-05-03T10:00:00Z",
          workoutPreview: { workoutTitle: "Lower Strength", targetArea: "Lower Body", totalDuration: 2100, totalVolume: 5400 }
        }
      ],
      recentWorkoutDetails: [
        {
          activityId: "upper-density",
          name: "Upper Density",
          targetArea: "Upper Body",
          duration: 1800,
          timeUnderTension: 600,
          totalReps: 82,
          totalSets: 8,
          totalVolume: 6200,
          movementSets: [
            {
              movementName: "Wide Grip Bench Press",
              totalVolume: 4000,
              sets: [
                { repCount: 5, weight: 80, oneRepMax: 95, maxConPower: 450, totalVolume: 400 },
                { repCount: 6, weight: 75, oneRepMax: 90, totalVolume: 450 }
              ]
            },
            { movementName: "Bent Over Row", totalVolume: 2200, sets: [{ repCount: 8, weight: 65, totalVolume: 520 }] }
          ]
        },
        {
          activityId: "core-builder",
          name: "Core Builder",
          targetArea: "Core",
          duration: 2400,
          timeUnderTension: 500,
          totalReps: 120,
          totalSets: 10,
          totalVolume: 3200,
          movementSets: [
            { movementName: "Pallof Press", totalVolume: 1800, sets: [{ repCount: 14, weight: 30, totalVolume: 420 }] },
            { movementName: "Dead Bug", totalVolume: 1400, sets: [{ repCount: 18, weight: 0, totalVolume: 0 }] }
          ]
        },
        {
          activityId: "lower-strength",
          name: "Lower Strength",
          targetArea: "Lower Body",
          duration: 2100,
          timeUnderTension: 900,
          totalReps: 60,
          totalSets: 6,
          totalVolume: 5400,
          movementSets: [
            { movementName: "Barbell Squat", totalVolume: 5400, sets: [{ repCount: 5, weight: 100, oneRepMax: 120, maxConPower: 390, totalVolume: 500 }] }
          ]
        }
      ],
      errors: []
    });

    expect(insights.calendar.activeDays).toBe(3);
    expect(insights.calendar.activeStreak).toBe(3);
    expect(insights.records.heaviestSet).toMatchObject({ label: "Heaviest set", value: 100, unit: "lb", movementName: "Barbell Squat" });
    expect(insights.records.bestOneRepMax).toMatchObject({ label: "Best estimated 1RM", value: 120, unit: "lb", movementName: "Barbell Squat" });
    expect(insights.records.mostRepsWorkout).toMatchObject({ label: "Most reps in one workout", value: 120, unit: "reps", workoutName: "Core Builder" });
    expect(insights.records.highestVolumeWorkout).toMatchObject({ label: "Highest volume workout", value: 6200, unit: "lb", workoutName: "Upper Density" });
    expect(insights.records.peakPower).toMatchObject({ label: "Peak power", value: 450, unit: "W", movementName: "Wide Grip Bench Press" });
    expect(insights.favoriteMovements[0]).toMatchObject({ name: "Barbell Squat", volume: 5400, frequency: 1, reps: 5 });
    expect(insights.bodyBalance.find((segment) => segment.area === "Upper")).toMatchObject({ workouts: 1, volume: 6200, percentage: 42 });
    expect(insights.trainingStyle.label).toBe("Strength-score climber");
    expect(insights.trainingStyle.traits).toContain("+35 strength score");
    expect(insights.recentHighlights.bestVolumeWorkout).toMatchObject({ title: "Upper Density", volume: 6200 });
    expect(insights.recentHighlights.densityWorkout).toMatchObject({ title: "Upper Density", density: 620 });
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
