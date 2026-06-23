import { useState } from "react";
import { useStore } from "../lib/store";
import { useUI } from "../lib/ui";
import { useItemActions } from "../lib/actions";
import { QuickAdd } from "../components/QuickAdd";
import { ItemList, ListSkeleton } from "../components/items";
import { Count, EmptyState } from "../components/ui";
import type { Item } from "../lib/types";

type Tab = "open" | "in-progress" | "done";

/** Home — every todo and issue across all projects, split into Open / In Progress / Done tabs. */
export function HomePage() {
  const { items, projects, loading } = useStore();
  const ui = useUI();
  const { cycleStatus } = useItemActions();
  const [tab, setTab] = useState<Tab>("open");

  const open = items.filter((i) => i.status === "Open");
  const inProgress = items.filter((i) => i.status === "In Progress");
  const done = items.filter((i) => i.status === "Done");
  const ai = items.filter((i) => i.status !== "Done" && i.assignee === "AI").length;

  const openItem = (it: Item) =>
    ui.openItemModal({ kind: it.kind, projectId: it.project_id, itemId: it.id });

  if (loading) {
    return (
      <div className="view-pad">
        <div className="page-head">
          <div className="ph-text">
            <h1 className="page-title">Home</h1>
          </div>
        </div>
        <ListSkeleton rows={6} />
      </div>
    );
  }

  return (
    <div className="view-pad">
      <div className="page-head">
        <div className="ph-text">
          <h1 className="page-title">Home</h1>
          <p className="page-sub">
            {open.length} open
            {inProgress.length > 0 && (
              <>
                {" · "}
                {inProgress.length} in progress
              </>
            )}
            {" · "}
            {done.length} done
            {/* Claude's live activity now lives in the sidebar (visible from every
                screen), so this stays a neutral fact in the sub-line rather than
                competing for the AI "voice". */}
            {ai > 0 && (
              <>
                {" · "}
                {ai} assigned to Claude
              </>
            )}
          </p>
        </div>
      </div>

      {projects.length === 0 ? (
        <EmptyState
          icon="inbox"
          title="No projects yet"
          description="Create a project first, then add todos and issues to it here."
          action={
            <button className="btn-chip" onClick={() => ui.openProjectModal()}>
              Create a project
            </button>
          }
        />
      ) : (
        <>
          <QuickAdd />

          {items.length === 0 ? (
            <div className="home-list">
              <ItemList
                items={items}
                emptyIcon="inbox"
                emptyTitle="Nothing here yet"
                emptyDescription="Type above and press Enter to add your first todo or issue."
                onToggle={cycleStatus}
                onOpen={openItem}
              />
            </div>
          ) : (
            <>
              <div className="tabbar" role="tablist" aria-label="Filter items by status">
                <button
                  role="tab"
                  id="home-tab-open"
                  aria-selected={tab === "open"}
                  aria-controls="home-tabpanel"
                  className={`tab${tab === "open" ? " active" : ""}`}
                  onClick={() => setTab("open")}
                >
                  Open <Count>{open.length}</Count>
                </button>
                <button
                  role="tab"
                  id="home-tab-in-progress"
                  aria-selected={tab === "in-progress"}
                  aria-controls="home-tabpanel"
                  className={`tab${tab === "in-progress" ? " active" : ""}`}
                  onClick={() => setTab("in-progress")}
                >
                  In Progress <Count>{inProgress.length}</Count>
                </button>
                <button
                  role="tab"
                  id="home-tab-done"
                  aria-selected={tab === "done"}
                  aria-controls="home-tabpanel"
                  className={`tab${tab === "done" ? " active" : ""}`}
                  onClick={() => setTab("done")}
                >
                  Done <Count>{done.length}</Count>
                </button>
              </div>
              <div
                className="home-list"
                id="home-tabpanel"
                role="tabpanel"
                aria-labelledby={`home-tab-${tab}`}
              >
                <ItemList
                  key={tab}
                  items={tab === "open" ? open : tab === "in-progress" ? inProgress : done}
                  groupBy="none"
                  showProject
                  emptyIcon="inbox"
                  emptyTitle={
                    tab === "open"
                      ? "No open items"
                      : tab === "in-progress"
                        ? "Nothing in progress"
                        : "No completed items"
                  }
                  emptyDescription={
                    tab === "open"
                      ? "Everything here is done — nice."
                      : tab === "in-progress"
                        ? "Items you've started will show up here."
                        : "Completed todos and issues will collect here."
                  }
                  onToggle={cycleStatus}
                  onOpen={openItem}
                />
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
