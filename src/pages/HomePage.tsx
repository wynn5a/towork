import { useState } from "react";
import { useStore } from "../lib/store";
import { useUI } from "../lib/ui";
import { useItemActions } from "../lib/actions";
import { QuickAdd } from "../components/QuickAdd";
import { HomeAiStrip } from "../components/HomeAiStrip";
import { ItemList, ListSkeleton } from "../components/items";
import { Count, EmptyState } from "../components/ui";
import type { Item } from "../lib/types";

type Tab = "open" | "done";

/** Home — every todo and issue across all projects, split into Open / Done tabs. */
export function HomePage() {
  const { items, projects, loading } = useStore();
  const ui = useUI();
  const { toggleDone } = useItemActions();
  const [tab, setTab] = useState<Tab>("open");

  const open = items.filter((i) => i.status !== "Done");
  const done = items.filter((i) => i.status === "Done");
  const ai = open.filter((i) => i.assignee === "AI").length;

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
      <HomeAiStrip />
      <div className="page-head">
        <div className="ph-text">
          <h1 className="page-title">Home</h1>
          <p className="page-sub">
            {open.length} open · {done.length} done
            {ai > 0 && (
              <>
                {" · "}
                <span style={{ color: "var(--purple)" }}>{ai} assigned to Claude</span>
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
                onToggle={toggleDone}
                onOpen={openItem}
              />
            </div>
          ) : (
            <>
              <div className="tabbar">
                <button
                  className={`tab${tab === "open" ? " active" : ""}`}
                  onClick={() => setTab("open")}
                >
                  Open <Count>{open.length}</Count>
                </button>
                <button
                  className={`tab${tab === "done" ? " active" : ""}`}
                  onClick={() => setTab("done")}
                >
                  Done <Count>{done.length}</Count>
                </button>
              </div>
              <div className="home-list">
                <ItemList
                  key={tab}
                  items={tab === "open" ? open : done}
                  groupBy="none"
                  showProject
                  emptyIcon="inbox"
                  emptyTitle={tab === "open" ? "No open items" : "No completed items"}
                  emptyDescription={
                    tab === "open"
                      ? "Everything here is done — nice."
                      : "Completed todos and issues will collect here."
                  }
                  onToggle={toggleDone}
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
