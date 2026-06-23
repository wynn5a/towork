import { describe, it, expect, afterEach, vi } from "vitest";
import { anchorMenu } from "./Menu";

// anchorMenu is a pure rect -> position function, so we test it directly:
// jsdom has no real layout, so we stub getBoundingClientRect + window size and
// assert the computed { top, left } keeps the menu on-screen (flips up / clamps
// when it would overflow, stays down when there's room).

function fakeAnchor(rect: Partial<DOMRect>): HTMLElement {
  const r = { top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0, x: 0, y: 0, ...rect };
  return {
    getBoundingClientRect: () => r as DOMRect,
  } as unknown as HTMLElement;
}

function setViewport(w: number, h: number) {
  vi.stubGlobal("innerWidth", w);
  vi.stubGlobal("innerHeight", h);
}

describe("anchorMenu", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("opens downward (top = bottom + 6) when there is room below", () => {
    setViewport(1280, 800);
    // Anchor near the top; a 280px menu fits comfortably below it.
    const pos = anchorMenu(fakeAnchor({ top: 100, bottom: 124, left: 200, right: 388 }));
    expect(pos.top).toBe(124 + 6);
  });

  it("flips above the anchor when a downward menu would overflow the bottom", () => {
    setViewport(1280, 800);
    // Anchor low in the viewport: bottom 760, est height 280 -> would overflow.
    // More room above (top 736) than below (800 - 760 = 40), so it flips up.
    const estHeight = 280;
    const pos = anchorMenu(fakeAnchor({ top: 736, bottom: 760, left: 200, right: 388 }), 188, "left", estHeight);
    // Flipped: top = anchorTop - estHeight - gap = 736 - 280 - 6 = 450.
    expect(pos.top).toBe(736 - estHeight - 6);
    // Whole menu stays on-screen.
    expect(pos.top).toBeGreaterThanOrEqual(8);
    expect(pos.top + estHeight).toBeLessThanOrEqual(800 - 8);
  });

  it("clamps top into the viewport even when neither direction fully fits", () => {
    // Short window: a 280px menu can't fully fit anywhere. top must clamp to pad.
    setViewport(1280, 300);
    const estHeight = 280;
    const pos = anchorMenu(fakeAnchor({ top: 260, bottom: 284, left: 50, right: 238 }), 188, "left", estHeight);
    expect(pos.top).toBe(8); // clamped to pad, never negative / off the top edge
    expect(pos.top).toBeGreaterThanOrEqual(8);
  });

  it("clamps left to the viewport on both edges", () => {
    setViewport(400, 800);
    // Right-aligned menu whose left would go negative -> clamped to pad.
    const negLeft = anchorMenu(fakeAnchor({ top: 100, bottom: 124, left: 0, right: 120 }), 188, "right");
    expect(negLeft.left).toBe(8);
    // A menu that would spill off the right edge -> clamped so it stays on-screen.
    const overRight = anchorMenu(fakeAnchor({ top: 100, bottom: 124, left: 350, right: 380 }), 188, "left");
    expect(overRight.left).toBeLessThanOrEqual(400 - 188 - 8);
  });
});
