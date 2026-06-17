import { useRef, useState } from "react";
import { useStore } from "../lib/store";
import { useUI } from "../lib/ui";
import { createTodo } from "../lib/tauri";
import { projectHue } from "../lib/derive";
import { Icon } from "../lib/icons";
import { Avatar } from "./ui";
import type { Assignee } from "../lib/types";
import { Menu, anchorMenu, type MenuItem, type MenuPos } from "./Menu";

const ASSIGNEES: Assignee[] = ["AI", "User"];
const assigneeLabel = (a: Assignee) => (a === "AI" ? "Claude" : "You");

/** Past this length the inline bar hands off to the full new-todo dialog,
 *  which has room for a long note plus a concise title. */
const TITLE_HANDOFF_LIMIT = 50;

/**
 * The all-todos quick-add bar. Type a title and press Enter to create a todo in
 * the chosen project. `#project-name` in the title routes it to that project.
 */
export function QuickAdd() {
  const { projects, reload, toast } = useStore();
  const ui = useUI();
  const [text, setText] = useState("");
  const [focus, setFocus] = useState(false);
  const [projId, setProjId] = useState<string | null>(projects[0]?.id ?? null);
  const [assignee, setAssignee] = useState<Assignee>("AI");
  const [menu, setMenu] = useState<MenuPos | null>(null);
  const [assigneeMenu, setAssigneeMenu] = useState<MenuPos | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const current = projects.find((p) => p.id === projId) ?? projects[0];

  /** Resolve the destination project + clean title, honoring `#project` routing. */
  function resolve(raw: string) {
    let title = raw;
    let target = current;
    const hash = raw.match(/#(\S+)/);
    if (hash) {
      const match = projects.find((p) => p.name.toLowerCase() === hash[1].toLowerCase());
      if (match) {
        target = match;
        title = raw.replace(/#\S+/, "").trim();
      }
    }
    return { title, target };
  }

  async function add() {
    const raw = text.trim();
    if (!raw || !current) return;
    const { title, target } = resolve(raw);
    if (!title || !target) return;
    await createTodo(target.id, title, undefined, undefined, assignee);
    setText("");
    await reload();
    toast("Todo added", `${target.name} · ${title} · ${assigneeLabel(assignee)}`, "green");
    inputRef.current?.focus();
  }

  /** Long text deserves the full dialog. The typed words go into the
   *  description (they read more like a note than a title); the title is left
   *  blank for the user to fill — it stays required to save. */
  function handoffToDialog(raw: string) {
    const { title, target } = resolve(raw);
    if (!target) return;
    ui.openItemModal({
      kind: "todo",
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
    onSelect: () => setProjId(p.id),
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
      <span className="qa-ring" />
      <input
        ref={inputRef}
        placeholder="Add a todo… press Enter to save"
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
        }}
      />
      <button
        className="prop-pill qa-assignee"
        title="Assign to"
        onClick={(e) =>
          setAssigneeMenu(anchorMenu(e.currentTarget as HTMLElement, 160, "right"))
        }
      >
        <Avatar assignee={assignee} size="sm" />
        <span>{assigneeLabel(assignee)}</span>
        <Icon name="chevDown" size={13} />
      </button>
      <button
        className="prop-pill qa-proj"
        title="Choose project"
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
      {menu && <Menu pos={menu} items={menuItems} onClose={() => setMenu(null)} />}
      {assigneeMenu && (
        <Menu pos={assigneeMenu} items={assigneeItems} onClose={() => setAssigneeMenu(null)} />
      )}
    </div>
  );
}
