import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import type { Project, Todo } from "../lib/types";

// One project + one todo so HomePage shows its status tabs and ProjectPage
// resolves a real project (rather than the "not found" empty state).
const PROJECT: Project = {
  id: "p-1",
  name: "Alpha",
  description: null,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};
const TODO: Todo = {
  id: "t-1",
  project_id: "p-1",
  title: "Existing todo",
  description: null,
  status: "Open",
  priority: "High",
  assignee: "User",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

// Stub the Tauri IPC layer so StoreProvider mounts cleanly under jsdom.
vi.mock("../lib/tauri", () => ({
  listProjects: () => Promise.resolve([PROJECT]),
  listTodos: () => Promise.resolve([TODO]),
  listIssues: () => Promise.resolve([]),
  getActivity: () => Promise.resolve([]),
  createTodo: vi.fn(() => Promise.resolve()),
  createIssue: vi.fn(() => Promise.resolve()),
  completeTodo: vi.fn(() => Promise.resolve()),
  completeIssue: vi.fn(() => Promise.resolve()),
}));

// No Tauri runtime under jsdom — the store's live-refresh listener is a no-op.
vi.mock("@tauri-apps/api/event", () => ({
  listen: () => Promise.resolve(() => {}),
}));

import { StoreProvider } from "../lib/store";
import { UIProvider } from "../lib/ui";
import { HomePage } from "./HomePage";
import { ProjectPage } from "./ProjectPage";

function renderHome() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <StoreProvider>
        <UIProvider>
          <HomePage />
        </UIProvider>
      </StoreProvider>
    </MemoryRouter>,
  );
}

function renderProject() {
  return render(
    <MemoryRouter initialEntries={["/p/p-1"]}>
      <StoreProvider>
        <UIProvider>
          <Routes>
            <Route path="/p/:id" element={<ProjectPage />} />
          </Routes>
        </UIProvider>
      </StoreProvider>
    </MemoryRouter>,
  );
}

describe("app-chrome accessibility (icon buttons + tab roles)", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("HomePage: the QuickAdd kind toggle is reachable by an accessible name", async () => {
    renderHome();
    // Defaults to a todo; the label reflects the action it performs.
    expect(
      await screen.findByRole("button", { name: /adding a todo — switch to an issue/i }),
    ).toBeInTheDocument();
  });

  it("HomePage: the status tabs expose role=tab with aria-selected in a labelled tablist", async () => {
    renderHome();

    // The tablist groups the three status tabs under an accessible name.
    const tablist = await screen.findByRole("tablist", { name: /filter items by status/i });
    expect(tablist).toBeInTheDocument();

    // The default-active tab ("Open") is a real tab and is selected; the others
    // are tabs but not selected.
    const openTab = screen.getByRole("tab", { name: /open/i });
    expect(openTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: /in progress/i })).toHaveAttribute(
      "aria-selected",
      "false",
    );
    expect(screen.getByRole("tab", { name: /done/i })).toHaveAttribute("aria-selected", "false");

    // The active tab points at the panel, and the panel points back at it.
    expect(openTab).toHaveAttribute("aria-controls", "home-tabpanel");
    const panel = screen.getByRole("tabpanel");
    expect(panel).toHaveAttribute("aria-labelledby", "home-tab-open");
  });

  it("ProjectPage: the More icon-button is reachable by an accessible name", async () => {
    renderProject();
    expect(
      await screen.findByRole("button", { name: /more project actions/i }),
    ).toBeInTheDocument();
  });

  it("ProjectPage: the view tabs expose role=tab with aria-selected in a labelled tablist", async () => {
    renderProject();

    const tablist = await screen.findByRole("tablist", { name: /project views/i });
    expect(tablist).toBeInTheDocument();

    // "Todos" is the default-active tab.
    const todosTab = screen.getByRole("tab", { name: /todos/i });
    expect(todosTab).toHaveAttribute("aria-selected", "true");
    expect(todosTab).toHaveAttribute("aria-controls", "project-tabpanel");
    expect(screen.getByRole("tab", { name: /issues/i })).toHaveAttribute(
      "aria-selected",
      "false",
    );

    // The panel exists and is labelled by the active tab.
    expect(screen.getByRole("tabpanel")).toHaveAttribute(
      "aria-labelledby",
      "project-tab-todos",
    );
  });
});
