import { useRef, useState } from "react";
import { useStore } from "../lib/store";
import { useUI } from "../lib/ui";
import { createIssue, createTodo } from "../lib/tauri";
import { projectHue } from "../lib/derive";
import { Icon } from "../lib/icons";
import { Avatar } from "./ui";
import { Tooltip } from "./Tooltip";
import type { Assignee, ItemKind } from "../lib/types";
import { Menu, anchorMenu, type MenuItem, type MenuPos } from "./Menu";

const ASSIGNEES: Assignee[] = ["AI", "User"];
const assigneeLabel = (a: Assignee) => (a === "AI" ? "Claude" : "You");

/** Past this length the inline bar hands off to the full new-todo dialog,
 *  which has room for a long note plus a concise title. */
const TITLE_HANDOFF_LIMIT = 80;

/** Remembers the last project picked in the quick-add bar across sessions. */
const LAST_PROJECT_KEY = "towork:quickadd:lastProject";

/**
 * Detect a leading `todo`/`issue` keyword and strip it, so typing
 * `issue: login broken` (or `Issue login broken`) files an issue instead of a
 * todo. The keyword must be followed by a separator (`:`, `-`, or whitespace)
 * so a lone word like "issue" isn't swallowed into an empty title.
 */
function parseKind(raw: string): { kind: ItemKind; rest: string } {
  // keyword + a separator (`:`/`-`) or whitespace — so "issue: x", "issue x"
  // and "issue:x" all match, but "issues" / "issuex" don't.
  const m = raw.match(/^\s*(issue|todo)(?:[:-]\s*|\s+)/i);
  if (m) return { kind: m[1].toLowerCase() as ItemKind, rest: raw.slice(m[0].length) };
  return { kind: "todo", rest: raw };
}

/**
 * The all-todos quick-add bar. Type a title and press Enter to create a todo in
 * the chosen project. `#project-name` in the title routes it to that project.
 */
export function QuickAdd() {
  const { projects, reload, toast } = useStore();
  const ui = useUI();
  const [text, setText] = useState("");
  const [focus, setFocus] = useState(false);
  // Restore the last-picked project from localStorage; `projects` may be empty
  // on first render and populate after load, so `current` resolves the fallback.
  const [projId, setProjId] = useState<string | null>(
    () => localStorage.getItem(LAST_PROJECT_KEY),
  );
  const [assignee, setAssignee] = useState<Assignee>("AI");
  const [menu, setMenu] = useState<MenuPos | null>(null);
  const [assigneeMenu, setAssigneeMenu] = useState<MenuPos | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const current = projects.find((p) => p.id === projId) ?? projects[0];

  /** Resolve kind + destination project + clean title, honoring the
   *  `issue`/`todo` prefix and `#project` routing. */
  function resolve(raw: string) {
    const { kind, rest } = parseKind(raw);
    let title = rest;
    let target = current;
    const hash = rest.match(/#(\S+)/);
    if (hash) {
      const match = projects.find((p) => p.name.toLowerCase() === hash[1].toLowerCase());
      if (match) {
        target = match;
        title = rest.replace(/#\S+/, "").trim();
      }
    }
    return { kind, title, target };
  }

  /** The kind the bar will create right now, reflected live by the leading icon. */
  const kind = parseKind(text).kind;

  /** Flip between todo/issue by rewriting the prefix — keeps the typed text as
   *  the single source of truth so the icon and Enter agree. */
  function toggleKind() {
    const { kind, rest } = parseKind(text);
    setText(kind === "todo" ? `issue ${rest}` : rest);
    inputRef.current?.focus();
  }

  async function add() {
    const raw = text.trim();
    if (!raw || !current) return;
    const { kind, title, target } = resolve(raw);
    if (!title || !target) return;
    const create = kind === "issue" ? createIssue : createTodo;
    await create(target.id, title, undefined, undefined, assignee);
    setText("");
    await reload();
    const label = kind === "issue" ? "Issue added" : "Todo added";
    toast(label, `${target.name} · ${title} · ${assigneeLabel(assignee)}`, "green");
    inputRef.current?.focus();
  }

  /** Long text deserves the full dialog. The typed words go into the
   *  description (they read more like a note than a title); the title is left
   *  blank for the user to fill — it stays required to save. */
  function handoffToDialog(raw: string) {
    const { kind, title, target } = resolve(raw);
    if (!target) return;
    ui.openItemModal({
      kind,
      projectId: target.id,
      draft: { description: title || raw, assignee },
    });
    setText("");
  }

  if (!current) return null;
  const hue = projectHue(current.id);

  const menuItems: MenuItem[] = projects.map((p) => ({
    key: p.id,
    label: p.name,
    lead: (
      <span
        className="pr-glyph"
        style={{
          width: 18,
          height: 18,
          borderRadius: 5,
          display: "grid",
          placeItems: "center",
          background: `color-mix(in srgb, ${projectHue(p.id)} 22%, var(--bg-elevated))`,
          color: projectHue(p.id),
        }}
      >
        <Icon name="project" size={11} />
      </span>
    ),
    selected: p.id === current.id,
    onSelect: () => {
      setProjId(p.id);
      localStorage.setItem(LAST_PROJECT_KEY, p.id);
    },
  }));

  const assigneeItems: MenuItem[] = ASSIGNEES.map((a) => ({
    key: a,
    label: assigneeLabel(a),
    lead: <Avatar assignee={a} size="sm" />,
    selected: a === assignee,
    onSelect: () => setAssignee(a),
  }));

  return (
    <div className={`quick-add${focus ? " focus" : ""}`}>
      <Tooltip
        label={
          kind === "issue"
            ? "Filing an issue — click for a todo (or type “todo ”)"
            : "Adding a todo — click for an issue (or type “issue ”)"
        }
      >
        <button type="button" className={`qa-kind ${kind}`} onClick={toggleKind}>
          <Icon name={kind} size={16} />
        </button>
      </Tooltip>
      <input
        ref={inputRef}
        placeholder="Add a todo… type “issue …” to file an issue"
        autoComplete="off"
        value={text}
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
          // Cmd/Ctrl+E hands the current text off to the full dialog on demand,
          // mirroring the auto-handoff for long titles.
          if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "e") {
            e.preventDefault();
            handoffToDialog(text);
          }
        }}
      />
      <Tooltip label="Assign to">
        <button
          className="prop-pill qa-assignee"
          onClick={(e) =>
            setAssigneeMenu(anchorMenu(e.currentTarget as HTMLElement, 160, "right"))
          }
        >
          <Avatar assignee={assignee} size="sm" />
          <span>{assigneeLabel(assignee)}</span>
          <Icon name="chevDown" size={13} />
        </button>
      </Tooltip>
      <Tooltip label="Choose project">
        <button
          className="prop-pill qa-proj"
          onClick={(e) => setMenu(anchorMenu(e.currentTarget as HTMLElement, 200, "right"))}
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
          <span>{current.name}</span>
          <Icon name="chevDown" size={13} />
        </button>
      </Tooltip>
      {menu && <Menu pos={menu} items={menuItems} onClose={() => setMenu(null)} />}
      {assigneeMenu && (
        <Menu pos={assigneeMenu} items={assigneeItems} onClose={() => setAssigneeMenu(null)} />
      )}
    </div>
  );
}
