import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../lib/store";
import { completeTodo, createTodo } from "../lib/tauri";
import { PRIORITY_META, PRIORITY_RANK } from "../lib/derive";
import { useDoubleShift } from "../lib/useDoubleShift";
import { Avatar } from "../components/ui";
import { Icon } from "../lib/icons";

/**
 * Simple Mode — a distraction-free flat list of open todos across all projects,
 * sorted High → Low. Keyboard: ↑/↓ navigate, Enter completes, Esc / double-Shift exits.
 */
export function SimpleModePage() {
  const { items, projects, reload, projectById } = useStore();
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [focus, setFocus] = useState(false);
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const exit = () => navigate("/");
  useDoubleShift(exit);

  const todos = items
    .filter((i) => i.kind === "todo" && i.status !== "Done")
    .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  useEffect(() => {
    if (sel >= todos.length) setSel(Math.max(0, todos.length - 1));
  }, [todos.length, sel]);

  async function add() {
    const raw = text.trim();
    if (!raw) return;
    let title = raw;
    let target = projects[0];
    const hash = raw.match(/#(\S+)/);
    if (hash) {
      const match = projects.find((p) => p.name.toLowerCase() === hash[1].toLowerCase());
      if (match) {
        target = match;
        title = raw.replace(/#\S+/, "").trim();
      }
    }
    if (!target || !title) return;
    await createTodo(target.id, title);
    setText("");
    await reload();
  }

  async function complete(id: string) {
    await completeTodo(id);
    await reload();
  }

  function onListKey(e: ReactKeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSel((i) => Math.min(i + 1, todos.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSel((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const t = todos[sel];
      if (t) complete(t.id);
    } else if (e.key === "Escape") {
      exit();
    }
  }

  return (
    <div className="simple" tabIndex={0} onKeyDown={onListKey}>
      <div className="simple-head">
        <span className="mode-tag">
          <Icon name="target" size={13} />
          Simple mode
        </span>
        <div className="spacer" />
        <button className="btn-chip" onClick={exit}>
          Exit (Esc)
        </button>
      </div>

      <div className={`simple-add${focus ? " focus" : ""}`}>
        <span className="qa-ring" />
        <input
          ref={inputRef}
          value={text}
          placeholder="Add a todo…  use #project to route it"
          onChange={(e) => setText(e.target.value)}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
      </div>

      <div className="simple-list">
        {todos.length === 0 ? (
          <div className="page-sub" style={{ textAlign: "center", padding: "48px 0" }}>
            No open todos. Add one above.
          </div>
        ) : (
          todos.map((t, i) => {
            const project = projectById(t.project_id);
            return (
              <div
                key={t.id}
                className={`simple-row${i === sel ? " sel" : ""}`}
                onMouseEnter={() => setSel(i)}
                onClick={() => complete(t.id)}
              >
                <button
                  className="item-check"
                  onClick={(e) => {
                    e.stopPropagation();
                    complete(t.id);
                  }}
                >
                  <Icon name="check" size={11} stroke="#08130b" />
                </button>
                <span className="row-pri" title={`${PRIORITY_META[t.priority].label} priority`}>
                  <Icon name="signal" size={14} stroke={PRIORITY_META[t.priority].hue} />
                </span>
                <span className="s-title">{t.title}</span>
                {project && <span className="s-proj">{project.name}</span>}
                <Avatar assignee={t.assignee} size="sm" />
              </div>
            );
          })
        )}
      </div>

      <div className="simple-foot">
        <span>
          <b>↑↓</b> Navigate
        </span>
        <span>
          <b>Enter</b> Complete
        </span>
        <span>
          <b>Esc</b> Exit
        </span>
        <span>
          <b>⇧⇧</b> Toggle mode
        </span>
      </div>
    </div>
  );
}
