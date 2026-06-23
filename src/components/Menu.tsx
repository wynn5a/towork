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

/**
 * Compute a menu position anchored to (and optionally right-aligned under) an
 * element. Opens downward by default, but — like `Tooltip` — flips above the
 * anchor when a downward menu of `estHeight` would run off the viewport bottom,
 * then clamps `top` to the viewport with an 8px pad. The CSS `max-height` on
 * `.menu` scrolls anything still too tall after flipping. `estHeight` is an
 * estimate (the menu hasn't rendered yet); the clamp + scroll keep it on-screen
 * regardless of the exact measurement.
 */
export function anchorMenu(
  el: HTMLElement,
  width = 188,
  align: "left" | "right" = "left",
  estHeight = 280,
): MenuPos {
  const r = el.getBoundingClientRect();
  const gap = 6;
  const pad = 8;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const left = align === "right" ? r.right - width : r.left;

  // Prefer below the anchor; flip above when below would overflow and above has
  // more room. Then clamp into the viewport so the top edge is always reachable.
  const below = r.bottom + gap;
  const above = r.top - estHeight - gap;
  let top = below;
  if (below + estHeight > vh - pad && r.top > vh - r.bottom) top = above;
  top = Math.max(pad, Math.min(top, vh - estHeight - pad));
  // Never let the clamp push the menu off the top edge on very short viewports.
  if (top < pad) top = pad;

  return {
    top,
    left: Math.max(pad, Math.min(left, vw - width - pad)),
    width,
  };
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
