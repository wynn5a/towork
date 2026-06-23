import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Item, Project } from "../lib/types";
import { useStore } from "../lib/store";
import { useUI } from "../lib/ui";
import { PRIORITY_RANK, STATUS_META } from "../lib/derive";
import { Avatar, Count, PrioritySignal, EmptyState } from "./ui";
import { Tooltip } from "./Tooltip";
import { Icon, type IconName } from "../lib/icons";

/** How the unified list is sliced into labelled sections. `none` is a single
 *  unlabelled section (open-then-done) — used inside a tab that is already
 *  scoped (e.g. a Status tab), so the section header doesn't just repeat the
 *  tab name. `flat` is also a single unlabelled section but preserves the
 *  caller's incoming order — used when a sub-tab already supplies its own
 *  ordering (e.g. the project page's Group-by buckets). */
export type GroupMode = "status" | "project" | "date" | "none" | "flat";

/** Open items: order High → Medium → Low. Equal priorities keep their incoming
 *  (creation) order since Array.prototype.sort is stable. */
const byPriority = (a: Item, b: Item) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];

/** Done items: most-recently-completed first. `updated_at` is bumped when an
 *  item is marked Done, so it stands in for completion time (ISO strings sort
 *  lexicographically in chronological order). */
const byCompleted = (a: Item, b: Item) => b.updated_at.localeCompare(a.updated_at);

/** Newest-created first — used inside date buckets. */
const byCreatedDesc = (a: Item, b: Item) => b.created_at.localeCompare(a.created_at);

/** Within a mixed group, surface open work first (by priority), then the done
 *  items (most-recently-completed first) trailing beneath it. */
function openThenDone(items: Item[]): Item[] {
  const open = items.filter((i) => i.status !== "Done").sort(byPriority);
  const done = items.filter((i) => i.status === "Done").sort(byCompleted);
  return [...open, ...done];
}

/** Coarse, calendar-relative bucket for an ISO timestamp (local time). */
function dateBucket(iso: string): { rank: number; label: string } {
  const startOfDay = (t: number) => {
    const x = new Date(t);
    return new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  };
  const day = 86_400_000;
  const today = startOfDay(Date.now());
  const t = startOfDay(new Date(iso).getTime());
  if (t >= today) return { rank: 0, label: "Today" };
  if (t >= today - day) return { rank: 1, label: "Yesterday" };
  if (t >= today - 7 * day) return { rank: 2, label: "Previous 7 days" };
  if (t >= today - 30 * day) return { rank: 3, label: "Previous 30 days" };
  return { rank: 4, label: "Older" };
}

interface Section {
  key: string;
  label: string;
  items: Item[];
}

/** Slice items into the labelled sections for the chosen grouping. Empty
 *  sections are dropped so the view never shows a header with nothing under it. */
function buildSections(items: Item[], groupBy: GroupMode, projects: Project[]): Section[] {
  if (groupBy === "none") {
    return items.length ? [{ key: "all", label: "", items: openThenDone(items) }] : [];
  }

  if (groupBy === "flat") {
    // Caller has already ordered the items (and usually scoped them to a tab);
    // present them as-is in one unlabelled section.
    return items.length ? [{ key: "all", label: "", items }] : [];
  }

  if (groupBy === "project") {
    const byProject = new Map<string, Item[]>();
    for (const it of items) {
      const arr = byProject.get(it.project_id) ?? [];
      arr.push(it);
      byProject.set(it.project_id, arr);
    }
    // Follow the sidebar's project order; skip projects with nothing here.
    return projects
      .filter((p) => byProject.has(p.id))
      .map((p) => ({ key: p.id, label: p.name, items: openThenDone(byProject.get(p.id)!) }));
  }

  if (groupBy === "date") {
    const byBucket = new Map<number, { label: string; items: Item[] }>();
    for (const it of items) {
      const b = dateBucket(it.created_at);
      const slot = byBucket.get(b.rank) ?? { label: b.label, items: [] };
      slot.items.push(it);
      byBucket.set(b.rank, slot);
    }
    return [...byBucket.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([rank, slot]) => ({
        key: `date-${rank}`,
        label: slot.label,
        items: slot.items.slice().sort(byCreatedDesc),
      }));
  }

  // status (default) — the Open / In Progress / Done lifecycle split. Active
  // work (Open, In Progress) is ordered by priority; Done by completion recency.
  const open = items.filter((i) => i.status === "Open").sort(byPriority);
  const inProgress = items.filter((i) => i.status === "In Progress").sort(byPriority);
  const done = items.filter((i) => i.status === "Done").sort(byCompleted);
  const sections: Section[] = [];
  if (open.length) sections.push({ key: "open", label: "Open", items: open });
  if (inProgress.length)
    sections.push({ key: "in-progress", label: "In Progress", items: inProgress });
  if (done.length) sections.push({ key: "done", label: "Done", items: done });
  return sections;
}

