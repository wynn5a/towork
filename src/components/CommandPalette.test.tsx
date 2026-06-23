import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import type { Project } from "../lib/types";

// jsdom doesn't implement scrollIntoView; the palette calls it whenever the
// active row moves, so stub it before anything renders.
Element.prototype.scrollIntoView = vi.fn();

// The Tauri IPC layer is mocked. `currentProjects` is mutable so a test can
// simulate the AI adding/removing a project over MCP between reloads.
const P_ALPHA: Project = {
  id: "p-alpha",
  name: "Alpha",
  description: null,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};
const P_BETA: Project = {
  id: "p-beta",
  name: "Beta",
  description: null,
  created_at: "2024-01-02T00:00:00Z",
  updated_at: "2024-01-02T00:00:00Z",
};
const P_INSERTED: Project = {
  id: "p-inserted",
  name: "Inserted",
  description: null,
  created_at: "2024-01-03T00:00:00Z",
  updated_at: "2024-01-03T00:00:00Z",
};

let currentProjects: Project[] = [P_ALPHA, P_BETA];

vi.mock("../lib/tauri", () => ({
  listProjects: () => Promise.resolve(currentProjects),
  listTodos: () => Promise.resolve([]),
  listIssues: () => Promise.resolve([]),
  getActivity: () => Promise.resolve([]),
  deleteProject: vi.fn(),
}));

// No Tauri runtime under jsdom — the store's live-refresh listener is a no-op.
vi.mock("@tauri-apps/api/event", () => ({
  listen: () => Promise.resolve(() => {}),
}));

import { StoreProvider, useStore } from "../lib/store";
import { UIProvider } from "../lib/ui";
import { CommandPalette } from "./CommandPalette";

// Surfaces the current route so a test can assert which action Enter fired,
// plus a hidden button that runs the store's reload() — standing in for the
// `towork:changed` live-refresh the AI's MCP mutations trigger in the real app.
function Harness({ onClose }: { onClose: () => void }) {
  const { projects, reload } = useStore();
  const loc = useLocation();
  // Mount the palette only once the async reload() has surfaced the projects,
  // so the project rows exist on first paint (the real app opens it from
  // already-loaded data).
  if (projects.length === 0) return null;
  return (
    <>
      <div data-testid="pathname">{loc.pathname}</div>
      <button onClick={() => void reload()}>reload-store</button>
      <CommandPalette onClose={onClose} />
    </>
  );
}

function renderPalette(onClose: () => void) {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <StoreProvider>
        <UIProvider>
          <Harness onClose={onClose} />
        </UIProvider>
      </StoreProvider>
    </MemoryRouter>,
  );
}

describe("CommandPalette selection is robust to list changes (fix b)", () => {
  beforeEach(() => {
    currentProjects = [P_ALPHA, P_BETA];
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fires the identity-tracked action, not the one now at the old index, when a project is inserted above the selection", async () => {
    const onClose = vi.fn();
    renderPalette(onClose);

    // Wait for the palette to mount (projects loaded).
    await screen.findByRole("dialog");

    // The base list is: Create x3, Go to x3, then Projects [Alpha, Beta].
    // Arrow all the way down to highlight the last row — "Beta".
    const dialog = screen.getByRole("dialog");
    for (let i = 0; i < 20; i++) {
      fireEvent.keyDown(document, { key: "ArrowDown" });
    }
    // The highlighted (.active) row is the Beta project.
    const active = dialog.querySelector(".pitem.active .pi-label");
    expect(active?.textContent).toBe("Beta");

    // The AI inserts a project ("Inserted") ahead of Beta. Its created_at is
    // newer, but projects render in list order — what matters is that the row at
    // Beta's *old* positional index is no longer Beta.
    currentProjects = [P_ALPHA, P_INSERTED, P_BETA];
    fireEvent.click(screen.getByRole("button", { name: "reload-store" }));

    // After the reload the list grew; the highlight must still be on "Beta"
    // (tracked by identity), not on whatever shifted into Beta's old index.
    await waitFor(() => {
      const stillActive = dialog.querySelector(".pitem.active .pi-label");
      expect(stillActive?.textContent).toBe("Beta");
    });

    // Enter fires the highlighted row — it must navigate to Beta, NOT to the
    // newly inserted project that now occupies Beta's former index.
    fireEvent.keyDown(document, { key: "Enter" });
    expect(onClose).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.getByTestId("pathname").textContent).toBe("/project/p-beta");
    });
  });

  it("falls back to the first item (and never fires a stale action) when the selected project is deleted", async () => {
    const onClose = vi.fn();
    renderPalette(onClose);
    await screen.findByRole("dialog");
    const dialog = screen.getByRole("dialog");

    // Highlight "Beta" (the last row).
    for (let i = 0; i < 20; i++) {
      fireEvent.keyDown(document, { key: "ArrowDown" });
    }
    expect(dialog.querySelector(".pitem.active .pi-label")?.textContent).toBe("Beta");

    // The AI deletes Beta. Its identity is gone from the list.
    currentProjects = [P_ALPHA];
    fireEvent.click(screen.getByRole("button", { name: "reload-store" }));

    // Selection resets to the first row ("New project"), never lingering on a
    // ghost index that could fire the wrong action.
    await waitFor(() => {
      expect(dialog.querySelector(".pitem.active .pi-label")?.textContent).toBe("New project");
    });
  });
});
