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
});
