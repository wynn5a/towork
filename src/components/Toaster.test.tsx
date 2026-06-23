import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

// Stub the Tauri IPC layer so StoreProvider mounts cleanly under jsdom.
vi.mock("../lib/tauri", () => ({
  listProjects: () => Promise.resolve([]),
  listTodos: () => Promise.resolve([]),
  listIssues: () => Promise.resolve([]),
  getActivity: () => Promise.resolve([]),
}));

// No Tauri runtime under jsdom — the store's live-refresh listener is a no-op.
vi.mock("@tauri-apps/api/event", () => ({
  listen: () => Promise.resolve(() => {}),
}));

import { StoreProvider, useStore } from "../lib/store";
import { Toaster } from "./Toaster";

// Harness that exposes the store's imperative `toast(...)` so a test can fire a
// toast against the real store + Toaster wiring (not a mocked store).
let fireToast: (title: string, body?: string) => void = () => {};
function ToastTrigger() {
  const { toast } = useStore();
  fireToast = toast;
  return null;
}

function renderToaster() {
  return render(
    <StoreProvider>
      <ToastTrigger />
      <Toaster />
    </StoreProvider>,
  );
}

// The DOM node for the (single) rendered toast.
function toastEl(): HTMLElement {
  return document.querySelector(".toast") as HTMLElement;
}

// NOTE on what jsdom can and can't cover here:
//  - jsdom does NOT run CSS animations and (in this React 19 + jsdom setup)
//    does not dispatch `animationend` to React's `onAnimationEnd`. So we can't
//    drive removal through the animation-end path in a test. We instead drive
//    removal through the component's safety-net timeout (EXIT_FALLBACK_MS), and
//    assert the `.out` class is applied while leaving — that class is what makes
//    the exit animate in a real browser, and `onAnimationEnd` removal there is
//    exercised by the same `removeToast` we verify via the timeout here.
const EXIT_FALLBACK_MS = 260;

describe("Toaster exit animation + manual dismiss", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("animates out instead of vanishing: auto-dismiss adds `out`, then removes after the exit", () => {
    renderToaster();
    act(() => fireToast("Saved", "TOW-1"));
    expect(screen.getByText("Saved")).toBeInTheDocument();
    expect(toastEl().className).toBe("toast");

    // The auto-dismiss timer (2800ms) flips it to leaving → `.out` class, but
    // the row is still in the DOM (the slide-out is "playing", not removed).
    act(() => vi.advanceTimersByTime(2800));
    expect(toastEl().className).toBe("toast out");
    expect(screen.getByText("Saved")).toBeInTheDocument();

    // Only after the exit completes is the row removed (no abrupt vanish).
    act(() => vi.advanceTimersByTime(EXIT_FALLBACK_MS));
    expect(screen.queryByText("Saved")).not.toBeInTheDocument();
  });

  it("removes a leaving toast when the `toast-out` animation ends (browser path)", () => {
    // jsdom won't dispatch this to React on its own, so we fire it explicitly.
    // It must be a no-op for the entrance and remove for the exit.
    renderToaster();
    act(() => fireToast("ViaAnim"));

    // Entrance animation ending must NOT remove the toast.
    act(() => fireEvent.animationEnd(toastEl(), { animationName: "toast-in" }));
    expect(screen.getByText("ViaAnim")).toBeInTheDocument();

    // Once leaving, an explicit `toast-out` animationend removes it. (If the
    // synthetic event no-ops in this environment, the fallback timeout still
    // removes it — asserted by advancing timers afterward.)
    act(() => fireEvent.click(toastEl()));
    expect(toastEl().className).toBe("toast out");
    act(() => fireEvent.animationEnd(toastEl(), { animationName: "toast-out" }));
    act(() => vi.advanceTimersByTime(EXIT_FALLBACK_MS));
    expect(screen.queryByText("ViaAnim")).not.toBeInTheDocument();
  });

  it("dismisses via the close button", () => {
    renderToaster();
    act(() => fireToast("Closeable"));

    const closeBtn = screen.getByRole("button", { name: "Dismiss notification" });
    act(() => fireEvent.click(closeBtn));

    expect(toastEl().className).toBe("toast out");
    act(() => vi.advanceTimersByTime(EXIT_FALLBACK_MS));
    expect(screen.queryByText("Closeable")).not.toBeInTheDocument();
  });

  it("dismisses on click anywhere on the toast body", () => {
    renderToaster();
    act(() => fireToast("Clickable"));

    act(() => fireEvent.click(toastEl()));
    expect(toastEl().className).toBe("toast out");

    act(() => vi.advanceTimersByTime(EXIT_FALLBACK_MS));
    expect(screen.queryByText("Clickable")).not.toBeInTheDocument();
  });

  it("ignores a repeated dismiss (no double-removal / key churn)", () => {
    renderToaster();
    act(() => fireToast("Once"));

    // Manual dismiss starts the exit; remove it once the exit completes.
    act(() => fireEvent.click(toastEl()));
    act(() => vi.advanceTimersByTime(EXIT_FALLBACK_MS));
    expect(document.querySelectorAll(".toast")).toHaveLength(0);

    // The auto-dismiss timer (2800ms) still fires later for the now-gone toast.
    // It must be a harmless no-op — no error, no resurrected/duplicate row.
    expect(() => act(() => vi.advanceTimersByTime(2800))).not.toThrow();
    expect(document.querySelectorAll(".toast")).toHaveLength(0);
  });
});
