import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useStore } from "../lib/store";
import { useUI } from "../lib/ui";
import { getMcpAddress } from "../lib/tauri";
import { countItems, projectHue } from "../lib/derive";
import { Icon } from "../lib/icons";
import { Count, Kbd } from "./ui";
// The app icon (web-usable sibling of icon.icns, generated together by `tauri icon`).
import appIcon from "../../src-tauri/icons/128x128.png";

export function Sidebar() {
  const { projects, itemsForProject, toast } = useStore();
  const ui = useUI();
  const navigate = useNavigate();
  const loc = useLocation();

  const [mcpAddr, setMcpAddr] = useState<string | null>(null);
  useEffect(() => {
    getMcpAddress()
      .then(setMcpAddr)
      .catch(() => setMcpAddr(null));
  }, []);

  const mcpUrl = mcpAddr ? `http://${mcpAddr}/` : null;
  async function copyMcpUrl() {
    if (!mcpUrl) return;
    try {
      await navigator.clipboard.writeText(mcpUrl);
      toast("Copied MCP endpoint", mcpUrl, "green");
    } catch {
      toast("MCP endpoint", mcpUrl);
    }
  }

  const projMatch = loc.pathname.match(/^\/project\/(.+)$/);
  const activeProjectId = projMatch?.[1];
  const isTodos = loc.pathname === "/";
  const isProjects = loc.pathname === "/projects";

  // The pen button creates a todo: in the active project if viewing one, else
  // the first project. With no projects yet, fall back to creating a project.
  function compose() {
    const targetProject = activeProjectId ?? projects[0]?.id;
    if (targetProject) ui.openItemModal({ kind: "todo", projectId: targetProject });
    else ui.openProjectModal();
  }

  return (
    <aside className="sidebar">
      <div className="side-head">
        <span className="ws-badge">
          <img src={appIcon} alt="Towork" />
        </span>
        <span className="ws-name">
          Towork<span className="sub">local · MCP</span>
        </span>
        <button
          className="icon-btn"
          title="New todo"
          style={{ marginLeft: "auto" }}
          onClick={compose}
        >
          <Icon name="edit" size={15} />
        </button>
      </div>

      <div className="side-nav">
        <div className={`nav-item${isTodos ? " active" : ""}`} onClick={() => navigate("/")}>
          <span className="ni-ic">
            <Icon name="todo" size={16} />
          </span>
          <span className="ni-label">Todos</span>
        </div>
        <div
          className={`nav-item${isProjects ? " active" : ""}`}
          onClick={() => navigate("/projects")}
        >
          <span className="ni-ic">
            <Icon name="project" size={16} />
          </span>
          <span className="ni-label">Projects</span>
        </div>
        <div className="nav-item" onClick={() => ui.openCommandPalette()}>
          <span className="ni-ic">
            <Icon name="command" size={16} />
          </span>
          <span className="ni-label">Command</span>
          <Kbd>⌘K</Kbd>
        </div>
      </div>

      <div className="side-grouplabel">
        Projects
        <button className="add" title="New project" onClick={() => ui.openProjectModal()}>
          <Icon name="plus" size={14} />
        </button>
      </div>

      <div className="proj-list">
        {projects.map((p) => {
          const c = countItems(itemsForProject(p.id));
          const hue = projectHue(p.id);
          const active = activeProjectId === p.id;
          return (
            <div
              key={p.id}
              className={`proj-row${active ? " active" : ""}`}
              onClick={() => navigate(`/project/${p.id}`)}
            >
              <span
                className="pr-glyph"
                style={{
                  background: `color-mix(in srgb, ${hue} 22%, var(--bg-elevated))`,
                  color: hue,
                }}
              >
                <Icon name="project" size={11} />
              </span>
              <span className="pr-name">{p.name}</span>
              <Count>{c.open}</Count>
            </div>
          );
        })}
      </div>

      <button
        className={`side-foot${mcpUrl ? " live" : ""}`}
        title={mcpUrl ? `MCP server listening — click to copy ${mcpUrl}` : "MCP server starting…"}
        onClick={copyMcpUrl}
      >
        <span className="mcp-dot" />
        <span className="mcp-txt">
          <b>MCP server</b> {mcpUrl ? "live" : "starting…"}
          {mcpAddr && <span className="mono">{mcpAddr}</span>}
        </span>
        {mcpUrl && (
          <span className="mcp-copy">
            <Icon name="command" size={13} />
          </span>
        )}
      </button>
    </aside>
  );
}
