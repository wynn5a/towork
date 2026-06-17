import { useState } from "react";
import { useStore } from "../lib/store";
import { useUI } from "../lib/ui";
import { useItemActions } from "../lib/actions";
import { projectHue } from "../lib/derive";
import { QuickAdd } from "../components/QuickAdd";
import { ItemList, ListSkeleton, type GroupMode } from "../components/items";
import { Count, EmptyState } from "../components/ui";
import { Icon } from "../lib/icons";
import type { Item } from "../lib/types";

/** The grouping options offered by the home header. */
const GROUPS: { value: GroupMode; label: string; icon: "check" | "project" | "clock" }[] = [
  { value: "status", label: "Status", icon: "check" },
  { value: "project", label: "Project", icon: "project" },
  { value: "date", label: "Date", icon: "clock" },
];

/** A single tab over a slice of items (status, project, or date-bucket). */
interface ItemTab {
  key: string;
  label: string;
  /** Project hue → renders a leading glyph; omit for status/date tabs. */
  hue?: string;
  items: Item[];
  /** Badge count shown on the tab. */
  count: number;
}

const startOfDay = (t: number) => {
  const x = new Date(t);
  return new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
};

/** Bucket a created-at timestamp into the three date tabs. */
function dateTabRank(iso: string): 0 | 1 | 2 {
  const day = 86_400_000;
  const today = startOfDay(Date.now());
  const t = startOfDay(new Date(iso).getTime());
  if (t >= today) return 0; // Today
  if (t >= today - 6 * day) return 1; // This week (the past 7 days)
  return 2; // Older
}
const DATE_TAB_LABELS = ["Today", "This week", "Older"] as const;

const openCount = (items: Item[]) => items.filter((i) => i.status !== "Done").length;

/** Tabs by status: Open / Done; empty tabs are dropped. */
function statusTabs(items: Item[]): ItemTab[] {
  const open = items.filter((i) => i.status !== "Done");
  const done = items.filter((i) => i.status === "Done");
  const tabs: ItemTab[] = [];
  if (open.length) tabs.push({ key: "open", label: "Open", items: open, count: open.length });
  if (done.length) tabs.push({ key: "done", label: "Done", items: done, count: done.length });
  return tabs;
}

/** Tabs by project, in sidebar order; only projects with items appear. */
function projectTabs(items: Item[], projects: { id: string; name: string }[]): ItemTab[] {
  return projects
    .map((p) => ({ p, items: items.filter((i) => i.project_id === p.id) }))
    .filter(({ items }) => items.length > 0)
    .map(({ p, items }) => ({
      key: p.id,
      label: p.name,
      hue: projectHue(p.id),
      items,
      count: openCount(items),
    }));
}

/** Tabs by date bucket: Today / This week / Older; empty buckets are dropped. */
function dateTabs(items: Item[]): ItemTab[] {
  const groups: Item[][] = [[], [], []];
  for (const it of items) groups[dateTabRank(it.created_at)].push(it);
  return groups
    .map((arr, rank) => ({
      key: `date-${rank}`,
      label: DATE_TAB_LABELS[rank],
      items: arr,
      count: openCount(arr),
    }))
    .filter((t) => t.items.length > 0);
}

/** A tab bar over item slices; the active tab's items render in the usual
 *  Open / Done split below. Remount (via `key`) to reset the active tab. */
function TabbedItemList({
  tabs,
  showProject,
  innerGroupBy = "status",
  onToggle,
  onOpen,
}: {
  tabs: ItemTab[];
  showProject?: boolean;
  /** How the active tab's items are sliced. Status tabs pass "none" (flat). */
  innerGroupBy?: GroupMode;
  onToggle: (it: Item) => void;
  onOpen: (it: Item) => void;
}) {
  const [active, setActive] = useState<string | null>(null);
  const current = active && tabs.some((t) => t.key === active) ? active : tabs[0]?.key ?? null;
  const activeItems = tabs.find((t) => t.key === current)?.items ?? [];

  return (
    <>
      <div className="tabbar">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`tab${current === t.key ? " active" : ""}`}
            onClick={() => setActive(t.key)}
          >
            {t.hue && (
              <span
                className="pr-glyph"
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 5,
                  display: "grid",
                  placeItems: "center",
                  background: `color-mix(in srgb, ${t.hue} 22%, var(--bg-elevated))`,
                  color: t.hue,
                }}
              >
                <Icon name="project" size={10} />
              </span>
            )}
            {t.label}
            <Count>{t.count}</Count>
          </button>
        ))}
      </div>
      <ItemList
        items={activeItems}
        groupBy={innerGroupBy}
        showProject={showProject}
        onToggle={onToggle}
        onOpen={onOpen}
      />
    </>
  );
}

/** Home — every todo and issue across all projects, in one place. */
export function HomePage() {
  const { items, projects, loading } = useStore();
  const ui = useUI();
  const { toggleDone } = useItemActions();
  const [groupBy, setGroupBy] = useState<GroupMode>("status");

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
        {/* Group-by selector lives in the header, aligned with the title. */}
        {projects.length > 0 && items.length > 0 && (
          <div className="ph-actions">
            <div className="seg" role="tablist" aria-label="Group items by">
              {GROUPS.map((g) => (
                <button
                  key={g.value}
                  role="tab"
                  aria-selected={groupBy === g.value}
                  className={`seg-btn${groupBy === g.value ? " sel" : ""}`}
                  onClick={() => setGroupBy(g.value)}
                >
                  <Icon name={g.icon} size={13} />
                  {g.label}
                </button>
              ))}
            </div>
          </div>
        )}
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

          <div className="home-list">
            {items.length === 0 ? (
              <ItemList
                items={items}
                emptyIcon="inbox"
                emptyTitle="Nothing here yet"
                emptyDescription="Type above and press Enter to add your first todo or issue."
                onToggle={toggleDone}
                onOpen={openItem}
              />
            ) : groupBy === "project" ? (
              // Project glyph already names each tab, so per-row project tags are off.
              <TabbedItemList
                key="project"
                tabs={projectTabs(items, projects)}
                onToggle={toggleDone}
                onOpen={openItem}
              />
            ) : groupBy === "date" ? (
              <TabbedItemList
                key="date"
                tabs={dateTabs(items)}
                showProject
                onToggle={toggleDone}
                onOpen={openItem}
              />
            ) : (
              // Status — Open / Done as tabs; each tab is a flat (unlabelled) list.
              <TabbedItemList
                key="status"
                tabs={statusTabs(items)}
                innerGroupBy="none"
                showProject
                onToggle={toggleDone}
                onOpen={openItem}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
