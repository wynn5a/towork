# Towork Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Tauri 2 desktop app for task management where AI acts as a team member via MCP integration.

**Architecture:** Tauri 2 app with React frontend and Rust backend. SQLite for storage, embedded MCP server for AI integration. Frontend communicates with backend via Tauri IPC.

**Tech Stack:** React 19, TypeScript 6.x, Vite 8.x, Tailwind CSS 4.x, Tauri 2.x, rusqlite, rmcp, tokio

---

## File Structure

```
towork/
├── src-tauri/
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── build.rs
│   ├── src/
│   │   ├── main.rs
│   │   ├── lib.rs
│   │   ├── db/
│   │   │   ├── mod.rs
│   │   │   ├── schema.rs
│   │   │   └── migrations.rs
│   │   ├── models/
│   │   │   ├── mod.rs
│   │   │   ├── project.rs
│   │   │   ├── todo.rs
│   │   │   ├── issue.rs
│   │   │   └── activity.rs
│   │   ├── commands/
│   │   │   ├── mod.rs
│   │   │   ├── projects.rs
│   │   │   ├── todos.rs
│   │   │   ├── issues.rs
│   │   │   ├── activity.rs
│   │   │   └── search.rs
│   │   └── mcp/
│   │       ├── mod.rs
│   │       ├── server.rs
│   │       ├── tools.rs
│   │       ├── resources.rs
│   │       └── prompts.rs
│   └── migrations/
│       └── 001_initial.sql
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── router.tsx
│   ├── lib/
│   │   ├── tauri.ts
│   │   └── types.ts
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Tabs.tsx
│   │   │   ├── Avatar.tsx
│   │   │   └── EmptyState.tsx
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   └── TopBar.tsx
│   │   ├── projects/
│   │   │   ├── ProjectList.tsx
│   │   │   └── ProjectCard.tsx
│   │   ├── items/
│   │   │   ├── ItemCard.tsx
│   │   │   ├── ItemModal.tsx
│   │   │   └── ItemList.tsx
│   │   ├── activity/
│   │   │   └── ActivityLog.tsx
│   │   └── simple/
│   │       └── SimpleMode.tsx
│   └── pages/
│       ├── HomePage.tsx
│       ├── ProjectPage.tsx
│       ├── SearchPage.tsx
│       └── SimpleModePage.tsx
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.ts
```

---

## Task 1: Project Scaffolding

**Covers:** (scaffolding — no spec section)

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `tailwind.config.ts`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src-tauri/Cargo.toml`
- Create: `src-tauri/tauri.conf.json`
- Create: `src-tauri/build.rs`
- Create: `src-tauri/src/main.rs`
- Create: `src-tauri/src/lib.rs`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "towork",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "tauri": "tauri"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^7.0.0",
    "@tauri-apps/api": "^2.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.0.0",
    "typescript": "^6.0.0",
    "vite": "^8.0.0",
    "tailwindcss": "^4.0.0",
    "postcss": "^8.0.0",
    "autoprefixer": "^10.0.0",
    "@tauri-apps/cli": "^2.0.0"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run: `pnpm install`
Expected: Dependencies installed successfully

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2021",
    "useDefineForClassFields": true,
    "lib": ["ES2021", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 4: Create vite.config.ts**

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
  envPrefix: ["VITE_", "TAURI_"],
  build: {
    target: process.env.TAURI_PLATFORM === "windows" ? "chrome105" : "safari13",
    minify: !process.env.TAURI_DEBUG ? "esbuild" : false,
    sourcemap: !!process.env.TAURI_DEBUG,
  },
});
```

- [ ] **Step 5: Create tailwind.config.ts**

```typescript
import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config;
```

- [ ] **Step 6: Create src/main.tsx**

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 7: Create src/App.tsx**

```tsx
export default function App() {
  return <div className="p-4">Towork</div>;
}
```

- [ ] **Step 8: Create src/index.css**

```css
@import "tailwindcss";
```

- [ ] **Step 9: Create src-tauri/Cargo.toml**

```toml
[package]
name = "towork"
version = "0.1.0"
edition = "2021"

[lib]
name = "towork_lib"
crate-type = ["lib", "cdylib", "staticlib"]

[[bin]]
name = "towork"
path = "src/main.rs"

[dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-shell = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
rusqlite = { version = "0.31", features = ["bundled"] }
uuid = { version = "1", features = ["v4"] }
chrono = { version = "0.4", features = ["serde"] }
tokio = { version = "1", features = ["full"] }
rmcp = { version = "0.1", features = ["server", "transport-child-process", "transport-http"] }
anyhow = "1"
thiserror = "1"

[build-dependencies]
tauri-build = { version = "2", features = [] }
```

- [ ] **Step 10: Create src-tauri/tauri.conf.json**

```json
{
  "$schema": "https://raw.githubusercontent.com/nicegram/nicegram-tauri/refs/heads/main/crates/tauri-utils/schema.json",
  "productName": "Towork",
  "version": "0.1.0",
  "identifier": "com.towork.app",
  "build": {
    "beforeDevCommand": "pnpm dev",
    "devUrl": "http://localhost:1420",
    "beforeBuildCommand": "pnpm build",
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [
      {
        "title": "Towork",
        "width": 1200,
        "height": 800
      }
    ],
    "security": {
      "csp": null
    }
  },
  "plugins": {
    "shell": {
      "open": true
    }
  }
}
```

- [ ] **Step 11: Create src-tauri/build.rs**

```rust
fn main() {
    tauri_build::build()
}
```

- [ ] **Step 12: Create src-tauri/src/main.rs**

```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 13: Create src-tauri/src/lib.rs**

```rust
pub mod db;
pub mod models;
pub mod commands;
pub mod mcp;
```

- [ ] **Step 14: Verify scaffolding**

Run: `pnpm tauri dev`
Expected: App window opens showing "Towork"

- [ ] **Step 15: Commit**

```bash
git add -A
git commit -m "feat: scaffold Tauri 2 project with React and Vite"
```

---

## Task 2: Database Schema and Migrations

**Covers:** [S3]

**Files:**
- Create: `src-tauri/migrations/001_initial.sql`
- Create: `src-tauri/src/db/mod.rs`
- Create: `src-tauri/src/db/migrations.rs`
- Create: `src-tauri/src/db/schema.rs`

- [ ] **Step 1: Create migration SQL**

```sql
-- migrations/001_initial.sql
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS todos (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'Done')),
    priority TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High')),
    assignee TEXT NOT NULL DEFAULT 'User' CHECK (assignee IN ('User', 'AI')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS issues (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'Done')),
    priority TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High')),
    assignee TEXT NOT NULL DEFAULT 'User' CHECK (assignee IN ('User', 'AI')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS activity_log (
    id TEXT PRIMARY KEY,
    item_type TEXT NOT NULL CHECK (item_type IN ('Todo', 'Issue')),
    item_id TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('Created', 'StatusChanged', 'PriorityChanged', 'AssigneeChanged', 'Updated', 'Completed')),
    actor TEXT NOT NULL CHECK (actor IN ('User', 'AI')),
    old_value TEXT,
    new_value TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_todos_project_id ON todos(project_id);
CREATE INDEX idx_todos_status ON todos(status);
CREATE INDEX idx_todos_assignee ON todos(assignee);
CREATE INDEX idx_issues_project_id ON issues(project_id);
CREATE INDEX idx_issues_status ON issues(status);
CREATE INDEX idx_issues_assignee ON issues(assignee);
CREATE INDEX idx_activity_log_item ON activity_log(item_type, item_id);
CREATE INDEX idx_activity_log_project ON activity_log(item_id);
```

- [ ] **Step 2: Create db/mod.rs**

```rust
pub mod migrations;
pub mod schema;

use rusqlite::Connection;
use std::sync::Mutex;
use tauri::State;

pub struct DbState {
    pub conn: Mutex<Connection>,
}

impl DbState {
    pub fn new(conn: Connection) -> Self {
        Self {
            conn: Mutex::new(conn),
        }
    }
}

pub fn init_db(db_path: &std::path::Path) -> anyhow::Result<Connection> {
    let conn = Connection::open(db_path)?;
    conn.execute_batch("PRAGMA foreign_keys = ON;")?;
    migrations::run_migrations(&conn)?;
    Ok(conn)
}
```

- [ ] **Step 3: Create db/migrations.rs**

```rust
use rusqlite::Connection;

pub fn run_migrations(conn: &Connection) -> anyhow::Result<()> {
    conn.execute_batch(include_str!("../../migrations/001_initial.sql"))?;
    Ok(())
}
```

- [ ] **Step 4: Create db/schema.rs**

```rust
use rusqlite::params;

use crate::models::{
    activity::{ActivityAction, ActivityLog, ActivityLogRow, ItemType},
    issue::{Issue, IssueRow},
    project::{Project, ProjectRow},
    todo::{Todo, TodoRow},
    Actor,
};

pub fn query_projects(conn: &rusqlite::Connection) -> anyhow::Result<Vec<Project>> {
    let mut stmt = conn.prepare(
        "SELECT id, name, description, created_at, updated_at FROM projects ORDER BY updated_at DESC",
    )?;
    let rows = stmt.query_map([], |row| {
        Ok(ProjectRow {
            id: row.get(0)?,
            name: row.get(1)?,
            description: row.get(2)?,
            created_at: row.get(3)?,
            updated_at: row.get(4)?,
        })
    })?;
    let projects = rows.filter_map(|r| r.ok()).map(Project::from).collect();
    Ok(projects)
}

pub fn query_project(conn: &rusqlite::Connection, id: &str) -> anyhow::Result<Option<Project>> {
    let mut stmt = conn.prepare(
        "SELECT id, name, description, created_at, updated_at FROM projects WHERE id = ?1",
    )?;
    let mut rows = stmt.query_map(params![id], |row| {
        Ok(ProjectRow {
            id: row.get(0)?,
            name: row.get(1)?,
            description: row.get(2)?,
            created_at: row.get(3)?,
            updated_at: row.get(4)?,
        })
    })?;
    Ok(rows.next().and_then(|r| r.ok()).map(Project::from))
}

pub fn insert_project(
    conn: &rusqlite::Connection,
    project: &Project,
) -> anyhow::Result<()> {
    conn.execute(
        "INSERT INTO projects (id, name, description, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![
            project.id,
            project.name,
            project.description,
            project.created_at,
            project.updated_at,
        ],
    )?;
    Ok(())
}

pub fn update_project(
    conn: &rusqlite::Connection,
    id: &str,
    name: Option<&str>,
    description: Option<&str>,
) -> anyhow::Result<()> {
    let now = chrono::Utc::now().to_rfc3339();
    if let Some(name) = name {
        conn.execute(
            "UPDATE projects SET name = ?1, updated_at = ?2 WHERE id = ?3",
            params![name, now, id],
        )?;
    }
    if let Some(description) = description {
        conn.execute(
            "UPDATE projects SET description = ?1, updated_at = ?2 WHERE id = ?3",
            params![description, now, id],
        )?;
    }
    Ok(())
}

pub fn delete_project(conn: &rusqlite::Connection, id: &str) -> anyhow::Result<()> {
    conn.execute("DELETE FROM projects WHERE id = ?1", params![id])?;
    Ok(())
}

