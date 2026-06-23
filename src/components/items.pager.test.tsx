import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import type { Item, Todo } from "../lib/types";

// The store provider runs an async reload() on mount via the Tauri IPC layer;
// stub it out so the provider mounts cleanly under jsdom. The pager test feeds
// items straight into <ItemList items=...> as props, so these can stay empty.
vi.mock("../lib/tauri", () => ({
  listProjects: () => Promise.resolve([]),
  listTodos: () => Promise.resolve([]),
  listIssues: () => Promise.resolve([]),
  getActivity: () => Promise.resolve([]),
}));

// No Tauri runtime under jsdom — the store's live-refresh listener is a no-op.
vi.mock("@tauri-apps/api/event", () => ({
  listen: () => Promise.resolve(() => {}),
}));

// ItemRow reaches for useUI() to wire its click handlers; the pager test never
// clicks a row, so a trivial stub keeps the heavy modal/router UIProvider chain
// out of the harness.
vi.mock("../lib/ui", () => ({
  useUI: () => ({
    openCommandPalette: () => {},
    toggleCommandPalette: () => {},
    openProjectModal: () => {},
    openItemModal: () => {},
    confirmDeleteProject: () => {},
    confirm: () => {},
    isAnyOverlayOpen: () => false,
  }),
}));

import { StoreProvider } from "../lib/store";
import { ItemList } from "./items";

/** Build `n` flat todos with stable ids/titles, all in one bucket. */
function makeItems(prefix: string, n: number): Item[] {
  return Array.from({ length: n }, (_, i) => {
    const todo: Todo = {
      id: `${prefix}-${i}`,
      project_id: "p1",
      title: `${prefix} item ${i}`,
      description: null,
      status: "Open",
      priority: "Medium",
      assignee: "User",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    };
    return { ...todo, kind: "todo" };
  });
}

// A harness that swaps the flat ItemList's items the way the project page's
// sub-tab switch does: same <ItemList> instance (flat grouping always keys its
// inner section "all"), different items underneath. Buttons let a test trigger
// either a genuine bucket switch (new ids) or a no-op reload (same ids, fresh
// array reference) so both pager behaviours can be asserted.
function Harness({ a, b }: { a: Item[]; b: Item[] }) {
  const [items, setItems] = useState<Item[]>(a);
  return (
    <StoreProvider>
      <button onClick={() => setItems(b)}>switch-bucket</button>
      <button onClick={() => setItems([...a])}>noop-reload</button>
      <ItemList items={items} groupBy="flat" onToggle={() => {}} onOpen={() => {}} />
    </StoreProvider>
  );
}

describe("ItemList pager page reset (flat sub-tab / content identity)", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("resets to page 1 when the flat section's content identity changes (sub-tab switch)", () => {
    // Bucket A and B both paginate (25 items -> 3 pages), with disjoint ids so
    // switching between them is a genuine content-identity change.
    render(<Harness a={makeItems("A", 25)} b={makeItems("B", 25)} />);

    // Start on page 1 of bucket A, then page forward to page 2.
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
    expect(screen.getByText("A item 0")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
    expect(screen.getByText("A item 10")).toBeInTheDocument();

    // Switch the sub-tab/bucket. Without the fix the reused ListSection would
    // stay on page 2 of bucket B; with it the pager resets to page 1.
    fireEvent.click(screen.getByRole("button", { name: "switch-bucket" }));
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
    expect(screen.getByText("B item 0")).toBeInTheDocument();
    expect(screen.queryByText("B item 10")).not.toBeInTheDocument();
  });

  it("keeps your page across a background reload that doesn't change this section's items", () => {
    render(<Harness a={makeItems("A", 25)} b={makeItems("B", 25)} />);

    // Page to 2, then a no-op reload (same ids, new array reference) lands —
    // the page must be preserved so unrelated background activity never yanks
    // the user back to page 1.
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(screen.getByText("2 / 3")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "noop-reload" }));
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
    expect(screen.getByText("A item 10")).toBeInTheDocument();
  });

  it("clamps to the last surviving page when the current page vanishes on reload", () => {
    // 25 items -> 3 pages; go to the last page, then shrink to 15 items
    // (2 pages) so page index 2 no longer exists.
    const full = makeItems("A", 25);
    const shrunk = full.slice(0, 15);
    render(<Harness a={full} b={shrunk} />);

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(screen.getByText("3 / 3")).toBeInTheDocument();

    // Shrinking removes the page you were on. The content identity changed
    // (items left this section), so the pager resets to a valid page — never
    // an empty page-3-of-2 view.
    fireEvent.click(screen.getByRole("button", { name: "switch-bucket" }));
    expect(screen.getByText(/\/ 2$/)).toBeInTheDocument();
    expect(screen.queryByText("3 / 2")).not.toBeInTheDocument();
  });
});
