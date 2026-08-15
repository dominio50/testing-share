#!/usr/bin/env python3
"""Generate the PWA icon set as PNGs with no third-party dependencies.

Draws the classic "share" glyph (an up arrow rising out of an open box) in
white on an indigo field. Run from the repo root:

    python3 tools/make-icons.py
"""

import os
import struct
import zlib

BG = (79, 70, 229)      # indigo-600
BG_DARK = (55, 48, 163)  # indigo-800, used for a subtle vertical gradient
FG = (255, 255, 255)

OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "icons")

# Every shape is expressed in 0..1 units so one routine serves all sizes.
BOX = (0.26, 0.46, 0.74, 0.82)   # left, top, right, bottom of the open box
STROKE = 0.06
SHAFT_HALF = 0.035
SHAFT_TOP, SHAFT_BOTTOM = 0.26, 0.64
HEAD_APEX, HEAD_BASE, HEAD_HALF = 0.15, 0.33, 0.155


def in_glyph(x, y):
    left, top, right, bottom = BOX

    # Open box: left, right and bottom edges only (the top is deliberately open).
    if left <= x <= right and top <= y <= bottom:
        if x <= left + STROKE or x >= right - STROKE or y >= bottom - STROKE:
            return True

    # Arrow shaft.
    if SHAFT_TOP <= y <= SHAFT_BOTTOM and abs(x - 0.5) <= SHAFT_HALF:
        return True

    # Arrow head: a triangle whose half-width grows linearly from apex to base.
    if HEAD_APEX <= y <= HEAD_BASE:
        span = (y - HEAD_APEX) / (HEAD_BASE - HEAD_APEX) * HEAD_HALF
        if abs(x - 0.5) <= span:
            return True

    return False


def blend(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def render(size, padding=0.0):
    """Return raw RGB rows. `padding` insets the glyph for maskable icons."""
    rows = []
    scale = 1.0 - 2 * padding
    # 2x supersampling keeps the diagonal arrow edges from looking ragged.
    ss = 2
    for py in range(size):
        row = bytearray()
        background = blend(BG, BG_DARK, py / max(size - 1, 1))
        for px in range(size):
            hits = 0
            for sy in range(ss):
                for sx in range(ss):
                    u = (px + (sx + 0.5) / ss) / size
                    v = (py + (sy + 0.5) / ss) / size
                    if scale > 0 and in_glyph((u - padding) / scale, (v - padding) / scale):
                        hits += 1
            row += bytes(blend(background, FG, hits / (ss * ss)))
        rows.append(bytes(row))
    return rows


def write_png(path, size, padding=0.0):
    rows = render(size, padding)
    raw = b"".join(b"\x00" + row for row in rows)

    def chunk(tag, data):
        body = tag + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body))

    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(raw, 9))
    png += chunk(b"IEND", b"")

    with open(path, "wb") as fh:
        fh.write(png)
    print(f"wrote {path} ({size}x{size}, {len(png)} bytes)")


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    write_png(os.path.join(OUT_DIR, "icon-192.png"), 192)
    write_png(os.path.join(OUT_DIR, "icon-512.png"), 512)
    # Maskable icons get padded so Android's circle/squircle crop can't clip the glyph.
    write_png(os.path.join(OUT_DIR, "icon-512-maskable.png"), 512, padding=0.14)
    # iOS uses this one for the Home Screen tile; it is composited on its own
    # rounded rect, so it must not be transparent.
    write_png(os.path.join(OUT_DIR, "apple-touch-icon.png"), 180)


if __name__ == "__main__":
    main()
