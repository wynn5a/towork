import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../lib/store";
import { completeIssue, completeTodo, createIssue, createTodo } from "../lib/tauri";
import type { Item, ItemKind } from "../lib/types";
import { PRIORITY_META, PRIORITY_RANK } from "../lib/derive";
import { useDoubleControl } from "../lib/useDoubleControl";
import { useItemActions } from "../lib/actions";
import { useUI } from "../lib/ui";
import { Avatar } from "../components/ui";
import { Icon } from "../lib/icons";
import { enterSimpleWindow, exitSimpleWindow } from "../lib/window";

/** Past this length the inline add hands off to the full new-todo dialog. */
const TITLE_HANDOFF_LIMIT = 50;

/**
 * Simple Mode — a distraction-free flat list of open todos and issues across all
 * projects, sorted High → Low.
 *
 * Keyboard model (Enter is disambiguated by whether a row is *actively* selected):
 *   - ↑/↓ establish/move the active selection and work from anywhere — they're
 *     bound at the document level so they drive the list even while the add input
 *     is focused (the default), and `preventDefault()` keeps them from moving the
 *     text caret.
 *   - Enter with an active row (sel >= 0) COMPLETES that row; Enter with no active
 *     selection (sel === -1, the default while typing) runs add() — handled by the
 *     input's own onKeyDown so plain typing + Enter still files a todo.
 *   - Typing in the input, or pressing Escape, clears the active selection so the
 *     user can immediately add again. Esc with no active selection exits.
 *   - Esc / double-Control exit the mode.
 */
export function SimpleModePage() {
  const { items, projects, reload, projectById } = useStore();
  const { runMutation } = useItemActions();
  const ui = useUI();
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [focus, setFocus] = useState(false);
  // -1 = no active selection (default: caret in the input, Enter adds). >= 0 = an
  // actively selected row, set by ↑/↓ (or hover), where Enter completes that row.
  const [sel, setSel] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

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
  // Keep the active selection in range as the list shrinks (e.g. an item is
  // completed or the AI mutates concurrently). -1 (no active selection) is left
  // untouched — only an out-of-range *active* index is reeled back to the last row.
  useEffect(() => {
    if (sel >= openItems.length) setSel(openItems.length - 1);
  }, [openItems.length, sel]);

  // Scroll the actively selected row into view as the selection moves — keyboard
  // nav can push it past the visible window. Only runs when a row is active.
  useEffect(() => {
    if (sel < 0) return;
    const el = listRef.current?.querySelector<HTMLElement>(".simple-row.sel");
    el?.scrollIntoView({ block: "nearest" });
  }, [sel]);

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
    const ok = await runMutation(kind === "issue" ? "Couldn’t add issue" : "Couldn’t add todo", async () => {
      await (kind === "issue" ? createIssue : createTodo)(target.id, title);
      await reload();
    });
    // Keep the typed text on failure so the user can retry; only clear on success.
    if (ok) setText("");
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
    await runMutation("Couldn’t complete", async () => {
      await (item.kind === "issue" ? completeIssue(item.id) : completeTodo(item.id));
      await reload();
    });
  }

  // List navigation lives at the document level so ↑/↓ drive the list from any
  // focus — crucially while the add input is focused (the default), where they'd
  // otherwise just move the text caret. ↑/↓ preventDefault() so they move the LIST
  // selection, not the caret; ArrowDown from the default (-1) lands on the first
  // row. Enter is handled here ONLY when a row is actively selected (sel >= 0) —
  // it completes that row and drops back to no-selection. With no active selection
  // Enter is left alone so the input's own onKeyDown still runs add(). Escape
  // clears an active selection (so the user can add again); a second Escape (or
  // Escape with nothing selected) exits.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        if (openItems.length === 0) return;
        e.preventDefault();
        setSel((i) => Math.min(i + 1, openItems.length - 1));
      } else if (e.key === "ArrowUp") {
        if (openItems.length === 0) return;
        e.preventDefault();
        // From the default (-1) this clamps to 0; from row 0 it stays put.
        setSel((i) => Math.max(i <= 0 ? 0 : i - 1, 0));
      } else if (e.key === "Enter") {
        if (sel < 0) return; // no active row — let the input's onKeyDown add()
        e.preventDefault();
        const t = openItems[sel];
        if (t) {
          complete(t);
          setSel(-1); // completed row leaves the list; return to "just typing"
        }
      } else if (e.key === "Escape") {
        if (sel >= 0) {
          // Clear the active selection first so the user can immediately add again.
          e.preventDefault();
          setSel(-1);
        } else {
          exit();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openItems, sel, complete, exit]);

  return (
    <div className="simple">
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
            // Editing the text returns the user to "just typing" — drop any active
            // row selection so the next Enter adds again rather than completing.
            setSel(-1);
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
            // Enter adds only when no row is actively selected; when one is, the
            // document handler completes it instead (this handler runs first, so
            // bailing here lets that path win without a double action).
            if (e.key === "Enter" && sel < 0) {
              e.preventDefault();
              add();
            }
          }}
        />
      </div>

      <div className="simple-list" ref={listRef}>
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