/** Page size for each list section; pagination appears past this count. */
const PAGE_SIZE = 10;

export function SectionLabel({ children }: { children: ReactNode }) {
  return <div className="section-label">{children}</div>;
}

/** Shimmering placeholder rows shown while a list is loading. Varied title
 *  widths keep it reading like real content rather than a bar chart. */
export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  const titleWidths = [240, 320, 180, 280, 150, 300, 210, 260];
  return (
    <div className="skeleton-list" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div className="skel-row" key={i}>
          <span className="skel skel-dot" />
          <span className="skel skel-bar" style={{ width: 14 }} />
          <span className="skel skel-bar" style={{ width: 44 }} />
          <span
            className="skel skel-bar"
            style={{ width: titleWidths[i % titleWidths.length], maxWidth: "55%" }}
          />
          <span className="skel skel-dot" style={{ marginLeft: "auto", width: 20, height: 20 }} />
        </div>
      ))}
    </div>
  );
}

export function ItemRow({
  item,
  showProject,
  onToggle,
  onOpen,
}: {
  item: Item;
  showProject?: boolean;
  onToggle: (item: Item) => void;
  onOpen: (item: Item) => void;
}) {
  const { seqId, projectById, aiTouched } = useStore();
  const ui = useUI();
  const done = item.status === "Done";
  const inProgress = item.status === "In Progress";
  const project = projectById(item.project_id);
  const id = seqId(item.id);
  // Clicking the checkbox advances status, so it announces the NEXT action.
  const nextActionLabel =
    item.status === "Open"
      ? "Mark as in progress"
      : item.status === "In Progress"
        ? "Mark as done"
        : "Reopen";
  // A token (not just a boolean) so a second AI touch within the window remounts
  // the wash via its key and replays the acknowledgement instead of sitting idle.
  const touchToken = aiTouched[item.id];
  // The row carries two sibling buttons (toggle + open) rather than one
  // clickable <div>, so both actions are keyboard-reachable without nesting
  // interactive elements inside one another.
  return (
    <div className={`item-row${done ? " done" : inProgress ? " in-progress" : ""}`}>
      {touchToken !== undefined && (
        // The AI teammate just touched this item — wash the row purple, then
        // recede. First child so it paints behind the row content (see app.css).
        <span key={touchToken} className="ai-wash" aria-hidden="true" />
      )}
      <Tooltip label={nextActionLabel}>
        <button
          type="button"
          className="item-check"
          aria-label={`${id || item.title}: ${STATUS_META[item.status].label}. ${nextActionLabel}.`}
          onClick={() => {
            if (item.status === "Done") {
              ui.confirm({
                title: "Reopen this item?",
                message: "It will move from Done back to Open.",
                confirmLabel: "Reopen",
                tone: "accent",
                icon: "ring",
                onConfirm: () => onToggle(item),
              });
            } else {
              onToggle(item);
            }
          }}
        >
          <Icon name="check" size={11} stroke="#08130b" />
        </button>
      </Tooltip>
      <button
        type="button"
        className="item-open"
        aria-label={id ? `Open ${id}: ${item.title}` : `Open ${item.title}`}
        onClick={() => onOpen(item)}
      >
        <PrioritySignal priority={item.priority} />
        <span className="item-id">{id}</span>
        <span className="item-title">{item.title}</span>
        <span className="row-right">
          {showProject && project && (
            <span className="search-result-proj">{project.name}</span>
          )}
          <Avatar assignee={item.assignee} size="sm" />
        </span>
      </button>
    </div>
  );
}

