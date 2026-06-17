import { useRef, useState } from "react";
import { useStore } from "../lib/store";
import { createTodo } from "../lib/tauri";
import { projectHue } from "../lib/derive";
import { Icon } from "../lib/icons";
import { Menu, anchorMenu, type MenuItem, type MenuPos } from "./Menu";

/**
 * The all-todos quick-add bar. Type a title and press Enter to create a todo in
 * the chosen project. `#project-name` in the title routes it to that project.
 */
export function QuickAdd() {
  const { projects, reload, toast } = useStore();
  const [text, setText] = useState("");
  const [focus, setFocus] = useState(false);
  const [projId, setProjId] = useState<string | null>(projects[0]?.id ?? null);
  const [menu, setMenu] = useState<MenuPos | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const current = projects.find((p) => p.id === projId) ?? projects[0];

  async function add() {
    const raw = text.trim();
    if (!raw || !current) return;
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
    if (!title) return;
    await createTodo(target.id, title);
    setText("");
    await reload();
    toast("Todo added", `${target.name} · ${title}`, "green");
    inputRef.current?.focus();
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

  return (
    <div className={`quick-add${focus ? " focus" : ""}`}>
      <span className="qa-ring" />
      <input
        ref={inputRef}
        placeholder="Add a todo… press Enter to save"
        autoComplete="off"
        value={text}
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
    </div>
  );
}