pub fn query_todos(
    conn: &rusqlite::Connection,
    project_id: Option<&str>,
    status: Option<&str>,
    priority: Option<&str>,
    assignee: Option<&str>,
) -> anyhow::Result<Vec<Todo>> {
    let mut query = String::from(
        "SELECT id, project_id, title, description, status, priority, assignee, created_at, updated_at FROM todos WHERE 1=1",
    );
    let mut params: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if let Some(pid) = project_id {
        query.push_str(" AND project_id = ?");
        params.push(Box::new(pid.to_string()));
    }
    if let Some(s) = status {
        query.push_str(" AND status = ?");
        params.push(Box::new(s.to_string()));
    }
    if let Some(p) = priority {
        query.push_str(" AND priority = ?");
        params.push(Box::new(p.to_string()));
    }
    if let Some(a) = assignee {
        query.push_str(" AND assignee = ?");
        params.push(Box::new(a.to_string()));
    }
    query.push_str(" ORDER BY created_at DESC");

    let mut stmt = conn.prepare(&query)?;
    let param_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();
    let rows = stmt.query_map(param_refs.as_slice(), |row| {
        Ok(TodoRow {
            id: row.get(0)?,
            project_id: row.get(1)?,
            title: row.get(2)?,
            description: row.get(3)?,
            status: row.get(4)?,
            priority: row.get(5)?,
            assignee: row.get(6)?,
            created_at: row.get(7)?,
            updated_at: row.get(8)?,
        })
    })?;
    let todos = rows.filter_map(|r| r.ok()).map(Todo::from).collect();
    Ok(todos)
}

pub fn query_todo(conn: &rusqlite::Connection, id: &str) -> anyhow::Result<Option<Todo>> {
    let mut stmt = conn.prepare(
        "SELECT id, project_id, title, description, status, priority, assignee, created_at, updated_at FROM todos WHERE id = ?1",
    )?;
    let mut rows = stmt.query_map(params![id], |row| {
        Ok(TodoRow {
            id: row.get(0)?,
            project_id: row.get(1)?,
            title: row.get(2)?,
            description: row.get(3)?,
            status: row.get(4)?,
            priority: row.get(5)?,
            assignee: row.get(6)?,
            created_at: row.get(7)?,
            updated_at: row.get(8)?,
        })
    })?;
    Ok(rows.next().and_then(|r| r.ok()).map(Todo::from))
}

pub fn insert_todo(conn: &rusqlite::Connection, todo: &Todo) -> anyhow::Result<()> {
    conn.execute(
        "INSERT INTO todos (id, project_id, title, description, status, priority, assignee, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        params![
            todo.id,
            todo.project_id,
            todo.title,
            todo.description,
            todo.status,
            todo.priority,
            todo.assignee,
            todo.created_at,
            todo.updated_at,
        ],
    )?;
    Ok(())
}

pub fn update_todo(
    conn: &rusqlite::Connection,
    id: &str,
    title: Option<&str>,
    description: Option<&str>,
    status: Option<&str>,
    priority: Option<&str>,
    assignee: Option<&str>,
) -> anyhow::Result<()> {
    let now = chrono::Utc::now().to_rfc3339();
    if let Some(title) = title {
        conn.execute(
            "UPDATE todos SET title = ?1, updated_at = ?2 WHERE id = ?3",
            params![title, now, id],
        )?;
    }
    if let Some(description) = description {
        conn.execute(
            "UPDATE todos SET description = ?1, updated_at = ?2 WHERE id = ?3",
            params![description, now, id],
        )?;
    }
    if let Some(status) = status {
        conn.execute(
            "UPDATE todos SET status = ?1, updated_at = ?2 WHERE id = ?3",
            params![status, now, id],
        )?;
    }
    if let Some(priority) = priority {
        conn.execute(
            "UPDATE todos SET priority = ?1, updated_at = ?2 WHERE id = ?3",
            params![priority, now, id],
        )?;
    }
    if let Some(assignee) = assignee {
        conn.execute(
            "UPDATE todos SET assignee = ?1, updated_at = ?2 WHERE id = ?3",
            params![assignee, now, id],
        )?;
    }
    Ok(())
}

pub fn delete_todo(conn: &rusqlite::Connection, id: &str) -> anyhow::Result<()> {
    conn.execute("DELETE FROM todos WHERE id = ?1", params![id])?;
    Ok(())
}

pub fn query_issues(
    conn: &rusqlite::Connection,
    project_id: Option<&str>,
    status: Option<&str>,
    priority: Option<&str>,
    assignee: Option<&str>,
) -> anyhow::Result<Vec<Issue>> {
    let mut query = String::from(
        "SELECT id, project_id, title, description, status, priority, assignee, created_at, updated_at FROM issues WHERE 1=1",
    );
    let mut params: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if let Some(pid) = project_id {
        query.push_str(" AND project_id = ?");
        params.push(Box::new(pid.to_string()));
    }
    if let Some(s) = status {
        query.push_str(" AND status = ?");
        params.push(Box::new(s.to_string()));
    }
    if let Some(p) = priority {
        query.push_str(" AND priority = ?");
        params.push(Box::new(p.to_string()));
    }
    if let Some(a) = assignee {
        query.push_str(" AND assignee = ?");
        params.push(Box::new(a.to_string()));
    }
    query.push_str(" ORDER BY created_at DESC");

    let mut stmt = conn.prepare(&query)?;
    let param_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();
    let rows = stmt.query_map(param_refs.as_slice(), |row| {
        Ok(IssueRow {
            id: row.get(0)?,
            project_id: row.get(1)?,
            title: row.get(2)?,
            description: row.get(3)?,
            status: row.get(4)?,
            priority: row.get(5)?,
            assignee: row.get(6)?,
            created_at: row.get(7)?,
            updated_at: row.get(8)?,
        })
    })?;
    let issues = rows.filter_map(|r| r.ok()).map(Issue::from).collect();
    Ok(issues)
}

pub fn query_issue(conn: &rusqlite::Connection, id: &str) -> anyhow::Result<Option<Issue>> {
    let mut stmt = conn.prepare(
        "SELECT id, project_id, title, description, status, priority, assignee, created_at, updated_at FROM issues WHERE id = ?1",
    )?;
    let mut rows = stmt.query_map(params![id], |row| {
        Ok(IssueRow {
            id: row.get(0)?,
            project_id: row.get(1)?,
            title: row.get(2)?,
            description: row.get(3)?,
            status: row.get(4)?,
            priority: row.get(5)?,
            assignee: row.get(6)?,
            created_at: row.get(7)?,
            updated_at: row.get(8)?,
        })
    })?;
    Ok(rows.next().and_then(|r| r.ok()).map(Issue::from))
}

pub fn insert_issue(conn: &rusqlite::Connection, issue: &Issue) -> anyhow::Result<()> {
    conn.execute(
        "INSERT INTO issues (id, project_id, title, description, status, priority, assignee, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        params![
            issue.id,
            issue.project_id,
            issue.title,
            issue.description,
            issue.status,
            issue.priority,
            issue.assignee,
            issue.created_at,
            issue.updated_at,
        ],
    )?;
    Ok(())
}

pub fn update_issue(
    conn: &rusqlite::Connection,
    id: &str,
    title: Option<&str>,
    description: Option<&str>,
    status: Option<&str>,
    priority: Option<&str>,
    assignee: Option<&str>,
) -> anyhow::Result<()> {
    let now = chrono::Utc::now().to_rfc3339();
    if let Some(title) = title {
        conn.execute(
            "UPDATE issues SET title = ?1, updated_at = ?2 WHERE id = ?3",
            params![title, now, id],
        )?;
    }
    if let Some(description) = description {
        conn.execute(
            "UPDATE issues SET description = ?1, updated_at = ?2 WHERE id = ?3",
            params![description, now, id],
        )?;
    }
    if let Some(status) = status {
        conn.execute(
            "UPDATE issues SET status = ?1, updated_at = ?2 WHERE id = ?3",
            params![status, now, id],
        )?;
    }
    if let Some(priority) = priority {
        conn.execute(
            "UPDATE issues SET priority = ?1, updated_at = ?2 WHERE id = ?3",
            params![priority, now, id],
        )?;
    }
    if let Some(assignee) = assignee {
        conn.execute(
            "UPDATE issues SET assignee = ?1, updated_at = ?2 WHERE id = ?3",
            params![assignee, now, id],
        )?;
    }
    Ok(())
}

pub fn delete_issue(conn: &rusqlite::Connection, id: &str) -> anyhow::Result<()> {
    conn.execute("DELETE FROM issues WHERE id = ?1", params![id])?;
    Ok(())
}

pub fn insert_activity(
    conn: &rusqlite::Connection,
    activity: &ActivityLog,
) -> anyhow::Result<()> {
    conn.execute(
        "INSERT INTO activity_log (id, item_type, item_id, action, actor, old_value, new_value, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![
            activity.id,
            activity.item_type,
            activity.item_id,
            activity.action,
            activity.actor,
            activity.old_value,
            activity.new_value,
            activity.created_at,
        ],
    )?;
    Ok(())
}

pub fn query_activity(
    conn: &rusqlite::Connection,
    item_id: Option<&str>,
    item_type: Option<&str>,
) -> anyhow::Result<Vec<ActivityLog>> {
    let mut query = String::from(
        "SELECT id, item_type, item_id, action, actor, old_value, new_value, created_at FROM activity_log WHERE 1=1",
    );
    let mut params: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if let Some(iid) = item_id {
        query.push_str(" AND item_id = ?");
        params.push(Box::new(iid.to_string()));
    }
    if let Some(it) = item_type {
        query.push_str(" AND item_type = ?");
        params.push(Box::new(it.to_string()));
    }
    query.push_str(" ORDER BY created_at DESC");

    let mut stmt = conn.prepare(&query)?;
    let param_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();
    let rows = stmt.query_map(param_refs.as_slice(), |row| {
        Ok(ActivityLogRow {
            id: row.get(0)?,
            item_type: row.get(1)?,
            item_id: row.get(2)?,
            action: row.get(3)?,
            actor: row.get(4)?,
            old_value: row.get(5)?,
            new_value: row.get(6)?,
            created_at: row.get(7)?,
        })
    })?;
    let activities = rows.filter_map(|r| r.ok()).map(ActivityLog::from).collect();
    Ok(activities)
}

pub fn search_items(
    conn: &rusqlite::Connection,
    query: &str,
    project_id: Option<&str>,
) -> anyhow::Result<(Vec<Todo>, Vec<Issue>)> {
    let search_pattern = format!("%{}%", query);
    let todos = query_todos(conn, project_id, None, None, None)?
        .into_iter()
        .filter(|t| {
            t.title.to_lowercase().contains(&query.to_lowercase())
                || t.description
                    .as_ref()
                    .map(|d| d.to_lowercase().contains(&query.to_lowercase()))
                    .unwrap_or(false)
        })
        .collect();
    let issues = query_issues(conn, project_id, None, None, None)?
        .into_iter()
        .filter(|i| {
            i.title.to_lowercase().contains(&query.to_lowercase())
                || i.description
                    .as_ref()
                    .map(|d| d.to_lowercase().contains(&query.to_lowercase()))
                    .unwrap_or(false)
        })
        .collect();
    Ok((todos, issues))
}
```

- [ ] **Step 5: Verify database initialization**

Run: `cargo build` in src-tauri
Expected: Build succeeds

- [ ] **Step 6: Commit**

```bash
git add src-tauri/migrations src-tauri/src/db
git commit -m "feat: add database schema and migration system"
```

---

## Task 3: Data Models

**Covers:** [S3]

**Files:**
- Create: `src-tauri/src/models/mod.rs`
- Create: `src-tauri/src/models/project.rs`
- Create: `src-tauri/src/models/todo.rs`
- Create: `src-tauri/src/models/issue.rs`
- Create: `src-tauri/src/models/activity.rs`

- [ ] **Step 1: Create models/mod.rs**

```rust
pub mod project;
pub mod todo;
pub mod issue;
pub mod activity;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, PartialEq)]
pub enum Actor {
    User,
    AI,
}

impl Actor {
    pub fn as_str(&self) -> &str {
        match self {
            Actor::User => "User",
            Actor::AI => "AI",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "AI" => Actor::AI,
            _ => Actor::User,
        }
    }
}
```

- [ ] **Step 2: Create models/project.rs**

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug)]
pub struct ProjectRow {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

impl From<ProjectRow> for Project {
    fn from(row: ProjectRow) -> Self {
        Self {
            id: row.id,
            name: row.name,
            description: row.description,
            created_at: row.created_at,
            updated_at: row.updated_at,
        }
    }
}

impl Project {
    pub fn new(name: String, description: Option<String>) -> Self {
        let now = chrono::Utc::now().to_rfc3339();
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            name,
            description,
            created_at: now.clone(),
            updated_at: now,
        }
    }
}
```

