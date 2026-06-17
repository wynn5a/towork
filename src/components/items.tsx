import type { ReactNode } from "react";
import type { Item } from "../lib/types";
import { useStore } from "../lib/store";
import { Avatar, Count, PrioritySignal, EmptyState } from "./ui";
import { Icon } from "../lib/icons";

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
  const open = items.filter((i) => i.status !== "Done");
  const done = items.filter((i) => i.status === "Done");
  return (
    <>
      {open.length > 0 && (
        <>
          <SectionLabel>
            Open <Count>{open.length}</Count>
          </SectionLabel>
          <div className="item-list">
            {open.map((it) => (
              <ItemRow
                key={it.id}
                item={it}
                showProject={showProject}
                onToggle={onToggle}
                onOpen={onOpen}
              />
            ))}
          </div>
        </>
      )}
      {done.length > 0 && (
        <>
          <SectionLabel>
            Done <Count>{done.length}</Count>
          </SectionLabel>
          <div className="item-list">
            {done.map((it) => (
              <ItemRow
                key={it.id}
                item={it}
                showProject={showProject}
                onToggle={onToggle}
                onOpen={onOpen}
              />
            ))}
          </div>
        </>
      )}
    </>
  );
}
