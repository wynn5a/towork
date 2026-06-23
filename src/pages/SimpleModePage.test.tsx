import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { Todo } from "../lib/types";

// jsdom lacks scrollIntoView; the page calls it whenever the active row moves,
// so stub it before anything renders.
Element.prototype.scrollIntoView = vi.fn();

// One open todo so ↓ has a row to land on. Lives in a project so #routing /
// projectById resolve cleanly.
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

// Mock the Tauri IPC layer. completeTodo / createTodo are spies so the test can
// assert which one Enter fired. The store reloads after each mutation, so its
// list* readers return whatever `currentTodos` holds at call time.
let currentTodos: Todo[] = [TODO];
const completeTodo = vi.fn((_id: string) => Promise.resolve());
const createTodo = vi.fn((projectId: string, title: string) => {
  // Mirror the real backend: the new todo appears in the next reload.
  currentTodos = [
    ...currentTodos,
    { ...TODO, id: `t-${currentTodos.length + 1}`, project_id: projectId, title },
  ];
  return Promise.resolve(currentTodos[currentTodos.length - 1]);
});

vi.mock("../lib/tauri", () => ({
  listProjects: () =>
    Promise.resolve([
      {
        id: "p-1",
        name: "Alpha",
        description: null,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      },
    ]),
  listTodos: () => Promise.resolve(currentTodos),
  listIssues: () => Promise.resolve([]),
  getActivity: () => Promise.resolve([]),
  completeTodo: (id: string) => completeTodo(id),
  completeIssue: vi.fn(() => Promise.resolve()),
  createTodo: (projectId: string, title: string) => createTodo(projectId, title),
  createIssue: vi.fn(() => Promise.resolve()),
}));

// No Tauri runtime under jsdom — the store's live-refresh listener is a no-op.
vi.mock("@tauri-apps/api/event", () => ({
  listen: () => Promise.resolve(() => {}),
}));

import { StoreProvider } from "../lib/store";
import { UIProvider } from "../lib/ui";
import { SimpleModePage } from "./SimpleModePage";

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/simple"]}>
      <StoreProvider>
        <UIProvider>
          <SimpleModePage />
        </UIProvider>
      </StoreProvider>
    </MemoryRouter>,
  );
}

describe("SimpleModePage list navigation reachable from default focus", () => {
  beforeEach(() => {
    currentTodos = [TODO];
    completeTodo.mockClear();
    createTodo.mockClear();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("with the add input focused (default), ↓ then Enter COMPLETES the selected row (not add)", async () => {
    renderPage();

    // Wait for the existing todo to surface, then confirm the add input holds
    // focus on mount (the default state the bug stranded the user in).
    const row = await screen.findByText("Existing todo");
    const input = screen.getByPlaceholderText(/Add a todo/i);
    expect(document.activeElement).toBe(input);

    // ↓ at the document level (input focused) must move the LIST selection, not
    // the caret — the row picks up the `.sel` class.
    fireEvent.keyDown(document, { key: "ArrowDown" });
    await waitFor(() => {
      expect(row.closest(".simple-row")?.className).toContain("sel");
    });

    // Enter fired AT the focused input (the realistic path: the input's own
    // onKeyDown runs first, then the document handler) must complete the armed
    // row and NOT add — proving the disambiguation suppresses the input's add().
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => {
      expect(completeTodo).toHaveBeenCalledWith("t-1");
    });
    expect(createTodo).not.toHaveBeenCalled();
  });

  it("plain typing + Enter still ADDS a todo (no row selected)", async () => {
    renderPage();
    await screen.findByText("Existing todo");
    const input = screen.getByPlaceholderText(/Add a todo/i);

    // Type a title and press Enter from the default (no active selection).
    fireEvent.change(input, { target: { value: "Brand new todo" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      expect(createTodo).toHaveBeenCalledWith("p-1", "Brand new todo");
    });
    expect(completeTodo).not.toHaveBeenCalled();
  });

  it("typing after ↓ clears the active selection, so Enter ADDS again instead of completing", async () => {
    renderPage();
    const row = await screen.findByText("Existing todo");
    const input = screen.getByPlaceholderText(/Add a todo/i);

    // Arm a row with ↓ …
    fireEvent.keyDown(document, { key: "ArrowDown" });
    await waitFor(() => {
      expect(row.closest(".simple-row")?.className).toContain("sel");
    });

    // … then start typing, which must drop the active selection.
    fireEvent.change(input, { target: { value: "Changed my mind" } });
    await waitFor(() => {
      expect(row.closest(".simple-row")?.className).not.toContain("sel");
    });

    // Enter now adds the typed todo rather than completing the no-longer-active row.
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => {
      expect(createTodo).toHaveBeenCalledWith("p-1", "Changed my mind");
    });
    expect(completeTodo).not.toHaveBeenCalled();
  });
});
