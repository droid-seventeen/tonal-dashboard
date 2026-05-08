import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DashboardApp from "./DashboardApp";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("DashboardApp", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    window.history.replaceState(null, "", "/");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ configured: true, members: [] })
      })
    );
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("opens the dashboard without an app-level password prompt", async () => {
    await act(async () => {
      root.render(<DashboardApp />);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(fetch).toHaveBeenCalledWith("/api/dashboard");
    expect(container.querySelector('input[type="password"]')).toBeNull();
    expect(container.textContent).toContain("Tonal League");
    expect(container.textContent).toContain("All-time leaderboard");
    expect(container.textContent).toContain("No family members configured yet");
    expect(container.textContent).toContain("Add TONAL_MEMBERS_JSON entries");
    expectNoRaceMetaphor(container);
    const visibleButtons = Array.from(container.querySelectorAll("button")).map((button) => button.textContent);
    expect(visibleButtons).not.toContain("Refresh");
    expect(container.textContent).not.toContain("Logout");
  });

  it("shows a warmer loading state while Tonal data is still loading", async () => {
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise(() => undefined)));

    await act(async () => {
      root.render(<DashboardApp />);
    });

    expect(container.textContent).toContain("Warming up Tonal data");
    expect(container.textContent).toContain("Pulling family strength signals");
    expect(container.querySelectorAll(".skeleton-card div").length).toBeGreaterThanOrEqual(3);
  });

  it("frames the home screen around the all-time volume leaderboard", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          configured: true,
          members: [
            {
              member: { id: "taylor", name: "Taylor" },
              fetchedAt: "2026-05-14T10:00:00.000Z",
              strength: { overall: 520 },
              strengthHistory: [
                { activityTime: "2026-04-01T10:00:00Z", overall: 505 },
                { activityTime: "2026-05-01T10:00:00Z", overall: 520 }
              ],
              readiness: {},
              topReady: [],
              allTime: { totalVolume: 250000, totalWorkouts: 20, totalReps: 2400, totalDuration: 72000 },
              weeklyVolume: [
                { week: "2026-W19", workouts: 2, volume: 14000 },
                { week: "2026-W20", workouts: 1, volume: 8000 }
              ],
              activities: [],
              recentWorkoutDetails: [],
              errors: []
            },
            {
              member: { id: "casey", name: "Casey" },
              fetchedAt: "2026-05-14T10:05:00.000Z",
              strength: { overall: 480 },
              strengthHistory: [
                { activityTime: "2026-04-01T10:00:00Z", overall: 450 },
                { activityTime: "2026-05-01T10:00:00Z", overall: 480 }
              ],
              readiness: {},
              topReady: [],
              allTime: { totalVolume: 125000, totalWorkouts: 12, totalReps: 1200, totalDuration: 36000 },
              weeklyVolume: [
                { week: "2026-W19", workouts: 1, volume: 2000 },
                { week: "2026-W20", workouts: 3, volume: 12000 }
              ],
              activities: [],
              recentWorkoutDetails: [],
              errors: []
            }
          ]
        })
      })
    );

    await act(async () => {
      root.render(<DashboardApp />);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(container.textContent).toContain("Tonal League");
    expect(container.textContent).toContain("All-time leaderboard");
    expect(container.textContent).toContain("Who has moved the most iron?");
    expect(container.textContent).toContain("Current leader");
    expect(container.textContent).toContain("Taylor");
    expect(container.textContent).toContain("250,000 lb lifted");
    expect(container.textContent).toContain("Family volume");
    expect(container.textContent).toContain("Tracked workouts");
    expect(container.textContent).toContain("Competitors");
    expect(container.textContent).toContain("Volume standings");
    expect(container.textContent).toContain("Last updated");
    expect(container.textContent).toContain("May 14, 10:05 AM UTC");
    expect(container.textContent).toContain("All-time");
    expect(container.textContent).toContain("This month");
    expect(container.textContent).toContain("This week");
    expect(container.textContent).toContain("Workouts");
    expect(container.textContent).toContain("Fairness adjusted");
    expect(container.textContent).toContain("This week 8,000 lb");
    expect(container.textContent).toContain("-43% vs prior week");
    expect(container.textContent).toContain("2-week streak");
    expect(container.textContent).toContain("+15 strength");
    expect(container.textContent).toContain("#1");
    expect(container.textContent).toContain("#2");
    expect(container.textContent).toContain("20 workouts");
    expect(container.textContent).toContain("lb all-time");
    expect(container.textContent).toContain("Family weekly volume");
    expect(container.textContent).toContain("Everyone's weekly pounds moved on the same time axis.");
    expect(container.querySelector('[data-chart="family-weekly-volume-overlay"]')).not.toBeNull();
    expect(container.querySelector('[data-series="weekly-volume-taylor"]')).not.toBeNull();
    expect(container.querySelector('[data-series="weekly-volume-casey"]')).not.toBeNull();

    const thisWeekTab = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("This week"));
    await act(async () => {
      thisWeekTab?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });
    const weeklyRows = Array.from(container.querySelectorAll(".leader-row"));
    expect(weeklyRows[0].textContent).toContain("Casey");
    expect(weeklyRows[0].textContent).toContain("12,000");
    expect(weeklyRows[0].textContent).toContain("lb this week");
    expect(weeklyRows[0].textContent).toContain("↑ 1");
    expect(weeklyRows[1].textContent).toContain("Taylor");
    expect(weeklyRows[1].textContent).toContain("↓ 1");

    const fairnessTab = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Fairness adjusted"));
    await act(async () => {
      fairnessTab?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });
    expect(container.textContent).toContain("Fairness adjusted standings");
    expect(container.textContent).toContain("fairness pts");
    expectNoRaceMetaphor(container);
  });

  it("only loads dashboard data on page load and never passively refreshes", async () => {
    vi.useFakeTimers();

    await act(async () => {
      root.render(<DashboardApp />);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain("Refresh the page to pull the latest Tonal data.");
    expect(container.textContent).not.toContain("Auto-updates");
    expect(container.textContent).not.toContain("Auto live");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60 * 60 * 1000);
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenLastCalledWith("/api/dashboard");
  });

  it("renders a body readiness heat map and historical performance charts", async () => {
    window.history.replaceState(null, "", "/#member-taylor");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          configured: true,
          members: [
            {
              member: { id: "taylor", name: "Taylor" },
              fetchedAt: "2026-04-18T15:00:00.000Z",
              strength: { overall: 525, upper: 560, core: 510, lower: 505 },
              strengthHistory: [
                { activityTime: "2026-01-15T12:00:00Z", overall: 470, upper: 500, core: 455, lower: 465 },
                { activityTime: "2026-02-15T12:00:00Z", overall: 492, upper: 525, core: 480, lower: 480 },
                { activityTime: "2026-03-15T12:00:00Z", overall: 525, upper: 560, core: 510, lower: 505 }
              ],
              readiness: {
                Chest: 92,
                Shoulders: 74,
                Back: 81,
                Triceps: 66,
                Biceps: 58,
                Abs: 88,
                Obliques: 42,
                Quads: 38,
                Glutes: 71,
                Hamstrings: 83,
                Calves: 97
              },
              topReady: [["Calves", 97], ["Chest", 92], ["Abs", 88], ["Hamstrings", 83]],
              allTime: { totalVolume: 7500, totalWorkouts: 3, totalReps: 300, totalDuration: 9000 },
              weeklyVolume: [
                { week: "2026-W01", workouts: 1, volume: 1000 },
                { week: "2026-W02", workouts: 1, volume: 2500 },
                { week: "2026-W03", workouts: 1, volume: 4000 }
              ],
              activities: [],
              recentWorkoutDetails: [],
              errors: []
            }
          ]
        })
      })
    );

    await act(async () => {
      root.render(<DashboardApp />);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(container.textContent).toContain("Muscle readiness");
    expect(container.textContent).toContain("11 muscles tracked");
    expect(container.textContent).toContain("Readiness scores");
    expect(container.textContent).not.toContain("Readiness matrix");
    expect(container.querySelector(".readiness-matrix")).toBeNull();
    expect(container.querySelector('[aria-label="Readiness color legend"]')).toBeNull();
    const diagram = container.querySelector('[data-chart="muscle-readiness-body-map"]');
    expect(diagram).not.toBeNull();
    expect(diagram?.getAttribute("aria-label")).toBe("Body muscle readiness diagram");
    expect(container.querySelectorAll("[data-readiness-chip]").length).toBe(11);
    expect(container.querySelector('[data-readiness-chip="Chest"]')?.textContent).toContain("92%");
    expect(container.querySelector('[data-readiness-chip="Calves"]')?.textContent).toContain("97%");
    expect(container.querySelector('[data-muscle="Chest"] title')?.textContent).toBe("Chest 92% readiness");
    expect(container.querySelector('[data-muscle="Quads"]')?.getAttribute("data-readiness-level")).toBe("redline");
    expect(container.querySelector('[data-muscle="Chest"]')?.getAttribute("data-tooltip")).toBe("Chest 92%");

    expect(container.textContent).not.toContain("Weekly volume");
    expect(container.textContent).not.toContain("Volume by week");
    expect(container.querySelector(".weekly-panel")).toBeNull();
    expect(container.querySelector('[data-chart="weekly-volume-history"]')).toBeNull();
    expect(container.querySelector('[data-series="weekly-volume"]')).toBeNull();

    expect(container.textContent).toContain("Strength score over time");
    expect(container.querySelector('[data-chart="strength-score-history"]')).not.toBeNull();
    expect(container.querySelector('[data-series="overall-strength"]')).not.toBeNull();
    expect(container.textContent).toContain("+55 overall");

    expect(container.textContent).toContain("Total weight moved over time");
    expect(container.querySelector('[data-chart="cumulative-volume-history"]')).not.toBeNull();
    expect(container.textContent).toContain("7,500 lb total");
  });

  it("turns detailed Tonal workout summaries into workout DNA cards", async () => {
    window.history.replaceState(null, "", "/#member-taylor");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          configured: true,
          members: [
            {
              member: { id: "taylor", name: "Taylor" },
              fetchedAt: "2026-04-18T15:00:00.000Z",
              strength: { overall: 501, upper: 525, core: 489, lower: 490 },
              readiness: {},
              topReady: [],
              allTime: {
                totalVolume: 120000,
                totalWorkouts: 20,
                totalReps: 2400,
                totalDuration: 72000,
                firstWorkoutAt: "2026-01-16T14:56:59.552567Z"
              },
              weeklyVolume: [],
              activities: [
                {
                  activityId: "workout-1",
                  activityTime: "2026-04-18T14:38:08.264564Z",
                  activityType: "DailyLift",
                  workoutPreview: {
                    workoutTitle: "DailyLift",
                    targetArea: "Upper Body",
                    totalDuration: 3600,
                    totalVolume: 3774
                  }
                }
              ],
              recentWorkoutDetails: [
                {
                  activityId: "workout-1",
                  name: "Taylor's Daily Lift",
                  targetArea: "UPPER BODY",
                  duration: 3600,
                  timeUnderTension: 598,
                  totalReps: 106,
                  totalSets: 36,
                  totalVolume: 3774,
                  totalWork: 11506,
                  level: "INTERMEDIATE",
                  movementSets: [
                    {
                      movementName: "Wide Grip Barbell Bench Press",
                      totalVolume: 1400,
                      totalWork: 4300,
                      sets: [
                        {
                          repCount: 10,
                          repGoal: 10,
                          weight: 26,
                          oneRepMax: 35,
                          maxConPower: 2111,
                          suggestedWeightChange: 1,
                          spotterMode: "SPOTTER",
                          totalVolume: 260,
                          duration: 40
                        }
                      ]
                    },
                    {
                      movementName: "Reverse Grip Triceps Extension",
                      totalVolume: 900,
                      sets: [{ repCount: 12, repGoal: 12, weight: 18, totalVolume: 216, duration: 32 }]
                    }
                  ]
                }
              ],
              errors: []
            }
          ]
        })
      })
    );

    await act(async () => {
      root.render(<DashboardApp />);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(container.textContent).toContain("Back to leaderboard");
    expect(container.textContent).toContain("Rank #1");
    expect(container.textContent).toContain("All-time volume");
    expect(container.textContent).toContain("120,000");
    expect(container.textContent).toContain("Workouts");
    expect(container.textContent).toContain("Time trained");
    expect(container.textContent).toContain("Workout DNA");
    expect(container.textContent).toContain("Movement telemetry");
    expect(container.textContent).toContain("Taylor's Daily Lift");
    expect(container.textContent).toContain("Wide Grip Barbell Bench Press");
    expect(container.textContent).toContain("Reverse Grip Triceps Extension");
    expect(container.textContent).toContain("Tension density");
    expect(container.textContent).toContain("379 lb/min");
    expect(container.textContent).toContain("36 sets");
    expect(container.textContent).toContain("106 reps");
    expect(container.textContent).toContain("Peak 26 lb");
    expect(container.textContent).toContain("1RM 35 lb");
    expect(container.textContent).toContain("2,111 W");
    expect(container.textContent).toContain("+1 next time");

    const backLink = container.querySelector(".back-button");
    await act(async () => {
      backLink?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });

    expect(window.location.hash).toBe("");
    expect(container.textContent).toContain("Tonal League");
    expectNoRaceMetaphor(container);
  });

  it("renders member detail training calendar, records, favorites, balance, style, and recent highlights", async () => {
    window.history.replaceState(null, "", "/#member-taylor");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          configured: true,
          members: [
            {
              member: { id: "taylor", name: "Taylor" },
              fetchedAt: "2026-05-04T12:00:00.000Z",
              strength: { overall: 535, upper: 560, core: 510, lower: 525 },
              strengthHistory: [
                { activityTime: "2026-04-01T12:00:00Z", overall: 500 },
                { activityTime: "2026-05-01T12:00:00Z", overall: 535 }
              ],
              readiness: {},
              topReady: [],
              allTime: { totalVolume: 14800, totalWorkouts: 3, totalReps: 262, totalDuration: 6300, firstWorkoutAt: "2026-05-01T10:00:00Z" },
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
                  activityType: "CustomWorkout",
                  workoutPreview: { workoutTitle: "Upper Density", targetArea: "Upper Body", totalDuration: 1800, totalVolume: 6200 }
                },
                {
                  activityId: "core-builder",
                  activityTime: "2026-05-02T10:00:00Z",
                  activityType: "CustomWorkout",
                  workoutPreview: { workoutTitle: "Core Builder", targetArea: "Core", totalDuration: 2400, totalVolume: 3200 }
                },
                {
                  activityId: "lower-strength",
                  activityTime: "2026-05-03T10:00:00Z",
                  activityType: "CustomWorkout",
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
            }
          ]
        })
      })
    );

    await act(async () => {
      root.render(<DashboardApp />);
    });

    await act(async () => {
      await Promise.resolve();
    });

    for (const section of [
      "training-calendar",
      "personal-records",
      "favorite-movements",
      "body-balance-analysis",
      "training-style-profile",
      "best-recent-workout"
    ]) {
      expect(container.querySelector(`[data-section="${section}"]`)).not.toBeNull();
    }

    expect(container.querySelector('[data-chart="training-calendar-heatmap"]')).not.toBeNull();
    expect(container.querySelector('[aria-label="Taylor training calendar heatmap"]')).not.toBeNull();
    expect(container.textContent).toContain("Training calendar");
    expect(container.textContent).toContain("3 active days");
    expect(container.textContent).toContain("3-day streak");
    expect(container.textContent).toContain("Personal records");
    expect(container.textContent).toContain("Heaviest set");
    expect(container.textContent).toContain("100 lb");
    expect(container.textContent).toContain("Best estimated 1RM");
    expect(container.textContent).toContain("120 lb");
    expect(container.textContent).toContain("Most reps in one workout");
    expect(container.textContent).toContain("120 reps");
    expect(container.textContent).toContain("Peak power");
    expect(container.textContent).toContain("450 W");
    expect(container.textContent).toContain("Favorite movements");
    expect(container.textContent).toContain("Barbell Squat");
    expect(container.textContent).toContain("Body balance");
    expect(container.textContent).toContain("Upper");
    expect(container.textContent).toContain("42%");
    expect(container.textContent).toContain("Training style");
    expect(container.textContent).toContain("Strength-score climber");
    expect(container.textContent).toContain("+35 strength score");
    expect(container.textContent).toContain("Best recent workout");
    expect(container.textContent).toContain("Upper Density");
    expect(container.textContent).toContain("620 lb/min");
    expectNoRaceMetaphor(container);
  });
});

function expectNoRaceMetaphor(container: HTMLElement) {
  const text = container.textContent ?? "";
  for (const phrase of [
    "Race to 500K",
    "Tonal Grand Prix",
    "Green flag",
    "race to 500K",
    "Pole position",
    "Pit lane",
    "Manual timing",
    "Race target",
    "Crew volume",
    "Race logs",
    "No boring rankings",
    "odometers",
    "Back to race",
    "Lane #",
    "in the chase",
    "Race odometer",
    "checkered flag",
    "Fuel burned",
    "Track time",
    "Engine rating",
    "Lap volume",
    "Muscle garage",
    "Pit telemetry",
    "race telemetry"
  ]) {
    expect(text).not.toContain(phrase);
  }
}
