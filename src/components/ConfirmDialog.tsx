import { useEffect } from "react";
import { Icon } from "../lib/icons";

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  title: string;
  message: string;
  confirmLabel: string;
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

  return (
    <div className="overlay open" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog" role="dialog" aria-modal="true" style={{ width: 420 }}>
        <div className="dlg-head">
          <span
            className="dlg-ic"
            style={{ background: "color-mix(in srgb, var(--red) 15%, transparent)", color: "var(--red)" }}
          >
            <Icon name="trash" size={16} />
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
            className="btn-danger"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            <Icon name="trash" size={13} />
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
