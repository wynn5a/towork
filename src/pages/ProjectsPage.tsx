import { useStore } from "../lib/store";
import { useUI } from "../lib/ui";
import { countItems } from "../lib/derive";
import { ProjectCard } from "../components/ProjectCard";
import { EmptyState } from "../components/ui";
import { Icon } from "../lib/icons";

export function ProjectsPage() {
  const { projects, items, loading } = useStore();
  const ui = useUI();

  const totalItems = items.length;
  const aiTotal = items.filter((i) => i.assignee === "AI").length;
  void countItems;

  if (loading) {
    return (
      <div className="view-pad">
        <div className="page-head">
          <div className="ph-text">
            <h1 className="page-title">Projects</h1>
          </div>
        </div>
        <div className="skel-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div className="skel skel-card" key={i} aria-hidden="true" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="view-pad">
      <div className="page-head">
        <div className="ph-text">
          <h1 className="page-title">Projects</h1>
          <p className="page-sub">
            {projects.length} projects · {totalItems} items
            {aiTotal > 0 && (
              <>
                {" · "}
                <span style={{ color: "var(--purple)" }}>{aiTotal} assigned to Claude</span>
              </>
            )}
          </p>
        </div>
        <div className="ph-actions">
          <button className="btn-primary" onClick={() => ui.openProjectModal()}>
            <Icon name="plus" size={14} stroke="#fff" />
            New project
          </button>
        </div>
      </div>

      {projects.length === 0 ? (
        <EmptyState
          icon="project"
          title="No projects yet"
          description="Create a project to start tracking todos and issues — and let Claude pick them up over MCP."
          action={
            <button className="btn-chip" onClick={() => ui.openProjectModal()}>
              <Icon name="plus" size={13} />
              Create your first project
            </button>
          }
        />
      ) : (
        <div className="proj-grid">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}
    </div>
  );
}
