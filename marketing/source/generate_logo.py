#!/usr/bin/env python3
"""Generate the KAVKA vector logo package.

All visible lettering is converted to SVG paths, so the files remain editable and
portable without requiring the Fraunces or Outfit fonts on the recipient's PC.
"""
from __future__ import annotations

from pathlib import Path
from xml.sax.saxutils import escape

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[1]
FONTS = Path(__file__).resolve().parent / "fonts"

INK = "#1C1915"
CREAM = "#F4EFE6"
TERRACOTTA = "#B54A2C"
GOLD = "#C4A574"


def outlined_text(
    text: str,
    font_path: Path,
    *,
    x: float,
    baseline: float,
    size: float,
    tracking: float,
    fill: str,
) -> tuple[str, float]:
    """Return path-only SVG markup and the rendered width in SVG units."""
    font = TTFont(font_path)
    glyph_set = font.getGlyphSet()
    cmap = font.getBestCmap()
    hmtx = font["hmtx"]
    units_per_em = font["head"].unitsPerEm
    scale = size / units_per_em
    cursor = 0.0
    out: list[str] = []

    for index, char in enumerate(text):
        glyph_name = cmap.get(ord(char), ".notdef")
        advance = hmtx[glyph_name][0]
        if char != " ":
            pen = SVGPathPen(glyph_set)
            glyph_set[glyph_name].draw(pen)
            commands = pen.getCommands()
            if commands:
                gx = x + cursor * scale
                out.append(
                    f'<path d="{escape(commands)}" fill="{fill}" '
                    f'transform="translate({gx:.3f} {baseline:.3f}) scale({scale:.6f} {-scale:.6f})"/>'
                )
        cursor += advance
        if index < len(text) - 1:
            cursor += tracking / scale

    font.close()
    return "\n    ".join(out), cursor * scale


def symbol_markup(*, x: float = 24, y: float = 28, size: float = 224, dark: str = INK) -> str:
    """KAVKA's stylised jackdaw mark, derived from the demo favicon."""
    s = size / 64
    return f"""
    <rect x="{x:.3f}" y="{y:.3f}" width="{size:.3f}" height="{size:.3f}" rx="{size * .205:.3f}" fill="{dark}"/>
    <path d="M14 42c8-2 12-11 14-20 1 7 4 14 12 18 3-8 8-14 16-16-6 8-8 16-7 24H18c-1-8-2-14-4-6z"
          fill="{CREAM}" transform="translate({x:.3f} {y:.3f}) scale({s:.6f})"/>
    <circle cx="{x + 40 * s:.3f}" cy="{y + 22 * s:.3f}" r="{2.2 * s:.3f}" fill="{TERRACOTTA}"/>
    """.strip()


def full_logo(word_fill: str, subtitle_fill: str, filename: str, dark: str = INK) -> None:
    word, _ = outlined_text(
        "KAVKA",
        FONTS / "Fraunces72pt-SemiBold.ttf",
        x=302,
        baseline=159,
        size=132,
        tracking=13,
        fill=word_fill,
    )
    subtitle, _ = outlined_text(
        "E-SHOP SYSTÉM",
        FONTS / "Outfit-SemiBold.ttf",
        x=306,
        baseline=211,
        size=23,
        tracking=5.3,
        fill=subtitle_fill,
    )
    svg = f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 280" width="900" height="280" role="img" aria-labelledby="title desc">
  <title id="title">KAVKA — e-shop systém</title>
  <desc id="desc">Vektorové logo systému KAVKA se stylizovaným ptákem.</desc>
  <g>
    {symbol_markup(dark=dark)}
    {word}
    {subtitle}
  </g>
</svg>
'''
    (ROOT / filename).write_text(svg, encoding="utf-8")


def symbol_file() -> None:
    svg = f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 280" width="280" height="280" role="img" aria-labelledby="title desc">
  <title id="title">Symbol KAVKA</title>
  <desc id="desc">Vektorový symbol se stylizovaným ptákem.</desc>
  <g transform="translate(16 16) scale(1.107143)">
    {symbol_markup(x=0, y=0, size=224)}
  </g>
</svg>
'''
    (ROOT / "kavka-symbol.svg").write_text(svg, encoding="utf-8")


def main() -> None:
    ROOT.mkdir(parents=True, exist_ok=True)
    full_logo(INK, TERRACOTTA, "kavka-logo.svg")
    # Intended for placement on #24352C or another dark brand field.
    full_logo(CREAM, GOLD, "kavka-logo-inverzni.svg", dark=INK)
    symbol_file()
    for name in ("kavka-logo.svg", "kavka-logo-inverzni.svg", "kavka-symbol.svg"):
        print(ROOT / name)


if __name__ == "__main__":
    main()
