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
    expect(container.textContent).toContain("All-time leaderboard");
    const visibleButtons = Array.from(container.querySelectorAll("button")).map((button) => button.textContent);
    expect(visibleButtons).not.toContain("Refresh");
    expect(container.textContent).not.toContain("Logout");
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
});
