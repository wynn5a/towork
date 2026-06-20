import { useState } from "react";
import { useParams } from "react-router-dom";
import { useStore } from "../lib/store";
import { useUI } from "../lib/ui";
import { useItemActions } from "../lib/actions";
import { ItemList, ListSkeleton } from "../components/items";
import { ActivityTimeline } from "../components/ActivityTimeline";
import { Count, EmptyState } from "../components/ui";
import { Icon } from "../lib/icons";
import { Menu, anchorMenu, type MenuPos } from "../components/Menu";
import { PRIORITY_RANK } from "../lib/derive";
import type { Item, ItemKind } from "../lib/types";

type Tab = "todos" | "issues" | "activity";
type GroupBy = "status" | "date";

/** Most urgent first (High → Medium → Low); ties keep creation order. */
const byUrgency = (a: Item, b: Item) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
/** Newest-created first (ISO strings sort chronologically). */
const byCreatedDesc = (a: Item, b: Item) => b.created_at.localeCompare(a.created_at);

interface Bucket {
  key: string;
  label: string;
  items: Item[];
}

/** Coarse calendar bucket for the Group-by-date tabs (local day boundaries). */
function dateRank(iso: string): 0 | 1 | 2 {
  const startOfDay = (t: number) => {
    const x = new Date(t);
    return new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  };
  const today = startOfDay(Date.now());
  const t = startOfDay(new Date(iso).getTime());
  if (t >= today) return 0; // Today
  if (t >= today - 86_400_000) return 1; // Yesterday
  return 2; // Older
}

/** Slice items into the Group-by sub-tab buckets, dropping any that are empty.
 *  Each bucket arrives pre-ordered so the list can render it flat. */
function buildBuckets(items: Item[], groupBy: GroupBy): Bucket[] {
  if (groupBy === "date") {
    const labels = ["Today", "Yesterday", "Older"] as const;
    const slots: Item[][] = [[], [], []];
    for (const it of items) slots[dateRank(it.created_at)].push(it);
    return labels
      .map((label, rank) => ({
        key: `date-${rank}`,
        label,
        items: slots[rank].slice().sort(byCreatedDesc),
      }))
      .filter((b) => b.items.length > 0);
  }

  // status — Todo (open) / Done tabs, each ordered by urgency.
  const todo = items.filter((i) => i.status !== "Done").sort(byUrgency);
  const done = items.filter((i) => i.status === "Done").sort(byUrgency);
  return [
    { key: "todo", label: "Todo", items: todo },
    { key: "done", label: "Done", items: done },
  ].filter((b) => b.items.length > 0);
}

