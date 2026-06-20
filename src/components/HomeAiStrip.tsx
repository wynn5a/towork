import { useEffect, useRef, useState } from "react";
import { actionPhrase, relTime } from "../lib/derive";
import { useStore } from "../lib/store";
import { useUI } from "../lib/ui";
import { Avatar } from "./ui";

/**
 * A compact, live strip at the top of Home that surfaces Claude's most recent
 * actions — making the AI teammate's participation legible on the most-visited
 * surface, rather than a single purple count buried in the sub-line.
 *
 * It reads `recentAiActivity` from the store (which refreshes it on the same
 * `towork:changed` event that already reloads the list), so the strip's entries,
 * the item lookup, and `seqId` all update together — no second fetch, no race.
 * When a genuinely new action arrives it pulses and announces it to assistive
 * tech via a persistent aria-live region; renders nothing when Claude is idle.
 */
export function HomeAiStrip() {
  const { recentAiActivity, items, seqId } = useStore();
  const ui = useUI();
  const [flash, setFlash] = useState(false);
  const [announce, setAnnounce] = useState("");
  // The newest id we've already reacted to. `undefined` = not yet initialised,
  // so the first population (pre-existing history) stays quiet.
  const latestId = useRef<string | null | undefined>(undefined);

  // Pulse + announce only on a genuinely new AI action.
  useEffect(() => {
    const newest = recentAiActivity[0];
    const newestId = newest?.id ?? null;
    if (latestId.current === undefined) {
      latestId.current = newestId; // initial baseline — stay quiet
      return;
    }
    if (!newest || newestId === latestId.current) {
      latestId.current = newestId;
      return;
    }
    latestId.current = newestId;
    // seqId resolves correctly here: the store updates `recentAiActivity` and the
    // seq map in the same reload, so by this render the new item is mapped.
    const label = seqId(newest.item_id) || newest.item_type;
    const text = `Claude ${actionPhrase(newest.action)} ${label}`;
    // Clear first so two identical consecutive strings still re-fire the live
    // region (React skips a no-op same-value state update otherwise).
    setAnnounce("");
    setFlash(false);
    const raf = requestAnimationFrame(() => {
      setAnnounce(text);
      setFlash(true);
    });
    return () => cancelAnimationFrame(raf);
  }, [recentAiActivity, seqId]);

  // Auto-clear the flash ring after one pulse.
  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(false), 1600);
    return () => clearTimeout(t);
  }, [flash]);

  // Keep relative times fresh while idle (re-render roughly once a minute).
  const [, setTick] = useState(0);
  useEffect(() => {
    if (recentAiActivity.length === 0) return;
    const id = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, [recentAiActivity.length]);

  return (
    <>
      {/* Persistent live region — must pre-exist in the DOM so a screen reader
          announces the first AI action that brings the strip into view, not
          only later ones. Visually hidden; harmless when empty. */}
      <span className="sr-only" role="status" aria-live="polite">
        {announce}
      </span>
      {recentAiActivity.length > 0 && (
        <section className={`ai-strip${flash ? " flash" : ""}`} aria-label="Recent Claude activity">
          <Avatar assignee="AI" size="sm" decorative />
          <ul className="ai-strip-list">
            {recentAiActivity.map((a) => {
              const id = seqId(a.item_id);
              const kind = a.item_type === "Issue" ? "issue" : "todo";
              const item = items.find((i) => i.id === a.item_id && i.kind === kind);
              const label = id || a.item_type;
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    className="ai-strip-entry"
                    disabled={!item}
                    title={item ? `Open ${label}` : undefined}
                    onClick={
                      item
                        ? () =>
                            ui.openItemModal({
                              kind: item.kind,
                              projectId: item.project_id,
                              itemId: item.id,
                            })
                        : undefined
                    }
                  >
                    <span className="ase-text">
                      <span className="ase-actor">Claude</span> {actionPhrase(a.action)}{" "}
                      <span className="ase-id">{label}</span>
                    </span>
                    <span className="ase-time">{relTime(a.created_at)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </>
  );
}
