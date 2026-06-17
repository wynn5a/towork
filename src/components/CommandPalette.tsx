import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useStore } from "../lib/store";
import { useUI } from "../lib/ui";
import { Icon, type IconName } from "../lib/icons";
import { Kbd } from "./ui";

interface Action {
  group: string;
  label: string;
  icon: IconName;
  sub?: string;
  run: () => void;
}

export function CommandPalette({ onClose }: { onClose: () => void }) {
  const { projects } = useStore();
  const ui = useUI();
  const navigate = useNavigate();
  const loc = useLocation();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const currentProjectId = useMemo(() => {
    const m = loc.pathname.match(/^\/project\/(.+)$/);
    return m ? m[1] : projects[0]?.id;
  }, [loc.pathname, projects]);

  const actions = useMemo<Action[]>(() => {
    const list: Action[] = [
      {
        group: "Create",
        label: "New project",
        icon: "folderPlus",
        run: () => {
          onClose();
          ui.openProjectModal();
        },
      },
      {
        group: "Create",
        label: "New todo",
        icon: "todo",
        sub: currentProjectId ? undefined : "create a project first",
        run: () => {
          onClose();
          if (currentProjectId) ui.openItemModal({ kind: "todo", projectId: currentProjectId });
          else navigate("/projects");
        },
      },
      {
        group: "Create",
        label: "New issue",
        icon: "issue",
        sub: currentProjectId ? undefined : "create a project first",
        run: () => {
          onClose();
          if (currentProjectId) ui.openItemModal({ kind: "issue", projectId: currentProjectId });
          else navigate("/projects");
        },
      },
      { group: "Go to", label: "All todos", icon: "todo", run: () => { onClose(); navigate("/"); } },
      { group: "Go to", label: "All projects", icon: "project", run: () => { onClose(); navigate("/projects"); } },
      { group: "Go to", label: "Search", icon: "search", run: () => { onClose(); navigate("/search"); } },
    ];
    for (const p of projects) {
      list.push({
        group: "Projects",
        label: p.name,
        icon: "project",
        run: () => {
          onClose();
          navigate(`/project/${p.id}`);
        },
      });
    }
    return list;
  }, [projects, currentProjectId, navigate, onClose, ui]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return actions;
    return actions.filter(
      (a) => a.label.toLowerCase().includes(q) || a.group.toLowerCase().includes(q)
    );
  }, [actions, query]);

  useEffect(() => {
    if (active >= filtered.length) setActive(0);
  }, [filtered, active]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((i) => Math.min(filtered.length - 1, i + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((i) => Math.max(0, i - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        filtered[active]?.run();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [filtered, active, onClose]);

  // Render with group headers.
  let lastGroup: string | null = null;

  return (
    <div
      className="palette-overlay open"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="palette" role="dialog" aria-modal="true">
        <div className="pq">
          <Icon name="search" size={17} stroke="var(--text-3)" />
          <input
            ref={inputRef}
            placeholder="Type a command or search…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
          />
          <Kbd>esc</Kbd>
        </div>
        <div className="pbody" ref={bodyRef}>
          {filtered.length === 0 && <div className="pgroup">No results</div>}
          {filtered.map((a, i) => {
            const header = a.group !== lastGroup ? a.group : null;
            lastGroup = a.group;
            return (
              <div key={`${a.group}-${a.label}-${i}`}>
                {header && <div className="pgroup">{header}</div>}
                <div
                  className={`pitem${i === active ? " active" : ""}`}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => a.run()}
                >
                  <span className="pi-ic">
                    <Icon name={a.icon} size={16} />
                  </span>
                  <span className="pi-label">{a.label}</span>
                  {a.sub && <span className="pi-sub">{a.sub}</span>}
                  {i === active && <Kbd>↵</Kbd>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
