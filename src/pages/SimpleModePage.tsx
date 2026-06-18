import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../lib/store";
import { completeIssue, completeTodo, createIssue, createTodo } from "../lib/tauri";
import type { Item, ItemKind } from "../lib/types";
import { PRIORITY_META, PRIORITY_RANK } from "../lib/derive";
import { useDoubleControl } from "../lib/useDoubleControl";
import { useUI } from "../lib/ui";
import { Avatar } from "../components/ui";
import { Icon } from "../lib/icons";
import { enterSimpleWindow, exitSimpleWindow } from "../lib/window";

/** Past this length the inline add hands off to the full new-todo dialog. */
const TITLE_HANDOFF_LIMIT = 50;

/**
 * Simple Mode — a distraction-free flat list of open todos and issues across all
 * projects, sorted High → Low. Keyboard: ↑/↓ navigate, Enter completes, Esc / double-Control exits.
 */
export function SimpleModePage() {
  const { items, projects, reload, projectById } = useStore();
  const ui = useUI();
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [focus, setFocus] = useState(false);
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const exit = () => navigate("/");
  useDoubleControl(exit);

  const openItems = items
    .filter((i) => i.status !== "Done")
    .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  // Shrink the window to the narrow Simple-mode width on enter, and animate it
  // back to the Complete-mode width when leaving (unmount = switching modes).
  useEffect(() => {
    enterSimpleWindow();
    return () => {
      exitSimpleWindow();
    };
  }, []);
  useEffect(() => {
    if (sel >= openItems.length) setSel(Math.max(0, openItems.length - 1));
  }, [openItems.length, sel]);

  /** Resolve the kind + destination project + clean title, honoring a leading
   *  `issue`/`todo` keyword and `#project` routing. Mirrors QuickAdd's parsing —
   *  Simple mode keeps its own self-contained copy. */
  function resolve(raw: string) {
    let kind: ItemKind = "todo";
    let title = raw;
    // keyword + separator (`:`/`-`) or whitespace, so "issue: x", "issue x" and
    // "issue:x" match but "issues"/"issuex" don't.
    const m = raw.match(/^\s*(issue|todo)(?:[:-]\s*|\s+)/i);
    if (m) {
      kind = m[1].toLowerCase() as ItemKind;
      title = raw.slice(m[0].length);
    }
    let target = projects[0];
    const hash = title.match(/#(\S+)/);
    if (hash) {
      const match = projects.find((p) => p.name.toLowerCase() === hash[1].toLowerCase());
      if (match) {
        target = match;
        title = title.replace(/#\S+/, "").trim();
      }
    }
    return { kind, title, target };
  }

  async function add() {
    const raw = text.trim();
    if (!raw) return;
    const { kind, title, target } = resolve(raw);
    if (!target || !title) return;
    await (kind === "issue" ? createIssue : createTodo)(target.id, title);
    setText("");
    await reload();
  }

  /** Long text deserves the full dialog. The typed words go into the
   *  description; the title is left blank for the user to fill (required). */
  function handoffToDialog(raw: string) {
    const { kind, title, target } = resolve(raw);
    if (!target) return;
    ui.openItemModal({ kind, projectId: target.id, draft: { description: title || raw } });
    setText("");
  }

  async function complete(item: Item) {
    await (item.kind === "issue" ? completeIssue(item.id) : completeTodo(item.id));
    await reload();
  }

  function onListKey(e: ReactKeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSel((i) => Math.min(i + 1, openItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSel((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const t = openItems[sel];
      if (t) complete(t);
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
        {openItems.length > 0 && (
          <span className="simple-count">
            {openItems.length} open · sorted by priority
          </span>
        )}
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
          placeholder="Add a todo…  use #project to route it · prefix with issue to file one"
          onChange={(e) => {
            const v = e.target.value;
            if (v.length > TITLE_HANDOFF_LIMIT) {
              handoffToDialog(v);
              return;
            }
            setText(v);
          }}
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
        {openItems.length === 0 ? (
          <div className="page-sub" style={{ textAlign: "center", padding: "48px 0" }}>
            No open items. Add one above.
          </div>
        ) : (
          openItems.map((t, i) => {
            const project = projectById(t.project_id);
            return (
              <div
                key={t.id}
                className={`simple-row${i === sel ? " sel" : ""}`}
                onMouseEnter={() => setSel(i)}
                onClick={() =>
                  ui.openItemModal({ kind: t.kind, projectId: t.project_id, itemId: t.id })
                }
              >
                <button
                  className="item-check"
                  title="Mark done"
                  onClick={(e) => {
                    e.stopPropagation();
                    complete(t);
                  }}
                >
                  <Icon name="check" size={11} stroke="#08130b" />
                </button>
                <span className="row-pri" title={`${PRIORITY_META[t.priority].label} priority`}>
                  <Icon name="signal" size={14} stroke={PRIORITY_META[t.priority].hue} />
                </span>
                <span className="s-kind" title={t.kind === "issue" ? "Issue" : "Todo"}>
                  <Icon name={t.kind} size={14} stroke="var(--text-3)" />
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
          <b>⌃⌃</b> Toggle mode
        </span>
      </div>
    </div>
  );
}
