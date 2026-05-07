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
        status: 200,
        json: async () => ({ configured: true, members: [] })
      })
    );
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it("opens the dashboard without an app-level password prompt", async () => {
    await act(async () => {
      root.render(<DashboardApp />);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(fetch).toHaveBeenCalledWith("/api/dashboard", { cache: "no-store" });
    expect(container.querySelector('input[type="password"]')).toBeNull();
    expect(container.textContent).toContain("All-time leaderboard");
    expect(container.textContent).not.toContain("Logout");
  });
});
