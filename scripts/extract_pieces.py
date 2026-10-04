#!/usr/bin/env python3
"""Extract Park in a Truck's printable "park pieces" into data.

Source: ~/Desktop/park-in-a-truck/source/linked/04_Dream_WORKBOOK_p11_<SIZE>__<id>.pdf
(15 files: sizes A–E × interior / corner street-right / corner street-left).
Output: src/data/pieces/<size>-<lotKind>.json, plus the stitched source composites
in source/work/pieces/ that scripts/pieces_validate.py compares against (see
docs/pieces.md for the validation steps).

The pieces are flat-colour raster art (JPEG) printed at 1/4" = 1'-0", tiled over
several letter pages. Pipeline:
  1. pieces_stitch   – stitch the tiles of each FRAME / FRONT / BACK back together
                       and place FRONT + BACK in the frame's window (nominal park)
  2. pieces_classify – label every pixel with a palette class
  3. pieces_analyse  – materials on a half-foot grid, and the park elements
  4. here            – park-local coordinates, lot-kind check, JSON

Run:  ~/Desktop/park-in-a-truck/source/.venv/bin/python scripts/extract_pieces.py [SIZE ...]
Needs pymupdf, numpy, scipy, pillow in that venv.

Park-local coordinates (DESIGN.md §5): feet, x along the LENGTH, y along the
WIDTH, FRONT at low x (entrance edge x0), y up — so standing on x0 looking
toward +x, the y1 edge is on your LEFT.
"""
from __future__ import annotations

import json
import os
import sys
from collections import Counter

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import pieces_stitch as ST  # noqa: E402
from pieces_analyse import SURF, detect_items, grid_rects, surface_grid, CELL  # noqa: E402
from pieces_analyse import F as AF  # noqa: E402
from pieces_classify import classify  # noqa: E402

REPO = os.path.dirname(HERE)
OUT = os.path.join(REPO, 'src', 'data', 'pieces')
WORK = os.path.join(ST.SRC, 'work', 'pieces')

RANGES = {'A': ([44, 64], [12, 16]), 'B': ([64, 76], [16, 28]), 'C': ([76, 88], [28, 40]),
          'D': ([88, 96], [32, 48]), 'E': ([80, 120], [44, 60])}

# elements that may be drawn across a piece boundary and are joined back together
MERGE_ELEMENTS = {'shade-canopy', 'communal-table', 'cafe-table', 'large-tree', 'small-tree', 'stage', 'shed',
                  'raised-bed', 'keyhole-garden'}


