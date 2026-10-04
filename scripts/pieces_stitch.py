"""Stage 1 of the park-piece extraction: stitch the printed tiles back into
whole pieces (frame / front / back per theme, plus the two seam strips).

Imported by extract_pieces.py. Run with source/.venv/bin/python.
"""
from __future__ import annotations

import glob
import os
import re
from dataclasses import dataclass, field

import numpy as np
import pymupdf as fitz

SRC = os.path.expanduser('~/Desktop/park-in-a-truck/source')
PT_PER_FT = 18.0  # 1/4" = 1'-0"
PX_PER_FT = 32  # analysis resolution
SCALE = PX_PER_FT / PT_PER_FT  # px per pt

THEMES = ['edible', 'sanctuary', 'nature', 'event']

# Which download link each file sits under on Dream workbook p.11 (the link
# column is the authority; some covers carry the wrong "street left/right").
# column x≈800 interior, x≈950 corner STREET RIGHT, x≈1100 corner STREET LEFT.
SETS = {
    '1e3j5d8Z': ('A', 'interior'), '1Txw_BMZ': ('A', 'corner-right'), '1LBQG4r2': ('A', 'corner-left'),
    '1LC6QvBJ': ('B', 'interior'), '1LKVUm28': ('B', 'corner-right'), '1LQmrAsZ': ('B', 'corner-left'),
    '1LR04NYM': ('C', 'interior'), '1LSWINYM': ('C', 'corner-right'), '1LJCzWBk': ('C', 'corner-left'),
    '1LfpisFC': ('D', 'interior'), '1LSqUwvH': ('D', 'corner-right'), '1LejWNaZ': ('D', 'corner-left'),
    '1L-pqs-C': ('E', 'interior'), '1LlyI3QG': ('E', 'corner-right'), '1LiE8uy8': ('E', 'corner-left'),
}


def set_path(fid: str) -> str:
    return glob.glob(f'{SRC}/linked/04_Dream_WORKBOOK_p11_*__{fid}*.pdf')[0]


@dataclass
class Tile:
    page: int  # 0-based page index
    rect: fitz.Rect  # visible area on the page, PDF points (top-down)
    img: np.ndarray | None = None  # HxWx3 uint8 at PX_PER_FT


@dataclass
class Piece:
    kind: str  # frame | front | back | lseam | wseam
    tiles: list[list[Tile]] = field(default_factory=list)  # rows of tiles
    img: np.ndarray | None = None
    # source refs: (page, [x0,y0,x1,y1] in pt) per tile
    refs: list = field(default_factory=list)

    @property
    def w_ft(self):
        return self.img.shape[1] / PX_PER_FT

    @property
    def h_ft(self):
        return self.img.shape[0] / PX_PER_FT


def page_theme(page) -> str | None:
    t = page.get_text().upper()
    # the theme name is printed bottom-right in 18pt
    for b in page.get_text('dict')['blocks']:
        for l in b.get('lines', []):
            s = ''.join(sp['text'] for sp in l['spans']).strip().upper()
            if l['spans'][0]['size'] > 15 and l['bbox'][1] > 740 and s in ('EDIBLE', 'SANCTUARY', 'NATURE', 'EVENT', 'SEAM', 'SEAMS'):
                return s.lower().rstrip('s') if s.startswith('SEAM') else s.lower()
    return None


def tiles_on(page) -> list[fitz.Rect]:
    """Visible image areas on a page: each image bbox intersected with its clip."""
    clips = [dr['scissor'] for dr in page.get_drawings(extended=True)
             if dr['type'] == 'clip' and not (dr['scissor'].width > 600 and dr['scissor'].height > 780)]
    out = []
    for info in page.get_image_info(xrefs=True):
        bb = fitz.Rect(info['bbox'])
        if bb.width < 20 or bb.height < 20:
            continue
        best, area = None, 0.0
        for c in clips:
            inter = fitz.Rect(bb) & c
            a = inter.width * inter.height if not inter.is_empty else 0
            if a > area:
                best, area = inter, a
        r = best if best is not None else (bb & page.rect)
        out.append(fitz.Rect(r))
    # de-duplicate (some pages place two copies of the same image)
    uniq = []
    for r in out:
        if not any(abs(r.x0 - u.x0) < 1 and abs(r.y0 - u.y0) < 1 and abs(r.x1 - u.x1) < 1 and abs(r.y1 - u.y1) < 1 for u in uniq):
            uniq.append(r)
    return uniq


