import { useEffect, type RefObject } from "react";

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "textarea:not([disabled])",
  "select:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

/** Visible, enabled, focusable descendants of `root`, in DOM order. */
function focusable(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => {
    if (el.hidden || el.getAttribute("aria-hidden") === "true") return false;
    // `offsetParent` is null for position:fixed and unreliable under jsdom
    // (no layout), so don't gate on it. `hidden`/`aria-hidden` plus the
    // `:not([disabled])` selector are enough for these modal dialogs.
    return true;
  });
}

/**
 * Make a dialog a real focus trap (WCAG 2.1 AA). While `active`:
 *  - moves focus to the first focusable control inside `ref` (or the container)
 *    on activate, capturing whatever was focused before so it can be restored;
 *  - keeps Tab / Shift+Tab cycling within the dialog (wrapping last→first and
 *    first→last) so focus can't escape into the inert background;
 *  - restores focus to the previously-focused element on deactivate.
 *
 * The container should be focusable as a fallback (give it `tabIndex={-1}`) for
 * dialogs whose first paint has no focusable control.
 */
export function useFocusTrap(ref: RefObject<HTMLElement | null>, active = true) {
  useEffect(() => {
    if (!active) return;
    const root = ref.current;
    if (!root) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Move focus inside on activate: first focusable control, else the container.
    const initial = focusable(root);
    if (initial.length > 0) initial[0].focus();
    else root.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const items = focusable(root);
      if (items.length === 0) {
        // Nothing focusable but the container — keep focus pinned to it.
        e.preventDefault();
        root.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const activeEl = document.activeElement;
      if (e.shiftKey) {
        if (activeEl === first || !root.contains(activeEl)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (activeEl === last || !root.contains(activeEl)) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    root.addEventListener("keydown", onKeyDown);
    return () => {
      root.removeEventListener("keydown", onKeyDown);
      // Restore focus to wherever it was before the dialog opened.
      previouslyFocused?.focus?.();
    };
  }, [ref, active]);
}
