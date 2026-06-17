# Towork

A Tauri 2 desktop task manager where **AI is a first-class teammate**. You and
Claude work the same projects, todos, and issues — Claude participates through an
embedded **MCP server**, not a chat box. Local-first SQLite storage, a dark,
keyboard-driven UI built from the `ux/` design system.

## Stack

- **Frontend:** React 19 + TypeScript + Vite + Tailwind 4, React Router. Dark
  "Data Buddy" design system (`src/styles/`).
- **Backend:** Rust + Tauri 2, `rusqlite` (bundled SQLite), `serde`.
- **AI integration:** an embedded JSON-RPC MCP server over stdio.

## Prerequisites

- Node 20+ and `pnpm`
- Rust toolchain (`cargo`, stable)

## Develop

```bash
pnpm install
pnpm tauri dev      # launches the desktop app (starts Vite automatically)
```

Other scripts:

```bash
pnpm build          # type-check + production web build
pnpm tauri build    # package the desktop app (needs a full icon set; see below)
```

## Data

The SQLite database lives in the OS app-data dir under `com.towork.app/towork.db`
(e.g. `~/Library/Application Support/com.towork.app/towork.db` on macOS). It is
created and migrated on first launch.

## Keyboard

- `⌘K` / `Ctrl+K` — command palette
- double-tap `Shift` — toggle **Simple Mode** (distraction-free flat todo list)
- In Simple Mode: `↑`/`↓` navigate, `Enter` complete, `Esc` exit
- In editors: `⌘↵` save, `Esc` close

## MCP integration

Towork exposes its data to AI clients over the Model Context Protocol (JSON-RPC
2.0), sharing the GUI's database. Mutations made over MCP are attributed to
**AI** in the activity log, and the running app **live-refreshes** when the AI
changes data (via a `towork:changed` event).

- **Tools:** `list_projects`, `list_items`, `create_item`, `update_item`,
  `complete_item`, `search_items`, `get_activity`
- **Resources:** `towork://projects`, `towork://project/{id}`, `towork://item/{id}`
- **Prompts:** `daily_review`, `plan_day`

### HTTP transport (starts with the app)

When the desktop app runs, it automatically starts an embedded MCP server on a
background thread. Point an HTTP-capable MCP client at it:

```
http://127.0.0.1:4127/      # POST JSON-RPC; GET returns a health check
```

Override the bind address with the `TOWORK_MCP_ADDR` environment variable.

Example client config:

```json
{
  "mcpServers": {
    "towork": { "url": "http://127.0.0.1:4127/" }
  }
}
```

### stdio transport

For clients that spawn their server as a subprocess (e.g. Claude Desktop), the
same binary also speaks MCP over stdio:

```json
{
  "mcpServers": {
    "towork": { "command": "/path/to/towork", "args": ["--mcp"] }
  }
}
```

During development: `cd src-tauri && cargo run -- --mcp`.

## Packaging icons

`pnpm tauri build` (full installers) needs a complete icon set including
`.icns`/`.ico`. Generate one from a source image with `pnpm tauri icon path/to/source.png`.
The committed PNGs under `src-tauri/icons/` (from `gen_icons.py`) are sufficient
for `tauri dev` and `cargo build`.
