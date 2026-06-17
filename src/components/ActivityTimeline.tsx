import { useEffect, useState } from "react";
import { getActivity } from "../lib/tauri";
import type { ActivityLog } from "../lib/types";
import { relTime } from "../lib/derive";
import { Avatar, EmptyState } from "./ui";

/** Human phrasing for an activity action verb. */
function phrase(a: ActivityLog): string {
  switch (a.action) {
    case "Created":
      return "created";
    case "Completed":
      return "completed";
    case "Reopened":
      return "reopened";
    case "StatusChanged":
      return "changed status of";
    case "PriorityChanged":
      return "changed priority of";
    case "AssigneeChanged":
      return "reassigned";
    case "Deleted":
      return "deleted";
    default:
      return "updated";
  }
}

export function ActivityTimeline({ projectId }: { projectId: string }) {
  const [activity, setActivity] = useState<ActivityLog[] | null>(null);

  useEffect(() => {
    let alive = true;
    getActivity({ projectId })
      .then((a) => alive && setActivity(a))
      .catch(() => alive && setActivity([]));
    return () => {
      alive = false;
    };
  }, [projectId]);

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
                {phrase(a)} {a.item_type.toLowerCase()}
                {target && <span className="tl-target"> {target}</span>}
              </div>
              <div className="tl-time">{relTime(a.created_at)}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
