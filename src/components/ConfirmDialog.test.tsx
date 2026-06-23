import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// ConfirmDialog now reads `toast` from the store, so it must render inside a
// StoreProvider. The Tauri IPC layer the store loads from is mocked to empty
// lists; no Tauri runtime under jsdom, so the live-refresh listener is a no-op.
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

function renderDialog(onConfirm: () => void | Promise<void>, onClose: () => void) {
  return render(
    <StoreProvider>
      <ConfirmDialog
        title="Delete TOW-3?"
        message="“Thing” will be permanently removed. This can’t be undone."
        confirmLabel="Delete"
        onConfirm={onConfirm}
        onClose={onClose}
      />
      <Toaster />
    </StoreProvider>,
  );
}

// A promise we resolve/reject from the test, so we can hold onConfirm "in flight"
// and assert what happens during the pending window.
function deferred<T = void>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("ConfirmDialog in-flight guard", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("invokes onConfirm exactly once on a rapid double-click and disables the button while pending", async () => {
    const d = deferred();
    const onConfirm = vi.fn(() => d.promise);
    const onClose = vi.fn();
    renderDialog(onConfirm, onClose);

    const confirmBtn = screen.getByRole("button", { name: /Delete/i });

    // Two fast clicks before the awaited onConfirm settles.
    fireEvent.click(confirmBtn);
    fireEvent.click(confirmBtn);

    // The in-flight guard collapses both clicks into a single invocation...
    expect(onConfirm).toHaveBeenCalledTimes(1);
    // ...and the button is disabled while pending, so further clicks are inert.
    expect(confirmBtn).toBeDisabled();
    expect(screen.getByRole("button", { name: /Cancel/i })).toBeDisabled();

    // Resolve the action: the dialog dismisses (onClose) on success.
    d.resolve();
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("keeps the dialog open and shows a red error toast when onConfirm rejects", async () => {
    const d = deferred();
    const onConfirm = vi.fn(() => d.promise);
    const onClose = vi.fn();
    renderDialog(onConfirm, onClose);

    const confirmBtn = screen.getByRole("button", { name: /Delete/i });
    fireEvent.click(confirmBtn);
    expect(confirmBtn).toBeDisabled();

    // The destructive action fails (e.g. the row was already deleted over MCP).
    d.reject(new Error("no such row"));

    // The dialog stays open (onClose never fires) and an error toast surfaces...
    expect(await screen.findByText("Action failed")).toBeInTheDocument();
    expect(screen.getByText(/no such row/)).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();

    // ...and pending clears so the user can retry — the button is live again.
    await waitFor(() => expect(confirmBtn).not.toBeDisabled());
    fireEvent.click(confirmBtn);
    expect(onConfirm).toHaveBeenCalledTimes(2);
  });
});
