#!/usr/bin/env python3
"""Generate the Czech KAVKA sales brochure as a polished, print-ready PDF.

The document uses only repository imagery and embedded OFL fonts. Most of the
artwork (UI mock-ups, diagrams, icons, rules and cards) remains vector in PDF.
"""
from __future__ import annotations

import math
from pathlib import Path
from typing import Callable, Iterable, Sequence

from reportlab.graphics import renderPDF
from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Drawing
from reportlab.lib.colors import Color, HexColor, white
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

ROOT = Path(__file__).resolve().parents[2]
MARKETING = ROOT / "marketing"
FONTS = Path(__file__).resolve().parent / "fonts"
OUTPUT = MARKETING / "KAVKA-prodejni-brozura.pdf"

W, H = A4
M = 42
CONTENT_W = W - 2 * M

# Brand palette — shared with src/styles.css.
CREAM = HexColor("#F3EEE4")
CREAM_DEEP = HexColor("#E7DECE")
PAPER = HexColor("#FFFDF8")
INK = HexColor("#1C1915")
INK_SOFT = HexColor("#4A453E")
MUTED = HexColor("#6D655B")
LINE = HexColor("#D7CCBC")
TERRACOTTA = HexColor("#B54A2C")
TERRACOTTA_DARK = HexColor("#8C351F")
FOREST = HexColor("#24352C")
FOREST_2 = HexColor("#2F4A3C")
GOLD = HexColor("#C4A574")
OK = HexColor("#2F6B4F")
PALE_GREEN = HexColor("#DDE6DC")
PALE_TERRA = HexColor("#F0D8CF")
PALE_GOLD = HexColor("#EEE2CD")

OUTFIT = "Outfit"
OUTFIT_MED = "Outfit-Medium"
OUTFIT_SEMI = "Outfit-SemiBold"
FRAUNCES = "Fraunces"
FRAUNCES_SEMI = "Fraunces-SemiBold"
FRAUNCES_ITALIC = "Fraunces-Italic"


def register_fonts() -> None:
    files = {
        OUTFIT: "Outfit-Regular.ttf",
        OUTFIT_MED: "Outfit-Medium.ttf",
        OUTFIT_SEMI: "Outfit-SemiBold.ttf",
        FRAUNCES: "Fraunces72pt-Regular.ttf",
        FRAUNCES_SEMI: "Fraunces72pt-SemiBold.ttf",
        FRAUNCES_ITALIC: "Fraunces72pt-Italic.ttf",
    }
    for name, filename in files.items():
        pdfmetrics.registerFont(TTFont(name, str(FONTS / filename)))


def ty(top: float) -> float:
    """Convert a coordinate measured from the page top to PDF bottom origin."""
    return H - top


def fill_page(c: canvas.Canvas, color=CREAM) -> None:
    c.setFillColor(color)
    c.rect(0, 0, W, H, fill=1, stroke=0)


def set_alpha(c: canvas.Canvas, *, fill: float | None = None, stroke: float | None = None) -> None:
    if fill is not None:
        try:
            c.setFillAlpha(fill)
        except Exception:
            pass
    if stroke is not None:
        try:
            c.setStrokeAlpha(stroke)
        except Exception:
            pass


def reset_alpha(c: canvas.Canvas) -> None:
    set_alpha(c, fill=1, stroke=1)


def round_rect_top(
    c: canvas.Canvas,
    x: float,
    top: float,
    width: float,
    height: float,
    radius: float,
    *,
    fill=None,
    stroke=None,
    line_width: float = 1,
) -> None:
    if fill is not None:
        c.setFillColor(fill)
    if stroke is not None:
        c.setStrokeColor(stroke)
    c.setLineWidth(line_width)
    c.roundRect(x, H - top - height, width, height, radius, fill=int(fill is not None), stroke=int(stroke is not None))


def line_top(c: canvas.Canvas, x1: float, top1: float, x2: float, top2: float, color=LINE, width: float = 1) -> None:
    c.setStrokeColor(color)
    c.setLineWidth(width)
    c.line(x1, ty(top1), x2, ty(top2))


def draw_tracking(
    c: canvas.Canvas,
    text: str,
    x: float,
    top: float,
    *,
    font: str = OUTFIT_SEMI,
    size: float = 8,
    tracking: float = 1.2,
    color=INK,
) -> float:
    c.setFont(font, size)
    c.setFillColor(color)
    cursor = x
    baseline = H - top - size
    for index, char in enumerate(text):
        c.drawString(cursor, baseline, char)
        cursor += pdfmetrics.stringWidth(char, font, size)
        if index < len(text) - 1:
            cursor += tracking
    return cursor - x


def draw_text(c: canvas.Canvas, text: str, x: float, top: float, *, font=OUTFIT, size=10, color=INK) -> float:
    c.setFont(font, size)
    c.setFillColor(color)
    c.drawString(x, H - top - size, text)
    return pdfmetrics.stringWidth(text, font, size)


def draw_text_right(c: canvas.Canvas, text: str, right: float, top: float, *, font=OUTFIT, size=10, color=INK) -> float:
    width = pdfmetrics.stringWidth(text, font, size)
    draw_text(c, text, right - width, top, font=font, size=size, color=color)
    return width


def draw_text_center(c: canvas.Canvas, text: str, cx: float, top: float, *, font=OUTFIT, size=10, color=INK) -> float:
    width = pdfmetrics.stringWidth(text, font, size)
    draw_text(c, text, cx - width / 2, top, font=font, size=size, color=color)
    return width


def split_lines(text: str, font: str, size: float, max_width: float) -> list[str]:
    lines: list[str] = []
    for paragraph in text.split("\n"):
        if not paragraph:
            lines.append("")
            continue
        words = paragraph.split()
        current = ""
        for word in words:
            candidate = word if not current else f"{current} {word}"
            if pdfmetrics.stringWidth(candidate, font, size) <= max_width:
                current = candidate
            else:
                if current:
                    lines.append(current)
                # Keep URLs or unusually long words from overflowing.
                if pdfmetrics.stringWidth(word, font, size) > max_width:
                    part = ""
                    for char in word:
                        if pdfmetrics.stringWidth(part + char, font, size) <= max_width:
                            part += char
                        else:
                            if part:
                                lines.append(part)
                            part = char
                    current = part
                else:
                    current = word
        if current:
            lines.append(current)
    return lines


def draw_wrapped(
    c: canvas.Canvas,
    text: str,
    x: float,
    top: float,
    width: float,
    *,
    font=OUTFIT,
    size=10,
    leading: float | None = None,
    color=INK,
    max_lines: int | None = None,
) -> float:
    leading = leading or size * 1.35
    lines = split_lines(text, font, size, width)
    if max_lines is not None and len(lines) > max_lines:
        lines = lines[:max_lines]
        last = lines[-1]
        while last and pdfmetrics.stringWidth(last + "…", font, size) > width:
            last = last[:-1]
        lines[-1] = last.rstrip() + "…"
    c.setFont(font, size)
    c.setFillColor(color)
    baseline = H - top - size
    for index, line in enumerate(lines):
        c.drawString(x, baseline - index * leading, line)
    return top + len(lines) * leading


def draw_rich_lines(
    c: canvas.Canvas,
    lines: Sequence[tuple[str, str]],
    x: float,
    top: float,
    width: float,
    *,
    size=10,
    leading=14,
    color=INK,
) -> float:
    """Draw a sequence of (font, text) blocks while retaining simple wrapping."""
    cursor_top = top
    for font, text in lines:
        cursor_top = draw_wrapped(c, text, x, cursor_top, width, font=font, size=size, leading=leading, color=color)
    return cursor_top


def draw_bullet(
    c: canvas.Canvas,
    text: str,
    x: float,
    top: float,
    width: float,
    *,
    size=9.2,
    leading=12.4,
    color=INK_SOFT,
    dot_color=TERRACOTTA,
    check: bool = True,
) -> float:
    cy = H - top - 5.5
    c.setFillColor(dot_color)
    c.circle(x + 4.5, cy, 4.5, fill=1, stroke=0)
    if check:
        c.setStrokeColor(PAPER)
        c.setLineWidth(1.15)
        c.line(x + 2.4, cy, x + 4.1, cy - 1.7)
        c.line(x + 4.1, cy - 1.7, x + 7.2, cy + 2.1)
    end = draw_wrapped(c, text, x + 14, top, width - 14, font=OUTFIT, size=size, leading=leading, color=color)
    return max(end, top + leading)


def draw_number_badge(c: canvas.Canvas, number: str, x: float, top: float, *, bg=TERRACOTTA, fg=PAPER, size=25) -> None:
    c.setFillColor(bg)
    c.circle(x + size / 2, H - top - size / 2, size / 2, fill=1, stroke=0)
    text_size = 8.5 if len(number) <= 2 else 7.4
    draw_text_center(c, number, x + size / 2, top + (size - text_size) / 2 - 1, font=OUTFIT_SEMI, size=text_size, color=fg)


def draw_pill(c: canvas.Canvas, text: str, x: float, top: float, *, bg=INK, fg=PAPER, font=OUTFIT_SEMI, size=7.5, pad_x=10, height=22) -> float:
    tw = pdfmetrics.stringWidth(text, font, size)
    width = tw + 2 * pad_x
    round_rect_top(c, x, top, width, height, height / 2, fill=bg)
    draw_text(c, text, x + pad_x, top + (height - size) / 2 - 1, font=font, size=size, color=fg)
    return width


def draw_image_cover(c: canvas.Canvas, image_path: Path, x: float, top: float, width: float, height: float) -> None:
    image = ImageReader(str(image_path))
    iw, ih = image.getSize()
    scale = max(width / iw, height / ih)
    dw, dh = iw * scale, ih * scale
    dx = x + (width - dw) / 2
    dy = H - top - height + (height - dh) / 2
    c.saveState()
    clip = c.beginPath()
    clip.rect(x, H - top - height, width, height)
    c.clipPath(clip, stroke=0, fill=0)
    c.drawImage(image, dx, dy, width=dw, height=dh, preserveAspectRatio=False, mask="auto")
    c.restoreState()


