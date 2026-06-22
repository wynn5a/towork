import { useEffect, useState } from "react";
import { getActivity } from "../lib/tauri";
import type { ActivityLog } from "../lib/types";
import { actionPhrase, changedField, relTime } from "../lib/derive";
import { useStore } from "../lib/store";
import { Avatar, EmptyState } from "./ui";

export function ActivityTimeline({
  projectId,
  itemId,
  itemType,
}: {
  projectId?: string;
  itemId?: string;
  itemType?: "Todo" | "Issue";
}) {
  const { items, seqId } = useStore();
  const [activity, setActivity] = useState<ActivityLog[] | null>(null);

  useEffect(() => {
    let alive = true;
    getActivity({ projectId, itemId, itemType })
      .then((a) => alive && setActivity(a))
      .catch(() => alive && setActivity([]));
    return () => {
      alive = false;
    };
  }, [projectId, itemId, itemType]);

  if (activity === null) return <div className="page-sub">Loading…</div>;
  if (activity.length === 0) {
    return (
      <EmptyState
        icon="activity"
        title="No activity"
        description="Mutations from you and Claude will appear here."
      />
    );
  }

  return (
    <div className="timeline">
      {activity.map((a) => {
        const isAI = a.actor === "AI";
        const kind = a.item_type === "Issue" ? "issue" : "todo";
        // Resolve the item's current title from the store so the entry names the
        // item, not just its id. Deleted items won't be found — fall back to the
        // derived seq id (e.g. TOW-3), then to the bare item type.
        const item = items.find((i) => i.id === a.item_id && i.kind === kind);
        const noun = a.item_type.toLowerCase();
        // Prefer the item's live title; fall back to its derived seq id (e.g.
        // TOW-3). For a Created/Deleted row the title is also stored in the
        // value column, so a deleted item (gone from the store) still names
        // itself via `storedTitle` below.
        const title = item?.title ?? (seqId(a.item_id) || null);
        const field = changedField(a.action);
        // A field change carrying both endpoints reads as a full transition:
        // "updated todo "Buy milk", changed priority from Low to High".
        const isTransition = field !== null && !!a.old_value && !!a.new_value;
        // Created/Deleted persist the title in new_value; surface it only when
        // the live title is unavailable (e.g. the item was deleted) so we don't
        // print the name twice. Status transitions (Completed/Reopened) carry
        // Open/Done in the value columns, which we intentionally drop now that
        // the entry names the item itself.
        const storedTitle =
          (a.action === "Created" || a.action === "Deleted") ? a.new_value : null;
        const label = title ?? storedTitle;

        return (
          <div className="tl-entry" key={a.id}>
            <span className="tl-avatar">
              <Avatar assignee={a.actor} size="sm" />
            </span>
            <div className="tl-content">
              <div className="tl-text">
                <span className={isAI ? "actor-ai" : "actor-user"}>
                  {isAI ? "Claude" : "You"}
                </span>{" "}
                {isTransition ? (
                  <>
                    updated {noun}
                    {label && (
                      <>
                        {" "}
                        <span className="tl-target">“{label}”</span>
                      </>
                    )}
                    , changed {field} from{" "}
                    <span className="tl-target">{a.old_value}</span> to{" "}
                    <span className="tl-target">{a.new_value}</span>
                  </>
                ) : (
                  <>
                    {actionPhrase(a.action)} {noun}
                    {label && (
                      <>
                        {" "}
                        <span className="tl-target">“{label}”</span>
                      </>
                    )}
                  </>
                )}
              </div>
              <div className="tl-time">{relTime(a.created_at)}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