- [ ] **Step 3: Create models/todo.rs**

```rust
use serde::{Deserialize, Serialize};

use super::Actor;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Todo {
    pub id: String,
    pub project_id: String,
    pub title: String,
    pub description: Option<String>,
    pub status: String,
    pub priority: String,
    pub assignee: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug)]
pub struct TodoRow {
    pub id: String,
    pub project_id: String,
    pub title: String,
    pub description: Option<String>,
    pub status: String,
    pub priority: String,
    pub assignee: String,
    pub created_at: String,
    pub updated_at: String,
}

impl From<TodoRow> for Todo {
    fn from(row: TodoRow) -> Self {
        Self {
            id: row.id,
            project_id: row.project_id,
            title: row.title,
            description: row.description,
            status: row.status,
            priority: row.priority,
            assignee: row.assignee,
            created_at: row.created_at,
            updated_at: row.updated_at,
        }
    }
}

impl Todo {
    pub fn new(
        project_id: String,
        title: String,
        description: Option<String>,
        priority: Option<String>,
        assignee: Option<Actor>,
    ) -> Self {
        let now = chrono::Utc::now().to_rfc3339();
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            project_id,
            title,
            description,
            status: "Open".to_string(),
            priority: priority.unwrap_or_else(|| "Medium".to_string()),
            assignee: assignee
                .map(|a| a.as_str().to_string())
                .unwrap_or_else(|| "User".to_string()),
            created_at: now.clone(),
            updated_at: now,
        }
    }
}
```

- [ ] **Step 4: Create models/issue.rs**

```rust
use serde::{Deserialize, Serialize};

use super::Actor;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Issue {
    pub id: String,
    pub project_id: String,
    pub title: String,
    pub description: Option<String>,
    pub status: String,
    pub priority: String,
    pub assignee: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug)]
pub struct IssueRow {
    pub id: String,
    pub project_id: String,
    pub title: String,
    pub description: Option<String>,
    pub status: String,
    pub priority: String,
    pub assignee: String,
    pub created_at: String,
    pub updated_at: String,
}

impl From<IssueRow> for Issue {
    fn from(row: IssueRow) -> Self {
        Self {
            id: row.id,
            project_id: row.project_id,
            title: row.title,
            description: row.description,
            status: row.status,
            priority: row.priority,
            assignee: row.assignee,
            created_at: row.created_at,
            updated_at: row.updated_at,
        }
    }
}

impl Issue {
    pub fn new(
        project_id: String,
        title: String,
        description: Option<String>,
        priority: Option<String>,
        assignee: Option<Actor>,
    ) -> Self {
        let now = chrono::Utc::now().to_rfc3339();
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            project_id,
            title,
            description,
            status: "Open".to_string(),
            priority: priority.unwrap_or_else(|| "Medium".to_string()),
            assignee: assignee
                .map(|a| a.as_str().to_string())
                .unwrap_or_else(|| "User".to_string()),
            created_at: now.clone(),
            updated_at: now,
        }
    }
}
```

- [ ] **Step 5: Create models/activity.rs**

```rust
use serde::{Deserialize, Serialize};

use super::Actor;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActivityLog {
    pub id: String,
    pub item_type: String,
    pub item_id: String,
    pub action: String,
    pub actor: String,
    pub old_value: Option<String>,
    pub new_value: Option<String>,
    pub created_at: String,
}

#[derive(Debug)]
pub struct ActivityLogRow {
    pub id: String,
    pub item_type: String,
    pub item_id: String,
    pub action: String,
    pub actor: String,
    pub old_value: Option<String>,
    pub new_value: Option<String>,
    pub created_at: String,
}

impl From<ActivityLogRow> for ActivityLog {
    fn from(row: ActivityLogRow) -> Self {
        Self {
            id: row.id,
            item_type: row.item_type,
            item_id: row.item_id,
            action: row.action,
            actor: row.actor,
            old_value: row.old_value,
            new_value: row.new_value,
            created_at: row.created_at,
        }
    }
}

impl ActivityLog {
    pub fn new(
        item_type: String,
        item_id: String,
        action: String,
        actor: Actor,
        old_value: Option<String>,
        new_value: Option<String>,
    ) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            item_type,
            item_id,
            action,
            actor: actor.as_str().to_string(),
            old_value,
            new_value,
            created_at: chrono::Utc::now().to_rfc3339(),
        }
    }
}
```

- [ ] **Step 6: Verify models compile**

Run: `cargo build` in src-tauri
Expected: Build succeeds

- [ ] **Step 7: Commit**

```bash
git add src-tauri/src/models
git commit -m "feat: add data models for Project, Todo, Issue, ActivityLog"
```

---

## Task 4: Tauri IPC Commands

**Covers:** [S4]

**Files:**
- Create: `src-tauri/src/commands/mod.rs`
- Create: `src-tauri/src/commands/projects.rs`
- Create: `src-tauri/src/commands/todos.rs`
- Create: `src-tauri/src/commands/issues.rs`
- Create: `src-tauri/src/commands/activity.rs`
- Create: `src-tauri/src/commands/search.rs`
- Modify: `src-tauri/src/main.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Create commands/mod.rs**

```rust
pub mod projects;
pub mod todos;
pub mod issues;
pub mod activity;
pub mod search;
```

- [ ] **Step 2: Create commands/projects.rs**

```rust
use tauri::State;

use crate::db::{schema, DbState};
use crate::models::project::Project;

#[tauri::command]
pub fn list_projects(state: State<'_, DbState>) -> Result<Vec<Project>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    schema::query_projects(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_project(state: State<'_, DbState>, id: String) -> Result<Option<Project>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    schema::query_project(&conn, &id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_project(
    state: State<'_, DbState>,
    name: String,
    description: Option<String>,
) -> Result<Project, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let project = Project::new(name, description);
    schema::insert_project(&conn, &project).map_err(|e| e.to_string())?;
    Ok(project)
}

