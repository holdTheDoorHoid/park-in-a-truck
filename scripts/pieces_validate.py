#!/usr/bin/env python3
"""Side-by-side validation images: the printed park pieces (stitched from the
PDF) next to PlanView's render of the extracted data, one PNG per set.

  1. ~/Desktop/park-in-a-truck/source/.venv/bin/python scripts/extract_pieces.py
     (writes the stitched source composites to source/work/pieces/)
  2. PIECES_SVG_DIR=<dir> npx vitest run src/lib/pieces/__tests__/planview.test.ts
  3. ~/Desktop/park-in-a-truck/source/.venv/bin/python scripts/pieces_validate.py <dir>

Output: docs/pieces-validation/<set>.png (kept under ~300 KB each).
"""
from __future__ import annotations

import io
import os
import sys

import numpy as np
import pymupdf as fitz
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
WORK = os.path.expanduser('~/Desktop/park-in-a-truck/source/work/pieces')
OUT = os.path.join(REPO, 'docs', 'pieces-validation')
THEMES = ['edible', 'sanctuary', 'nature', 'event']
SVG_PX_PER_FT = 16  # PlanView scale used by the SVG export
MARGIN_FT = 2.5
LIMIT = 300 * 1024


def render_svg(path: str) -> Image.Image:
    doc = fitz.open(path)
    pm = doc[0].get_pixmap(alpha=False)
    im = Image.frombytes('RGB', (pm.width, pm.height), pm.samples)
    m = int(MARGIN_FT * SVG_PX_PER_FT)
    return im.crop((m, m, im.width - m, im.height - m))


def font(size):
    for f in ('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf'):
        if os.path.exists(f):
            return ImageFont.truetype(f, size)
    return ImageFont.load_default()


def build(set_id: str, svg_dir: str, px_per_ft: float) -> Image.Image:
    rows = []
    f = font(14)
    for th in THEMES:
        src = Image.open(os.path.join(WORK, f'{set_id}-{th}.png')).convert('RGB')
        ren = render_svg(os.path.join(svg_dir, f'{set_id}-{th}.svg'))
        # both are 16 px/ft; bring them to the output scale
        w = int(round(src.width / 16 * px_per_ft))
        h = int(round(src.height / 16 * px_per_ft))
        src = src.resize((w, h), Image.LANCZOS)
        ren = ren.resize((w, h), Image.LANCZOS)
        row = Image.new('RGB', (2 * w + 12, h + 22), 'white')
        d = ImageDraw.Draw(row)
        d.text((0, 2), f'{th.upper()} — printed pieces (PDF)', fill='black', font=f)
        d.text((w + 12, 2), f'{th.upper()} — extracted data (PlanView)', fill='black', font=f)
        row.paste(src, (0, 22))
        row.paste(ren, (w + 12, 22))
        rows.append(row)
    W = max(r.width for r in rows)
    H = sum(r.height + 10 for r in rows) + 30
    sheet = Image.new('RGB', (W, H), 'white')
    ImageDraw.Draw(sheet).text((0, 4), f'{set_id}  (left: the PDF art, stitched; right: the data rendered)', fill='black', font=font(16))
    y = 30
    for r in rows:
        sheet.paste(r, (0, y))
        y += r.height + 10
    return sheet


def save_small(im: Image.Image, path: str):
    for colors in (128, 64, 48, 32):
        q = im.quantize(colors=colors, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
        buf = io.BytesIO()
        q.save(buf, 'PNG', optimize=True)
        if buf.tell() <= LIMIT:
            break
    with open(path, 'wb') as fh:
        fh.write(buf.getvalue())
    return buf.tell()


def main(argv):
    svg_dir = argv[0]
    os.makedirs(OUT, exist_ok=True)
    ids = sorted({n.rsplit('-', 1)[0] for n in os.listdir(svg_dir) if n.endswith('.svg')})
    for sid in ids:
        # scale so the sheet is ~1400 px wide
        L = int(sid and Image.open(os.path.join(WORK, f'{sid}-edible.png')).width / 16)
        px = min(8.0, 690 / L)
        im = build(sid, svg_dir, px)
        n = save_small(im, os.path.join(OUT, f'{sid}.png'))
        print(sid, im.size, f'{n // 1024} KB')


if __name__ == '__main__':
    main(sys.argv[1:])
