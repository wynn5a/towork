import { useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { getActivity } from "../lib/tauri";
import type { ActivityLog } from "../lib/types";
import { actionPhrase, relTime } from "../lib/derive";
import { useStore } from "../lib/store";
import { useUI } from "../lib/ui";
import { Icon } from "../lib/icons";

/** How many of Claude's most recent actions the strip shows at once. */
const MAX_ENTRIES = 3;

/**
 * A compact, live strip at the top of Home that surfaces Claude's most recent
 * actions — making the AI teammate's participation legible on the most-visited
 * surface, rather than a single purple count buried in the sub-line.
 *
 * Shows AI activity only (your own actions are already visible to you), and
 * renders nothing when Claude hasn't acted. It re-fetches reactively on the
 * `towork:changed` event the embedded MCP server fires after Claude mutates the
 * database — the same signal the store uses to live-refresh the list. When a
 * genuinely new action arrives the strip pulses and announces it to assistive
 * tech via an aria-live region.
 */
export function HomeAiStrip() {
  const { items, seqId } = useStore();
  const ui = useUI();
  const [entries, setEntries] = useState<ActivityLog[] | null>(null);
  const [flash, setFlash] = useState(false);
  const [announce, setAnnounce] = useState("");

  // The id of the newest entry we've already shown, so a freshly-arrived action
  // pulses/announces while the initial load (pre-existing history) stays quiet.
  const latestId = useRef<string | null>(null);
  // `seqId` is recreated on every store reload; read it through a ref so the
  // fetch effect can stay mount-only (one listener, no churn).
  const seqIdRef = useRef(seqId);
  seqIdRef.current = seqId;

  useEffect(() => {
    let alive = true;
    let flashTimer: ReturnType<typeof setTimeout> | undefined;

    const load = async (isLive: boolean) => {
      try {
        const all = await getActivity();
        if (!alive) return;
        const ai = all.filter((a) => a.actor === "AI").slice(0, MAX_ENTRIES);
        setEntries(ai);
        const newest = ai[0];
        if (newest && newest.id !== latestId.current) {
          // Celebrate only live arrivals, never the initial history load.
          if (isLive) {
            const label = seqIdRef.current(newest.item_id) || newest.item_type.toLowerCase();
            setAnnounce(`Claude ${actionPhrase(newest.action)} ${label}`);
            setFlash(false);
            // Re-arm on the next frame so the pulse restarts even on rapid hits.
            requestAnimationFrame(() => {
              if (alive) setFlash(true);
            });
            clearTimeout(flashTimer);
            flashTimer = setTimeout(() => alive && setFlash(false), 1600);
          }
          latestId.current = newest.id;
        }
      } catch {
        if (alive) setEntries([]);
      }
    };

    load(false);
    const unlisten = listen("towork:changed", () => load(true));
    return () => {
      alive = false;
      clearTimeout(flashTimer);
      unlisten.then((off) => off()).catch(() => {});
    };
  }, []);

  return (
    <>
      {/* Persistent live region — must pre-exist in the DOM so a screen reader
          announces the first AI action that brings the strip into view, not
          only later ones. Visually hidden; harmless when empty. */}
      <span className="sr-only" role="status" aria-live="polite">
        {announce}
      </span>
      {entries && entries.length > 0 && (
        <section className={`ai-strip${flash ? " flash" : ""}`} aria-label="Recent Claude activity">
          <span className="ai-strip-glyph" aria-hidden="true">
            <Icon name="ai" size={13} />
          </span>
          <ul className="ai-strip-list">
            {entries.map((a) => {
              const id = seqId(a.item_id);
              const item = items.find(
                (i) => i.id === a.item_id && i.kind === a.item_type.toLowerCase(),
              );
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