def half(a: np.ndarray) -> np.ndarray:
    h, w = a.shape[0] // 2 * 2, a.shape[1] // 2 * 2
    a = a[:h, :w].astype(np.uint16)
    return ((a[0::2, 0::2] + a[1::2, 0::2] + a[0::2, 1::2] + a[1::2, 1::2] + 2) // 4).astype(np.uint8)


def analyse_piece(img32: np.ndarray, theme: str, kind: str, hole_local=None):
    img = half(img32)
    lab = classify(img, theme)
    valid = np.ones(lab.shape, bool)
    if hole_local is not None:
        x0, y0, x1, y1 = hole_local
        valid[int(y0 * AF):int(y1 * AF), int(x0 * AF):int(x1 * AF)] = False
    grid = surface_grid(lab, valid)
    items, _ = detect_items(lab, theme, valid, kind)
    # what lies under some elements: the stage is a timber deck; sheds and
    # raised beds sit on the gravel base (their soil is not a planting square)
    under = {'stage': 'wood-deck', 'shed': 'gravel', 'raised-bed': 'gravel', 'keyhole-garden': 'gravel'}
    gh, gw = grid.shape
    for it in items:
        mat = under.get(it['element'])
        if not mat:
            continue
        W_ = it['w'] if it['rot'] == 0 else it['h']
        H_ = it['h'] if it['rot'] == 0 else it['w']
        cx0, cx1 = (it['x'] - W_ / 2) / CELL, (it['x'] + W_ / 2) / CELL
        cy0, cy1 = (it['y'] - H_ / 2) / CELL, (it['y'] + H_ / 2) / CELL
        ys, xs = np.mgrid[0:gh, 0:gw]
        cx, cy = xs + 0.5, ys + 0.5
        if it.get('shape') == 'round':
            rx, ry = (cx1 - cx0) / 2 + 1, (cy1 - cy0) / 2 + 1  # + half a foot: the anti-aliased rim
            inside = ((cx - (cx0 + cx1) / 2) / rx) ** 2 + ((cy - (cy0 + cy1) / 2) / ry) ** 2 <= 1
        else:
            inside = (cx > cx0) & (cx < cx1) & (cy > cy0) & (cy < cy1)
        grid[inside & (grid > 0)] = SURF.index(mat)
    return grid, items


def merge_cross_piece(items_by_piece: dict, rects: dict):
    """An element drawn across a piece boundary appears as two fragments, one
    in each piece. When both pieces are present (same theme), join them and
    give the whole element to the piece holding the larger part."""
    def bbox(it):
        return it['x'] - it['W'] / 2, it['y'] - it['H'] / 2, it['x'] + it['W'] / 2, it['y'] + it['H'] / 2

    for it_list in items_by_piece.values():
        for it in it_list:
            it['W'] = it['w'] if it['rot'] == 0 else it['h']
            it['H'] = it['h'] if it['rot'] == 0 else it['w']
    names = list(items_by_piece)
    for i in range(len(names)):
        for j in range(i + 1, len(names)):
            A, B = items_by_piece[names[i]], items_by_piece[names[j]]
            for a in list(A):
                for b in list(B):
                    if a['element'] != b['element'] or a['element'] not in MERGE_ELEMENTS:
                        continue
                    ax0, ay0, ax1, ay1 = bbox(a)
                    bx0, by0, bx1, by1 = bbox(b)
                    gapx = max(ax0, bx0) - min(ax1, bx1)
                    gapy = max(ay0, by0) - min(ay1, by1)
                    ovx = min(ax1, bx1) - max(ax0, bx0)
                    ovy = min(ay1, by1) - max(ay0, by0)
                    side_by_side = gapx <= 0.6 and gapx > -1.0 and ovy > 0.5 * min(ay1 - ay0, by1 - by0)
                    stacked = gapy <= 0.6 and gapy > -1.0 and ovx > 0.5 * min(ax1 - ax0, bx1 - bx0)
                    if not (side_by_side or stacked):
                        continue
                    x0, y0, x1, y1 = min(ax0, bx0), min(ay0, by0), max(ax1, bx1), max(ay1, by1)
                    keep, drop, lst_drop = (a, b, B) if (ax1 - ax0) * (ay1 - ay0) >= (bx1 - bx0) * (by1 - by0) else (b, a, A)
                    keep['x'], keep['y'] = (x0 + x1) / 2, (y0 + y1) / 2
                    keep['W'], keep['H'] = x1 - x0, y1 - y0
                    if keep['rot'] == 0:
                        keep['w'], keep['h'] = keep['W'], keep['H']
                    else:
                        keep['w'], keep['h'] = keep['H'], keep['W']
                    if 'canopyFt' in keep:
                        keep['canopyFt'] = round(max(keep['W'], keep['H']), 1)
                        keep['element'] = 'large-tree' if keep['canopyFt'] >= 6 else 'small-tree'
                    if 'seats' in keep:
                        keep['seats'] = keep.get('seats', 0) + drop.get('seats', 0)
                    keep['joined'] = True
                    lst_drop.remove(drop)
                    if drop is a:
                        break


def to_park(x, y, W, H, flipped):
    """page space (y down; flipped prints mirrored) -> park-local (y up)."""
    if flipped:
        return W - x, y
    return x, H - y


def edge_gabion(grids_park, W, H):
    """Fraction of each outer 1-ft band that is gabion wall (street edges carry it)."""
    g = grids_park  # (H/CELL, W/CELL) in park orientation, row 0 = y0
    n = int(1 / CELL)
    gab = SURF.index('gabion')
    return {
        'x0': float((g[:, :n] == gab).mean()), 'x1': float((g[:, -n:] == gab).mean()),
        'y0': float((g[:n, :] == gab).mean()), 'y1': float((g[-n:, :] == gab).mean()),
    }


def rnd(v, q=0.25):
    return round(round(v / q) * q, 2)


def extract(fid: str):
    size, link_kind = ST.SETS[fid]
    pieces, seam_tiles, caps, meta, doc, cache = ST.stitch_set(fid)
    flipped = meta['flipped']
    themes_out = {}
    composites = {}
    edge_stats = []
    for th in ST.THEMES:
        c = ST.compose(pieces[th], size, flipped)
        W, H = c['W'], c['H']
        composites[th] = c
        park_grid = np.zeros((int(H / CELL), int(W / CELL)), np.uint8)
        items_by_piece = {}
        grids = {}
        for kind in ('frame', 'front', 'back'):
            px, py, pw, ph = c['rects'][kind]
            hole_local = None
            if kind == 'frame' and c['hole'] is not None:
                hx0, hy0, hx1, hy1 = c['hole']
                hole_local = (hx0 - px, hy0 - py, hx1 - px, hy1 - py)
            grid, items = analyse_piece(c['imgs'][kind], th, kind, hole_local)
            grids[kind] = grid
            for it in items:
                it['x'] += px
                it['y'] += py
            items_by_piece[kind] = items
            # paint into the page-space park grid
            gy0, gx0 = int(py / CELL), int(px / CELL)
            gh, gw = grid.shape
            sub = park_grid[gy0:gy0 + gh, gx0:gx0 + gw]
            m = grid[:sub.shape[0], :sub.shape[1]] > 0
            sub[m] = grid[:sub.shape[0], :sub.shape[1]][m]
        merge_cross_piece(items_by_piece, c['rects'])

        # park orientation grid (row 0 = y0)
        pg = park_grid[::-1, :] if not flipped else park_grid[:, ::-1]
        edge_stats.append(edge_gabion(pg, W, H))

        th_out = {}
        for kind in ('frame', 'front', 'back'):
            px, py, pw, ph = c['rects'][kind]
            grid = grids[kind]
            surf = {}
            for code, x0, y0, x1, y1 in grid_rects(grid):
                X0, Y0, X1, Y1 = px + x0 * CELL, py + y0 * CELL, px + x1 * CELL, py + y1 * CELL
                a = to_park(X0, Y0, W, H, flipped)
                b = to_park(X1, Y1, W, H, flipped)
                surf.setdefault(SURF[code], []).append([min(a[0], b[0]), min(a[1], b[1]), max(a[0], b[0]), max(a[1], b[1])])
            items = []
            for it in items_by_piece[kind]:
                x, y = to_park(it['x'], it['y'], W, H, flipped)
                d = {'element': it['element'], 'x': rnd(x), 'y': rnd(y), 'w': rnd(it['w']), 'h': rnd(it['h']),
                     'rotationDeg': it['rot']}
                for k in ('canopyFt', 'seats', 'shape', 'atBench'):
                    if k in it:
                        d[k] = it[k]
                items.append(d)
            items.sort(key=lambda d: (round(-d['y'], 1), d['x']))
            # piece extent (park coords)
            if kind == 'frame' and c['hole'] is not None:
                hx0, hy0, hx1, hy1 = c['hole']
                ext_page = [r for r in [
                    (0, 0, W, hy0), (0, hy1, W, H), (0, hy0, hx0, hy1), (hx1, hy0, W, hy1)] if r[2] > r[0] and r[3] > r[1]]
            else:
                ext_page = [(px, py, px + pw, py + ph)]
            ext = []
            for (x0, y0, x1, y1) in ext_page:
                a, b = to_park(x0, y0, W, H, flipped), to_park(x1, y1, W, H, flipped)
                ext.append([min(a[0], b[0]), min(a[1], b[1]), max(a[0], b[0]), max(a[1], b[1])])
            refs = pieces[th][kind].refs
            th_out[kind] = {
                'extent': ext,
                'surfaces': {k: [[rnd(v, 0.5) for v in r] for r in rs] for k, rs in sorted(surf.items())},
                'items': items,
                'source': refs,
            }
        themes_out[th] = th_out

    c0 = composites['edible']
    W, H = c0['W'], c0['H']
    # street edges: the outer bands that carry a gabion wall in every theme
    mean = {e: float(np.mean([s[e] for s in edge_stats])) for e in ('x0', 'x1', 'y0', 'y1')}
    # x0 is the entrance edge on the street the lot is addressed to; a side
    # street shows as a gabion wall along y0 or y1
    street = sorted({'x0'} | {e for e, v in mean.items() if v > 0.25 and e in ('y0', 'y1')})
    if 'y1' in street and 'y0' not in street:
        true_kind = 'corner-left'
    elif 'y0' in street and 'y1' not in street:
        true_kind = 'corner-right'
    else:
        true_kind = 'interior'
    seam_x = c0['seamX'] if not flipped else W - c0['seamX']
    lr, wr = RANGES[size]
    out = {
        'id': f'{size}-{true_kind}',
        'size': size,
        'lotKind': true_kind,
        'nominal': {'lengthFt': W, 'widthFt': H},
        'range': {'longFt': lr, 'shortFt': wr},
        'streetEdges': street,
        'entranceEdge': 'x0',
        'edgeGabionShare': {k: round(v, 2) for k, v in mean.items()},
        'seams': {
            # LENGTH seam: between front and back, across the whole width
            'length': {'x': seam_x, 'maxFt': lr[1] - W, 'stretch': 'front'},
            # WIDTH seam: along the length, between the interior and the frame strip on the street (or y0) side
            'width': {'y': (H - 4) if true_kind == 'corner-left' else 4, 'maxFt': wr[1] - H,
                      'stretch': 'below' if true_kind == 'corner-left' else 'above'},
        },
        'source': {
            'file': meta['file'],
            'linkColumn': link_kind,
            'cover': meta['cover'],
            'printedMirrored': flipped,
            'themePages': meta['themePages'],
            'seamPages': meta['seamPages'],
            'scale': '1/4" = 1\'-0" (18 pt per foot)',
        },
        'issues': [],
        'themes': themes_out,
    }
    hs = meta['themeImageHashes']
    for a in ST.THEMES:
        for b in ST.THEMES:
            if a < b and hs[a] and hs[a] == hs[b]:
                out.setdefault('sharedArt', []).append([a, b])
    return out, composites


def mirror_theme(th: dict, W: float) -> dict:
    """One theme's pieces mirrored across the length axis (y -> W - y)."""
    m = json.loads(json.dumps(th))
    for p in m.values():
        p['extent'] = [[r[0], W - r[3], r[2], W - r[1]] for r in p['extent']]
        for k, rs in p['surfaces'].items():
            p['surfaces'][k] = [[r[0], W - r[3], r[2], W - r[1]] for r in rs]
        for it in p['items']:
            it['y'] = rnd(W - it['y'])
        p['items'].sort(key=lambda d: (round(-d['y'], 1), d['x']))
    return m


def mirror_set(s: dict) -> dict:
    """corner-left <-> corner-right: mirror across the length axis (y -> W - y)."""
    W = s['nominal']['widthFt']
    m = json.loads(json.dumps(s))
    kind = 'corner-right' if s['lotKind'] == 'corner-left' else 'corner-left'
    m['id'] = f"{s['size']}-{kind}"
    m['lotKind'] = kind
    flip = {'y0': 'y1', 'y1': 'y0'}
    m['streetEdges'] = sorted(flip.get(e, e) for e in s['streetEdges'])
    m['edgeGabionShare'] = {flip.get(k, k): v for k, v in s['edgeGabionShare'].items()}
    m['seams']['width'] = {'y': W - s['seams']['width']['y'], 'maxFt': s['seams']['width']['maxFt'],
                           'stretch': 'above' if s['seams']['width']['stretch'] == 'below' else 'below'}
    m['source']['derivedFrom'] = s['id']
    m['themes'] = {k: mirror_theme(v, W) for k, v in s['themes'].items()}
    return m


def file_signature(fid: str) -> str:
    """Hash of every image on the piece pages: equal for re-uploads of the same set."""
    import hashlib
    import pymupdf as fitz
    doc = fitz.open(ST.set_path(fid))
    h = hashlib.md5()
    for i in range(5, doc.page_count):
        for info in sorted(doc[i].get_image_info(xrefs=True), key=lambda b: (b['bbox'][1], b['bbox'][0])):
            if info['xref']:
                h.update(hashlib.md5(doc.xref_stream_raw(info['xref']) or b'').digest())
    return h.hexdigest()


def main(argv):
    only = set(argv)
    seen_sig = {}
    os.makedirs(OUT, exist_ok=True)
    os.makedirs(WORK, exist_ok=True)
    produced = {}
    report = []
    order = ['interior', 'corner-left', 'corner-right']
    for fid, (size, link_kind) in sorted(ST.SETS.items(), key=lambda kv: (kv[1][0], order.index(kv[1][1]))):
        if only and size not in only:
            continue
        sig = file_signature(fid)
        if sig in seen_sig:
            first = seen_sig[sig]
            print(fid, size, 'link:', link_kind, f'-> identical pieces to {first}; skipped', flush=True)
            report.append((fid, size, link_kind, f'duplicate of {first}', '', {}, 'identical art'))
            for s0 in produced.values():
                if fid != first and s0['source']['file'].find(first) >= 0:
                    s0['source'].setdefault('duplicates', []).append(os.path.basename(ST.set_path(fid)))
            continue
        seen_sig[sig] = fid
        s, comps = extract(fid)
        note = ''
        if s['lotKind'] != link_kind:
            note = f"link column says {link_kind}, geometry says {s['lotKind']}"
        report.append((fid, size, link_kind, s['lotKind'], s['source']['cover'], s['edgeGabionShare'], note))
        print(fid, size, 'link:', link_kind, '-> geometry:', s['lotKind'], s['streetEdges'], s['edgeGabionShare'], note, flush=True)
        if s['id'] in produced:
            prev = produced[s['id']]
            print(f"   duplicate of {prev['source']['file']} — keeping the first", flush=True)
            produced[s['id']]['source'].setdefault('duplicates', []).append(s['source']['file'])
            continue
        produced[s['id']] = s
        # keep a page-space composite for the validation renderer
        for th, c in comps.items():
            img = ST.composite_image(c)
            if s['source']['printedMirrored']:
                img = img[::-1, ::-1]
            from PIL import Image
            Image.fromarray(half(img)).save(os.path.join(WORK, f"{s['id']}-{th}.png"))
    # sets that were never printed: derive by mirroring the opposite corner set
    for size in sorted({s['size'] for s in produced.values()}):
        for a, b in (('corner-left', 'corner-right'), ('corner-right', 'corner-left')):
            if f'{size}-{b}' not in produced and f'{size}-{a}' in produced:
                m = mirror_set(produced[f'{size}-{a}'])
                m['issues'].append(f'No {b} set was published (both corner downloads contain the {a} pieces); '
                                   f'this set is the {a} set mirrored across the length axis.')
                produced[m['id']] = m
                for th in ST.THEMES:
                    src = os.path.join(WORK, f'{size}-{a}-{th}.png')
                    if os.path.exists(src):
                        from PIL import Image
                        im = np.asarray(Image.open(src))
                        Image.fromarray(im[::-1]).save(os.path.join(WORK, f'{m["id"]}-{th}.png'))
    # some downloads print the SANCTUARY art on their NATURE pages: take the
    # nature pieces from the mirror-image corner set when it has real ones
    for sid, s in produced.items():
        if ['nature', 'sanctuary'] not in s.get('sharedArt', []):
            continue
        other = produced.get(f"{s['size']}-{'corner-right' if s['lotKind'] == 'corner-left' else 'corner-left'}")
        if s['lotKind'] != 'interior' and other and ['nature', 'sanctuary'] not in other.get('sharedArt', []) \
                and not other['source'].get('derivedFrom'):
            s['themes']['nature'] = mirror_theme(other['themes']['nature'], s['nominal']['widthFt'])
            s['issues'].append(f"The download prints the SANCTUARY art on its NATURE pages (identical images); the "
                               f"nature pieces here are {other['id']}'s nature pieces mirrored across the length axis.")
            src = os.path.join(WORK, f"{other['id']}-nature.png")
            from PIL import Image
            Image.fromarray(np.asarray(Image.open(src))[::-1]).save(os.path.join(WORK, f"{sid}-nature.png"))
        else:
            s['issues'].append('The download prints the SANCTUARY art on its NATURE pages (identical images) and no '
                               'other set of this size and kind has real nature pieces, so the nature pieces here '
                               'repeat the sanctuary layout (coloured as Nature).')
    for sid, s in produced.items():
        with open(os.path.join(OUT, f'{sid}.json'), 'w') as f:
            json.dump(s, f, separators=(',', ':'))
        n_items = sum(len(p['items']) for t in s['themes'].values() for p in t.values())
        print('wrote', sid, n_items, 'items', flush=True)
    with open(os.path.join(WORK, 'report.json'), 'w') as f:
        json.dump(report, f, indent=1)


if __name__ == '__main__':
    main(sys.argv[1:])