#[tauri::command]
pub fn update_project(
    state: State<'_, DbState>,
    id: String,
    name: Option<String>,
    description: Option<String>,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    schema::update_project(&conn, &id, name.as_deref(), description.as_deref())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_project(state: State<'_, DbState>, id: String) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    schema::delete_project(&conn, &id).map_err(|e| e.to_string())
}
```

- [ ] **Step 3: Create commands/todos.rs**

```rust
use tauri::State;

use crate::db::{schema, DbState};
use crate::models::{todo::Todo, Actor};

#[tauri::command]
pub fn list_todos(
    state: State<'_, DbState>,
    project_id: Option<String>,
    status: Option<String>,
    priority: Option<String>,
    assignee: Option<String>,
) -> Result<Vec<Todo>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    schema::query_todos(
        &conn,
        project_id.as_deref(),
        status.as_deref(),
        priority.as_deref(),
        assignee.as_deref(),
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_todo(state: State<'_, DbState>, id: String) -> Result<Option<Todo>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    schema::query_todo(&conn, &id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_todo(
    state: State<'_, DbState>,
    project_id: String,
    title: String,
    description: Option<String>,
    priority: Option<String>,
    assignee: Option<String>,
) -> Result<Todo, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let actor = match assignee.as_deref() {
        Some("AI") => Actor::AI,
        _ => Actor::User,
    };
    let todo = Todo::new(project_id, title, description, priority, Some(actor));
    schema::insert_todo(&conn, &todo).map_err(|e| e.to_string())?;

    let activity = crate::models::activity::ActivityLog::new(
        "Todo".to_string(),
        todo.id.clone(),
        "Created".to_string(),
        actor,
        None,
        Some(todo.title.clone()),
    );
    crate::db::schema::insert_activity(&conn, &activity).map_err(|e| e.to_string())?;

    Ok(todo)
}

#[tauri::command]
pub fn update_todo(
    state: State<'_, DbState>,
    id: String,
    title: Option<String>,
    description: Option<String>,
    status: Option<String>,
    priority: Option<String>,
    assignee: Option<String>,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    let old = schema::query_todo(&conn, &id).map_err(|e| e.to_string())?;

    schema::update_todo(
        &conn,
        &id,
        title.as_deref(),
        description.as_deref(),
        status.as_deref(),
        priority.as_deref(),
        assignee.as_deref(),
    )
    .map_err(|e| e.to_string())?;

    if let Some(old) = old {
        if let Some(s) = &status {
            if s != &old.status {
                let activity = crate::models::activity::ActivityLog::new(
                    "Todo".to_string(),
                    id.clone(),
                    "StatusChanged".to_string(),
                    Actor::User,
                    Some(old.status.clone()),
                    Some(s.clone()),
                );
                crate::db::schema::insert_activity(&conn, &activity).map_err(|e| e.to_string())?;
            }
        }
        if let Some(p) = &priority {
            if p != &old.priority {
                let activity = crate::models::activity::ActivityLog::new(
                    "Todo".to_string(),
                    id.clone(),
                    "PriorityChanged".to_string(),
                    Actor::User,
                    Some(old.priority.clone()),
                    Some(p.clone()),
                );
                crate::db::schema::insert_activity(&conn, &activity).map_err(|e| e.to_string())?;
            }
        }
        if let Some(a) = &assignee {
            if a != &old.assignee {
                let activity = crate::models::activity::ActivityLog::new(
                    "Todo".to_string(),
                    id.clone(),
                    "AssigneeChanged".to_string(),
                    Actor::User,
                    Some(old.assignee.clone()),
                    Some(a.clone()),
                );
                crate::db::schema::insert_activity(&conn, &activity).map_err(|e| e.to_string())?;
            }
        }
    }

    Ok(())
}

#[tauri::command]
pub fn complete_todo(state: State<'_, DbState>, id: String) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    schema::update_todo(&conn, &id, None, None, Some("Done"), None, None)
        .map_err(|e| e.to_string())?;

    let activity = crate::models::activity::ActivityLog::new(
        "Todo".to_string(),
        id,
        "Completed".to_string(),
        Actor::User,
        Some("Open".to_string()),
        Some("Done".to_string()),
    );
    crate::db::schema::insert_activity(&conn, &activity).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn delete_todo(state: State<'_, DbState>, id: String) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    schema::delete_todo(&conn, &id).map_err(|e| e.to_string())
}
```

- [ ] **Step 4: Create commands/issues.rs**

```rust
use tauri::State;

use crate::db::{schema, DbState};
use crate::models::{issue::Issue, Actor};

#[tauri::command]
pub fn list_issues(
    state: State<'_, DbState>,
    project_id: Option<String>,
    status: Option<String>,
    priority: Option<String>,
    assignee: Option<String>,
) -> Result<Vec<Issue>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    schema::query_issues(
        &conn,
        project_id.as_deref(),
        status.as_deref(),
        priority.as_deref(),
        assignee.as_deref(),
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_issue(state: State<'_, DbState>, id: String) -> Result<Option<Issue>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    schema::query_issue(&conn, &id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_issue(
    state: State<'_, DbState>,
    project_id: String,
    title: String,
    description: Option<String>,
    priority: Option<String>,
    assignee: Option<String>,
) -> Result<Issue, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let actor = match assignee.as_deref() {
        Some("AI") => Actor::AI,
        _ => Actor::User,
    };
    let issue = Issue::new(project_id, title, description, priority, Some(actor));
    schema::insert_issue(&conn, &issue).map_err(|e| e.to_string())?;

    let activity = crate::models::activity::ActivityLog::new(
        "Issue".to_string(),
        issue.id.clone(),
        "Created".to_string(),
        actor,
        None,
        Some(issue.title.clone()),
    );
    crate::db::schema::insert_activity(&conn, &activity).map_err(|e| e.to_string())?;

    Ok(issue)
}

#[tauri::command]
pub fn update_issue(
    state: State<'_, DbState>,
    id: String,
    title: Option<String>,
    description: Option<String>,
    status: Option<String>,
    priority: Option<String>,
    assignee: Option<String>,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    let old = schema::query_issue(&conn, &id).map_err(|e| e.to_string())?;

    schema::update_issue(
        &conn,
        &id,
        title.as_deref(),
        description.as_deref(),
        status.as_deref(),
        priority.as_deref(),
        assignee.as_deref(),
    )
    .map_err(|e| e.to_string())?;

    if let Some(old) = old {
        if let Some(s) = &status {
            if s != &old.status {
                let activity = crate::models::activity::ActivityLog::new(
                    "Issue".to_string(),
                    id.clone(),
                    "StatusChanged".to_string(),
                    Actor::User,
                    Some(old.status.clone()),
                    Some(s.clone()),
                );
                crate::db::schema::insert_activity(&conn, &activity).map_err(|e| e.to_string())?;
            }
        }
        if let Some(p) = &priority {
            if p != &old.priority {
                let activity = crate::models::activity::ActivityLog::new(
                    "Issue".to_string(),
                    id.clone(),
                    "PriorityChanged".to_string(),
                    Actor::User,
                    Some(old.priority.clone()),
                    Some(p.clone()),
                );
                crate::db::schema::insert_activity(&conn, &activity).map_err(|e| e.to_string())?;
            }
        }
        if let Some(a) = &assignee {
            if a != &old.assignee {
                let activity = crate::models::activity::ActivityLog::new(
                    "Issue".to_string(),
                    id.clone(),
                    "AssigneeChanged".to_string(),
                    Actor::User,
                    Some(old.assignee.clone()),
                    Some(a.clone()),
                );
                crate::db::schema::insert_activity(&conn, &activity).map_err(|e| e.to_string())?;
            }
        }
    }

    Ok(())
}

#[tauri::command]
pub fn complete_issue(state: State<'_, DbState>, id: String) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    schema::update_issue(&conn, &id, None, None, Some("Done"), None, None)
        .map_err(|e| e.to_string())?;

    let activity = crate::models::activity::ActivityLog::new(
        "Issue".to_string(),
        id,
        "Completed".to_string(),
        Actor::User,
        Some("Open".to_string()),
        Some("Done".to_string()),
    );
    crate::db::schema::insert_activity(&conn, &activity).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn delete_issue(state: State<'_, DbState>, id: String) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    schema::delete_issue(&conn, &id).map_err(|e| e.to_string())
}
```

- [ ] **Step 5: Create commands/activity.rs**

```rust
use tauri::State;

use crate::db::{schema, DbState};
use crate::models::activity::ActivityLog;

#[tauri::command]
pub fn get_activity(
    state: State<'_, DbState>,
    item_id: Option<String>,
    item_type: Option<String>,
) -> Result<Vec<ActivityLog>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    schema::query_activity(&conn, item_id.as_deref(), item_type.as_deref())
        .map_err(|e| e.to_string())
}
```

- [ ] **Step 6: Create commands/search.rs**

```rust
use serde::Serialize;
use tauri::State;

use crate::db::{schema, DbState};
use crate::models::{issue::Issue, todo::Todo};

#[derive(Serialize)]
pub struct SearchResult {
    pub todos: Vec<Todo>,
    pub issues: Vec<Issue>,
}

#[tauri::command]
pub fn search_items(
    state: State<'_, DbState>,
    query: String,
    project_id: Option<String>,
) -> Result<SearchResult, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let (todos, issues) =
        schema::search_items(&conn, &query, project_id.as_deref()).map_err(|e| e.to_string())?;
    Ok(SearchResult { todos, issues })
}
```

- [ ] **Step 7: Update lib.rs to export commands**

```rust
pub mod db;
pub mod models;
pub mod commands;
pub mod mcp;
```

- [ ] **Step 8: Update main.rs to register commands**

```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::path::PathBuf;
use tauri::Manager;

use towork_lib::db::{self, DbState};
use towork_lib::commands::{
    projects::{list_projects, get_project, create_project, update_project, delete_project},
    todos::{list_todos, get_todo, create_todo, update_todo, complete_todo, delete_todo},
    issues::{list_issues, get_issue, create_issue, update_issue, complete_issue, delete_issue},
    activity::get_activity,
    search::search_items,
};

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let app_dir = app
                .path()
                .app_data_dir()
                .expect("failed to get app data dir");
            std::fs::create_dir_all(&app_dir).expect("failed to create app dir");
            let db_path = app_dir.join("towork.db");
            let conn = db::init_db(&db_path).expect("failed to init database");
            app.manage(DbState::new(conn));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            list_projects,
            get_project,
            create_project,
            update_project,
            delete_project,
            list_todos,
            get_todo,
            create_todo,
            update_todo,
            complete_todo,
            delete_todo,
            list_issues,
            get_issue,
            create_issue,
            update_issue,
            complete_issue,
            delete_issue,
            get_activity,
            search_items,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 9: Verify commands compile**

Run: `cargo build` in src-tauri
Expected: Build succeeds

- [ ] **Step 10: Commit**

```bash
git add src-tauri/src/commands src-tauri/src/main.rs
git commit -m "feat: add Tauri IPC commands for CRUD operations"
```

---

## Task 5: MCP Server Setup

**Covers:** [S5]

**Files:**
- Create: `src-tauri/src/mcp/mod.rs`
- Create: `src-tauri/src/mcp/server.rs`

- [ ] **Step 1: Create mcp/mod.rs**

```rust
pub mod server;
pub mod tools;
pub mod resources;
pub mod prompts;
```

- [ ] **Step 2: Create mcp/server.rs**

```rust
use rmcp::{
    handler::ServerHandler,
    model::{ServerCapabilities, ServerInfo},
    service::RunningService,
    transport::{child_process::ChildProcessServerTransport, sse_server::SseServerTransport},
    Error, RoleServer,
};
use std::sync::Arc;
use tokio::sync::Mutex;

use crate::db::DbState;

pub struct ToworkMcpServer {
    db: Arc<Mutex<DbState>>,
}

impl ToworkMcpServer {
    pub fn new(db: Arc<Mutex<DbState>>) -> Self {
        Self { db }
    }

    pub async fn run_stdio(self) -> Result<RunningService<RoleServer>, Error> {
        let transport = ChildProcessServerTransport::new()?;
        let service = self.serve(transport).await?;
        Ok(service)
    }

    pub async fn run_http(self, addr: &str) -> Result<RunningService<RoleServer>, Error> {
        let transport = SseServerTransport::new(addr).await?;
        let service = self.serve(transport).await?;
        Ok(service)
    }
}

impl ServerHandler for ToworkMcpServer {
    fn get_info(&self) -> ServerInfo {
        ServerInfo {
            name: "towork".to_string(),
            version: Some("0.1.0".to_string()),
        }
    }

    fn get_capabilities(&self) -> ServerCapabilities {
        ServerCapabilities::default()
    }
}
```

- [ ] **Step 3: Verify MCP setup compiles**

Run: `cargo build` in src-tauri
Expected: Build succeeds (may have warnings about unused code)

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/mcp/mod.rs src-tauri/src/mcp/server.rs
git commit -m "feat: add MCP server skeleton with stdio and HTTP transport"
```

---

## Task 6: MCP Tools Implementation

**Covers:** [S5]

**Files:**
- Create: `src-tauri/src/mcp/tools.rs`

- [ ] **Step 1: Create mcp/tools.rs**

```rust
use rmcp::model::{CallToolResult, Content, Tool};
use serde_json::{json, Value};

use crate::db::schema;
use crate::models::{issue::Issue, project::Project, todo::Todo, Actor};

pub fn list_tools() -> Vec<Tool> {
    vec![
        Tool {
            name: "list_projects".to_string(),
            description: Some("Get all projects or filter by status".to_string()),
            input_schema: json!({
                "type": "object",
                "properties": {}
            }),
        },
        Tool {
            name: "list_items".to_string(),
            description: Some("Get todos and issues, optionally filtered".to_string()),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "project_id": { "type": "string" },
                    "status": { "type": "string", "enum": ["Open", "Done"] },
                    "priority": { "type": "string", "enum": ["Low", "Medium", "High"] },
                    "assignee": { "type": "string", "enum": ["User", "AI"] },
                    "item_type": { "type": "string", "enum": ["Todo", "Issue"] }
                }
            }),
        },
        Tool {
            name: "create_item".to_string(),
            description: Some("Create a new todo or issue".to_string()),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "project_id": { "type": "string" },
                    "item_type": { "type": "string", "enum": ["Todo", "Issue"] },
                    "title": { "type": "string" },
                    "description": { "type": "string" },
                    "priority": { "type": "string", "enum": ["Low", "Medium", "High"] },
                    "assignee": { "type": "string", "enum": ["User", "AI"] }
                },
                "required": ["project_id", "item_type", "title"]
            }),
        },
        Tool {
            name: "update_item".to_string(),
            description: Some("Update an existing todo or issue".to_string()),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "item_id": { "type": "string" },
                    "item_type": { "type": "string", "enum": ["Todo", "Issue"] },
                    "title": { "type": "string" },
                    "description": { "type": "string" },
                    "status": { "type": "string", "enum": ["Open", "Done"] },
                    "priority": { "type": "string", "enum": ["Low", "Medium", "High"] },
                    "assignee": { "type": "string", "enum": ["User", "AI"] }
                },
                "required": ["item_id", "item_type"]
            }),
        },
        Tool {
            name: "complete_item".to_string(),
            description: Some("Mark a todo or issue as done".to_string()),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "item_id": { "type": "string" },
                    "item_type": { "type": "string", "enum": ["Todo", "Issue"] }
                },
                "required": ["item_id", "item_type"]
            }),
        },
        Tool {
            name: "search_items".to_string(),
            description: Some("Search across all items".to_string()),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "query": { "type": "string" },
                    "project_id": { "type": "string" }
                },
                "required": ["query"]
            }),
        },
        Tool {
            name: "get_activity".to_string(),
            description: Some("Get activity log for items".to_string()),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "item_id": { "type": "string" },
                    "item_type": { "type": "string", "enum": ["Todo", "Issue"] }
                }
            }),
        },
    ]
}

