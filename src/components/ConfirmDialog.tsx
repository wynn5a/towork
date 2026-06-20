import { useEffect } from "react";
import { Icon, type IconName } from "../lib/icons";

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
  onConfirm: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const toneColor = tone === "accent" ? "var(--accent)" : "var(--red)";
  const chipBg =
    tone === "accent"
      ? "color-mix(in srgb, var(--accent) 15%, transparent)"
      : "color-mix(in srgb, var(--red) 15%, transparent)";

  return (
    <div className="overlay open" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
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
          <button className="btn-chip" onClick={onClose}>
            Cancel
          </button>
          <button
            className={tone === "accent" ? "btn-primary" : "btn-danger"}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            <Icon name={icon} size={13} />
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
