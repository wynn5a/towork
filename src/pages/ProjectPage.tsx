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
import type { ItemKind } from "../lib/types";

type Tab = "todos" | "issues" | "activity";

export function ProjectPage() {
  const { id = "" } = useParams<{ id: string }>();
  const { projectById, itemsForProject, loading } = useStore();
  const ui = useUI();
  const { toggleDone } = useItemActions();
  const [tab, setTab] = useState<Tab>("todos");
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

  return (
    <div className="view-pad">
      <div className="page-head">
        <div className="ph-text">
          <h1 className="page-title">{project.name}</h1>
          {project.description && <p className="page-sub">{project.description}</p>}
        </div>
        <div className="ph-actions">
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
            <div className="ph-text" />
            <div className="ph-actions">
              <button className="btn-secondary" onClick={() => openOpen(tab === "issues" ? "issue" : "todo")}>
                <Icon name="plus" size={14} />
                {tab === "issues" ? "New issue" : "New todo"}
              </button>
            </div>
          </div>
          <ItemList
            items={tab === "issues" ? issues : todos}
            emptyIcon={tab === "issues" ? "issue" : "todo"}
            emptyTitle={tab === "issues" ? "No issues yet" : "No todos yet"}
            emptyDescription={
              tab === "issues"
                ? "Track bugs and problems here. Claude can create and complete them too."
                : "Break the work into todos. Claude can create and complete them too."
            }
            emptyAction={
              <button className="btn-chip" onClick={() => openOpen(tab === "issues" ? "issue" : "todo")}>
                <Icon name="plus" size={13} />
                New {tab === "issues" ? "issue" : "todo"}
              </button>
            }
            onToggle={toggleDone}
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
