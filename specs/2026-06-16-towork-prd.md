# Towork — Product Requirements Document

## [S1] Problem

Solo developers need a task management system where AI can actively participate as a teammate — creating, updating, and completing tasks — not just suggest actions. Current tools treat AI as an assistant or integration, not as a first-class team member that can be assigned work and tracked alongside human effort.

## [S2] Solution Overview

A Tauri 2 desktop application with:

- Local SQLite storage for projects, todos, and issues
- Embedded MCP server exposing task data to AI clients (Claude, etc.)
- AI acts as fixed-identity team member that can be assigned work
- React frontend with custom Tailwind components
- No in-app AI chat — AI interacts via MCP protocol externally

## [S3] Data Model

### Project

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| name | String | Project name |
| description | String? | Optional description |
| created_at | DateTime | Creation timestamp |
| updated_at | DateTime | Last modification timestamp |

### Todo

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| project_id | FK → Project | Parent project |
| title | String | Task title |
| description | String? | Optional description |
| status | enum { Open, Done } | Current status |
| priority | enum { Low, Medium, High } | Priority level |
| assignee | enum { User, AI } | Who is responsible |
| created_at | DateTime | Creation timestamp |
| updated_at | DateTime | Last modification timestamp |

### Issue

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| project_id | FK → Project | Parent project |
| title | String | Issue title |
| description | String? | Optional description |
| status | enum { Open, Done } | Current status |
| priority | enum { Low, Medium, High } | Priority level |
| assignee | enum { User, AI } | Who is responsible |
| created_at | DateTime | Creation timestamp |
| updated_at | DateTime | Last modification timestamp |

### ActivityLog

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| item_type | enum { Todo, Issue } | Entity type |
| item_id | UUID | Reference to item |
| action | enum { Created, StatusChanged, PriorityChanged, AssigneeChanged, Updated, Completed } | Action performed |
| actor | enum { User, AI } | Who performed action |
| old_value | String? | Previous value (for changes) |
| new_value | String? | New value (for changes) |
| created_at | DateTime | When action occurred |

Todos and Issues are parallel under Project — same schema, different entity types for semantic distinction.

## [S4] Architecture

```
┌─────────────────────────────────────────────────┐
│                  Tauri Window                    │
│  ┌───────────────────────────────────────────┐  │
│  │           React Frontend                  │  │
│  │  • Project list/detail views              │  │
│  │  • Todo/Issue CRUD screens                │  │
│  │  • Activity log viewer                    │  │
│  │  • Search/filter UI                       │  │
│  └───────────────┬───────────────────────────┘  │
│                  │ Tauri IPC                     │
│  ┌───────────────▼───────────────────────────┐  │
│  │           Rust Backend                    │  │
│  │  ┌─────────┐  ┌──────────┐  ┌──────────┐ │  │
│  │  │ SQLite  │  │ Commands │  │ MCP Srv  │ │  │
│  │  │  Layer  │  │ (IPC)    │  │ (stdio+  │ │  │
│  │  │         │  │          │  │  HTTP)   │ │  │
│  │  └────┬────┘  └────┬─────┘  └────┬─────┘ │  │
│  │       └─────────────┴─────────────┘       │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
         │                              │
    User interacts              AI clients connect
    via GUI                     via MCP (stdio/HTTP)
```

### Key Decisions

- SQLite via `rusqlite` — no ORM, direct SQL for simplicity
- MCP server embedded in Rust process, shares DB connection
- Tauri IPC commands for frontend ↔ backend communication
- Single instance enforced via Tauri plugin

## [S5] MCP Server

### Transport

- **stdio**: AI client launches app as subprocess, communicates via stdin/stdout
- **HTTP/SSE**: MCP server runs as HTTP endpoint, AI clients connect via HTTP

### Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `list_projects` | Get all projects | status?: string |
| `list_items` | Get todos/issues | project_id?, status?, priority?, assignee?, item_type? |
| `create_item` | Create todo or issue | project_id, item_type, title, description?, priority?, assignee? |
| `update_item` | Modify item fields | item_id, item_type, title?, description?, status?, priority?, assignee? |
| `complete_item` | Mark item as done | item_id, item_type |
| `search_items` | Full-text search | query, project_id? |
| `get_activity` | Get activity log | item_id?, item_type?, project_id? |

