import { useState, type ReactNode } from "react";
import type { Item } from "../lib/types";
import { useStore } from "../lib/store";
import { PRIORITY_RANK } from "../lib/derive";
import { Avatar, Count, PrioritySignal, EmptyState } from "./ui";
import { Icon } from "../lib/icons";

/** Open items: order High → Medium → Low. Equal priorities keep their incoming
 *  (creation) order since Array.prototype.sort is stable. */
const byPriority = (a: Item, b: Item) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];

/** Done items: most-recently-completed first. `updated_at` is bumped when an
 *  item is marked Done, so it stands in for completion time (ISO strings sort
 *  lexicographically in chronological order). */
const byCompleted = (a: Item, b: Item) => b.updated_at.localeCompare(a.updated_at);

/** Page size for the Open and Done lists; pagination appears past this count. */
const PAGE_SIZE = 10;

export function SectionLabel({ children }: { children: ReactNode }) {
  return <div className="section-label">{children}</div>;
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
  const { seqId, projectById } = useStore();
  const done = item.status === "Done";
  const project = projectById(item.project_id);
  return (
    <div className={`item-row${done ? " done" : ""}`} onClick={() => onOpen(item)}>
      <button
        className="item-check"
        title="Toggle done"
        onClick={(e) => {
          e.stopPropagation();
          onToggle(item);
        }}
      >
        <Icon name="check" size={11} stroke="#08130b" />
      </button>
      <PrioritySignal priority={item.priority} />
      <span className="item-id">{seqId(item.id)}</span>
      <span className="item-title">{item.title}</span>
      <span className="row-right">
        {showProject && project && (
          <span className="search-result-proj">{project.name}</span>
        )}
        <Avatar assignee={item.assignee} size="sm" />
      </span>
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
      <button className="pager-btn" disabled={page === 0} onClick={onPrev} title="Previous page">
        <Icon name="chevron" size={14} style={{ transform: "rotate(180deg)" }} />
      </button>
      <span className="pager-info">
        {page + 1} / {pageCount}
      </span>
      <button
        className="pager-btn"
        disabled={page >= pageCount - 1}
        onClick={onNext}
        title="Next page"
      >
        <Icon name="chevron" size={14} />
      </button>
    </div>
  );
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
  if (items.length === 0) return null;

  const pageCount = Math.ceil(items.length / PAGE_SIZE);
  // Clamp in case the list shrank (e.g. an item was toggled into another section).
  const current = Math.min(page, pageCount - 1);
  const visible = items.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);

  return (
    <>
      <SectionLabel>
        {label} <Count>{items.length}</Count>
      </SectionLabel>
      <div className="item-list">
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
  emptyIcon,
  emptyTitle,
  emptyDescription,
  emptyAction,
  onToggle,
  onOpen,
}: {
  items: Item[];
  showProject?: boolean;
  emptyIcon?: "todo" | "issue";
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  onToggle: (item: Item) => void;
  onOpen: (item: Item) => void;
}) {
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
  const open = items.filter((i) => i.status !== "Done").sort(byPriority);
  const done = items.filter((i) => i.status === "Done").sort(byCompleted);
  return (
    <>
      <ListSection
        label="Open"
        items={open}
        showProject={showProject}
        onToggle={onToggle}
        onOpen={onOpen}
      />
      <ListSection
        label="Done"
        items={done}
        showProject={showProject}
        onToggle={onToggle}
        onOpen={onOpen}
      />
    </>
  );
}