def draw_image_contain(c: canvas.Canvas, image_path: Path, x: float, top: float, width: float, height: float) -> None:
    image = ImageReader(str(image_path))
    iw, ih = image.getSize()
    scale = min(width / iw, height / ih)
    dw, dh = iw * scale, ih * scale
    c.drawImage(image, x + (width - dw) / 2, H - top - height + (height - dh) / 2, width=dw, height=dh, mask="auto")


def draw_mark(c: canvas.Canvas, x: float, top: float, size: float, *, box=INK, bird=PAPER, eye=TERRACOTTA) -> None:
    """Draw the KAVKA bird symbol as native PDF vector paths."""
    round_rect_top(c, x, top, size, size, size * .205, fill=box)
    s = size / 64
    p = c.beginPath()
    # Cubic expansion of the SVG path used by public/favicon.svg.
    p.moveTo(x + 14 * s, H - (top + 42 * s))
    p.curveTo(x + 22 * s, H - (top + 40 * s), x + 26 * s, H - (top + 31 * s), x + 28 * s, H - (top + 22 * s))
    p.curveTo(x + 29 * s, H - (top + 29 * s), x + 32 * s, H - (top + 36 * s), x + 40 * s, H - (top + 40 * s))
    p.curveTo(x + 43 * s, H - (top + 32 * s), x + 48 * s, H - (top + 26 * s), x + 56 * s, H - (top + 24 * s))
    p.curveTo(x + 50 * s, H - (top + 32 * s), x + 48 * s, H - (top + 40 * s), x + 49 * s, H - (top + 48 * s))
    p.lineTo(x + 18 * s, H - (top + 48 * s))
    p.curveTo(x + 17 * s, H - (top + 40 * s), x + 16 * s, H - (top + 34 * s), x + 14 * s, H - (top + 42 * s))
    p.close()
    c.setFillColor(bird)
    c.drawPath(p, fill=1, stroke=0)
    c.setFillColor(eye)
    c.circle(x + 40 * s, H - (top + 22 * s), 2.2 * s, fill=1, stroke=0)


def draw_logo(c: canvas.Canvas, x: float, top: float, *, scale: float = 1, inverse: bool = False, subtitle: str = "E-SHOP SYSTÉM") -> float:
    size = 34 * scale
    draw_mark(c, x, top, size, box=INK, bird=PAPER, eye=TERRACOTTA)
    word_color = PAPER if inverse else INK
    sub_color = GOLD if inverse else TERRACOTTA
    word_size = 22 * scale
    draw_tracking(c, "KAVKA", x + size + 10 * scale, top + 1 * scale, font=FRAUNCES_SEMI, size=word_size, tracking=2.1 * scale, color=word_color)
    draw_tracking(c, subtitle, x + size + 11 * scale, top + 24 * scale, font=OUTFIT_SEMI, size=5.6 * scale, tracking=1.25 * scale, color=sub_color)
    return size


def draw_icon(c: canvas.Canvas, kind: str, cx: float, top_center: float, *, radius=15, bg=CREAM_DEEP, fg=INK) -> None:
    cy = H - top_center
    c.setFillColor(bg)
    c.circle(cx, cy, radius, fill=1, stroke=0)
    c.setStrokeColor(fg)
    c.setFillColor(fg)
    c.setLineWidth(max(1.1, radius / 12))
    r = radius
    if kind == "cart":
        c.line(cx - .50 * r, cy + .35 * r, cx - .32 * r, cy + .35 * r)
        c.line(cx - .32 * r, cy + .35 * r, cx - .18 * r, cy - .28 * r)
        c.line(cx - .18 * r, cy - .28 * r, cx + .48 * r, cy - .28 * r)
        c.line(cx - .25 * r, cy + .18 * r, cx + .53 * r, cy + .18 * r)
        c.circle(cx - .05 * r, cy - .50 * r, .09 * r, fill=1, stroke=0)
        c.circle(cx + .39 * r, cy - .50 * r, .09 * r, fill=1, stroke=0)
    elif kind == "chart":
        for dx, hh in [(-.42, .36), (-.08, .62), (.26, .90)]:
            c.roundRect(cx + dx * r, cy - .52 * r, .22 * r, hh * r, .05 * r, fill=1, stroke=0)
    elif kind == "brush":
        c.circle(cx - .1 * r, cy + .06 * r, .58 * r, fill=0, stroke=1)
        c.setFillColor(bg)
        c.circle(cx + .35 * r, cy - .35 * r, .24 * r, fill=1, stroke=0)
        c.setFillColor(fg)
        for dx, dy in [(-.35,.2),(-.05,.4),(.25,.22),(-.27,-.17)]:
            c.circle(cx + dx*r, cy + dy*r, .07*r, fill=1, stroke=0)
    elif kind == "growth":
        c.line(cx - .50*r, cy - .35*r, cx - .13*r, cy + .02*r)
        c.line(cx - .13*r, cy + .02*r, cx + .12*r, cy - .12*r)
        c.line(cx + .12*r, cy - .12*r, cx + .52*r, cy + .42*r)
        c.line(cx + .22*r, cy + .39*r, cx + .52*r, cy + .42*r)
        c.line(cx + .49*r, cy + .13*r, cx + .52*r, cy + .42*r)
    elif kind == "search":
        c.circle(cx - .12*r, cy + .10*r, .34*r, fill=0, stroke=1)
        c.line(cx + .13*r, cy - .14*r, cx + .49*r, cy - .50*r)
    elif kind == "user":
        c.circle(cx, cy + .28*r, .23*r, fill=0, stroke=1)
        p = c.beginPath(); p.moveTo(cx-.45*r,cy-.45*r); p.curveTo(cx-.30*r,cy-.02*r,cx+.30*r,cy-.02*r,cx+.45*r,cy-.45*r)
        c.drawPath(p, fill=0, stroke=1)
    elif kind == "card":
        c.roundRect(cx-.55*r,cy-.36*r,1.1*r,.72*r,.1*r,fill=0,stroke=1)
        c.line(cx-.48*r,cy+.12*r,cx+.48*r,cy+.12*r)
        c.line(cx-.39*r,cy-.13*r,cx-.10*r,cy-.13*r)
    elif kind == "truck":
        c.rect(cx-.56*r,cy-.27*r,.70*r,.58*r,fill=0,stroke=1)
        p=c.beginPath();p.moveTo(cx+.14*r,cy+.22*r);p.lineTo(cx+.38*r,cy+.22*r);p.lineTo(cx+.57*r,cy-.02*r);p.lineTo(cx+.57*r,cy-.27*r);p.lineTo(cx+.14*r,cy-.27*r);p.close();c.drawPath(p,fill=0,stroke=1)
        c.circle(cx-.30*r,cy-.37*r,.11*r,fill=0,stroke=1);c.circle(cx+.39*r,cy-.37*r,.11*r,fill=0,stroke=1)
    elif kind == "doc":
        p=c.beginPath();p.moveTo(cx-.38*r,cy-.53*r);p.lineTo(cx+.38*r,cy-.53*r);p.lineTo(cx+.38*r,cy+.25*r);p.lineTo(cx+.10*r,cy+.52*r);p.lineTo(cx-.38*r,cy+.52*r);p.close();c.drawPath(p,fill=0,stroke=1)
        c.line(cx-.22*r,cy+.05*r,cx+.20*r,cy+.05*r);c.line(cx-.22*r,cy-.18*r,cx+.20*r,cy-.18*r)
    elif kind == "shield":
        p=c.beginPath();p.moveTo(cx,cy+.55*r);p.lineTo(cx+.46*r,cy+.34*r);p.lineTo(cx+.36*r,cy-.26*r);p.curveTo(cx+.20*r,cy-.51*r,cx,cy-.61*r,cx,cy-.61*r);p.curveTo(cx,cy-.61*r,cx-.20*r,cy-.51*r,cx-.36*r,cy-.26*r);p.lineTo(cx-.46*r,cy+.34*r);p.close();c.drawPath(p,fill=0,stroke=1)
        c.line(cx-.20*r,cy-.01*r,cx-.03*r,cy-.18*r);c.line(cx-.03*r,cy-.18*r,cx+.25*r,cy+.15*r)
    elif kind == "mail":
        c.roundRect(cx-.55*r,cy-.36*r,1.1*r,.72*r,.08*r,fill=0,stroke=1)
        c.line(cx-.49*r,cy+.25*r,cx,cy-.08*r);c.line(cx,cy-.08*r,cx+.49*r,cy+.25*r)
    elif kind == "cloud":
        p=c.beginPath();p.moveTo(cx-.53*r,cy-.20*r);p.curveTo(cx-.68*r,cy+.02*r,cx-.48*r,cy+.26*r,cx-.24*r,cy+.22*r);p.curveTo(cx-.18*r,cy+.56*r,cx+.33*r,cy+.55*r,cx+.39*r,cy+.22*r);p.curveTo(cx+.70*r,cy+.18*r,cx+.72*r,cy-.18*r,cx+.45*r,cy-.29*r);p.lineTo(cx-.35*r,cy-.29*r);p.curveTo(cx-.43*r,cy-.29*r,cx-.49*r,cy-.26*r,cx-.53*r,cy-.20*r);c.drawPath(p,fill=0,stroke=1)
    elif kind == "db":
        c.ellipse(cx-.46*r,cy+.27*r,cx+.46*r,cy+.55*r,fill=0,stroke=1)
        c.line(cx-.46*r,cy+.41*r,cx-.46*r,cy-.38*r);c.line(cx+.46*r,cy+.41*r,cx+.46*r,cy-.38*r)
        c.ellipse(cx-.46*r,cy-.52*r,cx+.46*r,cy-.24*r,fill=0,stroke=1)
        p=c.beginPath();p.moveTo(cx-.46*r,cy+.02*r);p.curveTo(cx-.20*r,cy-.12*r,cx+.20*r,cy-.12*r,cx+.46*r,cy+.02*r);c.drawPath(p,fill=0,stroke=1)
    elif kind == "feed":
        c.line(cx-.48*r,cy+.33*r,cx+.25*r,cy+.33*r);c.line(cx+.25*r,cy+.33*r,cx+.08*r,cy+.49*r);c.line(cx+.25*r,cy+.33*r,cx+.08*r,cy+.17*r)
        c.line(cx+.48*r,cy-.30*r,cx-.25*r,cy-.30*r);c.line(cx-.25*r,cy-.30*r,cx-.08*r,cy-.14*r);c.line(cx-.25*r,cy-.30*r,cx-.08*r,cy-.46*r)
    elif kind == "mobile":
        c.roundRect(cx-.34*r,cy-.57*r,.68*r,1.14*r,.12*r,fill=0,stroke=1)
        c.line(cx-.12*r,cy+.41*r,cx+.12*r,cy+.41*r);c.circle(cx,cy-.43*r,.05*r,fill=1,stroke=0)
    else:
        c.circle(cx, cy, .38*r, fill=0, stroke=1)


