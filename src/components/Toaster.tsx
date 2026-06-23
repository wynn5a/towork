import { useEffect, type AnimationEvent } from "react";
import { useStore, type Toast } from "../lib/store";
import { Icon } from "../lib/icons";

const HUE: Record<string, string> = {
  accent: "var(--accent)",
  green: "var(--green)",
  red: "var(--red)",
};

// Slide-out duration, kept in lockstep with `.toast.out`'s `var(--dur-3)`
// (180ms) in app.css. Used only as a safety net so a leaving toast is always
// removed even if `animationend` never fires (reduced motion, a backgrounded
// tab, or jsdom — which doesn't run animations). `onAnimationEnd` removes it
// exactly on time in a real browser; whichever lands first wins, and
// `removeToast` is idempotent so the loser is a harmless no-op.
const EXIT_FALLBACK_MS = 260;

function ToastItem({ toast: t }: { toast: Toast }) {
  const { dismissToast, removeToast } = useStore();
  const hue = HUE[t.hue];

  // Safety-net removal once the toast is leaving (see EXIT_FALLBACK_MS).
  useEffect(() => {
    if (!t.leaving) return;
    const timer = setTimeout(() => removeToast(t.id), EXIT_FALLBACK_MS);
    return () => clearTimeout(timer);
  }, [t.leaving, t.id, removeToast]);

  // The toast plays `toast-in` on mount and `toast-out` (via `.out`) on exit;
  // both fire onAnimationEnd, so only drop the row when the *exit* animation
  // ends — otherwise the entrance would remove it immediately.
  const onAnimationEnd = (e: AnimationEvent<HTMLDivElement>) => {
    if (e.animationName === "toast-out") removeToast(t.id);
  };

  return (
    <div
      className={"toast" + (t.leaving ? " out" : "")}
      onClick={() => dismissToast(t.id)}
      onAnimationEnd={onAnimationEnd}
    >
      <span
        className="tic"
        style={{ background: `color-mix(in srgb, ${hue} 16%, transparent)`, color: hue }}
      >
        <Icon name={t.hue === "red" ? "trash" : "check"} size={15} stroke={hue} />
      </span>
      <div style={{ flex: 1 }}>
        <b>{t.title}</b>
        {t.body && <p>{t.body}</p>}
      </div>
      <button
        type="button"
        className="toast-close"
        aria-label="Dismiss notification"
        onClick={(e) => {
          e.stopPropagation();
          dismissToast(t.id);
        }}
      >
        <Icon name="x" size={14} />
      </button>
    </div>
  );
}

export function Toaster() {
  const { toasts } = useStore();
  return (
    <div className="toast-wrap">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}