pub async fn handle_tool_call(
    tool_name: &str,
    arguments: Value,
    db: &crate::db::DbState,
) -> Result<CallToolResult, Error> {
    let conn = db.conn.lock().map_err(|e| Error::internal_error(e.to_string(), None))?;

    match tool_name {
        "list_projects" => {
            let projects = schema::query_projects(&conn)
                .map_err(|e| Error::internal_error(e.to_string(), None))?;
            let value = serde_json::to_value(&projects)
                .map_err(|e| Error::internal_error(e.to_string(), None))?;
            Ok(CallToolResult {
                content: vec![Content::json(value.to_string())],
                is_error: Some(false),
            })
        }
        "list_items" => {
            let project_id = arguments.get("project_id").and_then(|v| v.as_str());
            let status = arguments.get("status").and_then(|v| v.as_str());
            let priority = arguments.get("priority").and_then(|v| v.as_str());
            let assignee = arguments.get("assignee").and_then(|v| v.as_str());
            let item_type = arguments.get("item_type").and_then(|v| v.as_str());

            let mut result = json!({});

            if item_type != Some("Issue") {
                let todos = schema::query_todos(&conn, project_id, status, priority, assignee)
                    .map_err(|e| Error::internal_error(e.to_string(), None))?;
                result["todos"] = serde_json::to_value(&todos)
                    .map_err(|e| Error::internal_error(e.to_string(), None))?;
            }

            if item_type != Some("Todo") {
                let issues = schema::query_issues(&conn, project_id, status, priority, assignee)
                    .map_err(|e| Error::internal_error(e.to_string(), None))?;
                result["issues"] = serde_json::to_value(&issues)
                    .map_err(|e| Error::internal_error(e.to_string(), None))?;
            }

            Ok(CallToolResult {
                content: vec![Content::json(result.to_string())],
                is_error: Some(false),
            })
        }
        "create_item" => {
            let project_id = arguments.get("project_id")
                .and_then(|v| v.as_str())
                .ok_or_else(|| Error::invalid_params("project_id required", None))?
                .to_string();
            let item_type = arguments.get("item_type")
                .and_then(|v| v.as_str())
                .ok_or_else(|| Error::invalid_params("item_type required", None))?;
            let title = arguments.get("title")
                .and_then(|v| v.as_str())
                .ok_or_else(|| Error::invalid_params("title required", None))?
                .to_string();
            let description = arguments.get("description").and_then(|v| v.as_str()).map(String::from);
            let priority = arguments.get("priority").and_then(|v| v.as_str()).map(String::from);
            let assignee_str = arguments.get("assignee").and_then(|v| v.as_str());
            let actor = match assignee_str {
                Some("AI") => Actor::AI,
                _ => Actor::User,
            };

            let value = match item_type {
                "Todo" => {
                    let todo = Todo::new(project_id, title, description, priority, Some(actor));
                    schema::insert_todo(&conn, &todo)
                        .map_err(|e| Error::internal_error(e.to_string(), None))?;
                    let activity = crate::models::activity::ActivityLog::new(
                        "Todo".to_string(),
                        todo.id.clone(),
                        "Created".to_string(),
                        actor,
                        None,
                        Some(todo.title.clone()),
                    );
                    schema::insert_activity(&conn, &activity)
                        .map_err(|e| Error::internal_error(e.to_string(), None))?;
                    serde_json::to_value(&todo)
                        .map_err(|e| Error::internal_error(e.to_string(), None))?
                }
                "Issue" => {
                    let issue = Issue::new(project_id, title, description, priority, Some(actor));
                    schema::insert_issue(&conn, &issue)
                        .map_err(|e| Error::internal_error(e.to_string(), None))?;
                    let activity = crate::models::activity::ActivityLog::new(
                        "Issue".to_string(),
                        issue.id.clone(),
                        "Created".to_string(),
                        actor,
                        None,
                        Some(issue.title.clone()),
                    );
                    schema::insert_activity(&conn, &activity)
                        .map_err(|e| Error::internal_error(e.to_string(), None))?;
                    serde_json::to_value(&issue)
                        .map_err(|e| Error::internal_error(e.to_string(), None))?
                }
                _ => return Err(Error::invalid_params("item_type must be Todo or Issue", None)),
            };

            Ok(CallToolResult {
                content: vec![Content::json(value.to_string())],
                is_error: Some(false),
            })
        }
        "update_item" => {
            let item_id = arguments.get("item_id")
                .and_then(|v| v.as_str())
                .ok_or_else(|| Error::invalid_params("item_id required", None))?
                .to_string();
            let item_type = arguments.get("item_type")
                .and_then(|v| v.as_str())
                .ok_or_else(|| Error::invalid_params("item_type required", None))?;
            let title = arguments.get("title").and_then(|v| v.as_str()).map(String::from);
            let description = arguments.get("description").and_then(|v| v.as_str()).map(String::from);
            let status = arguments.get("status").and_then(|v| v.as_str()).map(String::from);
            let priority = arguments.get("priority").and_then(|v| v.as_str()).map(String::from);
            let assignee = arguments.get("assignee").and_then(|v| v.as_str()).map(String::from);

            match item_type {
                "Todo" => {
                    schema::update_todo(
                        &conn,
                        &item_id,
                        title.as_deref(),
                        description.as_deref(),
                        status.as_deref(),
                        priority.as_deref(),
                        assignee.as_deref(),
                    )
                    .map_err(|e| Error::internal_error(e.to_string(), None))?;
                }
                "Issue" => {
                    schema::update_issue(
                        &conn,
                        &item_id,
                        title.as_deref(),
                        description.as_deref(),
                        status.as_deref(),
                        priority.as_deref(),
                        assignee.as_deref(),
                    )
                    .map_err(|e| Error::internal_error(e.to_string(), None))?;
                }
                _ => return Err(Error::invalid_params("item_type must be Todo or Issue", None)),
            }

            Ok(CallToolResult {
                content: vec![Content::json("updated".to_string())],
                is_error: Some(false),
            })
        }
        "complete_item" => {
            let item_id = arguments.get("item_id")
                .and_then(|v| v.as_str())
                .ok_or_else(|| Error::invalid_params("item_id required", None))?
                .to_string();
            let item_type = arguments.get("item_type")
                .and_then(|v| v.as_str())
                .ok_or_else(|| Error::invalid_params("item_type required", None))?;

            match item_type {
                "Todo" => {
                    schema::update_todo(&conn, &item_id, None, None, Some("Done"), None, None)
                        .map_err(|e| Error::internal_error(e.to_string(), None))?;
                    let activity = crate::models::activity::ActivityLog::new(
                        "Todo".to_string(),
                        item_id,
                        "Completed".to_string(),
                        Actor::AI,
                        Some("Open".to_string()),
                        Some("Done".to_string()),
                    );
                    schema::insert_activity(&conn, &activity)
                        .map_err(|e| Error::internal_error(e.to_string(), None))?;
                }
                "Issue" => {
                    schema::update_issue(&conn, &item_id, None, None, Some("Done"), None, None)
                        .map_err(|e| Error::internal_error(e.to_string(), None))?;
                    let activity = crate::models::activity::ActivityLog::new(
                        "Issue".to_string(),
                        item_id,
                        "Completed".to_string(),
                        Actor::AI,
                        Some("Open".to_string()),
                        Some("Done".to_string()),
                    );
                    schema::insert_activity(&conn, &activity)
                        .map_err(|e| Error::internal_error(e.to_string(), None))?;
                }
                _ => return Err(Error::invalid_params("item_type must be Todo or Issue", None)),
            }

            Ok(CallToolResult {
                content: vec![Content::json("completed".to_string())],
                is_error: Some(false),
            })
        }
        "search_items" => {
            let query = arguments.get("query")
                .and_then(|v| v.as_str())
                .ok_or_else(|| Error::invalid_params("query required", None))?;
            let project_id = arguments.get("project_id").and_then(|v| v.as_str());

            let (todos, issues) = schema::search_items(&conn, query, project_id)
                .map_err(|e| Error::internal_error(e.to_string(), None))?;
            let value = json!({
                "todos": todos,
                "issues": issues,
            });
            Ok(CallToolResult {
                content: vec![Content::json(value.to_string())],
                is_error: Some(false),
            })
        }
        "get_activity" => {
            let item_id = arguments.get("item_id").and_then(|v| v.as_str());
            let item_type = arguments.get("item_type").and_then(|v| v.as_str());

            let activities = schema::query_activity(&conn, item_id, item_type)
                .map_err(|e| Error::internal_error(e.to_string(), None))?;
            let value = serde_json::to_value(&activities)
                .map_err(|e| Error::internal_error(e.to_string(), None))?;
            Ok(CallToolResult {
                content: vec![Content::json(value.to_string())],
                is_error: Some(false),
            })
        }
        _ => Err(Error::method_not_found(format!("Unknown tool: {}", tool_name), None)),
    }
}
```

- [ ] **Step 2: Verify tools compile**

Run: `cargo build` in src-tauri
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/mcp/tools.rs
git commit -m "feat: implement MCP tools for task management"
```

---

## Task 7: MCP Resources and Prompts

**Covers:** [S5]

**Files:**
- Create: `src-tauri/src/mcp/resources.rs`
- Create: `src-tauri/src/mcp/prompts.rs`

- [ ] **Step 1: Create mcp/resources.rs**

```rust
use rmcp::model::{Resource, ResourceContents};
use serde_json::json;

use crate::db::schema;

pub fn list_resources() -> Vec<Resource> {
    vec![
        Resource {
            uri: "towork://projects".to_string(),
            name: "projects".to_string(),
            description: Some("List of all projects".to_string()),
            mime_type: Some("application/json".to_string()),
        },
    ]
}

pub async fn get_resource(
    uri: &str,
    db: &crate::db::DbState,
) -> Result<Vec<ResourceContents>, rmcp::Error> {
    let conn = db.conn.lock().map_err(|e| rmcp::Error::internal_error(e.to_string(), None))?;

    match uri {
        "towork://projects" => {
            let projects = schema::query_projects(&conn)
                .map_err(|e| rmcp::Error::internal_error(e.to_string(), None))?;
            let value = serde_json::to_value(&projects)
                .map_err(|e| rmcp::Error::internal_error(e.to_string(), None))?;
            Ok(vec![ResourceContents::json(value.to_string(), uri)])
        }
        _ if uri.starts_with("towork://project/") => {
            let id = uri.strip_prefix("towork://project/").unwrap();
            let project = schema::query_project(&conn, id)
                .map_err(|e| rmcp::Error::internal_error(e.to_string(), None))?;
            let todos = schema::query_todos(&conn, Some(id), None, None, None)
                .map_err(|e| rmcp::Error::internal_error(e.to_string(), None))?;
            let issues = schema::query_issues(&conn, Some(id), None, None, None)
                .map_err(|e| rmcp::Error::internal_error(e.to_string(), None))?;
            let value = json!({
                "project": project,
                "todos": todos,
                "issues": issues,
            });
            Ok(vec![ResourceContents::json(value.to_string(), uri)])
        }
        _ if uri.starts_with("towork://item/") => {
            let id = uri.strip_prefix("towork://item/").unwrap();
            let todo = schema::query_todo(&conn, id)
                .map_err(|e| rmcp::Error::internal_error(e.to_string(), None))?;
            let issue = schema::query_issue(&conn, id)
                .map_err(|e| rmcp::Error::internal_error(e.to_string(), None))?;
            let activities = schema::query_activity(&conn, Some(id), None)
                .map_err(|e| rmcp::Error::internal_error(e.to_string(), None))?;
            let value = json!({
                "todo": todo,
                "issue": issue,
                "activities": activities,
            });
            Ok(vec![ResourceContents::json(value.to_string(), uri)])
        }
        _ => Err(rmse::Error::invalid_params("Unknown resource URI", None)),
    }
}
```

- [ ] **Step 2: Create mcp/prompts.rs**

