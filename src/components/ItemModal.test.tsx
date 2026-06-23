import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { Project, Todo } from "../lib/types";

// The Tauri IPC layer is mocked so we can drive a mutation into rejection.
// The initial reload() reads these fixtures; updateTodo is overridden per-test.
const PROJECT: Project = {
  id: "p1",
  name: "Apollo",
  description: null,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};
const BASE_TODO: Todo = {
  id: "t1",
  project_id: "p1",
  title: "Existing todo",
  description: "desc",
  status: "Open",
  priority: "Medium",
  assignee: "User",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

// Mutable so a test can simulate an external edit (e.g. the AI over MCP) landing
// between reloads: swap this then call the store's reload() via the harness.
let currentTodo: Todo = { ...BASE_TODO };

const updateTodo = vi.fn();

vi.mock("../lib/tauri", () => ({
  listProjects: () => Promise.resolve([PROJECT]),
  listTodos: () => Promise.resolve([currentTodo]),
  listIssues: () => Promise.resolve([]),
  getActivity: () => Promise.resolve([]),
  updateTodo: (...args: unknown[]) => updateTodo(...args),
  updateIssue: vi.fn(),
  createTodo: vi.fn(),
  createIssue: vi.fn(),
  deleteTodo: vi.fn(),
  deleteIssue: vi.fn(),
}));

// No Tauri runtime under jsdom — the store's live-refresh listener is a no-op.
vi.mock("@tauri-apps/api/event", () => ({
  listen: () => Promise.resolve(() => {}),
}));

import { StoreProvider, useStore } from "../lib/store";
import { Toaster } from "./Toaster";
import { ItemModal } from "./ItemModal";

// ItemModal seeds its form state from the store on mount (the real app always
// opens it from an already-loaded list), so only mount it once the async
// reload() has surfaced the fixture item. The hidden "reload-store" button
// stands in for the live-refresh that `towork:changed` triggers in the app
// (mocked to a no-op under jsdom): a test mutates `currentTodo` then clicks it
// to pull the external change into the store, exactly as a real reload would.
function Gate({ onClose }: { onClose: () => void }) {
  const { items, reload } = useStore();
  if (!items.some((i) => i.id === "t1")) return null;
  return (
    <>
      <ItemModal config={{ kind: "todo", projectId: "p1", itemId: "t1" }} onClose={onClose} />
      <button onClick={() => void reload()}>reload-store</button>
    </>
  );
}

function renderModal(onClose: () => void) {
  return render(
    <StoreProvider>
      <Gate onClose={onClose} />
      <Toaster />
    </StoreProvider>,
  );
}

describe("ItemModal error feedback", () => {
  beforeEach(() => {
    currentTodo = { ...BASE_TODO };
    updateTodo.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows a red error toast and keeps the dialog open when the save mutation rejects", async () => {
    updateTodo.mockRejectedValue(new Error("database is locked"));
    const onClose = vi.fn();
    renderModal(onClose);

    // Wait for the initial store load to surface the existing todo.
    const titleInput = (await screen.findByDisplayValue("Existing todo")) as HTMLInputElement;
    fireEvent.change(titleInput, { target: { value: "Edited title" } });

    fireEvent.click(screen.getByRole("button", { name: /Save changes/i }));

    // The rejection surfaces an error toast (label + stringified error)...
    expect(await screen.findByText("Couldn’t save changes")).toBeInTheDocument();
    expect(screen.getByText(/database is locked/)).toBeInTheDocument();
    // ...and the dialog stays open (onClose never fired) so the user can retry.
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByDisplayValue("Edited title")).toBeInTheDocument();
  });

  it("closes the dialog and does not show an error when the save mutation resolves", async () => {
    updateTodo.mockResolvedValue(undefined);
    const onClose = vi.fn();
    renderModal(onClose);

    const titleInput = (await screen.findByDisplayValue("Existing todo")) as HTMLInputElement;
    fireEvent.change(titleInput, { target: { value: "Edited title" } });

    fireEvent.click(screen.getByRole("button", { name: /Save changes/i }));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(screen.queryByText("Couldn’t save changes")).not.toBeInTheDocument();
  });
});