def feature_card(
    c: canvas.Canvas,
    x: float,
    top: float,
    width: float,
    height: float,
    *,
    icon: str,
    title: str,
    text: str,
    bg=PAPER,
    accent=TERRACOTTA,
) -> None:
    round_rect_top(c, x, top, width, height, 14, fill=bg, stroke=LINE, line_width=.7)
    draw_icon(c, icon, x + 28, top + 29, radius=14, bg=Color(accent.red, accent.green, accent.blue, alpha=.14), fg=accent)
    draw_wrapped(c, title, x + 50, top + 16, width - 62, font=FRAUNCES_SEMI, size=13, leading=15, color=INK)
    draw_wrapped(c, text, x + 16, top + 54, width - 32, font=OUTFIT, size=8.7, leading=11.7, color=INK_SOFT)


def stat_card(c: canvas.Canvas, x: float, top: float, width: float, value: str, label: str, *, color=TERRACOTTA) -> None:
    round_rect_top(c, x, top, width, 70, 14, fill=PAPER, stroke=LINE, line_width=.7)
    draw_text(c, value, x + 14, top + 11, font=FRAUNCES_SEMI, size=25, color=color)
    draw_wrapped(c, label, x + 14, top + 43, width - 28, font=OUTFIT_MED, size=7.8, leading=9.6, color=MUTED)


def page_header(c: canvas.Canvas, page: int, section: str) -> None:
    draw_logo(c, M, 24, scale=.72)
    draw_text_right(c, section.upper(), W - M, 31, font=OUTFIT_SEMI, size=6.7, color=MUTED)
    line_top(c, M, 69, W - M, 69, color=LINE, width=.65)


def page_footer(c: canvas.Canvas, page: int, *, dark: bool = False) -> None:
    fg = PALE_GOLD if dark else MUTED
    rule = Color(1, 1, 1, alpha=.18) if dark else LINE
    line_top(c, M, 806, W - M, 806, color=rule, width=.55)
    draw_tracking(c, "KAVKA · E-SHOP SYSTÉM", M, 815, font=OUTFIT_SEMI, size=5.8, tracking=.75, color=fg)
    draw_text_right(c, f"{page:02d}", W - M, 813, font=OUTFIT_SEMI, size=7.4, color=fg)


def section_intro(c: canvas.Canvas, kicker: str, title: str, lead: str, *, top=93, title_size=27, width=475) -> float:
    draw_tracking(c, kicker.upper(), M, top, font=OUTFIT_SEMI, size=7, tracking=1.5, color=TERRACOTTA)
    title_top = top + 18
    title_end = draw_wrapped(c, title, M, title_top, width, font=FRAUNCES_SEMI, size=title_size, leading=title_size * 1.03, color=INK)
    return draw_wrapped(c, lead, M, title_end + 8, width, font=OUTFIT, size=10.2, leading=14, color=INK_SOFT)


def browser_frame(c: canvas.Canvas, x: float, top: float, width: float, height: float, *, bg=PAPER) -> tuple[float, float, float, float]:
    round_rect_top(c, x, top, width, height, 15, fill=bg, stroke=LINE, line_width=.8)
    c.setFillColor(CREAM_DEEP)
    c.roundRect(x, H - top - 31, width, 31, 15, fill=1, stroke=0)
    c.rect(x, H - top - 31, width, 16, fill=1, stroke=0)
    for idx, col in enumerate([TERRACOTTA, GOLD, FOREST_2]):
        c.setFillColor(col)
        c.circle(x + 13 + idx * 12, H - top - 15, 3, fill=1, stroke=0)
    round_rect_top(c, x + 60, top + 8, width - 75, 14, 7, fill=PAPER)
    draw_text(c, "kavka.shop", x + 70, top + 10, font=OUTFIT, size=5.7, color=MUTED)
    return x, top + 31, width, height - 31


def draw_product_card(c: canvas.Canvas, x: float, top: float, width: float, height: float, image: str, name: str, price: str) -> None:
    round_rect_top(c, x, top, width, height, 10, fill=PAPER, stroke=LINE, line_width=.55)
    draw_image_cover(c, ROOT / "public" / "products" / image, x, top, width, height * .60)
    draw_wrapped(c, name, x + 8, top + height * .63, width - 16, font=FRAUNCES_SEMI, size=7.2, leading=8.4, color=INK, max_lines=2)
    draw_text(c, price, x + 8, top + height - 19, font=OUTFIT_SEMI, size=7.1, color=TERRACOTTA)


def cover(c: canvas.Canvas) -> None:
    fill_page(c, CREAM)
    image_x = 326
    draw_image_cover(c, ROOT / "public" / "hero.jpg", image_x, 0, W - image_x, H)
    # A crisp editorial divider keeps the image and sales copy distinct.
    c.setFillColor(INK)
    c.rect(image_x, 0, 4, H, fill=1, stroke=0)
    c.setFillColor(FOREST)
    c.rect(image_x, 0, W - image_x, 126, fill=1, stroke=0)

    draw_logo(c, M, 42, scale=1.02)
    draw_pill(c, "FUNKČNÍ DEMO · SRPEN 2026", M, 118, bg=PALE_TERRA, fg=TERRACOTTA_DARK, size=6.9, height=21)
    draw_tracking(c, "PRODEJ · SPRÁVA · RŮST", M, 160, font=OUTFIT_SEMI, size=6.9, tracking=1.1, color=TERRACOTTA)
    title_top = 190
    title_end = draw_wrapped(c, "E-shop, který\nprodává.", M, title_top, 260, font=FRAUNCES_SEMI, size=39, leading=39.5, color=INK)
    draw_wrapped(c, "Správa, která nezdržuje.", M, title_end + 7, 245, font=FRAUNCES_ITALIC, size=24, leading=27, color=TERRACOTTA_DARK)
    draw_wrapped(
        c,
        "Kompletní český e-shop systém pro značky, výrobce a menší prodejce. Od prvního kliknutí po fakturu a štítek dopravce.",
        M,
        356,
        245,
        font=OUTFIT,
        size=10.2,
        leading=14.6,
        color=INK_SOFT,
    )

    # Three compact promises.
    promises = [("01", "Rychlý nákup"), ("02", "Přehledná správa"), ("03", "Růstové nástroje")]
    top = 456
    for number, label in promises:
        draw_number_badge(c, number, M, top, size=23, bg=FOREST)
        draw_text(c, label, M + 33, top + 5, font=OUTFIT_MED, size=8.8, color=INK)
        top += 39

    round_rect_top(c, M, 611, 245, 89, 15, fill=INK)
    draw_text(c, "JEDNO ŘEŠENÍ. CELÝ PRODEJ.", M + 16, 626, font=OUTFIT_SEMI, size=7.3, color=GOLD)
    draw_wrapped(c, "Katalog, pokladna, objednávky, obsah, marketing i provoz v jednom propojeném systému.", M + 16, 648, 210, font=OUTFIT, size=8.8, leading=12, color=PAPER)

    draw_text(c, "Jan Minařík", M, 742, font=OUTFIT_SEMI, size=9.2, color=INK)
    draw_text(c, "jmweb.cz  ·  +420 776 677 399", M, 759, font=OUTFIT, size=8.4, color=MUTED)
    c.linkURL("https://jmweb.cz", (M, H - 774, M + 58, H - 754), relative=0)

    # Image-side caption.
    round_rect_top(c, image_x + 20, 664, W - image_x - 40, 31, 15.5, fill=PAPER)
    draw_text(c, "Navrženo pro český trh", image_x + 35, 674, font=OUTFIT_SEMI, size=7.5, color=INK)
    draw_text(c, "Doprava · platby · faktury", image_x + 35, 688, font=OUTFIT, size=6.6, color=MUTED)
    draw_text(c, "KAVKA", image_x + 22, 745, font=FRAUNCES_SEMI, size=22, color=PAPER)
    draw_wrapped(c, "Váš obchod.\nVaše značka.", image_x + 22, 774, 120, font=FRAUNCES, size=12.5, leading=15, color=PALE_GOLD)
    c.showPage()


