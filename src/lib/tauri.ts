import { invoke } from "@tauri-apps/api/core";
import type {
  ActivityLog,
  Assignee,
  Issue,
  Priority,
  Project,
  SearchResult,
  Status,
  Todo,
} from "./types";

/* ------------------------------ projects ------------------------------ */
export const listProjects = (): Promise<Project[]> => invoke("list_projects");
export const getProject = (id: string): Promise<Project | null> =>
  invoke("get_project", { id });
export const createProject = (name: string, description?: string): Promise<Project> =>
  invoke("create_project", { name, description });
export const updateProject = (
  id: string,
  name?: string,
  description?: string
): Promise<void> => invoke("update_project", { id, name, description });
export const deleteProject = (id: string): Promise<void> =>
  invoke("delete_project", { id });

/* -------------------------------- todos ------------------------------- */
export const listTodos = (
  projectId?: string,
  status?: Status,
  priority?: Priority,
  assignee?: Assignee
): Promise<Todo[]> =>
  invoke("list_todos", { projectId, status, priority, assignee });
export const createTodo = (
  projectId: string,
  title: string,
  description?: string,
  priority?: Priority,
  assignee?: Assignee
): Promise<Todo> =>
  invoke("create_todo", { projectId, title, description, priority, assignee });
export const updateTodo = (
  id: string,
  fields: {
    title?: string;
    description?: string;
    status?: Status;
    priority?: Priority;
    assignee?: Assignee;
  }
): Promise<void> => invoke("update_todo", { id, ...fields });
export const completeTodo = (id: string): Promise<void> =>
  invoke("complete_todo", { id });
export const deleteTodo = (id: string): Promise<void> =>
  invoke("delete_todo", { id });

/* ------------------------------- issues ------------------------------- */
export const listIssues = (
  projectId?: string,
  status?: Status,
  priority?: Priority,
  assignee?: Assignee
): Promise<Issue[]> =>
  invoke("list_issues", { projectId, status, priority, assignee });
export const createIssue = (
  projectId: string,
  title: string,
  description?: string,
  priority?: Priority,
  assignee?: Assignee
): Promise<Issue> =>
  invoke("create_issue", { projectId, title, description, priority, assignee });
export const updateIssue = (
  id: string,
  fields: {
    title?: string;
    description?: string;
    status?: Status;
    priority?: Priority;
    assignee?: Assignee;
  }
): Promise<void> => invoke("update_issue", { id, ...fields });
export const completeIssue = (id: string): Promise<void> =>
  invoke("complete_issue", { id });
export const deleteIssue = (id: string): Promise<void> =>
  invoke("delete_issue", { id });

/* ------------------------------ activity ------------------------------ */
export const getActivity = (opts?: {
  itemId?: string;
  itemType?: "Todo" | "Issue";
  projectId?: string;
  /** Cap the number of rows (most-recent first). Omit for all. */
  limit?: number;
}): Promise<ActivityLog[]> =>
  invoke("get_activity", {
    itemId: opts?.itemId,
    itemType: opts?.itemType,
    projectId: opts?.projectId,
    limit: opts?.limit,
  });

/* ------------------------------- search ------------------------------- */
export const searchItems = (
  query: string,
  projectId?: string
): Promise<SearchResult> => invoke("search_items", { query, projectId });

/* --------------------------------- mcp -------------------------------- */
export const getMcpAddress = (): Promise<string> => invoke("get_mcp_address");
