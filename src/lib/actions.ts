import { useCallback } from "react";
import { useStore } from "./store";
import {
  completeIssue,
  completeTodo,
  updateIssue,
  updateTodo,
} from "./tauri";
import type { Item } from "./types";

/** Mutating actions that update the backend then refresh the store. */
export function useItemActions() {
  const { reload, toast, seqId } = useStore();

  // Run a backend mutation with shared error handling. Rejections are common
  // here because the AI teammate can mutate the same row concurrently
  // (stale/missing item), on top of DB-busy/locked, FK/CHECK and disk errors —
  // so on failure this surfaces a RED error toast rather than letting the
  // rejection vanish into an unhandled promise (devtools-only, never seen by a
  // desktop user). Returns `true` on success and `false` on failure so callers
  // can keep a dialog or input open for retry on the failure path and only
  // close/clear on success.
  const runMutation = useCallback(
    async (errorLabel: string, fn: () => Promise<void>): Promise<boolean> => {
      try {
        await fn();
        return true;
      } catch (err) {
        toast(errorLabel, String(err), "red");
        return false;
      }
    },
    [toast]
  );

  // Advance an item through the Open → In Progress → Done → Open lifecycle.
  const cycleStatus = useCallback(
    (item: Item) => {
      const label = `${seqId(item.id)} · ${item.title}`;
      return runMutation("Couldn’t update status", async () => {
        if (item.status === "Open") {
          if (item.kind === "todo") await updateTodo(item.id, { status: "In Progress" });
          else await updateIssue(item.id, { status: "In Progress" });
          toast("In progress", label, "accent");
        } else if (item.status === "In Progress") {
          // Use complete* so the activity log records "Completed".
          if (item.kind === "todo") await completeTodo(item.id);
          else await completeIssue(item.id);
          toast("Marked done", label, "green");
        } else {
          if (item.kind === "todo") await updateTodo(item.id, { status: "Open" });
          else await updateIssue(item.id, { status: "Open" });
          toast("Reopened", label, "green");
        }
        await reload();
      });
    },
    [reload, toast, seqId, runMutation]
  );

  return { cycleStatus, runMutation };
}