def page_two(c: canvas.Canvas) -> None:
    fill_page(c)
    page_header(c, 2, "Proč KAVKA")
    intro_end = section_intro(
        c,
        "Váš obchod. Jedno místo.",
        "Méně rutiny. Více prostoru prodávat.",
        "KAVKA spojuje zákaznický e-shop, každodenní administraci, obsah, automatizace i technický provoz. Jednotlivé části spolu mluví — data se nepřepisují a zákazník neztrácí tempo.",
        title_size=28,
    )

    stats_top = intro_end + 22
    gap = 9
    sw = (CONTENT_W - 3 * gap) / 4
    stats = [
        ("35+", "bloků vizuálního editoru", TERRACOTTA),
        ("4", "prodejní a AI feedy", FOREST_2),
        ("3", "napojení pro účetnictví", TERRACOTTA),
        ("1", "propojený systém", FOREST_2),
    ]
    for i, (value, label, color) in enumerate(stats):
        stat_card(c, M + i * (sw + gap), stats_top, sw, value, label, color=color)

    cards_top = stats_top + 88
    card_gap = 12
    cw = (CONTENT_W - card_gap) / 2
    ch = 123
    cards = [
        ("cart", "Nakupování bez překážek", "Rychlý katalog, chytré filtry, přehledný košík a pokladna pro hosta i registrovaného zákazníka.", TERRACOTTA),
        ("chart", "Obchod pod kontrolou", "Tržby, objednávky, sklad, zákazníci, faktury i reklamace jsou dostupné z jedné administrace.", FOREST_2),
        ("growth", "Růst bez slepých míst", "Feedy, analytika, opuštěné košíky, kupóny, upsell a hlídací pes pomáhají vracet zákazníky.", TERRACOTTA),
        ("brush", "Značka zůstává vaše", "Barvy, logo, menu, stránky i obsah přizpůsobíte konkrétnímu obchodu bez zásahu do kódu.", FOREST_2),
    ]
    for idx, (icon, title, text, accent) in enumerate(cards):
        col, row = idx % 2, idx // 2
        feature_card(c, M + col * (cw + card_gap), cards_top + row * (ch + card_gap), cw, ch, icon=icon, title=title, text=text, accent=accent)

    journey_top = cards_top + 2 * ch + card_gap + 23
    draw_tracking(c, "JEDNA SOUVISLÁ CESTA", M, journey_top, font=OUTFIT_SEMI, size=6.8, tracking=1.4, color=TERRACOTTA)
    steps = ["Návštěva", "Objevování", "Košík", "Platba", "Expedice", "Návrat"]
    step_top = journey_top + 23
    cell = CONTENT_W / len(steps)
    line_top(c, M + 12, step_top + 15, W - M - 12, step_top + 15, color=LINE, width=1.2)
    for idx, label in enumerate(steps):
        cx = M + cell * idx + cell / 2
        c.setFillColor(TERRACOTTA if idx in (0, 5) else FOREST_2)
        c.circle(cx, H - step_top - 15, 8, fill=1, stroke=0)
        draw_text_center(c, str(idx + 1), cx, step_top + 10, font=OUTFIT_SEMI, size=6.2, color=PAPER)
        draw_text_center(c, label, cx, step_top + 30, font=OUTFIT_MED, size=7.3, color=INK_SOFT)

    page_footer(c, 2)
    c.showPage()


def page_three(c: canvas.Canvas) -> None:
    fill_page(c)
    page_header(c, 3, "Zákaznický e-shop")
    section_intro(
        c,
        "První klik až opakovaný nákup",
        "Příjemný nákup na mobilu i počítači.",
        "Rozhraní vede zákazníka přirozeně — od hledání přes detail produktu až k objednávce, účtu a návratu pro další nákup.",
        title_size=27,
    )

    # Mobile storefront mock-up.
    phone_x, phone_top, phone_w, phone_h = M, 223, 202, 455
    round_rect_top(c, phone_x, phone_top, phone_w, phone_h, 27, fill=INK, stroke=INK)
    round_rect_top(c, phone_x + 7, phone_top + 7, phone_w - 14, phone_h - 14, 22, fill=PAPER)
    round_rect_top(c, phone_x + 73, phone_top + 12, 56, 8, 4, fill=INK)
    draw_mark(c, phone_x + 18, phone_top + 35, 21)
    draw_tracking(c, "KAVKA", phone_x + 47, phone_top + 36, font=FRAUNCES_SEMI, size=11, tracking=1.25, color=INK)
    draw_icon(c, "cart", phone_x + phone_w - 28, phone_top + 47, radius=10, bg=CREAM_DEEP, fg=INK)
    round_rect_top(c, phone_x + 16, phone_top + 71, phone_w - 32, 24, 12, fill=CREAM)
    draw_icon(c, "search", phone_x + 29, phone_top + 83, radius=7, bg=CREAM, fg=MUTED)
    draw_text(c, "Hledat v katalogu", phone_x + 41, phone_top + 77, font=OUTFIT, size=6.7, color=MUTED)
    draw_image_cover(c, ROOT / "public" / "hero.jpg", phone_x + 16, phone_top + 108, phone_w - 32, 108)
    c.saveState(); set_alpha(c, fill=.80); c.setFillColor(FOREST); c.rect(phone_x + 16, H - phone_top - 216, phone_w - 32, 38, fill=1, stroke=0); c.restoreState()
    draw_text(c, "Domov, který dýchá pomalu", phone_x + 25, phone_top + 179, font=FRAUNCES_SEMI, size=8.8, color=PAPER)
    draw_text(c, "Procházet katalog →", phone_x + 25, phone_top + 195, font=OUTFIT_SEMI, size=5.9, color=GOLD)
    draw_text(c, "DOPORUČUJEME", phone_x + 16, phone_top + 231, font=OUTFIT_SEMI, size=5.4, color=TERRACOTTA)
    product_top = phone_top + 248
    card_w = (phone_w - 39) / 2
    draw_product_card(c, phone_x + 13, product_top, card_w, 139, "hrnek.jpg", "Keramický hrnek Hlína", "490 Kč")
    draw_product_card(c, phone_x + 20 + card_w, product_top, card_w, 139, "deka.jpg", "Vlněná deka Ovce", "2 490 Kč")
    # Bottom navigation.
    line_top(c, phone_x + 15, phone_top + 406, phone_x + phone_w - 15, phone_top + 406, color=LINE, width=.6)
    for idx, (kind, label) in enumerate([("search", "Hledat"), ("cart", "Košík"), ("user", "Účet")]):
        cx = phone_x + 40 + idx * 61
        draw_icon(c, kind, cx, phone_top + 423, radius=8, bg=PAPER, fg=FOREST_2)
        draw_text_center(c, label, cx, phone_top + 434, font=OUTFIT_MED, size=4.8, color=MUTED)

    # Feature list alongside.
    right_x = phone_x + phone_w + 28
    right_w = W - M - right_x
    features = [
        ("search", "Katalog a hledání", "Kategorie, hledání, řazení, cenový filtr, dostupnost skladem a stránkování."),
        ("cart", "Detail a košík", "Fotogalerie s lightboxem, oblíbené, recenze, naposledy zhlédnuté, kupóny a upsell."),
        ("user", "Účet i nákup bez registrace", "Profil, uložené adresy, historie objednávek, reklamace a zároveň pokladna pro hosta."),
        ("mail", "Hlídací pes", "U vyprodaného zboží přijde po naskladnění e-mail a volitelně Web Push."),
        ("mobile", "PWA a offline", "Instalace na plochu, mobilní navigace, service worker a základní offline režim."),
    ]
    top = 228
    for idx, (icon, title, text) in enumerate(features):
        box_h = 78
        round_rect_top(c, right_x, top, right_w, box_h, 13, fill=PAPER, stroke=LINE, line_width=.6)
        draw_icon(c, icon, right_x + 24, top + 26, radius=12, bg=PALE_GOLD if idx % 2 else PALE_TERRA, fg=TERRACOTTA if idx % 2 == 0 else FOREST_2)
        draw_wrapped(c, title, right_x + 44, top + 13, right_w - 55, font=FRAUNCES_SEMI, size=11.5, leading=13, color=INK)
        draw_wrapped(c, text, right_x + 13, top + 43, right_w - 26, font=OUTFIT, size=7.8, leading=10.2, color=INK_SOFT)
        top += box_h + 10

    round_rect_top(c, right_x, 668, right_w, 54, 13, fill=FOREST)
    draw_text(c, "Důvěra po nákupu", right_x + 14, 680, font=FRAUNCES_SEMI, size=11, color=PAPER)
    draw_wrapped(c, "Sledování podle čísla a e-mailu, faktura ke stažení a hodnocení skutečně koupeného zboží.", right_x + 14, 698, right_w - 28, font=OUTFIT, size=7.5, leading=9.5, color=PALE_GOLD)

    page_footer(c, 3)
    c.showPage()


