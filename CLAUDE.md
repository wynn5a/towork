# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Towork is a Tauri 2 desktop task manager where **AI is a first-class teammate**: the human (via the GUI) and an AI client (via an embedded MCP server) work the same projects, todos, and issues against one local SQLite database. Frontend is React 19 + TypeScript + Vite + Tailwind 4; backend is Rust + Tauri 2 with `rusqlite` (bundled SQLite).

## Commands

```bash
pnpm install
pnpm tauri dev          # run the desktop app (auto-starts Vite); primary dev loop
pnpm build              # tsc --noEmit + vite build — the type-check gate (no separate lint/test)
cd src-tauri && cargo run -- --mcp   # run the MCP server alone over stdio (dev)
cd src-tauri && cargo build          # compile the Rust backend
pnpm tauri build        # package installers (needs full icon set incl. .icns/.ico)
```

There is **no test suite and no lint step**. Verification = `pnpm build` (TS) + `cargo build` (Rust). Don't invent a `pnpm test`.

## Architecture

**Two write paths into one database.** The same SQLite file (`<app-data>/com.towork.app/towork.db`) is mutated by both the GUI and the MCP server:

- **GUI path:** React → `src/lib/tauri.ts` (`invoke(...)`) → `#[tauri::command]` fns in `src-tauri/src/commands/*` → `src-tauri/src/db/schema.rs`. GUI mutations are logged to the activity table as actor **User**.
- **MCP path:** AI client → `src-tauri/src/mcp/` → same `schema.rs`. MCP mutations are logged as actor **AI**.

**Live refresh.** When the app runs, `lib.rs` spawns the MCP **HTTP** server on a background thread (default `127.0.0.1:4127`, override via `TOWORK_MCP_ADDR`). After any mutating MCP call, the server fires a `notify` callback that emits the Tauri event `towork:changed`; the frontend `StoreProvider` (`src/lib/store.tsx`) listens for it and calls `reload()`. This is how the UI updates when the AI acts. If you add a new mutating MCP tool, make sure it's covered by `is_mutating()` in `src-tauri/src/mcp/server.rs` or the UI won't refresh.

**MCP server is hand-rolled.** No MCP SDK — `src-tauri/src/mcp/` implements JSON-RPC 2.0 directly. `server.rs` (shared dispatch) is fronted by two transports: `http.rs` (auto-started with the GUI) and stdio via `main.rs` detecting `--mcp`. Both open their *own* connection to the shared db file using `db::default_db_path()`, which mirrors Tauri's app-data path so the standalone process hits the same file. Tools/resources/prompts live in `tools.rs`, `resources.rs`, `prompts.rs`.

**Todos and Issues are near-identical twins.** They share the same schema and shape — in TS, `Issue = Todo` (`src/lib/types.ts`); in Rust, `commands/todos.rs` and `commands/issues.rs` mirror each other. Changes to one almost always need to be mirrored in the other. The frontend unifies them into `Item = Todo & { kind }` (see `tag()` / the `items` memo in `store.tsx`) for shared rendering.

**Two React contexts.** `StoreProvider` (`src/lib/store.tsx`) owns all data (projects/todos/issues, the merged `items`, toasts, `reload`). `UIProvider` (`src/lib/ui.tsx`) owns transient UI (modals, command palette). Mutations go through `src/lib/actions.ts` / `tauri.ts`, then call `reload()`. Routing is in `src/router.tsx`; `/simple` (Simple Mode) renders outside the main `App` shell.

**Derived, not stored.** Human-facing item IDs like `TOW-3` are computed on the frontend in `src/lib/derive.ts` (`buildSeqMap`) by sorting each project's items by `created_at` — the backend stores no sequence number. Project hues/prefixes are likewise derived from the id/name.

## Conventions

- **Design tokens, never hardcoded values.** This is the "Data Buddy" dark design system. Colors/spacing/radii/motion come from CSS custom properties in `src/styles/tokens.css` (`var(--accent)`, `var(--bg-panel)`, `var(--text-1)`, etc.). The accent must stay derivable — tint with `color-mix`/`rgba` off `var(--accent)`. Reference and rationale live in `ux/design-system/` (`DESIGN-SYSTEM.md`, `AGENT-GUIDE.md`); `ux/prototype/` is the original HTML/JS prototype the React app was ported from.
- **Activity log on every mutation.** Create/update/complete operations write an `ActivityLog` row with the correct actor (User from GUI, AI from MCP). Follow the existing `log_item_changes` pattern (`commands/todos.rs`) which diffs old vs. new and logs per-field changes.
- New Tauri commands must be registered in the `invoke_handler!` list in `src-tauri/src/lib.rs` *and* given a typed wrapper in `src/lib/tauri.ts`.
