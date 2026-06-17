#!/usr/bin/env python3
"""Generate Towork app icons (no third-party deps).

Renders an indigo rounded square with a white check mark at several sizes.
"""
import math
import struct
import zlib
import os

ACCENT = (110, 121, 214)  # --accent #6e79d6
WHITE = (247, 248, 248)


def dist_to_seg(px, py, ax, ay, bx, by):
    dx, dy = bx - ax, by - ay
    if dx == 0 and dy == 0:
        return math.hypot(px - ax, py - ay)
    t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)
    t = max(0.0, min(1.0, t))
    return math.hypot(px - (ax + t * dx), py - (ay + t * dy))


def render(size):
    n = size
    radius = n * 0.22
    # check geometry in normalized coords
    p0 = (0.28 * n, 0.53 * n)
    p1 = (0.44 * n, 0.69 * n)
    p2 = (0.74 * n, 0.34 * n)
    thick = n * 0.085
    px = bytearray()
    for y in range(n):
        px.append(0)  # PNG filter byte (none) per row
        for x in range(n):
            fx, fy = x + 0.5, y + 0.5
            # rounded-square coverage (signed distance, antialiased edge)
            cx = min(max(fx, radius), n - radius)
            cy = min(max(fy, radius), n - radius)
            d = math.hypot(fx - cx, fy - cy) - radius
            sq = max(0.0, min(1.0, 0.5 - d))
            if sq <= 0:
                px += bytes((0, 0, 0, 0))
                continue
            r, g, b = ACCENT
            a = sq
            # checkmark on top
            dc = min(
                dist_to_seg(fx, fy, *p0, *p1),
                dist_to_seg(fx, fy, *p1, *p2),
            )
            cov = max(0.0, min(1.0, (thick - dc) + 0.5))
            if cov > 0:
                r = int(ACCENT[0] * (1 - cov) + WHITE[0] * cov)
                g = int(ACCENT[1] * (1 - cov) + WHITE[1] * cov)
                b = int(ACCENT[2] * (1 - cov) + WHITE[2] * cov)
            px += bytes((r, g, b, int(a * 255)))
    raw = bytes(px)
    compressed = zlib.compress(raw, 9)

    def chunk(typ, data):
        c = struct.pack(">I", len(data)) + typ + data
        return c + struct.pack(">I", zlib.crc32(typ + data) & 0xFFFFFFFF)

    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", n, n, 8, 6, 0, 0, 0)  # 8-bit RGBA
    return sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", compressed) + chunk(b"IEND", b"")


def main():
    out = os.path.join(os.path.dirname(__file__), "icons")
    os.makedirs(out, exist_ok=True)
    targets = {
        "32x32.png": 32,
        "128x128.png": 128,
        "128x128@2x.png": 256,
        "icon.png": 512,
    }
    for name, size in targets.items():
        with open(os.path.join(out, name), "wb") as f:
            f.write(render(size))
        print("wrote", name)


if __name__ == "__main__":
    main()