```rust
use rmcp::model::{Prompt, PromptArgument, PromptMessage};

use crate::db::schema;

pub fn list_prompts() -> Vec<Prompt> {
    vec![
        Prompt {
            name: "daily_review".to_string(),
            description: Some("Summarize open items and recent activity".to_string()),
            arguments: None,
        },
        Prompt {
            name: "plan_day".to_string(),
            description: Some("Suggest task ordering based on priority".to_string()),
            arguments: None,
        },
    ]
}

pub async fn get_prompt(
    name: &str,
    db: &crate::db::DbState,
) -> Result<Vec<PromptMessage>, rmcp::Error> {
    let conn = db.conn.lock().map_err(|e| rmcp::Error::internal_error(e.to_string(), None))?;

    match name {
        "daily_review" => {
            let todos = schema::query_todos(&conn, None, Some("Open"), None, None)
                .map_err(|e| rmcp::Error::internal_error(e.to_string(), None))?;
            let issues = schema::query_issues(&conn, None, Some("Open"), None, None)
                .map_err(|e| rmcp::Error::internal_error(e.to_string(), None))?;
            let recent = schema::query_activity(&conn, None, None)
                .map_err(|e| rmcp::Error::internal_error(e.to_string(), None))?
                .into_iter()
                .take(10)
                .collect::<Vec<_>>();

            let content = format!(
                "Daily Review:\n\nOpen Todos ({}):\n{}\n\nOpen Issues ({}):\n{}\n\nRecent Activity:\n{}",
                todos.len(),
                todos.iter().map(|t| format!("- {} [{}] ({})", t.title, t.priority, t.assignee)).collect::<Vec<_>>().join("\n"),
                issues.len(),
                issues.iter().map(|i| format!("- {} [{}] ({})", i.title, i.priority, i.assignee)).collect::<Vec<_>>().join("\n"),
                recent.iter().map(|a| format!("- {} {} by {} at {}", a.action, a.item_type, a.actor, a.created_at)).collect::<Vec<_>>().join("\n"),
            );

            Ok(vec![PromptMessage::text(content)])
        }
        "plan_day" => {
            let todos = schema::query_todos(&conn, None, Some("Open"), None, None)
                .map_err(|e| rmcp::Error::internal_error(e.to_string(), None))?;
            let issues = schema::query_issues(&conn, None, Some("Open"), None, None)
                .map_err(|e| rmcp::Error::internal_error(e.to_string(), None))?;

            let mut items: Vec<(String, String, String)> = Vec::new();
            for t in &todos {
                items.push((t.title.clone(), t.priority.clone(), t.assignee.clone()));
            }
            for i in &issues {
                items.push((i.title.clone(), i.priority.clone(), i.assignee.clone()));
            }

            items.sort_by(|a, b| {
                let priority_order = |p: &str| match p {
                    "High" => 0,
                    "Medium" => 1,
                    "Low" => 2,
                    _ => 3,
                };
                priority_order(&a.1).cmp(&priority_order(&b.1))
            });

            let content = format!(
                "Suggested task order for today:\n\n{}",
                items.iter().enumerate().map(|(i, (title, priority, assignee))| {
                    format!("{}. {} [{}] - {}", i + 1, title, priority, assignee)
                }).collect::<Vec<_>>().join("\n")
            );

            Ok(vec![PromptMessage::text(content)])
        }
        _ => Err(rmse::Error::method_not_found(format!("Unknown prompt: {}", name), None)),
    }
}
```

- [ ] **Step 3: Verify resources and prompts compile**

Run: `cargo build` in src-tauri
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/mcp/resources.rs src-tauri/src/mcp/prompts.rs
git commit -m "feat: implement MCP resources and prompts"
```

---

## Task 8: React App Structure and Routing

**Covers:** [S6]

**Files:**
- Create: `src/lib/tauri.ts`
- Create: `src/lib/types.ts`
- Create: `src/router.tsx`
- Create: `src/pages/HomePage.tsx`
- Create: `src/pages/ProjectPage.tsx`
- Create: `src/pages/SearchPage.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create src/lib/types.ts**

```typescript
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
  status: "Open" | "Done";
  priority: "Low" | "Medium" | "High";
  assignee: "User" | "AI";
  created_at: string;
  updated_at: string;
}

export interface Issue {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: "Open" | "Done";
  priority: "Low" | "Medium" | "High";
  assignee: "User" | "AI";
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  item_type: "Todo" | "Issue";
  item_id: string;
  action: string;
  actor: "User" | "AI";
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

export interface SearchResult {
  todos: Todo[];
  issues: Issue[];
}
```

- [ ] **Step 2: Create src/lib/tauri.ts**

```typescript
import { invoke } from "@tauri-apps/api/core";
import type { Project, Todo, Issue, ActivityLog, SearchResult } from "./types";

export async function listProjects(): Promise<Project[]> {
  return invoke("list_projects");
}

export async function getProject(id: string): Promise<Project | null> {
  return invoke("get_project", { id });
}

export async function createProject(
  name: string,
  description?: string
): Promise<Project> {
  return invoke("create_project", { name, description });
}

export async function updateProject(
  id: string,
  name?: string,
  description?: string
): Promise<void> {
  return invoke("update_project", { id, name, description });
}

export async function deleteProject(id: string): Promise<void> {
  return invoke("delete_project", { id });
}

export async function listTodos(
  projectId?: string,
  status?: string,
  priority?: string,
  assignee?: string
): Promise<Todo[]> {
  return invoke("list_todos", {
    projectId,
    status,
    priority,
    assignee,
  });
}

export async function getTodo(id: string): Promise<Todo | null> {
  return invoke("get_todo", { id });
}

export async function createTodo(
  projectId: string,
  title: string,
  description?: string,
  priority?: string,
  assignee?: string
): Promise<Todo> {
  return invoke("create_todo", {
    projectId,
    title,
    description,
    priority,
    assignee,
  });
}

export async function updateTodo(
  id: string,
  title?: string,
  description?: string,
  status?: string,
  priority?: string,
  assignee?: string
): Promise<void> {
  return invoke("update_todo", {
    id,
    title,
    description,
    status,
    priority,
    assignee,
  });
}

export async function completeTodo(id: string): Promise<void> {
  return invoke("complete_todo", { id });
}

export async function deleteTodo(id: string): Promise<void> {
  return invoke("delete_todo", { id });
}

export async function listIssues(
  projectId?: string,
  status?: string,
  priority?: string,
  assignee?: string
): Promise<Issue[]> {
  return invoke("list_issues", {
    projectId,
    status,
    priority,
    assignee,
  });
}

export async function getIssue(id: string): Promise<Issue | null> {
  return invoke("get_issue", { id });
}

export async function createIssue(
  projectId: string,
  title: string,
  description?: string,
  priority?: string,
  assignee?: string
): Promise<Issue> {
  return invoke("create_issue", {
    projectId,
    title,
    description,
    priority,
    assignee,
  });
}

export async function updateIssue(
  id: string,
  title?: string,
  description?: string,
  status?: string,
  priority?: string,
  assignee?: string
): Promise<void> {
  return invoke("update_issue", {
    id,
    title,
    description,
    status,
    priority,
    assignee,
  });
}

export async function completeIssue(id: string): Promise<void> {
  return invoke("complete_issue", { id });
}

export async function deleteIssue(id: string): Promise<void> {
  return invoke("delete_issue", { id });
}

export async function getActivity(
  itemId?: string,
  itemType?: string
): Promise<ActivityLog[]> {
  return invoke("get_activity", { itemId, itemType });
}

export async function searchItems(
  query: string,
  projectId?: string
): Promise<SearchResult> {
  return invoke("search_items", { query, projectId });
}
```

- [ ] **Step 3: Create src/pages/HomePage.tsx**

```tsx
export default function HomePage() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Projects</h1>
    </div>
  );
}
```

- [ ] **Step 4: Create src/pages/ProjectPage.tsx**

```tsx
import { useParams } from "react-router-dom";

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Project {id}</h1>
    </div>
  );
}
```

- [ ] **Step 5: Create src/pages/SearchPage.tsx**

```tsx
export default function SearchPage() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Search</h1>
    </div>
  );
}
```

- [ ] **Step 6: Create src/router.tsx**

```tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import HomePage from "./pages/HomePage";
import ProjectPage from "./pages/ProjectPage";
import SearchPage from "./pages/SearchPage";

export default function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />}>
          <Route index element={<HomePage />} />
          <Route path="project/:id" element={<ProjectPage />} />
          <Route path="search" element={<SearchPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
```

- [ ] **Step 7: Update src/App.tsx**

```tsx
import { Outlet } from "react-router-dom";

export default function App() {
  return (
    <div className="flex h-screen bg-gray-100">
      <aside className="w-64 bg-white border-r">
        <div className="p-4">
          <h1 className="text-xl font-bold">Towork</h1>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
```

- [ ] **Step 8: Update src/main.tsx**

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import Router from "./router";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Router />
  </React.StrictMode>
);
```

- [ ] **Step 9: Verify frontend compiles**

Run: `pnpm build`
Expected: Build succeeds

- [ ] **Step 10: Commit**

```bash
git add src/
git commit -m "feat: add React app structure with routing"
```

---

## Task 9: UI Components

**Covers:** [S6]

**Files:**
- Create: `src/components/ui/Button.tsx`
- Create: `src/components/ui/Input.tsx`
- Create: `src/components/ui/Select.tsx`
- Create: `src/components/ui/Badge.tsx`
- Create: `src/components/ui/Card.tsx`
- Create: `src/components/ui/Modal.tsx`
- Create: `src/components/ui/Tabs.tsx`
- Create: `src/components/ui/Avatar.tsx`
- Create: `src/components/ui/EmptyState.tsx`

- [ ] **Step 1: Create Button.tsx**

```tsx
import { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger";
}

