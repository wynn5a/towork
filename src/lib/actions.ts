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

  const toggleDone = useCallback(
    async (item: Item) => {
      const label = `${seqId(item.id)} · ${item.title}`;
      if (item.status === "Done") {
        if (item.kind === "todo") await updateTodo(item.id, { status: "Open" });
        else await updateIssue(item.id, { status: "Open" });
        toast("Reopened", label, "green");
      } else {
        if (item.kind === "todo") await completeTodo(item.id);
        else await completeIssue(item.id);
        toast("Marked done", label, "green");
      }
      await reload();
    },
    [reload, toast, seqId]
  );

  return { toggleDone };
}
