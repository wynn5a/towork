import { useEffect, type ReactNode } from "react";
import { Icon, type IconName } from "../lib/icons";

export interface MenuItem {
  key: string;
  label: string;
  icon?: IconName;
  lead?: ReactNode;
  trailing?: ReactNode;
  selected?: boolean;
  danger?: boolean;
  separatorBefore?: boolean;
  onSelect: () => void;
}

export interface MenuPos {
  top: number;
  left: number;
  width?: number;
}

/** Compute a menu position anchored to (and right-aligned under) an element. */
export function anchorMenu(el: HTMLElement, width = 188, align: "left" | "right" = "left"): MenuPos {
  const r = el.getBoundingClientRect();
  const left = align === "right" ? r.right - width : r.left;
  return { top: r.bottom + 6, left: Math.max(12, left), width };
}

export function Menu({
  pos,
  items,
  onClose,
}: {
  pos: MenuPos;
  items: MenuItem[];
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest(".menu")) onClose();
    };
    document.addEventListener("keydown", onKey);
    // defer so the opening click doesn't immediately close it
    const id = setTimeout(() => document.addEventListener("mousedown", onDown), 0);
    return () => {
      document.removeEventListener("keydown", onKey);
      clearTimeout(id);
      document.removeEventListener("mousedown", onDown);
    };
  }, [onClose]);

  return (
    <div
      className="menu open"
      style={{ top: pos.top, left: pos.left, width: pos.width }}
    >
      {items.map((it) => (
        <div key={it.key}>
          {it.separatorBefore && <div className="msep" />}
          <div
            className={`mi${it.danger ? " danger" : ""}`}
            onClick={() => {
              it.onSelect();
              onClose();
            }}
          >
            {it.lead ?? (it.icon && <Icon name={it.icon} size={15} />)}
            <span style={{ flex: 1 }}>{it.label}</span>
            {it.trailing}
            {it.selected && <Icon name="check" size={14} />}
          </div>
        </div>
      ))}
    </div>
  );
}
