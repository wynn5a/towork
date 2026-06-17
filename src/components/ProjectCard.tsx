import { useNavigate } from "react-router-dom";
import type { Project } from "../lib/types";
import { useStore } from "../lib/store";
import { countItems, projectHue, relTime } from "../lib/derive";
import { Icon } from "../lib/icons";

export function ProjectCard({ project }: { project: Project }) {
  const navigate = useNavigate();
  const { itemsForProject } = useStore();
  const c = countItems(itemsForProject(project.id));
  const hue = projectHue(project.id);

  return (
    <div className="proj-card" onClick={() => navigate(`/project/${project.id}`)}>
      <div className="proj-card-head">
        <span
          className="proj-glyph"
          style={{
            background: `color-mix(in srgb, ${hue} 20%, var(--bg-elevated))`,
            color: hue,
          }}
        >
          <Icon name="project" size={16} />
        </span>
        <h3>{project.name}</h3>
        {c.ai > 0 && (
          <span className="ai-flag">
            <Icon name="ai" size={11} />
            {c.ai}
          </span>
        )}
      </div>
      <p className="pc-desc">{project.description || "No description."}</p>
      <div className="proj-card-foot">
        <div className="pcf-counts">
          <span className="pcf-stat">
            <span className="num">{c.open}</span> open
          </span>
          <span className="pcf-stat">
            <span className="num">{c.done}</span> done
          </span>
        </div>
        <span className="pcf-time">{relTime(project.updated_at)}</span>
      </div>
    </div>
  );
}