def page_four(c: canvas.Canvas) -> None:
    fill_page(c)
    page_header(c, 4, "Pokladna, doprava a platby")
    intro_end = section_intro(
        c,
        "Poslední krok bez tření",
        "Česká pokladna připravená na realitu.",
        "Fakturační a doručovací údaje, nákup na firmu, výdejní místa i různé platební scénáře v jednom jasném postupu.",
        title_size=27,
    )

    # Checkout flow.
    flow_top = intro_end + 20
    steps = [("1", "Kontakt"), ("2", "Fakturace"), ("3", "Doprava"), ("4", "Platba"), ("5", "Hotovo")]
    cell = CONTENT_W / len(steps)
    line_top(c, M + 18, flow_top + 16, W - M - 18, flow_top + 16, color=LINE, width=1.4)
    for idx, (number, label) in enumerate(steps):
        cx = M + idx * cell + cell / 2
        c.setFillColor(TERRACOTTA if idx == 4 else FOREST_2)
        c.circle(cx, H - flow_top - 16, 12, fill=1, stroke=0)
        draw_text_center(c, number, cx, flow_top + 10, font=OUTFIT_SEMI, size=7.7, color=PAPER)
        draw_text_center(c, label, cx, flow_top + 35, font=OUTFIT_MED, size=7.3, color=INK_SOFT)

    columns_top = flow_top + 70
    gap = 14
    col_w = (CONTENT_W - gap) / 2
    # Shipping column.
    round_rect_top(c, M, columns_top, col_w, 333, 17, fill=PAPER, stroke=LINE, line_width=.7)
    draw_icon(c, "truck", M + 28, columns_top + 29, radius=15, bg=PALE_TERRA, fg=TERRACOTTA)
    draw_text(c, "Doprava", M + 51, columns_top + 18, font=FRAUNCES_SEMI, size=16, color=INK)
    draw_text(c, "podle zákazníka i provozu", M + 51, columns_top + 39, font=OUTFIT, size=7.5, color=MUTED)
    shipping = [
        "Z-BOX a výdejní místa Zásilkovny",
        "Balíkovna — pobočky, pošty i boxy",
        "Doručení na adresu a osobní odběr",
        "PPL, DPD a Česká pošta po nastavení API",
        "Oficiální mapy dopravců + záložní mapa",
        "Vlastní ceny, limity dopravy zdarma a ETA",
    ]
    top = columns_top + 72
    for item in shipping:
        top = draw_bullet(c, item, M + 16, top, col_w - 32, size=8.4, leading=11, dot_color=TERRACOTTA)
        top += 8

    round_rect_top(c, M + 16, columns_top + 263, col_w - 32, 51, 12, fill=CREAM)
    draw_text(c, "Výdejní místo bez hádání", M + 29, columns_top + 274, font=OUTFIT_SEMI, size=8.2, color=FOREST)
    draw_wrapped(c, "Zákazník vybírá přímo v živé mapě Packety nebo České pošty.", M + 29, columns_top + 292, col_w - 58, font=OUTFIT, size=7.4, leading=9.2, color=INK_SOFT)

    # Payment column.
    rx = M + col_w + gap
    round_rect_top(c, rx, columns_top, col_w, 333, 17, fill=PAPER, stroke=LINE, line_width=.7)
    draw_icon(c, "card", rx + 28, columns_top + 29, radius=15, bg=PALE_GREEN, fg=FOREST_2)
    draw_text(c, "Platby", rx + 51, columns_top + 18, font=FRAUNCES_SEMI, size=16, color=INK)
    draw_text(c, "od QR po online kartu", rx + 51, columns_top + 39, font=OUTFIT, size=7.5, color=MUTED)
    payments = [
        "Bankovní převod s QR kódem SPD a variabilním symbolem",
        "Online karta přes zabezpečenou bránu Comgate",
        "Apple Pay a Google Pay podle konfigurace obchodníka",
        "Dobírka a karta při převzetí",
        "Hotovost při osobním odběru",
        "Opětovné spuštění nedokončené online platby",
    ]
    top = columns_top + 72
    for item in payments:
        top = draw_bullet(c, item, rx + 16, top, col_w - 32, size=8.4, leading=11, dot_color=FOREST_2)
        top += 8
    round_rect_top(c, rx + 16, columns_top + 263, col_w - 32, 51, 12, fill=CREAM)
    draw_text(c, "Stav platby se ověřuje", rx + 29, columns_top + 274, font=OUTFIT_SEMI, size=8.2, color=FOREST)
    draw_wrapped(c, "Systém nespoléhá jen na návratovou URL — výsledek kontroluje přes API brány.", rx + 29, columns_top + 292, col_w - 58, font=OUTFIT, size=7.4, leading=9.2, color=INK_SOFT)

    # Bottom checkout capabilities.
    bottom_top = columns_top + 350
    bw = (CONTENT_W - 2 * 10) / 3
    mini = [
        ("user", "Host i přihlášený", "Uložené adresy urychlí další nákup."),
        ("search", "ARES", "Načtení názvu a sídla firmy podle IČO."),
        ("doc", "Po objednávce", "Potvrzení, sledování a faktura v PDF."),
    ]
    for idx, (icon, title, text) in enumerate(mini):
        x = M + idx * (bw + 10)
        round_rect_top(c, x, bottom_top, bw, 82, 13, fill=INK if idx == 1 else CREAM_DEEP)
        draw_icon(c, icon, x + 22, bottom_top + 24, radius=11, bg=GOLD if idx == 1 else PAPER, fg=INK)
        draw_text(c, title, x + 40, bottom_top + 15, font=OUTFIT_SEMI, size=8.2, color=PAPER if idx == 1 else INK)
        draw_wrapped(c, text, x + 12, bottom_top + 44, bw - 24, font=OUTFIT, size=7.2, leading=9.3, color=PALE_GOLD if idx == 1 else INK_SOFT)

    draw_wrapped(c, "Pozn.: dostupnost jednotlivých dopravců a plateb se řídí konkrétním nasazením, smlouvami s poskytovateli a vyplněnými API údaji.", M, 754, CONTENT_W, font=OUTFIT, size=6.8, leading=8.7, color=MUTED)
    page_footer(c, 4)
    c.showPage()


def draw_dashboard_mockup(c: canvas.Canvas, x: float, top: float, width: float, height: float) -> None:
    bx, bt, bw, bh = browser_frame(c, x, top, width, height, bg=CREAM)
    side_w = 105
    c.setFillColor(FOREST)
    c.rect(bx, H - bt - bh, side_w, bh, fill=1, stroke=0)
    draw_logo(c, bx + 12, bt + 15, scale=.50, inverse=True)
    nav = ["Přehled", "Produkty", "Sklad", "Objednávky", "Faktury", "Zákazníci", "Stránky", "Nastavení"]
    nt = bt + 64
    for idx, label in enumerate(nav):
        if idx == 0:
            round_rect_top(c, bx + 9, nt - 5, side_w - 18, 22, 8, fill=FOREST_2)
        draw_text(c, label, bx + 18, nt, font=OUTFIT_MED if idx == 0 else OUTFIT, size=6.6, color=PAPER if idx == 0 else PALE_GOLD)
        nt += 25

    main_x = bx + side_w + 15
    main_w = bw - side_w - 30
    draw_text(c, "Přehled", main_x, bt + 18, font=FRAUNCES_SEMI, size=16, color=INK)
    stats = [("184 520 Kč", "Tržby"), ("18", "Nové objednávky"), ("4", "Nízký sklad")]
    sg = 8
    scw = (main_w - 2 * sg) / 3
    for idx, (value, label) in enumerate(stats):
        sx = main_x + idx * (scw + sg)
        round_rect_top(c, sx, bt + 48, scw, 56, 9, fill=PAPER, stroke=LINE, line_width=.5)
        draw_text(c, value, sx + 9, bt + 58, font=FRAUNCES_SEMI, size=11.5, color=TERRACOTTA if idx == 0 else FOREST)
        draw_text(c, label, sx + 9, bt + 82, font=OUTFIT, size=5.8, color=MUTED)

    # Sales chart.
    round_rect_top(c, main_x, bt + 117, main_w * .59, 129, 10, fill=PAPER, stroke=LINE, line_width=.5)
    draw_text(c, "Tržby za 30 dní", main_x + 10, bt + 127, font=OUTFIT_SEMI, size=6.8, color=INK)
    chart_x = main_x + 15
    chart_top = bt + 153
    chart_w = main_w * .59 - 30
    chart_h = 72
    for idx in range(4):
        line_top(c, chart_x, chart_top + idx * chart_h / 3, chart_x + chart_w, chart_top + idx * chart_h / 3, color=CREAM_DEEP, width=.5)
    vals = [.26, .42, .31, .56, .47, .68, .54, .83, .76, .92, .78, .98]
    step = chart_w / (len(vals) - 1)
    c.setStrokeColor(TERRACOTTA); c.setLineWidth(1.5)
    for idx in range(len(vals) - 1):
        c.line(chart_x + idx * step, H - chart_top - vals[idx] * chart_h, chart_x + (idx + 1) * step, H - chart_top - vals[idx + 1] * chart_h)
    # Orders list.
    table_x = main_x + main_w * .62
    table_w = main_w * .38
    round_rect_top(c, table_x, bt + 117, table_w, 129, 10, fill=PAPER, stroke=LINE, line_width=.5)
    draw_text(c, "Nové objednávky", table_x + 9, bt + 127, font=OUTFIT_SEMI, size=6.8, color=INK)
    rows = [("KAV-24081", "2 890 Kč"), ("KAV-24080", "1 380 Kč"), ("KAV-24079", "4 240 Kč"), ("KAV-24078", "890 Kč")]
    rt = bt + 151
    for idx, (num, total) in enumerate(rows):
        if idx:
            line_top(c, table_x + 8, rt - 5, table_x + table_w - 8, rt - 5, color=CREAM_DEEP, width=.45)
        draw_text(c, num, table_x + 9, rt, font=OUTFIT_MED, size=5.8, color=INK)
        draw_text_right(c, total, table_x + table_w - 9, rt, font=OUTFIT_SEMI, size=5.8, color=TERRACOTTA)
        rt += 23


def page_five(c: canvas.Canvas) -> None:
    fill_page(c)
    page_header(c, 5, "Administrace")
    section_intro(
        c,
        "Každodenní provoz",
        "Administrace, která drží obchod pohromadě.",
        "Méně tabulek bokem, méně ručního přepisování. KAVKA dává týmu jeden přehled od skladu přes objednávku až po účetní export.",
        title_size=27,
    )
    draw_dashboard_mockup(c, M, 212, CONTENT_W, 315)

    # Feature columns under dashboard.
    top = 550
    gap = 12
    cw = (CONTENT_W - 2 * gap) / 3
    groups = [
        ("Produkty a prodej", TERRACOTTA, [
            "Produkty, kategorie a fotky v R2",
            "Sklad, limity a historie pohybů",
            "Objednávky, stav platby a storno s vratkou skladu",
            "Zákazníci, kupóny, dárkové poukazy a recenze",
        ]),
        ("Doklady a expedice", FOREST_2, [
            "Automatické faktury, řada, VS, DPH a PDF/tisk",
            "Reklamace a jejich stav",
            "Štítky České pošty, PPL a DPD po nastavení API",
            "Sledovací číslo a odkaz u objednávky",
        ]),
        ("Data a nastavení", TERRACOTTA, [
            "iDoklad CSV, Fakturoid CSV a POHODA XML",
            "Univerzální CSV faktur a objednávek",
            "Doprava, platby a vlastní výdejní místa",
            "Právní, bankovní, e-mailové a provozní údaje",
        ]),
    ]
    for idx, (title, accent, items) in enumerate(groups):
        x = M + idx * (cw + gap)
        round_rect_top(c, x, top, cw, 195, 15, fill=PAPER, stroke=LINE, line_width=.65)
        c.setFillColor(accent); c.roundRect(x, H - top - 5, cw, 5, 2.5, fill=1, stroke=0)
        draw_text(c, title, x + 14, top + 18, font=FRAUNCES_SEMI, size=12.5, color=INK)
        bt = top + 51
        for item in items:
            bt = draw_bullet(c, item, x + 12, bt, cw - 24, size=7.7, leading=10.1, dot_color=accent)
            bt += 7

    page_footer(c, 5)
    c.showPage()


