#!/usr/bin/env bash
# PreToolUse(Write|Edit|NotebookEdit) guard.
#
# Blocks code changes in the MAIN git checkout of this repo. Edits are allowed
# only when the target file lives inside a linked git worktree
# (.../.git/worktrees/<name>) or outside this repo entirely (scratchpad,
# ~/.claude, an unrelated repo). The goal: every session that changes code does
# so in an isolated worktree copy, never the main checkout.
#
# Fail-open by design: any unexpected error allows the edit rather than wedging
# the session. The user can always disable this hook from /hooks.
set -uo pipefail

input=$(cat)
file=$(printf '%s' "$input" | jq -r '.tool_input.file_path // .tool_input.notebook_path // empty')
[ -z "$file" ] && exit 0

# The file may not exist yet (new file) — walk up to the nearest existing dir.
d=$file
while [ ! -d "$d" ]; do
  parent=$(dirname "$d")
  [ "$parent" = "$d" ] && break
  d=$parent
done
[ -d "$d" ] || exit 0

# Outside any git repo → allow (scratchpad, ~/.claude, etc.).
gitdir=$(git -C "$d" rev-parse --path-format=absolute --git-dir 2>/dev/null) || exit 0

# Inside a linked worktree → allow. This IS the intended workflow.
case "$gitdir" in
  */worktrees/*) exit 0 ;;
esac

# We're in a main checkout. Only enforce for THIS repo (compare the shared/common
# git dir), so editing an unrelated repo elsewhere is never blocked.
file_common=$(git -C "$d" rev-parse --path-format=absolute --git-common-dir 2>/dev/null) || exit 0
proj=${CLAUDE_PROJECT_DIR:-$PWD}
proj_common=$(git -C "$proj" rev-parse --path-format=absolute --git-common-dir 2>/dev/null) || proj_common=""
if [ -n "$proj_common" ] && [ "$file_common" != "$proj_common" ]; then
  exit 0
fi

# Block, and tell Claude how to proceed.
cat <<'JSON'
{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"This repo requires code changes in an isolated git worktree, not the main checkout. Create/enter one first: use the EnterWorktree tool, or run `git worktree add .worktrees/<branch> -b <branch>` and edit the copy under .worktrees/<branch>/. (One-off override: the user can disable this hook from /hooks.)"}}
JSON
exit 0