export default function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonProps) {
  const base = "px-4 py-2 rounded font-medium transition-colors";
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "bg-gray-200 text-gray-800 hover:bg-gray-300",
    danger: "bg-red-600 text-white hover:bg-red-700",
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
```

- [ ] **Step 2: Create Input.tsx**

```tsx
import { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export default function Input({ label, className = "", ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-gray-700">{label}</label>
      )}
      <input
        className={`px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
        {...props}
      />
    </div>
  );
}
```

- [ ] **Step 3: Create Select.tsx**

```tsx
import { SelectHTMLAttributes } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export default function Select({
  label,
  options,
  className = "",
  ...props
}: SelectProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-gray-700">{label}</label>
      )}
      <select
        className={`px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
```

- [ ] **Step 4: Create Badge.tsx**

```tsx
interface BadgeProps {
  variant?: "default" | "success" | "warning" | "danger";
  children: React.ReactNode;
}

export default function Badge({ variant = "default", children }: BadgeProps) {
  const variants = {
    default: "bg-gray-100 text-gray-800",
    success: "bg-green-100 text-green-800",
    warning: "bg-yellow-100 text-yellow-800",
    danger: "bg-red-100 text-red-800",
  };

  return (
    <span
      className={`px-2 py-1 text-xs font-medium rounded ${variants[variant]}`}
    >
      {children}
    </span>
  );
}
```

- [ ] **Step 5: Create Card.tsx**

```tsx
interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export default function Card({ children, className = "" }: CardProps) {
  return (
    <div className={`bg-white rounded-lg border p-4 ${className}`}>
      {children}
    </div>
  );
}
```

- [ ] **Step 6: Create Modal.tsx**

```tsx
import { useEffect, useRef } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [isOpen]);

  return (
    <dialog
      ref={dialogRef}
      className="rounded-lg shadow-xl p-0 backdrop:bg-black/50"
      onClose={onClose}
    >
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
```

- [ ] **Step 7: Create Tabs.tsx**

```tsx
import { useState } from "react";

interface Tab {
  id: string;
  label: string;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  children: React.ReactNode;
}

export default function Tabs({ tabs, activeTab, onTabChange, children }: TabsProps) {
  return (
    <div>
      <div className="flex border-b">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-4 py-2 font-medium ${
              activeTab === tab.id
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="py-4">{children}</div>
    </div>
  );
}
```

- [ ] **Step 8: Create Avatar.tsx**

```tsx
interface AvatarProps {
  name: string;
}

export default function Avatar({ name }: AvatarProps) {
  const isAI = name === "AI";
  const initials = isAI ? "AI" : name.charAt(0).toUpperCase();
  const bgColor = isAI ? "bg-purple-600" : "bg-blue-600";

  return (
    <div
      className={`w-8 h-8 rounded-full ${bgColor} text-white flex items-center justify-center text-sm font-medium`}
    >
      {initials}
    </div>
  );
}
```

- [ ] **Step 9: Create EmptyState.tsx**

```tsx
interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export default function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center py-12">
      <h3 className="text-lg font-medium text-gray-900">{title}</h3>
      {description && (
        <p className="mt-2 text-sm text-gray-500">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
```

- [ ] **Step 10: Verify components compile**

Run: `pnpm build`
Expected: Build succeeds

- [ ] **Step 11: Commit**

```bash
git add src/components/ui
git commit -m "feat: add UI components (Button, Input, Select, Badge, Card, Modal, Tabs, Avatar, EmptyState)"
```

---

## Task 10: Project List View

**Covers:** [S6]

**Files:**
- Create: `src/components/projects/ProjectList.tsx`
- Create: `src/components/projects/ProjectCard.tsx`
- Modify: `src/pages/HomePage.tsx`

- [ ] **Step 1: Create ProjectCard.tsx**

```tsx
import { useNavigate } from "react-router-dom";
import Card from "../ui/Card";
import type { Project } from "../../lib/types";

interface ProjectCardProps {
  project: Project;
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const navigate = useNavigate();

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => navigate(`/project/${project.id}`)}
    >
      <h3 className="font-semibold text-lg">{project.name}</h3>
      {project.description && (
        <p className="text-gray-500 text-sm mt-1">{project.description}</p>
      )}
      <p className="text-gray-400 text-xs mt-2">
        Updated {new Date(project.updated_at).toLocaleDateString()}
      </p>
    </Card>
  );
}
```

- [ ] **Step 2: Create ProjectList.tsx**

```tsx
import { useEffect, useState } from "react";
import { listProjects } from "../../lib/tauri";
import type { Project } from "../../lib/types";
import ProjectCard from "./ProjectCard";
import EmptyState from "../ui/EmptyState";
import Button from "../ui/Button";

interface ProjectListProps {
  onCreateProject: () => void;
}

export default function ProjectList({ onCreateProject }: ProjectListProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    try {
      const data = await listProjects();
      setProjects(data);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  if (projects.length === 0) {
    return (
      <EmptyState
        title="No projects yet"
        description="Create your first project to get started"
        action={<Button onClick={onCreateProject}>Create Project</Button>}
      />
    );
  }

  return (
    <div className="grid gap-4">
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Update HomePage.tsx**

```tsx
import { useState } from "react";
import ProjectList from "../components/projects/ProjectList";
import Modal from "../components/ui/Modal";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import { createProject } from "../lib/tauri";

export default function HomePage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  async function handleCreateProject() {
    if (!newProjectName.trim()) return;
    await createProject(newProjectName.trim(), newProjectDesc.trim() || undefined);
    setNewProjectName("");
    setNewProjectDesc("");
    setShowCreateModal(false);
    setRefreshKey((k) => k + 1);
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Projects</h1>
        <Button onClick={() => setShowCreateModal(true)}>New Project</Button>
      </div>

      <ProjectList key={refreshKey} onCreateProject={() => setShowCreateModal(true)} />

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Project"
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Name"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            placeholder="Project name"
          />
          <Input
            label="Description"
            value={newProjectDesc}
            onChange={(e) => setNewProjectDesc(e.target.value)}
            placeholder="Optional description"
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateProject}>Create</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
```

- [ ] **Step 4: Verify project list compiles**

Run: `pnpm build`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add src/components/projects src/pages/HomePage.tsx
git commit -m "feat: add project list view with create modal"
```

---

## Task 11: Project Detail View

**Covers:** [S6]

**Files:**
- Create: `src/components/items/ItemCard.tsx`
- Create: `src/components/items/ItemList.tsx`
- Create: `src/components/items/ItemModal.tsx`
- Create: `src/components/activity/ActivityLog.tsx`
- Modify: `src/pages/ProjectPage.tsx`

- [ ] **Step 1: Create ItemCard.tsx**

```tsx
import Badge from "../ui/Badge";
import Avatar from "../ui/Avatar";
import type { Todo, Issue } from "../../lib/types";

interface ItemCardProps {
  item: Todo | Issue;
  type: "Todo" | "Issue";
  onClick: () => void;
}

export default function ItemCard({ item, type, onClick }: ItemCardProps) {
  const statusVariant = item.status === "Done" ? "success" : "default";
  const priorityVariant =
    item.priority === "High"
      ? "danger"
      : item.priority === "Medium"
      ? "warning"
      : "default";

  return (
    <div
      className="p-3 bg-white border rounded-lg cursor-pointer hover:shadow-sm transition-shadow"
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 uppercase">{type}</span>
            <Badge variant={statusVariant}>{item.status}</Badge>
            <Badge variant={priorityVariant}>{item.priority}</Badge>
          </div>
          <h4 className="font-medium mt-1">{item.title}</h4>
          {item.description && (
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">
              {item.description}
            </p>
          )}
        </div>
        <Avatar name={item.assignee} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create ItemList.tsx**

```tsx
import ItemCard from "./ItemCard";
import EmptyState from "../ui/EmptyState";
import type { Todo, Issue } from "../../lib/types";

interface ItemListProps {
  items: (Todo | Issue)[];
  type: "Todo" | "Issue";
  onItemSelect: (item: Todo | Issue) => void;
}

export default function ItemList({ items, type, onItemSelect }: ItemListProps) {
  if (items.length === 0) {
    return (
      <EmptyState
        title={`No ${type.toLowerCase()}s yet`}
        description={`Create your first ${type.toLowerCase()} to get started`}
      />
    );
  }

  return (
    <div className="grid gap-3">
      {items.map((item) => (
        <ItemCard
          key={item.id}
          item={item}
          type={type}
          onClick={() => onItemSelect(item)}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create ItemModal.tsx**

```tsx
import { useState, useEffect } from "react";
import Modal from "../ui/Modal";
import Input from "../ui/Input";
import Select from "../ui/Select";
import Button from "../ui/Button";
import type { Todo, Issue } from "../../lib/types";

interface ItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: Todo | Issue | null;
  type: "Todo" | "Issue";
  onSave: (data: {
    title: string;
    description: string;
    status: string;
    priority: string;
    assignee: string;
  }) => void;
}

export default function ItemModal({
  isOpen,
  onClose,
  item,
  type,
  onSave,
}: ItemModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("Open");
  const [priority, setPriority] = useState("Medium");
  const [assignee, setAssignee] = useState("User");

  useEffect(() => {
    if (item) {
      setTitle(item.title);
      setDescription(item.description || "");
      setStatus(item.status);
      setPriority(item.priority);
      setAssignee(item.assignee);
    } else {
      setTitle("");
      setDescription("");
      setStatus("Open");
      setPriority("Medium");
      setAssignee("User");
    }
  }, [item, isOpen]);

  function handleSave() {
    onSave({ title, description, status, priority, assignee });
    onClose();
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={item ? `Edit ${type}` : `New ${type}`}
    >
      <div className="flex flex-col gap-4">
        <Input
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
        />
        <Input
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description"
        />
        <Select
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={[
            { value: "Open", label: "Open" },
            { value: "Done", label: "Done" },
          ]}
        />
        <Select
          label="Priority"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          options={[
            { value: "Low", label: "Low" },
            { value: "Medium", label: "Medium" },
            { value: "High", label: "High" },
          ]}
        />
        <Select
          label="Assignee"
          value={assignee}
          onChange={(e) => setAssignee(e.target.value)}
          options={[
            { value: "User", label: "User" },
            { value: "AI", label: "AI" },
          ]}
        />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </div>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 4: Create ActivityLog.tsx**

```tsx
import { useEffect, useState } from "react";
import { getActivity } from "../../lib/tauri";
import type { ActivityLog as ActivityLogType } from "../../lib/types";

interface ActivityLogProps {
  itemId?: string;
  itemType?: string;
}

export default function ActivityLog({ itemId, itemType }: ActivityLogProps) {
  const [activities, setActivities] = useState<ActivityLogType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivities();
  }, [itemId, itemType]);

  async function loadActivities() {
    try {
      const data = await getActivity(itemId, itemType);
      setActivities(data);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div>Loading...</div>;
  }

  if (activities.length === 0) {
    return <div className="text-gray-500 text-sm">No activity yet</div>;
  }

  return (
    <div className="space-y-3">
      {activities.map((activity) => (
        <div key={activity.id} className="flex items-start gap-3 text-sm">
          <div
            className={`w-2 h-2 rounded-full mt-2 ${
              activity.actor === "AI" ? "bg-purple-500" : "bg-blue-500"
            }`}
          />
          <div>
            <p>
              <span className="font-medium">{activity.actor}</span>{" "}
              {activity.action.toLowerCase()} {activity.item_type.toLowerCase()}
              {activity.old_value && activity.new_value && (
                <span>
                  {" "}
                  from <span className="text-gray-500">{activity.old_value}</span>{" "}
                  to <span className="text-gray-500">{activity.new_value}</span>
                </span>
              )}
            </p>
            <p className="text-gray-400 text-xs">
              {new Date(activity.created_at).toLocaleString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Update ProjectPage.tsx**

```tsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  getProject,
  listTodos,
  listIssues,
  createTodo,
  createIssue,
  updateTodo,
  updateIssue,
} from "../lib/tauri";
import type { Project, Todo, Issue } from "../lib/types";
import Tabs from "../components/ui/Tabs";
import Button from "../components/ui/Button";
import ItemList from "../components/items/ItemList";
import ItemModal from "../components/items/ItemModal";
import ActivityLog from "../components/activity/ActivityLog";

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [activeTab, setActiveTab] = useState("todos");
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Todo | Issue | null>(null);
  const [itemType, setItemType] = useState<"Todo" | "Issue">("Todo");

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  async function loadData() {
    if (!id) return;
    const [proj, todoList, issueList] = await Promise.all([
      getProject(id),
      listTodos(id),
      listIssues(id),
    ]);
    setProject(proj);
    setTodos(todoList);
    setIssues(issueList);
  }

  function handleCreateItem(type: "Todo" | "Issue") {
    setItemType(type);
    setEditingItem(null);
    setShowItemModal(true);
  }

  function handleEditItem(item: Todo | Issue, type: "Todo" | "Issue") {
    setItemType(type);
    setEditingItem(item);
    setShowItemModal(true);
  }

  async function handleSaveItem(data: {
    title: string;
    description: string;
    status: string;
    priority: string;
    assignee: string;
  }) {
    if (!id) return;

    if (editingItem) {
      if (itemType === "Todo") {
        await updateTodo(
          editingItem.id,
          data.title,
          data.description,
          data.status,
          data.priority,
          data.assignee
        );
      } else {
        await updateIssue(
          editingItem.id,
          data.title,
          data.description,
          data.status,
          data.priority,
          data.assignee
        );
      }
    } else {
      if (itemType === "Todo") {
        await createTodo(
          id,
          data.title,
          data.description || undefined,
          data.priority,
          data.assignee
        );
      } else {
        await createIssue(
          id,
          data.title,
          data.description || undefined,
          data.priority,
          data.assignee
        );
      }
    }

    loadData();
  }

  if (!project) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold">{project.name}</h1>
          {project.description && (
            <p className="text-gray-500">{project.description}</p>
          )}
        </div>
      </div>

      <Tabs
        tabs={[
          { id: "todos", label: "Todos" },
          { id: "issues", label: "Issues" },
          { id: "activity", label: "Activity" },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      >
        {activeTab === "todos" && (
          <div>
            <div className="flex justify-end mb-4">
              <Button onClick={() => handleCreateItem("Todo")}>New Todo</Button>
            </div>
            <ItemList
              items={todos}
              type="Todo"
              onItemSelect={(item) => handleEditItem(item, "Todo")}
            />
          </div>
        )}

        {activeTab === "issues" && (
          <div>
            <div className="flex justify-end mb-4">
              <Button onClick={() => handleCreateItem("Issue")}>New Issue</Button>
            </div>
            <ItemList
              items={issues}
              type="Issue"
              onItemSelect={(item) => handleEditItem(item, "Issue")}
            />
          </div>
        )}

        {activeTab === "activity" && <ActivityLog />}
      </Tabs>

      <ItemModal
        isOpen={showItemModal}
        onClose={() => setShowItemModal(false)}
        item={editingItem}
        type={itemType}
        onSave={handleSaveItem}
      />
    </div>
  );
}
```

- [ ] **Step 6: Verify project detail compiles**

Run: `pnpm build`
Expected: Build succeeds

- [ ] **Step 7: Commit**

```bash
git add src/components/items src/components/activity src/pages/ProjectPage.tsx
git commit -m "feat: add project detail view with todo/issue management and activity log"
```

---

## Task 12: Search View

**Covers:** [S6]

**Files:**
- Modify: `src/pages/SearchPage.tsx`
- Modify: `src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Update SearchPage.tsx**

```tsx
import { useState } from "react";
import { searchItems } from "../lib/tauri";
import type { SearchResult } from "../lib/types";
import ItemCard from "../components/items/ItemCard";
import EmptyState from "../components/ui/EmptyState";
import Input from "../components/ui/Input";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSearch() {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const data = await searchItems(query.trim());
      setResults(data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Search</h1>

      <div className="flex gap-2 mb-4">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search todos and issues..."
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
        <button
          onClick={handleSearch}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Search
        </button>
      </div>

      {loading && <div>Searching...</div>}

      {results && (
        <div>
          {results.todos.length === 0 && results.issues.length === 0 ? (
            <EmptyState
              title="No results found"
              description="Try a different search term"
            />
          ) : (
            <div className="space-y-6">
              {results.todos.length > 0 && (
                <div>
                  <h2 className="font-semibold mb-2">
                    Todos ({results.todos.length})
                  </h2>
                  <div className="space-y-2">
                    {results.todos.map((todo) => (
                      <ItemCard
                        key={todo.id}
                        item={todo}
                        type="Todo"
                        onClick={() => {}}
                      />
                    ))}
                  </div>
                </div>
              )}

              {results.issues.length > 0 && (
                <div>
                  <h2 className="font-semibold mb-2">
                    Issues ({results.issues.length})
                  </h2>
                  <div className="space-y-2">
                    {results.issues.map((issue) => (
                      <ItemCard
                        key={issue.id}
                        item={issue}
                        type="Issue"
                        onClick={() => {}}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify search compiles**

Run: `pnpm build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/pages/SearchPage.tsx
git commit -m "feat: add search view with full-text search"
```

---

## Task 13: Simple Mode

**Covers:** [S6]

**Files:**
- Create: `src/components/simple/SimpleMode.tsx`
- Create: `src/pages/SimpleModePage.tsx`
- Create: `src/lib/hooks/useDoubleShift.ts`
- Create: `src/lib/hooks/useSimpleMode.ts`
- Modify: `src/App.tsx`
- Modify: `src/router.tsx`

- [ ] **Step 1: Create useDoubleShift.ts hook**

```typescript
import { useEffect, useRef } from "react";

export function useDoubleShift(callback: () => void, delay = 300) {
  const lastShiftTime = useRef(0);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Shift") {
        const now = Date.now();
        if (now - lastShiftTime.current < delay) {
          callback();
          lastShiftTime.current = 0;
        } else {
          lastShiftTime.current = now;
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [callback, delay]);
}
```

- [ ] **Step 2: Create useSimpleMode.ts hook**

```typescript
import { useState, useEffect } from "react";

const STORAGE_KEY = "towork-simple-mode";

export function useSimpleMode() {
  const [isSimpleMode, setIsSimpleMode] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? stored === "true" : false;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(isSimpleMode));
  }, [isSimpleMode]);

  function toggle() {
    setIsSimpleMode((prev) => !prev);
  }

  return { isSimpleMode, toggle };
}
```

- [ ] **Step 3: Create SimpleMode.tsx component**

```tsx
import { useState, useEffect, useRef } from "react";
import { listProjects, listTodos, createTodo, completeTodo } from "../../lib/tauri";
import type { Project, Todo } from "../../lib/types";
import Avatar from "../ui/Avatar";
import Badge from "../ui/Badge";

interface SimpleModeProps {
  onExit: () => void;
}

export default function SimpleMode({ onExit }: SimpleModeProps) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTodoText, setNewTodoText] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setSelectedIndex(0);
  }, [todos]);

  async function loadData() {
    try {
      const [projectList, todoList] = await Promise.all([
        listProjects(),
        listTodos(undefined, "Open"),
      ]);
      setProjects(projectList);
      const sorted = todoList.sort((a, b) => {
        const priorityOrder = { High: 0, Medium: 1, Low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });
      setTodos(sorted);
    } finally {
      setLoading(false);
    }
  }

  function getProjectName(projectId: string): string {
    return projects.find((p) => p.id === projectId)?.name || "Unknown";
  }

  async function handleAddTodo() {
    const text = newTodoText.trim();
    if (!text) return;

    let title = text;
    let projectId = projects[0]?.id;

    const hashMatch = text.match(/#(\S+)/);
    if (hashMatch) {
      const projectName = hashMatch[1];
      const project = projects.find(
        (p) => p.name.toLowerCase() === projectName.toLowerCase()
      );
      if (project) {
        projectId = project.id;
        title = text.replace(/#\S+/, "").trim();
      }
    }

    if (!projectId) return;

    await createTodo(projectId, title);
    setNewTodoText("");
    loadData();
  }

  async function handleCompleteTodo(id: string) {
    await completeTodo(id);
    loadData();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, todos.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        if (todos[selectedIndex]) {
          handleCompleteTodo(todos[selectedIndex].id);
        }
        break;
      case "Escape":
        onExit();
        break;
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <div className="flex items-center justify-between px-6 py-4 border-b bg-white">
        <h1 className="text-lg font-semibold">Simple Mode</h1>
        <button
          onClick={onExit}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Exit (Esc)
        </button>
      </div>

      <div className="px-6 py-4 border-b bg-white">
        <input
          ref={inputRef}
          type="text"
          value={newTodoText}
          onChange={(e) => setNewTodoText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAddTodo();
            }
          }}
          placeholder="Add a todo... (use #project-name to assign)"
          className="w-full px-4 py-3 text-lg border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex-1 overflow-auto px-6 py-4">
        {todos.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            No open todos. Add one above!
          </div>
        ) : (
          <div className="space-y-2">
            {todos.map((todo, index) => (
              <div
                key={todo.id}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                  index === selectedIndex
                    ? "bg-blue-50 border border-blue-200"
                    : "bg-white border hover:bg-gray-50"
                }`}
                onClick={() => handleCompleteTodo(todo.id)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <input
                  type="checkbox"
                  checked={false}
                  onChange={() => handleCompleteTodo(todo.id)}
                  className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="flex-1">{todo.title}</span>
                <Badge
                  variant={
                    todo.priority === "High"
                      ? "danger"
                      : todo.priority === "Medium"
                      ? "warning"
                      : "default"
                  }
                >
                  {todo.priority}
                </Badge>
                <span className="text-xs text-gray-400">
                  {getProjectName(todo.project_id)}
                </span>
                <Avatar name={todo.assignee} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="px-6 py-3 border-t bg-white text-sm text-gray-500 flex gap-4">
        <span>↑↓ Navigate</span>
        <span>Enter Complete</span>
        <span>Esc Exit</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create SimpleModePage.tsx**

```tsx
import { useNavigate } from "react-router-dom";
import SimpleMode from "../components/simple/SimpleMode";

export default function SimpleModePage() {
  const navigate = useNavigate();

  return <SimpleMode onExit={() => navigate("/")} />;
}
```

- [ ] **Step 5: Update App.tsx to support mode switching**

```tsx
import { Outlet } from "react-router-dom";
import SimpleMode from "./components/simple/SimpleMode";
import { useSimpleMode } from "./lib/hooks/useSimpleMode";
import { useDoubleShift } from "./lib/hooks/useDoubleShift";

export default function App() {
  const { isSimpleMode, toggle } = useSimpleMode();

  useDoubleShift(toggle);

  if (isSimpleMode) {
    return <SimpleMode onExit={toggle} />;
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <aside className="w-64 bg-white border-r">
        <div className="p-4">
          <h1 className="text-xl font-bold">Towork</h1>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
```

- [ ] **Step 6: Update router.tsx to include SimpleModePage**

```tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import HomePage from "./pages/HomePage";
import ProjectPage from "./pages/ProjectPage";
import SearchPage from "./pages/SearchPage";
import SimpleModePage from "./pages/SimpleModePage";

export default function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />}>
          <Route index element={<HomePage />} />
          <Route path="project/:id" element={<ProjectPage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="simple" element={<SimpleModePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
```

- [ ] **Step 7: Verify Simple Mode compiles**

Run: `pnpm build`
Expected: Build succeeds

- [ ] **Step 8: Commit**

```bash
git add src/components/simple src/pages/SimpleModePage.tsx src/lib/hooks src/App.tsx src/router.tsx
git commit -m "feat: add Simple Mode with quick add and double-Shift toggle"
```

---

## Task 14: System Features

**Covers:** [S8]

**Files:**
- Modify: `src-tauri/tauri.conf.json`
- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/src/main.rs`

- [ ] **Step 1: Update Cargo.toml to add plugins**

```toml
[dependencies]
tauri = { version = "2", features = ["tray-icon"] }
tauri-plugin-shell = "2"
tauri-plugin-autostart = "2"
tauri-plugin-notification = "2"
# ... other deps unchanged
```

- [ ] **Step 2: Update tauri.conf.json**

```json
{
  "$schema": "https://raw.githubusercontent.com/nicegram/nicegram-tauri/refs/heads/main/crates/tauri-utils/schema.json",
  "productName": "Towork",
  "version": "0.1.0",
  "identifier": "com.towork.app",
  "build": {
    "beforeDevCommand": "pnpm dev",
    "devUrl": "http://localhost:1420",
    "beforeBuildCommand": "pnpm build",
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [
      {
        "title": "Towork",
        "width": 1200,
        "height": 800,
        "singleInstance": true
      }
    ],
    "security": {
      "csp": null
    }
  },
  "plugins": {
    "shell": {
      "open": true
    },
    "autostart": {
      "enabled": true
    },
    "notification": {
      "enabled": true
    }
  }
}
```

- [ ] **Step 3: Update main.rs to register plugins**

```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::path::PathBuf;
use tauri::Manager;

use towork_lib::db::{self, DbState};
use towork_lib::commands::{
    projects::{list_projects, get_project, create_project, update_project, delete_project},
    todos::{list_todos, get_todo, create_todo, update_todo, complete_todo, delete_todo},
    issues::{list_issues, get_issue, create_issue, update_issue, complete_issue, delete_issue},
    activity::get_activity,
    search::search_items,
};

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_autostart::init(tauri_plugin_autostart::MacosLauncher::LaunchAgent, None))
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            let app_dir = app
                .path()
                .app_data_dir()
                .expect("failed to get app data dir");
            std::fs::create_dir_all(&app_dir).expect("failed to create app dir");
            let db_path = app_dir.join("towork.db");
            let conn = db::init_db(&db_path).expect("failed to init database");
            app.manage(DbState::new(conn));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            list_projects,
            get_project,
            create_project,
            update_project,
            delete_project,
            list_todos,
            get_todo,
            create_todo,
            update_todo,
            complete_todo,
            delete_todo,
            list_issues,
            get_issue,
            create_issue,
            update_issue,
            complete_issue,
            delete_issue,
            get_activity,
            search_items,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 4: Verify system features compile**

Run: `cargo build` in src-tauri
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add src-tauri/
git commit -m "feat: add autostart, notifications, and single instance support"
```

---

## Task 15: Full Integration Test

**Covers:** [S9], [S10]

**Files:** (no new files)

- [ ] **Step 1: Build the full app**

Run: `pnpm tauri build`
Expected: Build succeeds, produces installer

- [ ] **Step 2: Test frontend dev mode**

Run: `pnpm tauri dev`
Expected: App opens, UI renders correctly

- [ ] **Step 3: Verify MCP server starts**

Check that MCP tools are registered and the server can start in stdio mode.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete MVP implementation"
```

---

## Self-Review Summary

1. **Spec coverage:** All spec sections [S1]-[S10] are covered by tasks
2. **Placeholder scan:** No TBD/TODO found
3. **Type consistency:** All types match across frontend (TypeScript) and backend (Rust)
4. **File paths:** All paths are exact and consistent