def draw_editor_mockup(c: canvas.Canvas, x: float, top: float, width: float, height: float) -> None:
    bx, bt, bw, bh = browser_frame(c, x, top, width, height, bg=CREAM)
    toolbox = 118
    c.setFillColor(PAPER); c.rect(bx, H - bt - bh, toolbox, bh, fill=1, stroke=0)
    line_top(c, bx + toolbox, bt, bx + toolbox, bt + bh, color=LINE, width=.6)
    draw_text(c, "BLOKY", bx + 12, bt + 15, font=OUTFIT_SEMI, size=6.1, color=TERRACOTTA)
    round_rect_top(c, bx + 10, bt + 32, toolbox - 20, 20, 10, fill=CREAM)
    draw_text(c, "Hledat blok…", bx + 21, bt + 38, font=OUTFIT, size=5.6, color=MUTED)
    tools = [("H", "Nadpis"), ("¶", "Odstavec"), ("★", "Hero sekce"), ("▦", "Produkty"), ("?", "FAQ"), ("▤", "Galerie"), ("◎", "Výzva k akci"), ("⇩", "Soubor")]
    tt = bt + 67
    for idx, (symbol, label) in enumerate(tools):
        round_rect_top(c, bx + 10, tt, toolbox - 20, 25, 7, fill=CREAM_DEEP if idx == 2 else PAPER, stroke=LINE, line_width=.4)
        draw_text_center(c, symbol, bx + 24, tt + 6, font=OUTFIT_SEMI, size=7.2, color=TERRACOTTA if idx == 2 else FOREST)
        draw_text(c, label, bx + 37, tt + 7, font=OUTFIT_MED, size=5.9, color=INK)
        tt += 31

    canvas_x = bx + toolbox + 15
    canvas_w = bw - toolbox - 30
    # Editor toolbar.
    draw_text(c, "Úvodní stránka", canvas_x, bt + 15, font=FRAUNCES_SEMI, size=11, color=INK)
    draw_pill(c, "ULOŽIT", canvas_x + canvas_w - 52, bt + 10, bg=INK, fg=PAPER, size=5.1, pad_x=8, height=18)
    draw_text(c, "↶  ↷", canvas_x + canvas_w - 90, bt + 14, font=OUTFIT_SEMI, size=7, color=MUTED)
    # Hero block.
    round_rect_top(c, canvas_x, bt + 45, canvas_w, 137, 9, fill=FOREST)
    draw_image_cover(c, ROOT / "public" / "hero.jpg", canvas_x + canvas_w * .56, bt + 45, canvas_w * .44, 137)
    draw_text(c, "ATELIÉR KAVKA", canvas_x + 13, bt + 64, font=OUTFIT_SEMI, size=5.3, color=GOLD)
    draw_wrapped(c, "Domov, který\ndýchá pomalu", canvas_x + 13, bt + 82, canvas_w * .47, font=FRAUNCES_SEMI, size=12.5, leading=13, color=PAPER)
    draw_pill(c, "PROCHÁZET KATALOG", canvas_x + 13, bt + 122, bg=TERRACOTTA, fg=PAPER, size=4.4, pad_x=7, height=16)
    # Selection outline + block controls.
    c.setStrokeColor(TERRACOTTA); c.setLineWidth(1); c.roundRect(canvas_x - 2, H - (bt + 45) - 141, canvas_w + 4, 141, 11, fill=0, stroke=1)
    round_rect_top(c, canvas_x + canvas_w - 54, bt + 37, 54, 15, 6, fill=TERRACOTTA)
    draw_text(c, "↑ ↓  ⋮  ×", canvas_x + canvas_w - 47, bt + 40, font=OUTFIT_SEMI, size=5.2, color=PAPER)
    # Product block preview.
    draw_text(c, "Doporučujeme", canvas_x, bt + 199, font=FRAUNCES_SEMI, size=10, color=INK)
    pw = (canvas_w - 12) / 3
    products = [("hrnek.jpg", "Hrnek"), ("svicka.jpg", "Svíčka"), ("vaza.jpg", "Váza")]
    for idx, (img, label) in enumerate(products):
        px = canvas_x + idx * (pw + 6)
        round_rect_top(c, px, bt + 220, pw, 83, 7, fill=PAPER, stroke=LINE, line_width=.4)
        draw_image_cover(c, ROOT / "public" / "products" / img, px, bt + 220, pw, 56)
        draw_text(c, label, px + 6, bt + 280, font=FRAUNCES_SEMI, size=5.9, color=INK)


def page_six(c: canvas.Canvas) -> None:
    fill_page(c)
    page_header(c, 6, "Obsah a značka")
    section_intro(
        c,
        "Tvorba bez vývojáře",
        "Obsah, který si upravíte sami.",
        "Vizuální editor staví běžné i systémové stránky z hotových bloků. Značka, navigace i vzhled zůstávají pod vaší kontrolou.",
        title_size=27,
    )
    draw_editor_mockup(c, M, 214, 338, 455)

    right_x = M + 356
    right_w = W - M - right_x
    draw_text(c, "35+ BLOKŮ", right_x, 223, font=OUTFIT_SEMI, size=6.8, color=TERRACOTTA)
    draw_wrapped(c, "Od hero sekce po vlastní HTML.", right_x, 244, right_w, font=FRAUNCES_SEMI, size=16, leading=18, color=INK)
    block_groups = [
        ("Obsah", "nadpisy, text, citáty, seznamy, tabulky"),
        ("Média", "obrázky, galerie, video, mapa, bannery"),
        ("E-shop", "produkty, kategorie, ceníky, CTA, odpočet"),
        ("Důvěra", "FAQ, reference, tým, timeline, statistiky"),
        ("Kontakt", "newsletter, sociální sítě, soubory, kontakt"),
    ]
    top = 306
    for title, text in block_groups:
        round_rect_top(c, right_x, top, right_w, 55, 11, fill=PAPER, stroke=LINE, line_width=.55)
        draw_text(c, title, right_x + 12, top + 10, font=OUTFIT_SEMI, size=7.7, color=FOREST)
        draw_wrapped(c, text, right_x + 12, top + 28, right_w - 24, font=OUTFIT, size=7.1, leading=9, color=INK_SOFT)
        top += 63

    round_rect_top(c, right_x, 626, right_w, 112, 13, fill=FOREST)
    draw_text(c, "PŘESNĚ PODLE ZNAČKY", right_x + 13, 638, font=OUTFIT_SEMI, size=6.1, color=GOLD)
    draw_wrapped(c, "Vzhled od stránky po každý blok.", right_x + 13, 656, right_w - 26, font=FRAUNCES, size=10, leading=11.5, color=PAPER)
    draw_wrapped(c, "Barvy, stíny, SVG logo, menu a carousel. U bloků nastavíte odsazení, pozadí, šířku, kotvy, animaci i skrytí na mobilu.", right_x + 13, 690, right_w - 26, font=OUTFIT, size=6.35, leading=8, color=PALE_GOLD)

    # Editing and SEO strips.
    rows = [
        (744, ["Drag & drop", "Undo / redo", "Ctrl+S", "Meta title", "Noindex", "Drobenka"]),
        (768, ["Nová / smazat stránku", "Ukázkové bloky", "Systémové stránky"]),
    ]
    for strip_top, tags in rows:
        x = M
        for tag in tags:
            width = draw_pill(c, tag, x, strip_top, bg=CREAM_DEEP, fg=INK_SOFT, font=OUTFIT_MED, size=5.7, pad_x=7, height=18)
            x += width + 5
    page_footer(c, 6)
    c.showPage()


def page_seven(c: canvas.Canvas) -> None:
    fill_page(c)
    page_header(c, 7, "Marketing a retence")
    intro_end = section_intro(
        c,
        "Nejen získat. Také vrátit.",
        "Růstové nástroje přímo v e-shopu.",
        "KAVKA pracuje s momenty, kdy zákazník váhá, odchází nebo čeká na zboží — a proměňuje je v další příležitost k nákupu.",
        title_size=27,
    )

    # Lifecycle ribbon.
    ribbon_top = intro_end + 20
    phases = [
        ("01", "Zaujmout", "obsah · feedy"),
        ("02", "Přesvědčit", "recenze · kupóny"),
        ("03", "Zvýšit košík", "upsell"),
        ("04", "Zachránit", "opuštěný košík"),
        ("05", "Vrátit", "e-mail · push"),
    ]
    pgap = 7
    pw = (CONTENT_W - 4 * pgap) / 5
    for idx, (num, title, small) in enumerate(phases):
        x = M + idx * (pw + pgap)
        bg = FOREST if idx in (0, 4) else PAPER
        round_rect_top(c, x, ribbon_top, pw, 82, 13, fill=bg, stroke=None if idx in (0, 4) else LINE, line_width=.6)
        draw_text(c, num, x + 10, ribbon_top + 10, font=OUTFIT_SEMI, size=6.2, color=GOLD if idx in (0, 4) else TERRACOTTA)
        draw_wrapped(c, title, x + 10, ribbon_top + 27, pw - 20, font=FRAUNCES_SEMI, size=10.5, leading=11.5, color=PAPER if idx in (0, 4) else INK)
        draw_text(c, small, x + 10, ribbon_top + 62, font=OUTFIT, size=5.7, color=PALE_GOLD if idx in (0, 4) else MUTED)

    cards_top = ribbon_top + 103
    gap = 12
    cw = (CONTENT_W - gap) / 2
    cards = [
        ("growth", "Kupóny a první nákup", "Procentní i pevné slevy, minimální hodnota, limit použití, přihlášení a jednorázový kupón pro první objednávku.", TERRACOTTA),
        ("cart", "Upsell v košíku", "Doporučené doplňky se přidají jedním klikem — například zápalky ke svíčce.", FOREST_2),
        ("mail", "Opuštěný košík", "Opouštěcí pop-up se slevou a třístupňová e-mailová série spouštěná automaticky cronem.", TERRACOTTA),
        ("mobile", "Hlídací pes a Web Push", "Po naskladnění systém odešle e-mail a při souhlasu také upozornění do prohlížeče.", FOREST_2),
        ("mail", "Transakční e-maily", "Potvrzení objednávky, změny stavu, naskladnění i záznam úspěchu nebo chyby přes Resend.", TERRACOTTA),
        ("chart", "Měřit, ne hádat", "GTM, GA4 a Meta Pixel načtené až po souhlasu; události view_item, add_to_cart a purchase.", FOREST_2),
    ]
    ch = 112
    for idx, (icon, title, text, accent) in enumerate(cards):
        col, row = idx % 2, idx // 2
        feature_card(c, M + col * (cw + gap), cards_top + row * (ch + 10), cw, ch, icon=icon, title=title, text=text, accent=accent)

    callout_top = cards_top + 3 * ch + 20
    round_rect_top(c, M, callout_top, CONTENT_W, 56, 14, fill=INK)
    draw_text(c, "AUTOMATIZACE, KTERÉ PRACUJÍ I PO ZAVŘENÍ NOTEBOOKU", M + 16, callout_top + 14, font=OUTFIT_SEMI, size=6.8, color=GOLD)
    draw_wrapped(c, "Cron spouští následné e-maily a údržbu; administrátor je může spustit i ručně.", M + 16, callout_top + 33, CONTENT_W - 32, font=FRAUNCES, size=10, leading=12, color=PAPER)

    page_footer(c, 7)
    c.showPage()


