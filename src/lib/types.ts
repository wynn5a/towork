export type Status = "Open" | "In Progress" | "Done";
export type Priority = "Low" | "Medium" | "High";
export type Assignee = "User" | "AI";
export type ItemKind = "todo" | "issue";

export interface Project {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Todo {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: Status;
  priority: Priority;
  assignee: Assignee;
  created_at: string;
  updated_at: string;
}

// Issue has the same shape as Todo.
export type Issue = Todo;

/** A todo or issue tagged with its kind, for unified rendering. */
export type Item = Todo & { kind: ItemKind };

export interface ActivityLog {
  id: string;
  item_type: "Todo" | "Issue";
  item_id: string;
  action: string;
  actor: Assignee;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

export interface SearchResult {
  todos: Todo[];
  issues: Issue[];
}

export interface ItemInput {
  title: string;
  description: string;
  status: Status;
  priority: Priority;
  assignee: Assignee;
}