def render_tile(doc, page_no: int, rect: fitz.Rect, cache: dict) -> np.ndarray:
    if page_no not in cache:
        # copy the page without its text so labels don't pollute the art
        tmp = fitz.open()
        tmp.insert_pdf(doc, from_page=page_no, to_page=page_no)
        p = tmp[0]
        for b in p.get_text('dict')['blocks']:
            for l in b.get('lines', []):
                p.add_redact_annot(l['bbox'])
        p.apply_redactions(images=fitz.PDF_REDACT_IMAGE_NONE, graphics=fitz.PDF_REDACT_LINE_ART_NONE)
        cache[page_no] = (tmp, p)
    _, p = cache[page_no]
    pm = p.get_pixmap(matrix=fitz.Matrix(SCALE, SCALE), clip=rect, alpha=False)
    a = np.frombuffer(pm.samples, dtype=np.uint8).reshape(pm.height, pm.width, pm.n)[:, :, :3].copy()
    return trim_white(a)


def trim_white(a: np.ndarray, thr: int = 248) -> np.ndarray:
    """Drop all-white rows/columns at the outside of a tile (page margins and
    image padding). Painted piece edges are never pure white."""
    nonwhite = (a < thr).any(axis=2)
    rows = np.where(nonwhite.mean(axis=1) > 0.02)[0]
    cols = np.where(nonwhite.mean(axis=0) > 0.02)[0]
    if len(rows) == 0 or len(cols) == 0:
        return a
    return a[rows[0]:rows[-1] + 1, cols[0]:cols[-1] + 1]


def snap_ft(a: np.ndarray) -> np.ndarray:
    """Crop a trimmed tile to whole feet, shaving the sparser edge first."""
    def shave(a, axis):
        n = a.shape[axis]
        target = max(PX_PER_FT, int(round(n / PX_PER_FT)) * PX_PER_FT)
        while n > target:
            lo = a.take(0, axis=axis)
            hi = a.take(n - 1, axis=axis)
            if (lo < 248).any(axis=-1).mean() <= (hi < 248).any(axis=-1).mean():
                a = a.take(range(1, n), axis=axis)
            else:
                a = a.take(range(0, n - 1), axis=axis)
            n -= 1
        return a
    return shave(shave(a, 0), 1)


def hstack_top(imgs: list[np.ndarray]) -> np.ndarray:
    h = max(i.shape[0] for i in imgs)
    out = []
    for i in imgs:
        if i.shape[0] < h:
            pad = np.full((h - i.shape[0], i.shape[1], 3), 255, np.uint8)
            i = np.vstack([i, pad])
        out.append(i)
    return np.hstack(out)


def vstack_left(imgs):
    w = max(i.shape[1] for i in imgs)
    out = []
    for i in imgs:
        if i.shape[1] < w:
            i = np.hstack([i, np.full((i.shape[0], w - i.shape[1], 3), 255, np.uint8)])
        out.append(i)
    return np.vstack(out)