def page_eight(c: canvas.Canvas) -> None:
    fill_page(c)
    page_header(c, 8, "Viditelnost a data")
    intro_end = section_intro(
        c,
        "Aby byl obchod vidět",
        "Připraveno pro vyhledávače, srovnávače i AI.",
        "Produkty lze posílat do prodejních kanálů a současně je popsat tak, aby jim rozuměl Google, sociální sítě i moderní AI vyhledávání.",
        title_size=27,
    )

    # Feeds row.
    feed_top = intro_end + 22
    feeds = [
        ("HEUREKA", "XML", TERRACOTTA),
        ("ZBOŽÍ.CZ", "XML", FOREST_2),
        ("GOOGLE SHOPPING", "XML", TERRACOTTA),
        ("OPENAI SHOPPING", "JSONL.GZ", FOREST_2),
    ]
    gap = 9
    fw = (CONTENT_W - 3 * gap) / 4
    for idx, (name, kind, accent) in enumerate(feeds):
        x = M + idx * (fw + gap)
        round_rect_top(c, x, feed_top, fw, 104, 14, fill=PAPER, stroke=LINE, line_width=.65)
        draw_icon(c, "feed", x + 24, feed_top + 28, radius=13, bg=PALE_TERRA if idx % 2 == 0 else PALE_GREEN, fg=accent)
        draw_wrapped(c, name, x + 12, feed_top + 49, fw - 24, font=OUTFIT_SEMI, size=7.1, leading=8.5, color=INK)
        draw_pill(c, kind, x + 12, feed_top + 76, bg=CREAM_DEEP, fg=MUTED, font=OUTFIT_SEMI, size=5.3, pad_x=6, height=16)

    # Search result / structured data illustration.
    panel_top = feed_top + 127
    left_w = 304
    round_rect_top(c, M, panel_top, left_w, 325, 17, fill=PAPER, stroke=LINE, line_width=.7)
    draw_text(c, "Jak KAVKA popisuje obchod", M + 18, panel_top + 18, font=FRAUNCES_SEMI, size=16, color=INK)
    draw_wrapped(c, "Strukturovaná data jsou vložena už do prvotního HTML — pro crawlery i sdílení.", M + 18, panel_top + 46, left_w - 36, font=OUTFIT, size=8.2, leading=11, color=INK_SOFT)
    # Search card.
    round_rect_top(c, M + 18, panel_top + 91, left_w - 36, 126, 12, fill=CREAM, stroke=LINE, line_width=.5)
    draw_text(c, "kavka.shop › produkt › keramicky-hrnek", M + 31, panel_top + 104, font=OUTFIT, size=5.8, color=FOREST_2)
    draw_wrapped(c, "Keramický hrnek Hlína — KAVKA", M + 31, panel_top + 123, left_w - 62, font=FRAUNCES_SEMI, size=11.7, leading=13, color=INK)
    draw_text(c, "Hodnocení 4,9 / 5  ·  490 Kč  ·  Skladem", M + 31, panel_top + 153, font=OUTFIT_SEMI, size=6.7, color=TERRACOTTA)
    draw_wrapped(c, "Ručně točený hrnek s tečkovanou glazurou. Doručení od 59 Kč.", M + 31, panel_top + 174, left_w - 62, font=OUTFIT, size=6.9, leading=9.1, color=INK_SOFT)
    # JSON-LD chips.
    tags = ["Organization", "WebSite + SearchAction", "Product + Offer", "shippingDetails", "BreadcrumbList"]
    tx, tt = M + 18, panel_top + 239
    max_x = M + left_w - 18
    for tag in tags:
        expected = pdfmetrics.stringWidth(tag, OUTFIT_MED, 5.8) + 14
        if tx + expected > max_x:
            tx = M + 18; tt += 24
        tw = draw_pill(c, tag, tx, tt, bg=PALE_GOLD, fg=INK_SOFT, font=OUTFIT_MED, size=5.8, pad_x=7, height=18)
        tx += tw + 5

    # Right capabilities.
    rx = M + left_w + 15
    rw = W - M - rx
    groups = [
        ("search", "SEO na každé stránce", ["vlastní titulek a meta popis", "canonical a noindex", "Open Graph / Twitter náhled", "sitemap.xml a robots.txt"]),
        ("chart", "Analytika se souhlasem", ["Google Tag Manager", "Google Analytics 4", "Meta Pixel", "e-commerce události"]),
        ("growth", "Technický výkon", ["AVIF a WebP varianty", "vrstvená edge cache", "verzování cache po změně", "chytré umístění Workeru u D1"]),
    ]
    top = panel_top
    heights = [101, 101, 101]
    for idx, (icon, title, items) in enumerate(groups):
        round_rect_top(c, rx, top, rw, heights[idx], 14, fill=FOREST if idx == 2 else CREAM_DEEP)
        draw_icon(c, icon, rx + 24, top + 26, radius=12, bg=GOLD if idx == 2 else PAPER, fg=INK if idx == 2 else TERRACOTTA)
        draw_text(c, title, rx + 44, top + 17, font=FRAUNCES_SEMI, size=11.3, color=PAPER if idx == 2 else INK)
        bt = top + 48
        for item in items:
            draw_text(c, "•", rx + 13, bt, font=OUTFIT_SEMI, size=7, color=GOLD if idx == 2 else TERRACOTTA)
            draw_text(c, item, rx + 23, bt, font=OUTFIT, size=6.9, color=PALE_GOLD if idx == 2 else INK_SOFT)
            bt += 12
        top += heights[idx] + 10

    round_rect_top(c, rx, top, rw, 34, 12, fill=TERRACOTTA)
    draw_text_center(c, "VIDITELNOST → NÁVŠTĚVA → NÁKUP", rx + rw / 2, top + 12, font=OUTFIT_SEMI, size=6.4, color=PAPER)

    page_footer(c, 8)
    c.showPage()


def arrow(c: canvas.Canvas, x1: float, top1: float, x2: float, top2: float, *, color=LINE, width=1.3) -> None:
    y1, y2 = ty(top1), ty(top2)
    c.setStrokeColor(color); c.setFillColor(color); c.setLineWidth(width)
    c.line(x1, y1, x2, y2)
    angle = math.atan2(y2 - y1, x2 - x1)
    length = 6
    for delta in (2.55, -2.55):
        c.line(x2, y2, x2 + length * math.cos(angle + delta), y2 + length * math.sin(angle + delta))


def architecture_node(c: canvas.Canvas, x: float, top: float, width: float, height: float, *, icon: str, title: str, text: str, bg=PAPER, accent=TERRACOTTA, dark=False) -> None:
    round_rect_top(c, x, top, width, height, 14, fill=bg, stroke=None if dark else LINE, line_width=.65)
    draw_icon(c, icon, x + 24, top + 27, radius=12, bg=GOLD if dark else (PALE_TERRA if accent == TERRACOTTA else PALE_GREEN), fg=INK if dark else accent)
    draw_text(c, title, x + 44, top + 17, font=FRAUNCES_SEMI, size=11.2, color=PAPER if dark else INK)
    draw_wrapped(c, text, x + 13, top + 49, width - 26, font=OUTFIT, size=7.1, leading=9.3, color=PALE_GOLD if dark else INK_SOFT)