describe("ItemModal status-change toast", () => {
  beforeEach(() => {
    currentTodo = { ...BASE_TODO };
    updateTodo.mockReset();
    updateTodo.mockResolvedValue(undefined);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("emits a status-specific toast (not 'Saved') when the status changes on save", async () => {
    const onClose = vi.fn();
    renderModal(onClose);

    // Wait for the fixture (an Open todo) to surface, then open the status menu
    // and pick "In Progress" via its menu item.
    await screen.findByDisplayValue("Existing todo");
    fireEvent.click(screen.getByRole("button", { name: /Open/i }));
    // Menu items render as plain divs (no role), so target the option by text.
    fireEvent.click(await screen.findByText("In Progress"));

    fireEvent.click(screen.getByRole("button", { name: /Save changes/i }));

    // The status-specific toast (cycleStatus's "In progress" wording) shows,
    // and the generic "Saved" toast does not.
    expect(await screen.findByText("In progress")).toBeInTheDocument();
    expect(screen.queryByText("Saved")).not.toBeInTheDocument();
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it("keeps the generic 'Saved' toast when only the title changes (no status change)", async () => {
    const onClose = vi.fn();
    renderModal(onClose);

    const titleInput = (await screen.findByDisplayValue("Existing todo")) as HTMLInputElement;
    fireEvent.change(titleInput, { target: { value: "Edited title" } });

    fireEvent.click(screen.getByRole("button", { name: /Save changes/i }));

    // No status change → the generic "Saved" toast, and no status-specific one.
    expect(await screen.findByText("Saved")).toBeInTheDocument();
    expect(screen.queryByText("In progress")).not.toBeInTheDocument();
    expect(screen.queryByText("Marked done")).not.toBeInTheDocument();
    expect(screen.queryByText("Reopened")).not.toBeInTheDocument();
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });
});

describe("ItemModal live-sync to external edits", () => {
  beforeEach(() => {
    currentTodo = { ...BASE_TODO };
    updateTodo.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("re-syncs an untouched field when the item changes underneath the open modal", async () => {
    const onClose = vi.fn();
    renderModal(onClose);

    // Modal is open showing the original title; the user hasn't touched it.
    await screen.findByDisplayValue("Existing todo");

    // The AI edits the same item over MCP: title changes + updated_at bumps.
    currentTodo = {
      ...BASE_TODO,
      title: "Title from the AI",
      updated_at: "2024-02-02T00:00:00Z",
    };
    fireEvent.click(screen.getByRole("button", { name: "reload-store" }));

    // The untouched title field re-syncs to the AI's value live...
    expect(await screen.findByDisplayValue("Title from the AI")).toBeInTheDocument();
    // ...and since nothing was dirty, no conflict banner appears.
    expect(screen.queryByText(/changed elsewhere/i)).not.toBeInTheDocument();
  });

  it("warns instead of clobbering when a dirty field changes underneath, and Reload pulls the external value", async () => {
    const onClose = vi.fn();
    renderModal(onClose);

    // User edits the title (it's now dirty)...
    const titleInput = (await screen.findByDisplayValue("Existing todo")) as HTMLInputElement;
    fireEvent.change(titleInput, { target: { value: "My in-progress edit" } });

    // ...then the AI changes the *same* field underneath.
    currentTodo = {
      ...BASE_TODO,
      title: "Title from the AI",
      updated_at: "2024-02-02T00:00:00Z",
    };
    fireEvent.click(screen.getByRole("button", { name: "reload-store" }));

    // The user's edit is preserved (not silently clobbered) and a banner warns.
    expect(await screen.findByText(/changed elsewhere/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue("My in-progress edit")).toBeInTheDocument();

    // Clicking Reload pulls the external value in and clears the banner.
    fireEvent.click(screen.getByRole("button", { name: "Reload" }));
    expect(await screen.findByDisplayValue("Title from the AI")).toBeInTheDocument();
    expect(screen.queryByText(/changed elsewhere/i)).not.toBeInTheDocument();
  });
});
