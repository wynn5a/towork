import type { Item, Priority, Project, Status, Todo } from "./types";

/** CSS-variable hues cycled across projects (matches the prototype palette). */
export const HUES = [
  "var(--accent)",
  "var(--teal)",
  "var(--amber)",
  "var(--blue)",
  "var(--green)",
  "var(--purple)",
];

export const PRIORITY_META: Record<Priority, { label: string; hue: string }> = {
  Low: { label: "Low", hue: "var(--text-3)" },
  Medium: { label: "Medium", hue: "var(--amber)" },
  High: { label: "High", hue: "var(--red)" },
};

export const STATUS_META: Record<Status, { label: string; hue: string }> = {
  Open: { label: "Open", hue: "var(--text-3)" },
  "In Progress": { label: "In Progress", hue: "var(--accent)" },
  Done: { label: "Done", hue: "var(--green)" },
};

export const PRIORITY_RANK: Record<Priority, number> = { High: 0, Medium: 1, Low: 2 };

/** Short, stable project prefix derived from its name (e.g. "Towork Core" → "TOW"). */
export function projectPrefix(name: string): string {
  const letters = (name || "").replace(/[^a-zA-Z]/g, "");
  return letters.slice(0, 3).toUpperCase() || "PRJ";
}

/** Deterministic hue for a project based on its id. */
export function projectHue(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return HUES[h % HUES.length];
}

export function relTime(iso: string): string {
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return "";
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}w ago`;
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Human phrasing for an activity action verb. Shared by the item activity
 *  timeline and the Home AI strip so both read the same. */
export function actionPhrase(action: string): string {
  switch (action) {
    case "Created":
      return "created";
    case "Completed":
      return "completed";
    case "Reopened":
      return "reopened";
    case "StatusChanged":
      return "changed status of";
    case "PriorityChanged":
      return "changed priority of";
    case "AssigneeChanged":
      return "reassigned";
    case "Deleted":
      return "deleted";
    default:
      return "updated";
  }
}

/** Which field a field-change action refers to, for the "changed <field> from
 *  X to Y" phrasing. Returns null for non-field-change actions. */
export function changedField(action: string): "status" | "priority" | "assignee" | null {
  switch (action) {
    case "StatusChanged":
      return "status";
    case "PriorityChanged":
      return "priority";
    case "AssigneeChanged":
      return "assignee";
    default:
      return null;
  }
}

export interface ProjectCounts {
  open: number;
  done: number;
  ai: number;
  total: number;
}

export function countItems(items: Item[]): ProjectCounts {
  let open = 0,
    done = 0,
    ai = 0;
  for (const it of items) {
    if (it.status === "Done") done++;
    else open++;
    if (it.assignee === "AI") ai++;
  }
  return { open, done, ai, total: items.length };
}

export function tag(kind: "todo" | "issue", item: Todo): Item {
  return { ...item, kind };
}

/**
 * Build a stable `PREFIX-N` identifier map for every item, numbering each
 * project's items by creation order. The backend doesn't store sequence
 * numbers, so they're derived deterministically here.
 */
export function buildSeqMap(projects: Project[], items: Item[]): Map<string, string> {
  const byProject = new Map<string, Item[]>();
  for (const it of items) {
    const arr = byProject.get(it.project_id) ?? [];
    arr.push(it);
    byProject.set(it.project_id, arr);
  }
  const map = new Map<string, string>();
  for (const p of projects) {
    const arr = (byProject.get(p.id) ?? [])
      .slice()
      .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
    const prefix = projectPrefix(p.name);
    arr.forEach((it, i) => map.set(it.id, `${prefix}-${i + 1}`));
  }
  return map;
}
