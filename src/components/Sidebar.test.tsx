import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import type { Project } from "../lib/types";

const PROJECT: Project = {
  id: "p-1",
  name: "Alpha",
  description: null,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

// Stub the Tauri IPC layer so StoreProvider + Sidebar mount cleanly under jsdom.
// `getMcpAddress` rejecting is fine — the Sidebar falls back to a "starting…" foot.
vi.mock("../lib/tauri", () => ({
  listProjects: () => Promise.resolve([PROJECT]),
  listTodos: () => Promise.resolve([]),
  listIssues: () => Promise.resolve([]),
  getActivity: () => Promise.resolve([]),
  getMcpAddress: () => Promise.reject(new Error("no tauri in jsdom")),
}));

// No Tauri runtime under jsdom — the store's live-refresh listener is a no-op.
vi.mock("@tauri-apps/api/event", () => ({
  listen: () => Promise.resolve(() => {}),
}));

import { StoreProvider } from "../lib/store";
import { UIProvider } from "../lib/ui";
import { Sidebar } from "./Sidebar";

// Surfaces the current pathname so a test can assert navigation happened.
function LocationProbe() {
  const loc = useLocation();
  return <div data-testid="pathname">{loc.pathname}</div>;
}

function renderSidebar(initialPath = "/") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <StoreProvider>
        <UIProvider>
          <Sidebar />
          <Routes>
            <Route path="*" element={<LocationProbe />} />
          </Routes>
        </UIProvider>
      </StoreProvider>
    </MemoryRouter>,
  );
}

describe("Sidebar search access", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("exposes a top-level Search nav control reachable by accessible name", async () => {
    renderSidebar();
    expect(await screen.findByRole("button", { name: /search/i })).toBeInTheDocument();
  });

  it("activating Search routes to /search and marks it current", async () => {
    renderSidebar();

    const searchNav = await screen.findByRole("button", { name: /search/i });
    expect(searchNav).not.toHaveAttribute("aria-current", "page");

    fireEvent.click(searchNav);

    expect(screen.getByTestId("pathname")).toHaveTextContent("/search");
    // After landing on /search the nav item reflects the active route.
    expect(screen.getByRole("button", { name: /search/i })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("marks Search active when rendered on the /search route", async () => {
    renderSidebar("/search");
    const searchNav = await screen.findByRole("button", { name: /search/i });
    expect(searchNav).toHaveAttribute("aria-current", "page");
  });
});

describe("Sidebar Simple Mode access", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("exposes a Simple Mode control reachable by accessible name", async () => {
    renderSidebar();
    expect(
      await screen.findByRole("button", { name: /simple mode/i }),
    ).toBeInTheDocument();
  });

  it("activating Simple Mode routes to /simple", async () => {
    renderSidebar();

    const simpleBtn = await screen.findByRole("button", { name: /simple mode/i });
    fireEvent.click(simpleBtn);

    expect(screen.getByTestId("pathname")).toHaveTextContent("/simple");
  });
});
