---
name: dog-feeding
description: Dogfood Towork — pull Open items from the embedded Towork MCP (project TOWORK), then fix, verify, merge, and close each one autonomously, looping until the queue is empty. Use when the user wants to "feed the dog", dogfood/dogfeed the backlog, work the Towork Open items, drain the TOWORK queue, or run the autonomous Towork loop. Each item gets its own named worktree + subagent; verified changes are merged to main and the item is marked Done.
version: 1.0.0
user-invocable: true
argument-hint: "[max items to work, default: all Open] e.g. /dog-feeding 3"
license: Apache 2.0
---

Towork eats its own dog food: this skill uses Towork's own MCP server to find work, then does that work in this repo. The human files Open items in project **TOWORK**; you drain them one at a time — each in an isolated worktree worked by a dedicated subagent — verifying, merging to main, and closing the item before moving to the next.

This is an **autonomous, standing-authorization loop**. The user has pre-approved: verified changes get committed and merged to `main` (not left in worktrees). Stop and report only when verification fails, the change is risky/ambiguous, or the queue is empty.

## The loop, per item

Repeat until no Open items remain (or the optional count limit is hit):

### 1. Fetch the next Open item

- `mcp__towork__list_projects` → find the project whose name is **TOWORK**; grab its `project_id`.
- `mcp__towork__list_items` with `project_id=<TOWORK>`, `status="Open"`. Prefer items with `assignee="AI"`; otherwise take the highest-priority Open item, breaking ties by oldest.
- If none are Open → **stop**, report the queue is drained.
- `mcp__towork__update_item` to set the chosen item `status="In Progress"` so the GUI reflects it's being worked.

### 2. Make an isolated worktree (named, not auto-generated)

Derive a meaningful branch name from the item title (kebab-case, prefixed with the item kind), then:

```bash
git worktree add .worktrees/<name> -b <name>   # branches from current HEAD (baseRef: head)
```

`node_modules` is symlinked in automatically — **never run `pnpm install` or any auto-installing pnpm command (`pnpm build`, `pnpm tauri dev`) from a worktree**; it clobbers main's pnpm store. Use the binaries directly (see step 4).

### 3. Hand the item to a subagent

Spawn one `general-purpose` subagent (via the Agent tool) pointed at `.worktrees/<name>`. Give it:

- The full item title + description (the spec).
- The verification gate it MUST pass before returning (step 4).
- The repo conventions from `CLAUDE.md` (two write paths, activity log on every mutation, design tokens, mirror Todos↔Issues, register new commands in `lib.rs` + `tauri.ts`).
- Instruction to **commit on the worktree branch** when done and report the commit hash + files touched.

One item = one subagent = one worktree. Don't batch unrelated items into one agent.

### 4. Verification gate (must pass before merge)

Run from inside the worktree, using binaries directly (not pnpm wrappers):

```bash
cd .worktrees/<name>
node_modules/.bin/tsc --noEmit            # TS type-check (only if TS/TSX changed)
node_modules/.bin/vitest run              # JS/TS tests (only if relevant)
cd src-tauri && cargo build && cargo test # Rust gate (only if Rust changed)
```

Apply the matching gate to what actually changed. If anything fails → **do not merge**; report the failure with output and leave the item In Progress.

> **Phantom TS diagnostics:** after creating/removing worktrees, the editor may inject `Cannot find module './…'` (TS 2307) errors. These are a stale TS language server, not real. Confirm with `node_modules/.bin/tsc --noEmit; echo "exit=$?"` from the **main** checkout — exit 0 = ignore. Only treat as real if `grep virtualStoreDir node_modules/.modules.yaml` shows a `.worktrees/…` path.

### 5. Merge to main and clean up

```bash
git -C <main-checkout> merge --ff-only <name>   # fast-forward when possible
git worktree remove .worktrees/<name>
git branch -d <name>
```

If a fast-forward isn't possible, rebase the branch on main and re-run the gate before merging.

### 6. Record on the item, then close it

- `mcp__towork__update_item`: append to the item's `description` a short changelog — merged commit hash(es), files touched, one-line what/why. The user wants the record on the item itself, not only in git/chat.
- `mcp__towork__complete_item` (or `update_item status="Done"`) to mark it Done.

### 7. Loop

Immediately fetch the next Open item (step 1) — don't wait. Stop when the queue is empty or the count limit is reached, then give a one-paragraph summary: items closed, commits merged, anything skipped and why.

## Guardrails

- **Verified work lands; unverified work doesn't.** Never merge on a failing/again skipped gate. Never mark Done what isn't merged.
- **One worktree per item, meaningfully named** (`.worktrees/fix-toast-dismissal`), removed when done. Don't let worktrees accumulate.
- **Respect the two write paths.** A mutating change usually touches both `commands/*` (GUI, actor User) and `mcp/*` (AI, actor AI); new mutating MCP tools must be in `is_mutating()` in `mcp/server.rs` or the UI won't live-refresh.
- **Stop and ask** if an item is ambiguous, security-sensitive, or would delete/overwrite user data — surface it instead of guessing.
