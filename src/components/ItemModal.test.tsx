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
const TODO: Todo = {
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

const updateTodo = vi.fn();

vi.mock("../lib/tauri", () => ({
  listProjects: () => Promise.resolve([PROJECT]),
  listTodos: () => Promise.resolve([TODO]),
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
// reload() has surfaced the fixture item.
function Gate({ onClose }: { onClose: () => void }) {
  const { items } = useStore();
  if (!items.some((i) => i.id === "t1")) return null;
  return <ItemModal config={{ kind: "todo", projectId: "p1", itemId: "t1" }} onClose={onClose} />;
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