def page_nine(c: canvas.Canvas) -> None:
    fill_page(c)
    page_header(c, 9, "Technologie a bezpečnost")
    intro_end = section_intro(
        c,
        "Pevné základy",
        "Rychlé jádro na infrastruktuře Cloudflare.",
        "Veřejný web, serverová logika, databáze i soubory tvoří jeden celek. Externí služby se připojují pouze tam, kde dávají obchodní smysl.",
        title_size=27,
    )

    # Architecture diagram.
    diagram_top = intro_end + 25
    node_w = 126
    architecture_node(c, M, diagram_top + 77, node_w, 100, icon="mobile", title="Zákazník", text="Responzivní web, PWA, košík a účet.", bg=PAPER, accent=TERRACOTTA)
    center_x = M + 188
    architecture_node(c, center_x, diagram_top, 184, 112, icon="cloud", title="Cloudflare Pages + Workers", text="Frontend, API, edge cache, SEO middleware a serverová logika.", bg=FOREST, accent=FOREST_2, dark=True)
    architecture_node(c, center_x, diagram_top + 139, 84, 103, icon="db", title="D1", text="SQL data obchodu.", bg=PAPER, accent=TERRACOTTA)
    architecture_node(c, center_x + 100, diagram_top + 139, 84, 103, icon="cloud", title="R2", text="Fotky a zálohy.", bg=PAPER, accent=FOREST_2)
    right_x = W - M - node_w
    architecture_node(c, right_x, diagram_top + 77, node_w, 100, icon="feed", title="Integrace", text="Dopravci, platby, e-mail, měření a feedy.", bg=PAPER, accent=FOREST_2)
    arrow(c, M + node_w + 8, diagram_top + 127, center_x - 8, diagram_top + 56, color=TERRACOTTA)
    arrow(c, center_x + 92, diagram_top + 118, center_x + 42, diagram_top + 132, color=LINE)
    arrow(c, center_x + 92, diagram_top + 118, center_x + 142, diagram_top + 132, color=LINE)
    arrow(c, center_x + 192, diagram_top + 56, right_x - 8, diagram_top + 127, color=FOREST_2)

    # Platform facts.
    facts_top = diagram_top + 270
    facts = [
        ("cloud", "Jádro bez Vercelu a Firebase", "Přihlášení používá vlastní cookie session a D1; hosting webu i API zůstává na Cloudflare."),
        ("growth", "Výkon u zákazníka", "AVIF/WebP obrázky, edge cache, verzování cache a smart placement Workeru u databáze."),
    ]
    gap = 12
    fw = (CONTENT_W - gap) / 2
    for idx, (icon, title, text) in enumerate(facts):
        feature_card(c, M + idx * (fw + gap), facts_top, fw, 100, icon=icon, title=title, text=text, accent=TERRACOTTA if idx == 0 else FOREST_2)

    # Security and operations.
    sec_top = facts_top + 122
    left_w = 244
    round_rect_top(c, M, sec_top, left_w, 170, 16, fill=INK)
    draw_icon(c, "shield", M + 28, sec_top + 30, radius=15, bg=GOLD, fg=INK)
    draw_text(c, "Bezpečnost", M + 52, sec_top + 19, font=FRAUNCES_SEMI, size=15, color=PAPER)
    security = [
        "Dvoufázové ověření TOTP pro administrátory",
        "Rate limiting proti hádání hesel",
        "Content-Security-Policy a bezpečnostní hlavičky",
        "Ověření výsledku online platby přes API",
        "Souhlasové načítání analytických skriptů",
    ]
    bt = sec_top + 63
    for item in security:
        bt = draw_bullet(c, item, M + 16, bt, left_w - 32, size=7.7, leading=10.1, color=PALE_GOLD, dot_color=TERRACOTTA)
        bt += 7

    rx = M + left_w + 14
    rw = W - M - rx
    round_rect_top(c, rx, sec_top, rw, 170, 16, fill=PAPER, stroke=LINE, line_width=.65)
    draw_icon(c, "db", rx + 28, sec_top + 30, radius=15, bg=PALE_GREEN, fg=FOREST_2)
    draw_text(c, "Provoz a obnova", rx + 52, sec_top + 19, font=FRAUNCES_SEMI, size=15, color=INK)
    operations = [
        "Záloha D1 do R2 jedním klikem",
        "Údržba logů a starých prázdných košíků",
        "Cron pro opuštěné košíky a pravidelnou údržbu",
        "E-mailový log včetně chyb a testu odeslání",
        "Offline fallback přes service worker",
    ]
    bt = sec_top + 63
    for item in operations:
        bt = draw_bullet(c, item, rx + 16, bt, rw - 32, size=7.7, leading=10.1, dot_color=FOREST_2)
        bt += 7

    page_footer(c, 9)
    c.showPage()


def draw_qr(c: canvas.Canvas, value: str, x: float, top: float, size: float) -> None:
    widget = QrCodeWidget(value)
    bounds = widget.getBounds()
    bw, bh = bounds[2] - bounds[0], bounds[3] - bounds[1]
    drawing = Drawing(size, size, transform=[size / bw, 0, 0, size / bh, 0, 0])
    drawing.add(widget)
    renderPDF.draw(drawing, c, x, H - top - size)


def checklist_column(c: canvas.Canvas, x: float, top: float, width: float, title: str, items: Sequence[str], *, accent=TERRACOTTA) -> None:
    draw_text(c, title, x, top, font=FRAUNCES_SEMI, size=11, color=INK)
    bt = top + 27
    for item in items:
        bt = draw_bullet(c, item, x, bt, width, size=6.8, leading=8.7, dot_color=accent)
        bt += 4.7


def page_ten(c: canvas.Canvas) -> None:
    fill_page(c)
    # Dark sales close.
    c.setFillColor(FOREST); c.rect(0, H - 345, W, 345, fill=1, stroke=0)
    # Decorative bird watermark.
    c.saveState(); set_alpha(c, fill=.06); draw_mark(c, 435, 36, 118, box=PAPER, bird=FOREST, eye=TERRACOTTA); c.restoreState()
    draw_logo(c, M, 38, scale=.95, inverse=True)
    draw_tracking(c, "DALŠÍ KROK", M, 112, font=OUTFIT_SEMI, size=6.8, tracking=1.5, color=GOLD)
    draw_wrapped(c, "Pojďme postavit e-shop,\nkterý sedí vašemu podnikání.", M, 140, 405, font=FRAUNCES_SEMI, size=28, leading=30, color=PAPER)
    draw_wrapped(c, "Demo ukazuje funkční základ KAVKA. Produkční nasazení přizpůsobíme značce, sortimentu, dopravcům, platbám a procesům konkrétního obchodu.", M, 213, 375, font=OUTFIT, size=9.1, leading=12.7, color=PALE_GOLD)

    # Contact card and QR.
    round_rect_top(c, M, 282, 378, 43, 21.5, fill=TERRACOTTA)
    draw_text(c, "Jan Minařík", M + 18, 293, font=OUTFIT_SEMI, size=8.7, color=PAPER)
    draw_text(c, "jmweb.cz", M + 114, 293, font=OUTFIT_SEMI, size=8.7, color=PAPER)
    draw_text(c, "+420 776 677 399", M + 199, 293, font=OUTFIT_SEMI, size=8.7, color=PAPER)
    c.linkURL("https://jmweb.cz", (M + 104, H - 320, M + 181, H - 286), relative=0)
    draw_qr(c, "https://jmweb.cz", 474, 245, 76)
    draw_text_center(c, "jmweb.cz", 512, 325, font=OUTFIT_SEMI, size=5.8, color=GOLD)

    # Transparent deployment scope.
    draw_tracking(c, "CO SE DOLADÍ PŘED SPUŠTĚNÍM", M, 376, font=OUTFIT_SEMI, size=6.8, tracking=1.3, color=TERRACOTTA)
    deploy = [
        "značka, doména, firemní a právní údaje",
        "produkty, kategorie, ceny, sklad a obsah",
        "Cloudflare D1/R2 a produkční prostředí",
        "dopravci, mapy, API klíče a ceny dopravy",
        "platební brána, bankovní účet a peněženky",
        "e-mailová doména, Resend, měření a feedy",
        "testovací objednávka, faktura, bezpečnost a předání",
    ]
    top = 401
    cols = 2
    gap = 24
    dw = (CONTENT_W - gap) / cols
    split = math.ceil(len(deploy) / 2)
    for idx, item in enumerate(deploy):
        col = 0 if idx < split else 1
        row = idx if col == 0 else idx - split
        draw_bullet(c, item, M + col * (dw + gap), top + row * 29, dw, size=7.7, leading=9.8, dot_color=TERRACOTTA if col == 0 else FOREST_2)

    # Compact complete checklist.
    line_top(c, M, 533, W - M, 533, color=LINE, width=.7)
    draw_tracking(c, "RYCHLÝ PŘEHLED HLAVNÍCH FUNKCÍ", M, 550, font=OUTFIT_SEMI, size=6.8, tracking=1.35, color=TERRACOTTA)
    col_gap = 10
    col_w = (CONTENT_W - 3 * col_gap) / 4
    checklist_column(c, M, 576, col_w, "Prodej", [
        "katalog, hledání a filtry",
        "detail, galerie, recenze",
        "oblíbené a historie zobrazení",
        "košík, kupóny a upsell",
        "host, účet, adresy, reklamace",
        "PWA, offline a Web Push",
    ], accent=TERRACOTTA)
    checklist_column(c, M + (col_w + col_gap), 576, col_w, "Pokladna", [
        "ARES a firemní nákup",
        "Packeta a Balíkovna mapy",
        "adresa a osobní odběr",
        "QR, karta, peněženky, dobírka",
        "sledování a doplatek",
        "automatická faktura PDF",
    ], accent=FOREST_2)
    checklist_column(c, M + 2 * (col_w + col_gap), 576, col_w, "Správa", [
        "produkty, sklad, objednávky",
        "zákazníci, kupóny, recenze",
        "reklamace, doprava, platby",
        "faktury a účetní exporty",
        "štítky dopravců",
        "35+ bloků a vlastní vzhled",
    ], accent=TERRACOTTA)
    checklist_column(c, M + 3 * (col_w + col_gap), 576, col_w, "Růst a provoz", [
        "feedy Heureka / Zboží / Google / AI",
        "GTM, GA4, Meta a události",
        "e-maily a opuštěný košík",
        "SEO, JSON-LD a sitemap",
        "2FA, CSP, rate limiting",
        "cache, AVIF a zálohy",
    ], accent=FOREST_2)

    round_rect_top(c, M, 748, CONTENT_W, 35, 17.5, fill=INK)
    draw_text_center(c, "CENA A ROZSAH NASAZENÍ PODLE DOHODY  ·  DOMLUVTE SI UKÁZKU NA JMWEB.CZ", W / 2, 760, font=OUTFIT_SEMI, size=6.7, color=PAPER)
    c.linkURL("https://jmweb.cz", (M, H - 783, W - M, H - 748), relative=0)
    page_footer(c, 10)
    c.showPage()


def build() -> Path:
    register_fonts()
    MARKETING.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(OUTPUT), pagesize=A4, pageCompression=1)
    c.setTitle("KAVKA — prodejní brožura e-shop systému")
    c.setAuthor("KAVKA / Jan Minařík / jmweb.cz")
    c.setSubject("Přehled hlavních funkcí e-shop systému KAVKA")
    c.setKeywords("KAVKA, e-shop systém, český e-shop, Cloudflare, prodejní brožura")
    c.setCreator("KAVKA brochure generator")

    cover(c)
    page_two(c)
    page_three(c)
    page_four(c)
    page_five(c)
    page_six(c)
    page_seven(c)
    page_eight(c)
    page_nine(c)
    page_ten(c)
    c.save()
    return OUTPUT


if __name__ == "__main__":
    path = build()
    print(path)
