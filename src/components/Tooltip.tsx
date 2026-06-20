import {
  cloneElement,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

type Side = "top" | "bottom" | "left" | "right";

/** Compose an existing (optional) child handler with one of our own. */
function compose(theirs: unknown, ours: (e: any) => void) {
  return (e: any) => {
    if (typeof theirs === "function") (theirs as (e: any) => void)(e);
    ours(e);
  };
}

/**
 * A lightweight hover/focus tooltip that replaces the native `title` attribute.
 *
 * Wraps a single interactive child, attaching its handlers without adding an
 * extra DOM box, and renders the bubble through a portal so it never clips
 * inside `overflow: hidden` panels. Positioned with fixed viewport coords
 * (same approach as `Menu`), flips to the opposite side when it would leave
 * the viewport, and is keyboard-accessible (shows on focus).
 */
export function Tooltip({
  label,
  side = "top",
  delay = 350,
  gap = 8,
  autoHide,
  children,
}: {
  label: ReactNode;
  side?: Side;
  delay?: number;
  gap?: number;
  autoHide?: number;
  children: ReactElement<Record<string, unknown>>;
}) {
  const anchorRef = useRef<HTMLElement | null>(null);
  const tipRef = useRef<HTMLDivElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const clear = () => {
    if (timer.current !== undefined) clearTimeout(timer.current);
    timer.current = undefined;
  };
  const showDelayed = () => {
    clear();
    timer.current = setTimeout(() => setOpen(true), delay);
  };
  const showNow = () => {
    clear();
    setOpen(true);
  };
  const hide = () => {
    clear();
    setOpen(false);
  };

  // Tear down any pending timer if we unmount mid-hover.
  useEffect(() => clear, []);

  // When `autoHide` is set, dismiss the bubble after a fixed delay once shown so
  // the hint doesn't linger (e.g. while the user keeps typing in a focused input).
  // Uses a local timeout — never the hover-show `timer` ref — to avoid interfering
  // with the open delay. When `autoHide` is undefined the effect is a no-op.
  useEffect(() => {
    if (!open || !autoHide || autoHide <= 0) return;
    const t: ReturnType<typeof setTimeout> = setTimeout(() => setOpen(false), autoHide);
    return () => clearTimeout(t);
  }, [open, autoHide]);

  // While open, dismiss on scroll/resize — the anchor has moved and a stale
  // bubble looks broken. Cheaper and steadier than continuous repositioning.
  useEffect(() => {
    if (!open) return;
    const onMove = () => hide();
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [open]);

  // Measure both boxes before paint and place the bubble. Running in a layout
  // effect means the initial (0,0) render is never painted, so no flicker.
  useLayoutEffect(() => {
    if (!open || !anchorRef.current || !tipRef.current) return;
    const a = anchorRef.current.getBoundingClientRect();
    const t = tipRef.current.getBoundingClientRect();
    const pad = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let s = side;
    if (s === "top" && a.top - t.height - gap < pad) s = "bottom";
    else if (s === "bottom" && a.bottom + t.height + gap > vh - pad) s = "top";
    else if (s === "left" && a.left - t.width - gap < pad) s = "right";
    else if (s === "right" && a.right + t.width + gap > vw - pad) s = "left";

    let top: number;
    let left: number;
    if (s === "top" || s === "bottom") {
      top = s === "top" ? a.top - t.height - gap : a.bottom + gap;
      left = a.left + a.width / 2 - t.width / 2;
    } else {
      left = s === "left" ? a.left - t.width - gap : a.right + gap;
      top = a.top + a.height / 2 - t.height / 2;
    }

    left = Math.max(pad, Math.min(left, vw - t.width - pad));
    top = Math.max(pad, Math.min(top, vh - t.height - pad));
    setPos({ top, left });
  }, [open, side, label, gap]);

  const child = children;
  const childProps = child.props;
  const setRef = (node: HTMLElement | null) => {
    anchorRef.current = node;
    const r = (child as { ref?: unknown }).ref ?? childProps.ref;
    if (typeof r === "function") (r as (n: HTMLElement | null) => void)(node);
    else if (r && typeof r === "object") (r as { current: unknown }).current = node;
  };

  const trigger = cloneElement(child, {
    ref: setRef,
    onMouseEnter: compose(childProps.onMouseEnter, showDelayed),
    onMouseLeave: compose(childProps.onMouseLeave, hide),
    onFocus: compose(childProps.onFocus, showNow),
    onBlur: compose(childProps.onBlur, hide),
    // Dismiss as soon as the control is pressed so the bubble doesn't linger.
    onPointerDown: compose(childProps.onPointerDown, hide),
    // Preserve native a11y: only label the control if it doesn't already self-describe.
    "aria-label":
      childProps["aria-label"] ?? (typeof label === "string" ? label : undefined),
  } as Record<string, unknown>);

  return (
    <>
      {trigger}
      {open &&
        createPortal(
          <div
            ref={tipRef}
            role="tooltip"
            className="tip"
            style={{ top: pos.top, left: pos.left }}
          >
            {label}
          </div>,
          document.body,
        )}
    </>
  );
}