def stitch_set(fid: str):
    """Return {theme: {frame, front, back}}, {lseam, wseam}, meta."""
    size, kind = SETS[fid]
    doc = fitz.open(set_path(fid))
    cache: dict = {}
    by_theme: dict[str, list[int]] = {}
    for i in range(5, doc.page_count):
        th = page_theme(doc[i])
        if th is None:
            raise RuntimeError(f'{fid} p{i}: no theme label')
        by_theme.setdefault(th, []).append(i)
    # seam pages: in C/D/E the last three pages are labelled SEAMS (some E
    # files label them with the theme instead); detect by the seam captions.
    seam_pages = [i for i in range(5, doc.page_count) if 'SEAM' in doc[i].get_text().upper()
                  and ('HORIZONTAL SEAM' in doc[i].get_text().upper() or 'VERTICAL SEAM' in doc[i].get_text().upper()
                       or page_theme(doc[i]) == 'seam')]
    # continuation pages of the seams carry no caption: take the trailing run
    first_seam = min(seam_pages)
    seam_pages = list(range(first_seam, doc.page_count))
    for th in list(by_theme):
        by_theme[th] = [i for i in by_theme[th] if i < first_seam]
    by_theme.pop('seam', None)

    def T(i):
        return sorted(tiles_on(doc[i]), key=lambda r: (r.y0, r.x0))

    def mk(kind_, rows, trim=False):
        """rows: list of rows, each a list of (page, rect). Tiles in a row are
        laid left to right in page order (the printed sheets tape that way);
        their vertical offset inside the row comes from the page position."""
        pc = Piece(kind_)
        row_imgs = []
        for row in rows:
            top = min(r.y0 for _, r in row)
            imgs = []
            for (pg, r) in row:
                im = render_tile(doc, pg, r, cache)
                if trim:
                    im = snap_ft(trim_white(im))
                off = int(round((r.y0 - top) * SCALE))
                if off:
                    im = np.vstack([np.full((off, im.shape[1], 3), 255, np.uint8), im])
                imgs.append(im)
                pc.refs.append({'page': pg + 1, 'bboxPt': [round(r.x0, 1), round(r.y0, 1), round(r.x1, 1), round(r.y1, 1)]})
            row_imgs.append(hstack_top(imgs))
        pc.img = vstack_left(row_imgs)
        return pc

    flipped = False
    pieces = {}
    for th in THEMES:
        pages = by_theme[th]
        tt = [T(p) for p in pages]
        if size == 'A':
            assert len(pages) == 1, (fid, th, pages)
            tl = sorted(tt[0], key=lambda r: r.width)
            assert len(tl) == 3, (fid, th, tl)
            # one page: the 4-ft end cap (frame), the back, and the long front
            pg = pages[0]
            pieces[th] = {'frame': mk('frame', [[(pg, tl[0])]], True), 'back': mk('back', [[(pg, tl[1])]], True),
                          'front': mk('front', [[(pg, tl[2])]], True)}
        elif size == 'B':
            assert len(pages) == 2, (fid, th, pages)
            p0, p1 = pages
            if len(tt[1]) == 2:  # front | frame-left ; back | frame-right
                pieces[th] = {'front': mk('front', [[(p0, tt[0][0])]]),
                              'frame': mk('frame', [[(p0, tt[0][1]), (p1, tt[1][1])]]),
                              'back': mk('back', [[(p1, tt[1][0])]])}
            else:  # mirrored print: the front runs onto the second sheet
                flipped = True
                pieces[th] = {'front': mk('front', [[(p0, tt[0][0]), (p1, tt[1][0])]]),
                              'frame': mk('frame', [[(p0, tt[0][1]), (p1, tt[1][2])]]),
                              'back': mk('back', [[(p1, tt[1][1])]])}
        elif size in ('C', 'D'):
            assert len(pages) == 6, (fid, th, pages)
            pieces[th] = {'frame': mk('frame', [[(pages[k], tt[k][0]) for k in range(3)]]),
                          'front': mk('front', [[(pages[k], tt[k][0]) for k in (3, 4)]]),
                          'back': mk('back', [[(pages[5], tt[5][0])]])}
        else:  # E: the frame's fourth side is printed as a strip above the interior pieces
            assert len(pages) == 6, (fid, th, pages)
            main = mk('frame', [[(pages[k], tt[k][0]) for k in range(3)]])
            strip = mk('frame', [[(pages[k], tt[k][0]) for k in range(3, 6)]])
            white = lambda row: (row > 245).all(axis=-1).mean()
            fr = Piece('frame')
            fr.refs = main.refs + strip.refs
            if white(main.img[2]) > white(main.img[-3]):  # open at the top
                fr.img = vstack_left([strip.img, main.img])
            else:
                fr.img = vstack_left([main.img, strip.img])
            pieces[th] = {'frame': fr,
                          'front': mk('front', [[(pages[k], tt[k][1]) for k in (3, 4)]]),
                          'back': mk('back', [[(pages[5], tt[5][1])]])}

    # seams: the tiles on the seam pages; the caption names each strip
    seams = {}
    caps = {}
    for i in seam_pages:
        for b in doc[i].get_text('dict')['blocks']:
            for l in b.get('lines', []):
                s = ''.join(sp['text'] for sp in l['spans']).strip().upper()
                if s in ('HORIZONTAL SEAM', 'VERTICAL SEAM'):
                    caps[s] = (i, fitz.Rect(l['bbox']))
    seam_tiles = [(i, r) for i in seam_pages for r in T(i)]
    import hashlib
    hashes = {}
    for th in THEMES:
        hs = []
        for p in by_theme[th]:
            for info in doc[p].get_image_info(xrefs=True):
                if info['xref']:
                    hs.append(hashlib.md5(doc.xref_stream_raw(info['xref']) or b'').hexdigest())
        hashes[th] = sorted(hs)
    meta = {'themeImageHashes': hashes, 'flipped': flipped, 'size': size, 'kind': kind, 'file': os.path.basename(set_path(fid)), 'pages': doc.page_count,
            'themePages': {th: [p + 1 for p in by_theme[th]] for th in THEMES}, 'seamPages': [p + 1 for p in seam_pages],
            'cover': ' | '.join(l.strip() for l in doc[0].get_text().split('\n') if l.strip() and ('LOT' in l or 'STREET' in l or 'SIZE' in l))}
    return pieces, seam_tiles, caps, meta, doc, cache


