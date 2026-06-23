import { useEffect, useState } from "react";
import { Icon, type IconName } from "../lib/icons";
import { useStore } from "../lib/store";

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  tone = "danger",
  icon = "trash",
  onConfirm,
  onClose,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  tone?: "danger" | "accent";
  icon?: IconName;
  // Widened from `() => void` so async handlers (delete + reload, etc.) are
  // awaited. Existing void handlers stay assignable.
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}) {
  const { toast } = useStore();
  // While a confirm is in flight, the button is disabled and re-entry is
  // ignored — a fast double-click can't fire the destructive action twice.
  const [pending, setPending] = useState(false);

  // Cancel/Escape/backdrop are disabled while pending so the dialog can't be
  // dismissed out from under an in-flight action.
  function cancel() {
    if (pending) return;
    onClose();
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose, pending]);

  async function confirm() {
    if (pending) return;
    setPending(true);
    try {
      await onConfirm();
      // Only dismiss on success. A failed (e.g. the row was already deleted by
      // the AI over MCP) confirm leaves the dialog open with the error toast.
      onClose();
    } catch (err) {
      toast("Action failed", String(err), "red");
      setPending(false);
    }
  }

  const toneColor = tone === "accent" ? "var(--accent)" : "var(--red)";
  const chipBg =
    tone === "accent"
      ? "color-mix(in srgb, var(--accent) 15%, transparent)"
      : "color-mix(in srgb, var(--red) 15%, transparent)";

  return (
    <div className="overlay open" onMouseDown={(e) => e.target === e.currentTarget && cancel()}>
      <div className="dialog" role="dialog" aria-modal="true" style={{ width: 420 }}>
        <div className="dlg-head">
          <span className="dlg-ic" style={{ background: chipBg, color: toneColor }}>
            <Icon name={icon} size={16} />
          </span>
          <div className="dh-text">
            <div className="dlg-title">{title}</div>
            <div className="dlg-sub">{message}</div>
          </div>
        </div>
        <div className="dlg-foot">
          <button className="btn-chip" onClick={cancel} disabled={pending}>
            Cancel
          </button>
          <button
            className={tone === "accent" ? "btn-primary" : "btn-danger"}
            onClick={confirm}
            disabled={pending}
          >
            <Icon name={icon} size={13} />
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