### Resources

| URI | Description |
|-----|-------------|
| `towork://projects` | Project list |
| `towork://project/{id}` | Project with its items |
| `towork://item/{id}` | Item with activity log |

### Prompts

| Prompt | Description |
|--------|-------------|
| `daily_review` | Summarize open items and recent activity |
| `plan_day` | Suggest task ordering based on priority |

## [S6] Frontend

> **Note:** Detailed design to be provided separately. Below are structural requirements.

### Layout

- Sidebar: project list, search bar
- Main area: project detail with todo/issue tabs
- Top bar: current project name, global search

### Views

1. **Project List** — cards showing project name, item counts, last activity
2. **Project Detail** — tabs for Todos / Issues / Activity Log
3. **Item Card** — title, status badge, priority indicator, assignee avatar (User/AI)
4. **Item Modal** — full edit form for title, description, status, priority, assignee
5. **Search Results** — filtered list across all projects
6. **Simple Mode** — flat list of all open todos across projects, minimal UI

### Simple Mode

A distraction-free view showing only open todos in a flat list. No sidebar, no project grouping, no issues — just the tasks that need doing.

**Behavior:**
- Shows all open todos from all projects, sorted by priority (High → Medium → Low)
- Each item: checkbox, title, project name badge, assignee avatar
- Click checkbox → complete todo (marks as Done, removes from list)
- Click item → edit modal
- Keyboard-driven: arrow keys to navigate, Enter to edit, Space to toggle completion

**Quick Add:**
- Text input at top of list: "Add a todo..."
- Type title, press Enter → creates todo in default project (or last used project)
- New item appears at top of list immediately
- Optional: type `#project-name` in title to assign to specific project

**Toggle:**
- Double-tap Shift key to toggle between Simple Mode and Complete Mode
- Visual indicator in corner shows current mode
- Preference persisted across sessions

### Components (custom, Tailwind-only)

`Button`, `Input`, `Select`, `Badge`, `Card`, `Modal`, `Tabs`, `Avatar`, `EmptyState`

### Routing

| Route | View |
|-------|------|
| `/` | Project list |
| `/project/:id` | Project detail |
| `/search` | Search results |

## [S7] Tech Stack

### Frontend

| Package | Version |
|---------|---------|
| React | 19.x |
| TypeScript | 6.x |
| Vite | 8.x |
| Tailwind CSS | 4.x |
| React Router | 7.x |
| Tauri API | 2.x |

### Backend (Rust)

| Crate | Purpose |
|-------|---------|
| tauri | 2.x — App framework |
| rusqlite | SQLite driver |
| rmcp | MCP SDK |
| tokio | Async runtime |
| serde / serde_json | Serialization |
| uuid | ID generation |
| chrono | DateTime handling |

### Build Tools

| Tool | Purpose |
|------|---------|
| pnpm | Package manager |
| Cargo | Rust build |
| @tauri-apps/cli | 2.x — Tauri CLI |

### Platform Targets

- macOS
- Windows
- Linux

## [S8] System Features

| Feature | Status |
|---------|--------|
| Auto-start on boot | MVP |
| System notifications | MVP |
| Single instance enforcement | MVP |
| System tray | Future |
| Multi-window | Future |

## [S9] Scope

### MVP (In Scope)

- Project CRUD
- Todo/Issue CRUD with status, priority, assignee
- Activity log tracking
- Search/filter
- Simple Mode (flat todo list, double-Shift toggle)
- MCP server (stdio + HTTP)
- SQLite storage
- Auto-start, notifications, single instance

### Future (Out of Scope)

- User accounts / multi-user
- Due dates / reminders
- Tags / labels
- File attachments
- Real-time sync
- Mobile app
- System tray integration
- Multi-window

## [S10] Success Criteria

1. User can create projects and manage todos/issues via the GUI
2. AI client can connect via MCP and perform all tool operations
3. Activity log accurately tracks all mutations with actor attribution
4. App starts on boot and enforces single instance
5. Search returns relevant results across all projects
6. User can toggle Simple Mode via double-Shift hotkey
