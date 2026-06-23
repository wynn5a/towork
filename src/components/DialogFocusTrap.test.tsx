import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// ConfirmDialog reads `toast` from the store, so render it inside a
// StoreProvider. The Tauri IPC layer is mocked to empty lists; there's no Tauri
// runtime under jsdom, so the live-refresh listener is a no-op.
vi.mock("../lib/tauri", () => ({
  listProjects: () => Promise.resolve([]),
  listTodos: () => Promise.resolve([]),
  listIssues: () => Promise.resolve([]),
  getActivity: () => Promise.resolve([]),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: () => Promise.resolve(() => {}),
}));

import { StoreProvider } from "../lib/store";
import { Toaster } from "./Toaster";
import { ConfirmDialog } from "./ConfirmDialog";

function renderDialog() {
  return render(
    <StoreProvider>
      {/* A control outside the dialog: in the real app the background is inert,
          so focus must never land here. */}
      <button>outside</button>
      <ConfirmDialog
        title="Delete TOW-3?"
        message="“Thing” will be permanently removed. This can’t be undone."
        confirmLabel="Delete"
        onConfirm={() => {}}
        onClose={() => {}}
      />
      <Toaster />
    </StoreProvider>,
  );
}

describe("dialog focus trap + accessible name (useFocusTrap)", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("names the dialog via aria-labelledby pointing at the title", () => {
    renderDialog();
    const dialog = screen.getByRole("dialog");
    const labelledBy = dialog.getAttribute("aria-labelledby");
    expect(labelledBy).toBeTruthy();
    const title = document.getElementById(labelledBy as string);
    expect(title).not.toBeNull();
    expect(title).toHaveTextContent("Delete TOW-3?");
    // The accessible name resolves to the title text.
    expect(dialog).toHaveAccessibleName("Delete TOW-3?");
  });

  it("moves focus into the dialog on open (first focusable control)", () => {
    renderDialog();
    const dialog = screen.getByRole("dialog");
    // Initial focus is the first focusable inside the dialog (the Cancel button)
    // — not the "outside" background control.
    const cancel = screen.getByRole("button", { name: /Cancel/i });
    expect(document.activeElement).toBe(cancel);
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it("Tab from the last focusable wraps to the first; Shift+Tab from the first wraps to the last", () => {
    renderDialog();
    const dialog = screen.getByRole("dialog");
    const cancel = screen.getByRole("button", { name: /Cancel/i });
    const confirm = screen.getByRole("button", { name: /Delete/i });

    // Focus the last control, then Tab — the trap should wrap to the first.
    confirm.focus();
    expect(document.activeElement).toBe(confirm);
    fireEvent.keyDown(dialog, { key: "Tab" });
    expect(document.activeElement).toBe(cancel);

    // Focus the first control, then Shift+Tab — the trap should wrap to the last.
    cancel.focus();
    expect(document.activeElement).toBe(cancel);
    fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(confirm);
  });

  it("restores focus to the previously-focused element when the dialog closes", () => {
    // A trigger button focused before the dialog opens.
    const trigger = document.createElement("button");
    trigger.textContent = "trigger";
    document.body.appendChild(trigger);
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    const { unmount } = renderDialog();
    // Dialog grabbed focus on open.
    expect(document.activeElement).not.toBe(trigger);

    // Closing the dialog restores focus to the trigger.
    unmount();
    expect(document.activeElement).toBe(trigger);

    document.body.removeChild(trigger);
  });
});