def fit_ft(a: np.ndarray, w_ft: int, h_ft: int) -> np.ndarray:
    """Crop or pad (white) an image to exactly w_ft x h_ft."""
    W, H = w_ft * PX_PER_FT, h_ft * PX_PER_FT
    a = a[:H, :W]
    if a.shape[0] < H:
        a = np.vstack([a, np.repeat(a[-1:], H - a.shape[0], axis=0)])
    if a.shape[1] < W:
        a = np.hstack([a, np.repeat(a[:, -1:], W - a.shape[1], axis=1)])
    return a


def longest_run(idx: np.ndarray):
    if len(idx) == 0:
        return None
    best, start = (idx[0], idx[0]), idx[0]
    for a, b in zip(idx[:-1], idx[1:]):
        if b != a + 1:
            start = b
        if b - start > best[1] - best[0]:
            best = (start, b)
    if idx[-1] - start > best[1] - best[0]:
        best = (start, idx[-1])
    return best


def find_hole(frame: np.ndarray):
    """The white 'PIECE GOES HERE' window of a frame, in whole feet (page space)."""
    white = (frame > 242).all(axis=-1)
    hr = longest_run(np.where(white.mean(axis=1) > 0.4)[0])
    if hr is None:
        return None
    hc = longest_run(np.where(white[hr[0]:hr[1] + 1].mean(axis=0) > 0.6)[0])
    f = PX_PER_FT
    return (int(round(hc[0] / f)), int(round(hr[0] / f)), int(round((hc[1] + 1) / f)), int(round((hr[1] + 1) / f)))


def compose(pieces_th: dict, size: str, flipped: bool):
    """Place frame/front/back into one nominal park (page space, feet).
    Returns dict with W, H, and for each piece its (x, y, w, h) in feet
    and fitted image; plus seamX (length seam)."""
    fr, fo, bk = pieces_th['frame'], pieces_th['front'], pieces_th['back']
    fw, fh = int(round(fo.w_ft)), int(round(fo.h_ft))
    bw, bh = int(round(bk.w_ft)), int(round(bk.h_ft))
    rw, rh = int(round(fr.w_ft)), int(round(fr.h_ft))
    out = {}
    if size == 'A':
        W, H = fw + bw + rw, max(fh, bh, rh)
        out['front'] = (0, 0, fw, fh)
        out['back'] = (fw, 0, bw, bh)
        out['frame'] = (fw + bw, 0, rw, rh)
        seam_x = fw
        hole = None
    else:
        W, H = rw, rh
        hole = find_hole(fit_ft(fr.img, rw, rh))
        hx0, hy0, hx1, hy1 = hole
        assert abs((hx1 - hx0) - (fw + bw)) <= 1 and abs((hy1 - hy0) - fh) <= 1, (hole, fw, bw, fh)
        if not flipped:
            out['front'] = (hx0, hy0, fw, fh)
            out['back'] = (hx0 + fw, hy0, bw, bh)
            seam_x = hx0 + fw
        else:
            out['back'] = (hx0, hy0, bw, bh)
            out['front'] = (hx0 + bw, hy0, fw, fh)
            seam_x = hx0 + bw
        out['frame'] = (0, 0, rw, rh)
    imgs = {k: fit_ft(p.img, out[k][2], out[k][3]) for k, p in (('frame', fr), ('front', fo), ('back', bk))}
    return {'W': W, 'H': H, 'rects': out, 'imgs': imgs, 'seamX': seam_x, 'hole': hole}


def composite_image(c: dict) -> np.ndarray:
    f = PX_PER_FT
    canvas = np.full((c['H'] * f, c['W'] * f, 3), 255, np.uint8)
    order = ['frame', 'front', 'back']
    for k in order:
        x, y, w, h = c['rects'][k]
        im = c['imgs'][k]
        if k == 'frame' and c['hole'] is not None:
            # keep the window white so the interior pieces show
            sub = canvas[y * f:(y + h) * f, x * f:(x + w) * f]
            mask = ~(im > 242).all(axis=-1)
            sub[mask] = im[mask]
        else:
            canvas[y * f:(y + h) * f, x * f:(x + w) * f] = im
    return canvas