export function ProjectPage() {
  const { id = "" } = useParams<{ id: string }>();
  const { projectById, itemsForProject, loading } = useStore();
  const ui = useUI();
  const { cycleStatus } = useItemActions();
  const [tab, setTab] = useState<Tab>("todos");
  const [groupBy, setGroupBy] = useState<GroupBy>("status");
  const [subTab, setSubTab] = useState<string | null>(null);
  const [menu, setMenu] = useState<MenuPos | null>(null);

  const project = projectById(id);
  if (loading && !project) {
    return (
      <div className="view-pad">
        <div className="page-head">
          <div className="ph-text">
            <h1 className="page-title" style={{ opacity: 0.5 }}>
              Loading…
            </h1>
          </div>
        </div>
        <ListSkeleton rows={6} />
      </div>
    );
  }
  if (!project) {
    return (
      <div className="view-pad">
        <EmptyState icon="project" title="Project not found" description="It may have been deleted." />
      </div>
    );
  }

  const all = itemsForProject(id);
  const todos = all.filter((i) => i.kind === "todo");
  const issues = all.filter((i) => i.kind === "issue");

  const openOpen = (kind: ItemKind) => ui.openItemModal({ kind, projectId: id });
  const openEdit = (itemId: string, kind: ItemKind) =>
    ui.openItemModal({ kind, projectId: id, itemId });

  const TabButton = ({ value, label, icon, count }: { value: Tab; label: string; icon: "todo" | "issue" | "activity"; count?: number }) => (
    <button className={`tab${tab === value ? " active" : ""}`} onClick={() => setTab(value)}>
      <Icon name={icon} size={15} />
      {label}
      {count !== undefined && <Count>{count}</Count>}
    </button>
  );

  const kind: ItemKind = tab === "issues" ? "issue" : "todo";
  const activeItems = tab === "issues" ? issues : todos;
  const buckets = buildBuckets(activeItems, groupBy);
  // Resolve the active sub-tab: keep the selection if it still has items,
  // otherwise fall back to the first available bucket.
  const active = buckets.find((b) => b.key === subTab) ?? buckets[0] ?? null;

  return (
    <div className="view-pad">
      <div className="page-head">
        <div className="ph-text">
          <h1 className="page-title">{project.name}</h1>
          {project.description && <p className="page-sub">{project.description}</p>}
        </div>
        <div className="ph-actions">
          {tab !== "activity" && (
            <div className="seg" role="tablist" aria-label="Group by">
              <button
                className={`seg-btn${groupBy === "status" ? " sel" : ""}`}
                onClick={() => {
                  setGroupBy("status");
                  setSubTab(null);
                }}
                title="Group by status"
              >
                <Icon name="signal" size={13} />
                Status
              </button>
              <button
                className={`seg-btn${groupBy === "date" ? " sel" : ""}`}
                onClick={() => {
                  setGroupBy("date");
                  setSubTab(null);
                }}
                title="Group by date"
              >
                <Icon name="clock" size={13} />
                Date
              </button>
            </div>
          )}
          <button
            className="icon-btn"
            title="More"
            onClick={(e) => setMenu(anchorMenu(e.currentTarget as HTMLElement, 188, "right"))}
          >
            <Icon name="more" size={16} />
          </button>
        </div>
      </div>

      <div className="tabbar">
        <TabButton value="todos" label="Todos" icon="todo" count={todos.length} />
        <TabButton value="issues" label="Issues" icon="issue" count={issues.length} />
        <TabButton value="activity" label="Activity" icon="activity" />
      </div>

      {tab === "activity" ? (
        <ActivityTimeline projectId={id} />
      ) : (
        <>
          <div className="page-head" style={{ marginBottom: 16 }}>
            <div className="ph-text">
              {buckets.length > 0 && (
                <div className="tabbar tabbar--sub">
                  {buckets.map((b) => (
                    <button
                      key={b.key}
                      className={`tab${active?.key === b.key ? " active" : ""}`}
                      onClick={() => setSubTab(b.key)}
                    >
                      {b.label} <Count>{b.items.length}</Count>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="ph-actions">
              <button className="btn-secondary" onClick={() => openOpen(kind)}>
                <Icon name="plus" size={14} />
                {tab === "issues" ? "New issue" : "New todo"}
              </button>
            </div>
          </div>
          <ItemList
            key={`${tab}-${groupBy}-${active?.key ?? "empty"}`}
            items={active?.items ?? []}
            groupBy="flat"
            emptyIcon={tab === "issues" ? "issue" : "todo"}
            emptyTitle={tab === "issues" ? "No issues yet" : "No todos yet"}
            emptyDescription={
              tab === "issues"
                ? "Track bugs and problems here. Claude can create and complete them too."
                : "Break the work into todos. Claude can create and complete them too."
            }
            emptyAction={
              <button className="btn-chip" onClick={() => openOpen(kind)}>
                <Icon name="plus" size={13} />
                New {tab === "issues" ? "issue" : "todo"}
              </button>
            }
            onToggle={cycleStatus}
            onOpen={(it) => openEdit(it.id, it.kind)}
          />
        </>
      )}

      {menu && (
        <Menu
          pos={menu}
          onClose={() => setMenu(null)}
          items={[
            { key: "edit", label: "Edit project", icon: "edit", onSelect: () => ui.openProjectModal(id) },
            { key: "new-todo", label: "New todo", icon: "todo", onSelect: () => openOpen("todo") },
            { key: "new-issue", label: "New issue", icon: "issue", onSelect: () => openOpen("issue") },
            {
              key: "delete",
              label: "Delete project",
              icon: "trash",
              danger: true,
              separatorBefore: true,
              onSelect: () => ui.confirmDeleteProject(project),
            },
          ]}
        />
      )}
    </div>
  );
}
