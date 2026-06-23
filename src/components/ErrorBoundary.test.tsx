import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorBoundary } from "./ErrorBoundary";

// A child that throws on demand, so we can flip it off to test recovery.
let crash = true;
function Bomb() {
  if (crash) throw new Error("boom");
  return <div>recovered content</div>;
}

describe("ErrorBoundary", () => {
  beforeEach(() => {
    crash = true;
    // React logs caught render errors to console.error; silence the noise.
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders children when nothing throws", () => {
    render(
      <ErrorBoundary>
        <div>healthy content</div>
      </ErrorBoundary>,
    );

    expect(screen.getByText("healthy content")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
  });

  it("renders the fallback with a custom title when a child throws", () => {
    render(
      <ErrorBoundary title="Boom title">
        <Bomb />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Boom title")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
    expect(screen.queryByText("recovered content")).not.toBeInTheDocument();
  });

  it("falls back to the default title when none is given", () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("recovers when the child stops throwing and 'Try again' is clicked", () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();

    // Fix the underlying problem, then retry.
    crash = false;
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(screen.getByText("recovered content")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
  });

  it("auto-recovers when a resetKey changes (e.g. route navigation)", () => {
    const { rerender } = render(
      <ErrorBoundary resetKeys={["/a"]}>
        <Bomb />
      </ErrorBoundary>,
    );
    // Child threw → fallback is shown, recovered content is not.
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
    expect(screen.queryByText("recovered content")).not.toBeInTheDocument();

    // Fix the underlying problem, then "navigate" by changing the resetKey.
    // No "Try again" click — the boundary should clear itself.
    crash = false;
    rerender(
      <ErrorBoundary resetKeys={["/b"]}>
        <Bomb />
      </ErrorBoundary>,
    );

    expect(screen.getByText("recovered content")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
  });

  it("stays in the error state when resetKeys are unchanged", () => {
    const { rerender } = render(
      <ErrorBoundary resetKeys={["/a"]}>
        <Bomb />
      </ErrorBoundary>,
    );
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();

    // Same resetKey on re-render must NOT clear the error, even if the child
    // would now succeed — only a key change (or "Try again") recovers.
    crash = false;
    rerender(
      <ErrorBoundary resetKeys={["/a"]}>
        <Bomb />
      </ErrorBoundary>,
    );

    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
    expect(screen.queryByText("recovered content")).not.toBeInTheDocument();
  });
});
