#!/usr/bin/env python3
"""Wordmark tiles for favicon siblings. Paper ground, oxblood full stop.

Cochin is not licensed in this repo. Liberation Serif stands in for the
Georgia / Times fallback. Favicon SVG drops the stop; these tiles keep it.
"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

PAPER = (0xF3, 0xF1, 0xEB, 255)
INK = (0x11, 0x11, 0x11, 255)
OXBLOOD = (0x52, 0x29, 0x2A, 255)
FONT = "/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf"

ROOT = Path(__file__).resolve().parents[1]


def render(size: int, stop: bool, dest: Path) -> None:
    img = Image.new("RGBA", (size, size), PAPER)
    draw = ImageDraw.Draw(img)
    font = ImageFont.truetype(FONT, int(size * 0.38))
    letters = [("t", INK), ("b", INK), ("r", INK)]
    if stop:
        letters.append((".", OXBLOOD))
    tracking = -0.03 * font.size
    advances = [font.getlength(ch) for ch, _ in letters]
    total = sum(advances) + tracking * (len(letters) - 1)
    probe = "tbr." if stop else "tbr"
    bbox = font.getbbox(probe)
    y = (size - (bbox[3] - bbox[1])) / 2 - bbox[1]
    x = (size - total) / 2
    for (ch, color), adv in zip(letters, advances):
        draw.text((x, y), ch, font=font, fill=color)
        x += adv + tracking
    dest.parent.mkdir(parents=True, exist_ok=True)
    img.convert("RGB").save(dest, "PNG")
    print(f"wrote {dest}")


def main() -> None:
    public = ROOT / "public"
    jobs = [
        (180, True, public / "icon-180.png"),
        (192, True, public / "icon-192.png"),
        (512, True, public / "icon-512.png"),
        (180, True, public / "__grok" / "icon-180.png"),
    ]
    for size, stop, dest in jobs:
        render(size, stop, dest)


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:  # noqa: BLE001
        print(exc, file=sys.stderr)
        sys.exit(1)
