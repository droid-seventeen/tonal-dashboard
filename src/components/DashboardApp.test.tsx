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
    expect(container.textContent).toContain("Race to 500K");
    expect(container.textContent).toContain("The race to 500K is live.");
    expect(container.textContent).not.toContain("All-time leaderboard");
    const visibleButtons = Array.from(container.querySelectorAll("button")).map((button) => button.textContent);
    expect(visibleButtons).not.toContain("Refresh");
    expect(container.textContent).not.toContain("Logout");
  });

  it("frames the home screen as the race to 500K", async () => {
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
              strength: {},
              readiness: {},
              topReady: [],
              allTime: { totalVolume: 250000, totalWorkouts: 20, totalReps: 2400, totalDuration: 72000 },
              weeklyVolume: [],
              activities: [],
              recentWorkoutDetails: [],
              errors: []
            },
            {
              member: { id: "casey", name: "Casey" },
              fetchedAt: "2026-04-18T15:00:00.000Z",
              strength: {},
              readiness: {},
              topReady: [],
              allTime: { totalVolume: 125000, totalWorkouts: 12, totalReps: 1200, totalDuration: 36000 },
              weeklyVolume: [],
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

    expect(container.textContent).toContain("Race to 500K");
    expect(container.textContent).toContain("Pole position");
    expect(container.textContent).toContain("Taylor");
    expect(container.textContent).toContain("50% complete");
    expect(container.textContent).toContain("250,000 lb to the flag");
    expect(container.textContent).toContain("Pit lane standings");
    expect(container.textContent).toContain("P1");
    expect(container.textContent).toContain("P2");
    expect(container.textContent).toContain("No boring rankings, just odometers.");
    expect(container.textContent).not.toContain("Volume standings");
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

  it("turns detailed Tonal workout summaries into race telemetry", async () => {
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

    expect(container.textContent).toContain("Back to race");
    expect(container.textContent).toContain("Lane #1");
    expect(container.textContent).toContain("Race odometer");
    expect(container.textContent).toContain("24% complete");
    expect(container.textContent).toContain("380,000 lb to the flag");
    expect(container.textContent).toContain("Pit telemetry");
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
    expect(container.textContent).toContain("Race to 500K");
  });
});
