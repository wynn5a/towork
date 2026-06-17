import { useStore } from "../lib/store";
import { useUI } from "../lib/ui";
import { useItemActions } from "../lib/actions";
import { QuickAdd } from "../components/QuickAdd";
import { ItemList } from "../components/items";
import { EmptyState } from "../components/ui";

export function TodosPage() {
  const { items, projects, loading } = useStore();
  const ui = useUI();
  const { toggleDone } = useItemActions();

  const todos = items.filter((i) => i.kind === "todo");
  const open = todos.filter((t) => t.status !== "Done");
  const done = todos.filter((t) => t.status === "Done");
  const ai = open.filter((t) => t.assignee === "AI").length;

  if (loading) return <div className="view-pad page-sub">Loading…</div>;

  return (
    <div className="view-pad">
      <div className="page-head">
        <div className="ph-text">
          <h1 className="page-title">Todos</h1>
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
          icon="todo"
          title="No projects yet"
          description="Create a project first, then add todos to it here."
          action={
            <button className="btn-chip" onClick={() => ui.openProjectModal()}>
              Create a project
            </button>
          }
        />
      ) : (
        <>
          <QuickAdd />
          <ItemList
            items={todos}
            showProject
            emptyIcon="todo"
            emptyTitle="No todos yet"
            emptyDescription="Type above and press Enter to add your first todo."
            onToggle={toggleDone}
            onOpen={(it) =>
              ui.openItemModal({ kind: "todo", projectId: it.project_id, itemId: it.id })
            }
          />
        </>
      )}
    </div>
  );
}
