import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useStore } from "../lib/store";
import { useUI } from "../lib/ui";
import { Icon, type IconName } from "../lib/icons";
import { Kbd } from "./ui";
import { useFocusTrap } from "../lib/useFocusTrap";

interface Action {
  group: string;
  label: string;
  icon: IconName;
  sub?: string;
  run: () => void;
}

/** Stable identity for an action, independent of its position in the list.
 *  `group + label` uniquely identifies every action we build (the static
 *  commands plus one row per project, whose names are unique). We remember the
 *  selected row by this key so that when the `filtered` list changes underneath
 *  the open palette — e.g. the AI adds or deletes a project — Enter still fires
 *  the row the user is looking at, never whatever now sits at the old index. */
const actionKey = (a: Action) => `${a.group} ${a.label}`;

export function CommandPalette({ onClose }: { onClose: () => void }) {
  const { projects } = useStore();
  const ui = useUI();
  const navigate = useNavigate();
  const loc = useLocation();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef);

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
      { group: "Go to", label: "Home", icon: "inbox", run: () => { onClose(); navigate("/"); } },
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

  // Keep the selection pinned to its row by identity, not by bare position.
  // `selectedKey` is the stable key of the chosen action; `active` (the index
  // the rest of the component uses) is *derived* from it against the current
  // `filtered` list. So when the list changes underneath the open palette (a
  // project added/removed by the AI, or the query narrowing results) the
  // selection follows its row — Enter can never fire whatever now sits at the
  // old index. If the remembered row is gone, the selection falls back to the
  // first item.
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const resolved = selectedKey === null ? -1 : filtered.findIndex((a) => actionKey(a) === selectedKey);
  const active = resolved !== -1 ? resolved : 0;

  // Move the selection by index (keyboard / mouse): translate the target index
  // back to a stable key so the derivation above tracks it across list changes.
  const selectIndex = (i: number) => {
    const a = filtered[i];
    if (a) setSelectedKey(actionKey(a));
  };

  // Scroll the active row into view as the selection moves (keyboard nav can
  // push it past the visible `.pbody` window). `bodyRef` holds the scroll
  // container; the active `.pitem` is the only one carrying the `active` class.
  useEffect(() => {
    const el = bodyRef.current?.querySelector<HTMLElement>(".pitem.active");
    el?.scrollIntoView({ block: "nearest" });
  }, [active]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        selectIndex(Math.min(filtered.length - 1, active + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        selectIndex(Math.max(0, active - 1));
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
      <div
        ref={dialogRef}
        className="palette"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        tabIndex={-1}
      >
        <div className="pq">
          <Icon name="search" size={17} stroke="var(--text-3)" />
          <input
            ref={inputRef}
            placeholder="Type a command or search…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              // Reset the highlight to the top result as the query changes
              // (clearing the remembered key falls `active` back to index 0).
              setSelectedKey(null);
            }}
          />
          <Kbd keys="esc" />
        </div>
        <div className="pbody" ref={bodyRef}>
          {filtered.length === 0 && <div className="pgroup">No results</div>}
          {filtered.map((a, i) => {
            const header = a.group !== lastGroup ? a.group : null;
            lastGroup = a.group;
            return (
              <div key={actionKey(a)}>
                {header && <div className="pgroup">{header}</div>}
                <div
                  className={`pitem${i === active ? " active" : ""}`}
                  onMouseEnter={() => selectIndex(i)}
                  onClick={() => a.run()}
                >
                  <span className="pi-ic">
                    <Icon name={a.icon} size={16} />
                  </span>
                  <span className="pi-label">{a.label}</span>
                  {a.sub && <span className="pi-sub">{a.sub}</span>}
                  {i === active && <Kbd keys="↵" variant="ghost" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
