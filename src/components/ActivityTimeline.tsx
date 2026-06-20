import { useEffect, useState } from "react";
import { getActivity } from "../lib/tauri";
import type { ActivityLog } from "../lib/types";
import { actionPhrase, relTime } from "../lib/derive";
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
        const TRANSITIONS = ["PriorityChanged", "StatusChanged", "AssigneeChanged"];
        const isTransition =
          TRANSITIONS.includes(a.action) && !!a.old_value && !!a.new_value;
        const target = a.new_value ?? a.old_value ?? "";
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
                {actionPhrase(a.action)} {a.item_type.toLowerCase()}
                {isTransition ? (
                  <span className="tl-target">
                    {" "}
                    from {a.old_value} to {a.new_value}
                  </span>
                ) : (
                  target && <span className="tl-target"> {target}</span>
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
