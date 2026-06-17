import { getCurrentWindow } from "@tauri-apps/api/window";
import { LogicalSize } from "@tauri-apps/api/dpi";

/**
 * Window sizing for mode switches.
 *
 * Complete mode uses the roomy default window; Simple mode shrinks to a narrow,
 * focused column. Tauri's `setSize` jumps instantly, so we animate the width
 * ourselves frame-by-frame for a smooth transition between modes.
 */

/** Narrow width (logical px) used by Simple mode. */
export const SIMPLE_WIDTH = 560;
/** Min size while in Simple mode — low enough that SIMPLE_WIDTH isn't clamped. */
const SIMPLE_MIN = { w: 420, h: 420 };
/** Min size for Complete mode — matches tauri.conf.json. */
const COMPLETE_MIN = { w: 720, h: 520 };
/** Fallback width if we somehow never recorded the Complete-mode width. */
const DEFAULT_COMPLETE_WIDTH = 1200;
const DURATION_MS = 260;

/** The Complete-mode width captured when entering Simple mode, restored on exit. */
let savedCompleteWidth: number | null = null;
/** Monotonic token so a newer animation supersedes an in-flight one. */
let animToken = 0;

/** True only inside the Tauri runtime; lets the plain-browser dev server no-op. */
function inTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

const easeInOut = (t: number): number =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

/** Current logical inner size of the window. */
async function logicalSize(): Promise<{ width: number; height: number }> {
  const win = getCurrentWindow();
  const [factor, phys] = await Promise.all([win.scaleFactor(), win.innerSize()]);
  return { width: phys.width / factor, height: phys.height / factor };
}

/**
 * Animate the window's logical width to `targetWidth`, keeping the current
 * height. Resolves when the animation finishes (or is superseded). No-ops
 * outside Tauri.
 */
export async function animateWindowWidth(
  targetWidth: number,
  duration = DURATION_MS
): Promise<void> {
  if (!inTauri()) return;
  const win = getCurrentWindow();
  const { width: startW, height } = await logicalSize();
  if (Math.abs(startW - targetWidth) < 1) return;

  const token = ++animToken;
  const start = performance.now();
  return new Promise<void>((resolve) => {
    const step = (now: number) => {
      if (token !== animToken) return resolve(); // a newer animation took over
      const t = Math.min(1, (now - start) / duration);
      const w = startW + (targetWidth - startW) * easeInOut(t);
      // Fire-and-forget: ~16 IPC calls over the animation is cheap, and not
      // awaiting keeps the steps in sync with the display's refresh.
      void win.setSize(new LogicalSize(Math.round(w), Math.round(height)));
      if (t < 1) requestAnimationFrame(step);
      else resolve();
    };
    requestAnimationFrame(step);
  });
}

/** Shrink to the narrow Simple-mode window, remembering the current width. */
export async function enterSimpleWindow(): Promise<void> {
  if (!inTauri()) return;
  const win = getCurrentWindow();
  // Record the current width as the Complete-mode width to restore later — but
  // only if it's genuinely wide. Re-entering mid-transition (or React
  // StrictMode's double-invoked effect in dev) can observe an already-narrow
  // width; in that case keep the previously saved value.
  const current = Math.round((await logicalSize()).width);
  if (current > SIMPLE_WIDTH + 40) savedCompleteWidth = current;
  // Relax the min first so the narrow target isn't clamped to the Complete min.
  await win.setMinSize(new LogicalSize(SIMPLE_MIN.w, SIMPLE_MIN.h));
  await animateWindowWidth(SIMPLE_WIDTH);
}

/** Grow back to the remembered Complete-mode width and restore its min size. */
export async function exitSimpleWindow(): Promise<void> {
  if (!inTauri()) return;
  const target = savedCompleteWidth ?? DEFAULT_COMPLETE_WIDTH;
  // Animate up first, then re-apply the larger min (setting it earlier would
  // make Tauri snap to it instantly and skip the animation).
  await animateWindowWidth(target);
  await getCurrentWindow().setMinSize(new LogicalSize(COMPLETE_MIN.w, COMPLETE_MIN.h));
}
