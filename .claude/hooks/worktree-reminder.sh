#!/usr/bin/env bash
# SessionStart guard.
#
# When a session is rooted in the MAIN checkout, inject a reminder to work in an
# isolated worktree before changing code. The PreToolUse hook
# (require-worktree.sh) is the actual enforcement; this just lets Claude enter a
# worktree proactively instead of hitting a denial mid-task. No output (and thus
# no reminder) when already inside a worktree.
set -uo pipefail

proj=${CLAUDE_PROJECT_DIR:-$PWD}
gitdir=$(git -C "$proj" rev-parse --path-format=absolute --git-dir 2>/dev/null) || exit 0
case "$gitdir" in
  */worktrees/*) exit 0 ;;   # already in a worktree — nothing to remind
esac

cat <<'JSON'
{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"WORKTREE WORKFLOW (this repo): code changes must be made in an isolated git worktree, not the main checkout. Before editing code, create/enter a worktree with the EnterWorktree tool (or `git worktree add .worktrees/<branch> -b <branch>`) and edit there. A PreToolUse hook denies Edit/Write/NotebookEdit in the main checkout. Worktrees live under .worktrees/ (gitignored); node_modules is symlinked in so no reinstall is needed."}}
JSON
exit 0