function Pager({
  page,
  pageCount,
  onPrev,
  onNext,
}: {
  page: number;
  pageCount: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="pager">
      <Tooltip label="Previous page">
        <button
          className="pager-btn"
          aria-label="Previous page"
          disabled={page === 0}
          onClick={onPrev}
        >
          <Icon name="chevron" size={14} style={{ transform: "rotate(180deg)" }} />
        </button>
      </Tooltip>
      <span className="pager-info">
        {page + 1} / {pageCount}
      </span>
      <Tooltip label="Next page">
        <button
          className="pager-btn"
          aria-label="Next page"
          disabled={page >= pageCount - 1}
          onClick={onNext}
        >
          <Icon name="chevron" size={14} />
        </button>
      </Tooltip>
    </div>
  );
}

/** A stable signature of *which* items a section holds, in order. It changes
 *  when the underlying list genuinely changes (a different sub-tab/bucket, or
 *  an item entering/leaving this section) but stays identical across a
 *  background reload that didn't touch this section — so the pager only resets
 *  when the list you're looking at actually changed, not on every reload. */
function contentSig(items: Item[]): string {
  let sig = String(items.length);
  for (const it of items) sig += "|" + it.id;
  return sig;
}

/** One labelled section (Open or Done) with client-side pagination once it
 *  exceeds PAGE_SIZE items. Each section tracks its own page. */
function ListSection({
  label,
  items,
  showProject,
  onToggle,
  onOpen,
}: {
  label: string;
  items: Item[];
  showProject?: boolean;
  onToggle: (item: Item) => void;
  onOpen: (item: Item) => void;
}) {
  const [page, setPage] = useState(0);

  // Reset to the first page whenever the section's content identity changes —
  // e.g. switching the Open↔Done sub-tab reuses this same ListSection instance
  // (flat/none grouping always keys the section "all"), so without this you'd
  // land on the prior tab's page number. A background reload that leaves this
  // section's items untouched produces the same signature and is a no-op, so
  // the user isn't yanked to page 1 by unrelated activity elsewhere.
  const sig = contentSig(items);
  const prevSig = useRef(sig);
  useEffect(() => {
    if (prevSig.current !== sig) {
      prevSig.current = sig;
      setPage(0);
    }
  }, [sig]);

  if (items.length === 0) return null;

  const pageCount = Math.ceil(items.length / PAGE_SIZE);
  // Belt-and-suspenders clamp: if a reload shrank this section below the
  // current page before the reset effect runs (or removed the trailing page),
  // fall back to the last page that still exists rather than rendering empty.
  const current = Math.min(page, pageCount - 1);
  const visible = items.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);
  const allDone = items.every((i) => i.status === "Done");

  return (
    <>
      {label && (
        <SectionLabel>
          {label} <Count>{items.length}</Count>
        </SectionLabel>
      )}
      <div className={`item-list${allDone ? " item-list--done" : ""}`}>
        {visible.map((it) => (
          <ItemRow
            key={it.id}
            item={it}
            showProject={showProject}
            onToggle={onToggle}
            onOpen={onOpen}
          />
        ))}
      </div>
      {pageCount > 1 && (
        <Pager
          page={current}
          pageCount={pageCount}
          onPrev={() => setPage(Math.max(0, current - 1))}
          onNext={() => setPage(Math.min(pageCount - 1, current + 1))}
        />
      )}
    </>
  );
}

export function ItemList({
  items,
  showProject,
  groupBy = "status",
  emptyIcon,
  emptyTitle,
  emptyDescription,
  emptyAction,
  onToggle,
  onOpen,
}: {
  items: Item[];
  showProject?: boolean;
  /** How to slice the list into sections (default: Open / Done). */
  groupBy?: GroupMode;
  emptyIcon?: IconName;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  onToggle: (item: Item) => void;
  onOpen: (item: Item) => void;
}) {
  const { projects } = useStore();
  if (items.length === 0 && emptyTitle) {
    return (
      <EmptyState
        icon={emptyIcon ?? "todo"}
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
      />
    );
  }
  // Grouping by project already names the project in each header, so the
  // per-row project tag would be redundant there.
  const rowShowProject = groupBy === "project" ? false : showProject;
  const sections = buildSections(items, groupBy, projects);
  return (
    <>
      {sections.map((s) => (
        <ListSection
          key={s.key}
          label={s.label}
          items={s.items}
          showProject={rowShowProject}
          onToggle={onToggle}
          onOpen={onOpen}
        />
      ))}
    </>
  );
}
