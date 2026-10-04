"""Stage 3 of the park-piece extraction: turn a labelled piece image into
surfaces (materials on a half-foot grid) and items (park elements).

All coordinates here are in feet in the piece's own PAGE space (x right,
y DOWN, origin at the piece image's top-left corner). extract_pieces.py moves
them into park-local coordinates.
"""
from __future__ import annotations

import math

import numpy as np
from scipy import ndimage as ndi

from pieces_classify import L

F = 16  # analysis resolution, px per foot (stitched art is downsampled 2x)
CELL = 0.5  # surface grid, feet
CPX = int(F * CELL)

# surface codes
SURF = ['none', 'gravel', 'planting', 'gabion', 'nature-play', 'wood-deck']
S = {n: i for i, n in enumerate(SURF)}


def lab_mask(lab, *names):
    m = np.zeros(lab.shape, bool)
    for n in names:
        m |= lab == L[n]
    return m


def disk(r_px):
    r = int(round(r_px))
    y, x = np.ogrid[-r:r + 1, -r:r + 1]
    return x * x + y * y <= r * r


def box(n):
    return np.ones((max(1, int(n)), max(1, int(n))), bool)


def _n(n):
    return max(1, int(round(n)))


def erode(m, n):
    # outside the image counts as empty, so bars along a piece edge are not
    # mirrored into thicker shapes
    return ndi.minimum_filter(m.astype(np.uint8), size=_n(n), mode='constant', cval=0).astype(bool)


def dilate(m, n):
    return ndi.maximum_filter(m.astype(np.uint8), size=_n(n), mode='constant', cval=0).astype(bool)


def opening(m, n):
    return dilate(erode(m, n), n)


def closing(m, n):
    return erode(dilate(m, n), n)


def closing_hv(m, ny, nx):
    """Closing with an ny x nx rectangle (rows x cols)."""
    size = (_n(ny), _n(nx))
    d = ndi.maximum_filter(m.astype(np.uint8), size=size, mode='constant', cval=0)
    return ndi.minimum_filter(d, size=size, mode='constant', cval=0).astype(bool)


# ---------------------------------------------------------------- surfaces

def surface_grid(lab: np.ndarray, valid: np.ndarray) -> np.ndarray:
    """Material per half-foot cell. `valid` masks the piece's own area
    (False in a frame's window). Cells covered by furniture inherit the
    nearest surface."""
    code = np.zeros(lab.shape, np.uint8)
    code[lab_mask(lab, 'ground', 'canopy_g', 'tick', 'cyan')] = S['gravel']
    code[lab_mask(lab, 'plant', 'canopy', 'shrub')] = S['planting']
    code[lab_mask(lab, 'gabion', 'canopy_k')] = S['gabion']
    code[lab_mask(lab, 'np', 'canopy_np')] = S['nature-play']
    H, W = lab.shape
    gh, gw = H // CPX, W // CPX
    code = code[:gh * CPX, :gw * CPX]
    v = valid[:gh * CPX, :gw * CPX]
    blocks = code.reshape(gh, CPX, gw, CPX).transpose(0, 2, 1, 3).reshape(gh, gw, -1)
    vb = v.reshape(gh, CPX, gw, CPX).transpose(0, 2, 1, 3).reshape(gh, gw, -1).mean(-1) > 0.5
    counts = np.stack([(blocks == k).sum(-1) for k in range(len(SURF))], -1)
    counts[..., 0] = 0
    best = counts.argmax(-1).astype(np.uint8)
    frac = counts.max(-1) / (CPX * CPX)
    best[frac < 0.3] = 0
    # fill unknown cells (under furniture) from the nearest known cell
    known = best > 0
    if not known.any():
        # nothing but furniture (e.g. an end cap that is all shed and stage)
        best[:] = S['gravel']
        known = best > 0
    if known.any() and (~known).any():
        _, (iy, ix) = ndi.distance_transform_edt(~known, return_indices=True)
        best = best[iy, ix]
    best[~vb] = 0
    return best


def grid_rects(grid: np.ndarray):
    """Greedy decomposition of each material region into rectangles.
    Yields (code, x0, y0, x1, y1) in cells."""
    g = grid.copy()
    gh, gw = g.shape
    out = []
    for y in range(gh):
        x = 0
        while x < gw:
            c = g[y, x]
            if c == 0:
                x += 1
                continue
            x1 = x
            while x1 < gw and g[y, x1] == c:
                x1 += 1
            y1 = y + 1
            while y1 < gh and (g[y1, x:x1] == c).all():
                y1 += 1
            out.append((int(c), x, y, x1, y1))
            g[y:y1, x:x1] = 0
            x = x1
    return out


# ---------------------------------------------------------------- items

def comps(mask, min_area_ft2=0.0):
    lbl, n = ndi.label(mask)
    if n == 0:
        return []
    objs = ndi.find_objects(lbl)
    areas = ndi.sum_labels(np.ones_like(lbl), lbl, index=np.arange(1, n + 1))
    out = []
    for i, sl in enumerate(objs):
        a = areas[i] / (F * F)
        if a < min_area_ft2:
            continue
        out.append({'sl': sl, 'mask': lbl[sl] == i + 1, 'area': a,
                    'x0': sl[1].start / F, 'y0': sl[0].start / F, 'x1': sl[1].stop / F, 'y1': sl[0].stop / F})
    return out


def item(element, x0, y0, x1, y1, rot=0, **kw):
    """An element from its page-space bbox. w/h are the item's own length and
    width (local x/y); rot 90 means its length runs along the page's y."""
    w, h = x1 - x0, y1 - y0
    if rot == 90:
        w, h = h, w
    d = {'element': element, 'x': (x0 + x1) / 2, 'y': (y0 + y1) / 2, 'w': w, 'h': h, 'rot': rot}
    d.update(kw)
    return d


def modules(element, x0, y0, x1, y1, unit, **kw):
    """Split a straight run into `unit`-long modules along its long axis."""
    w, h = x1 - x0, y1 - y0
    horiz = w >= h
    length = w if horiz else h
    n = max(1, int(round(length / unit)))
    step = length / n
    out = []
    for k in range(n):
        if horiz:
            out.append(item(element, x0 + k * step, y0, x0 + (k + 1) * step, y1, 0, **kw))
        else:
            # long axis along y: rotated 90°, w runs along the bench
            out.append(item(element, x0, y0 + k * step, x1, y0 + (k + 1) * step, 90, **kw))
    return out


def rect_decompose(mask: np.ndarray, cell_px: int):
    """Decompose a binary mask into rectangles on a coarse grid (px units)."""
    H, W = mask.shape
    gh, gw = math.ceil(H / cell_px), math.ceil(W / cell_px)
    pad = np.zeros((gh * cell_px, gw * cell_px), bool)
    pad[:H, :W] = mask
    g = pad.reshape(gh, cell_px, gw, cell_px).mean((1, 3)) > 0.5
    rects = grid_rects(g.astype(np.uint8))
    return [(x0 * cell_px, y0 * cell_px, min(W, x1 * cell_px), min(H, y1 * cell_px)) for _, x0, y0, x1, y1 in rects]


def bars(mask: np.ndarray, ox: float, oy: float, min_len_ft=1.5):
    """Split an L/U-shaped bar component into straight rectangles (feet)."""
    cell = max(2, F // 4)
    out = []
    rects = rect_decompose(mask, cell)
    # merge: prefer long rectangles; greedy decomposition already row-major,
    # so re-run column-major and keep whichever gives fewer pieces
    rects_t = rect_decompose(mask.T, cell)
    rects_t = [(y0, x0, y1, x1) for (x0, y0, x1, y1) in rects_t]
    if len(rects_t) < len(rects):
        rects = rects_t
    for x0, y0, x1, y1 in rects:
        if max(x1 - x0, y1 - y0) / F < min_len_ft * 0.5:
            continue
        out.append((ox + x0 / F, oy + y0 / F, ox + x1 / F, oy + y1 / F))
    return out


def detect_items(lab: np.ndarray, theme: str, valid: np.ndarray, kind: str):
    """Find park elements in one piece image. Returns a list of item dicts
    (feet, page space of the piece) and a mask of pixels used by items."""
    items = []
    used = np.zeros(lab.shape, bool)
    lab = lab.copy()
    lab[~valid] = L['white']

    def take(c, m=None):
        sl = c['sl']
        mm = c['mask'] if m is None else m
        used[sl][mm] = True

    # -- shade canopy: a lattice of thin slats
    woodish = lab_mask(lab, 'perg_y', 'wood_dk', 'wood_md', 'wood_lt', 'table_s')
    # benches carry thin white or dark lines; close them before deciding what is solid
    solid = opening(closing(woodish, 0.3 * F), 0.6 * F)
    thin = woodish & ~solid
    if theme == 'edible':
        thin |= lab_mask(lab, 'perg_y')
    dens = ndi.uniform_filter(thin.astype(np.float32), size=int(2 * F))
    lattice = closing(dens > 0.18, F) & valid
    lattice = opening(lattice, 2 * F)
    boxes = []
    for c in comps(lattice, 8):
        sl = c['sl']
        pad = int(F)
        ys = slice(max(0, sl[0].start - pad), sl[0].stop + pad)
        xs = slice(max(0, sl[1].start - pad), sl[1].stop + pad)
        reg = np.zeros(lab.shape, bool)
        reg[sl] = c['mask']
        reg = dilate(reg, F)
        yy, xx = np.where((reg & (thin | lab_mask(lab, 'perg_y')))[ys, xs])
        if len(yy) == 0:
            continue
        boxes.append([(xs.start + xx.min()) / F, (ys.start + yy.min()) / F, (xs.start + xx.max() + 1) / F, (ys.start + yy.max() + 1) / F])
    # one canopy can be cut in two by a table drawn under it: merge aligned neighbours
    merged = True
    while merged:
        merged = False
        for i in range(len(boxes)):
            for j in range(i + 1, len(boxes)):
                a, b = boxes[i], boxes[j]
                same_row = abs(a[1] - b[1]) < 1 and abs(a[3] - b[3]) < 1
                same_col = abs(a[0] - b[0]) < 1 and abs(a[2] - b[2]) < 1
                gapx = max(a[0], b[0]) - min(a[2], b[2])
                gapy = max(a[1], b[1]) - min(a[3], b[3])
                if (same_row and gapx < 4) or (same_col and gapy < 4):
                    boxes[i] = [min(a[0], b[0]), min(a[1], b[1]), max(a[2], b[2]), max(a[3], b[3])]
                    boxes.pop(j)
                    merged = True
                    break
            if merged:
                break
    for (x0, y0, x1, y1) in boxes:
        if (x1 - x0) * (y1 - y0) < 12 or min(x1 - x0, y1 - y0) < 2.5:
            continue
        x0, y0, x1, y1 = (round(v * 2) / 2 for v in (x0, y0, x1, y1))
        items.append(item('shade-canopy', x0, y0, x1, y1, area=round((x1 - x0) * (y1 - y0), 1)))
        ys, xs = slice(int(y0 * F), int(y1 * F)), slice(int(x0 * F), int(x1 * F))
        used[ys, xs] |= woodish[ys, xs]
    canopy_region = np.zeros(lab.shape, bool)
    for it in items:
        canopy_region[int((it['y'] - it['h'] / 2) * F):int((it['y'] + it['h'] / 2) * F),
                      int((it['x'] - it['w'] / 2) * F):int((it['x'] + it['w'] / 2) * F)] = True

    # -- solid blocks: sheds (coloured) and the stage (wood)
    for name in ('red', 'purple', 'mauve', 'lilac', 'wood_dk'):
        m = lab_mask(lab, name) & ~used
        m = closing(m, 0.3 * F)
        shed_colour = name != 'wood_dk'
        if shed_colour and kind == 'frame':
            # a solid coloured block in the frame is the shed (some are 4' x 2')
            blk = opening(m, 1.8 * F)
        else:
            blk = opening(m, 3.5 * F)
        for c in comps(blk, 7.5 if (shed_colour and kind == 'frame') else 12):
            x0, y0, x1, y1 = (round(v * 2) / 2 for v in (c['x0'], c['y0'], c['x1'], c['y1']))
            if shed_colour and max(x1 - x0, y1 - y0) < 3.5:
                continue
            if name == 'wood_dk':
                items.extend(modules('stage', x0, y0, x1, y1, 4))
                for it in items[-1:]:
                    pass
            else:
                items.append(item('shed', x0, y0, x1, y1))
            # everything drawn on the shed or stage belongs to it (white board
            # lines, the align marks, anti-aliased edges)
            ys, xs = slice(int(y0 * F), int(y1 * F) + 1), slice(int(x0 * F), int(x1 * F) + 1)
            used[ys, xs] |= ~lab_mask(lab, 'plant', 'canopy', 'shrub', 'gabion')[ys, xs]

    # -- tables with chairs (cafe tables, communal tables)
    table_col = {'edible': 'red', 'sanctuary': 'navy', 'event': 'purple', 'nature': None}[theme]
    chair_col = {'edible': 'salmon', 'sanctuary': 'blue', 'event': 'lilac', 'nature': 'green_sq'}[theme]
    # (bridging the canopy slats drawn across stools)
    chairs = closing(lab_mask(lab, chair_col) & ~used, 0.35 * F)
    if table_col:
        tm = lab_mask(lab, table_col) & ~used
        # bridge the canopy slats drawn across tables
        # posts run across the tables, slats along them: bridge both without
        # joining neighbouring tables
        tm = opening(closing_hv(closing_hv(tm, 0.25 * F, 0.9 * F), 0.35 * F, 0.25 * F), 0.4 * F)
        for c in comps(tm, 1.0):
            w, h = c['x1'] - c['x0'], c['y1'] - c['y0']
            # absorb the chairs drawn around it
            sl = c['sl']
            pad = int(1.2 * F)
            ys = slice(max(0, sl[0].start - pad), min(lab.shape[0], sl[0].stop + pad))
            xs = slice(max(0, sl[1].start - pad), min(lab.shape[1], sl[1].stop + pad))
            near = np.zeros(lab.shape, bool)
            near[ys, xs] = True
            grow = ndi.binary_dilation(np.pad(c['mask'], 0), structure=box(0.5 * F))
            tmask = np.zeros(lab.shape, bool)
            tmask[sl] = c['mask']
            reach = ndi.binary_dilation(tmask[ys, xs], structure=box(0.8 * F))
            ch = chairs[ys, xs] & reach
            # chair blobs touching the reach count entirely
            cl, cn = ndi.label(chairs[ys, xs])
            ids = np.unique(cl[ch])
            ids = ids[ids > 0]
            allm = tmask[ys, xs] | np.isin(cl, ids)
            yy, xx = np.where(allm)
            X0, Y0 = (xs.start + xx.min()) / F, (ys.start + yy.min()) / F
            X1, Y1 = (xs.start + xx.max() + 1) / F, (ys.start + yy.max() + 1) / F
            used[ys, xs] |= allm
            chairs[ys, xs] &= ~np.isin(cl, ids)
            long = max(w, h)
            if long >= 4.5:
                items.append(item('communal-table', X0, Y0, X1, Y1, 0 if w >= h else 90, seats=int(len(ids))))
            else:
                items.append(item('cafe-table', X0, Y0, X1, Y1, 0 if (X1 - X0) >= (Y1 - Y0) else 90, seats=int(len(ids))))

    # -- stools: small solid squares
    for c in comps(chairs, 0.6):
        w, h = c['x1'] - c['x0'], c['y1'] - c['y0']
        if 1.0 <= w <= 2.4 and 1.0 <= h <= 2.4 and c['area'] > 0.6 * w * h:
            items.append(item('stool', c['x0'], c['y0'], c['x1'], c['y1']))
            take(c)

    # -- rain barrel (teal disc)
    for c in comps(ndi.binary_opening(lab_mask(lab, 'teal') & ~used, structure=disk(0.4 * F)), 1.0):
        items.append(item('rain-barrel', c['x0'], c['y0'], c['x1'], c['y1']))
        take(c)

    # -- compost bins: dark red outlines
    br = ndi.binary_closing(lab_mask(lab, 'brown') & ~used, structure=box(0.5 * F))
    for c in comps(br, 0.5):
        w, h = c['x1'] - c['x0'], c['y1'] - c['y0']
        if max(w, h) < 2:
            continue
        n = max(1, int(round(max(w, h) / max(min(w, h), 1))))
        items.extend(modules('compost-bin', c['x0'], c['y0'], c['x1'], c['y1'], max(w, h) / n))
        take(c)

    # -- benches: gabion benches (dark wood) and benches with backs (mid wood)
    bench_mask = np.zeros(lab.shape, bool)
    for name, element in (('wood_dk', 'gabion-bench'), ('wood_md', 'bench-back'), ('wood_lt', 'bench-lt')):
        m = lab_mask(lab, name, 'canopy_w') & ~used & ~canopy_region
        m &= ~lab_mask(lab, 'canopy_w') | ndi.binary_dilation(lab_mask(lab, name), structure=box(2 * F))
        m = closing(m, 0.3 * F)
        for c in comps(m, 1.0):
            sl = c['sl']
            fill = c['area'] / max(1e-6, (c['x1'] - c['x0']) * (c['y1'] - c['y0']))
            w, h = c['x1'] - c['x0'], c['y1'] - c['y0']
            if name == 'wood_md' and kind == 'frame' and fill < 0.55:
                # open boxes with a back rail: cold frames
                n = max(1, int(round(max(w, h) / 3.0)))
                items.extend(modules('cold-frame', c['x0'], c['y0'], c['x1'], c['y1'], max(w, h) / n))
                take(c)
                continue
            if max(w, h) < 3.0:
                continue  # small squares: stools / tables, below
            for (x0, y0, x1, y1) in bars(c['mask'], c['x0'], c['y0']):
                bw, bh = x1 - x0, y1 - y0
                if min(bw, bh) < 0.6 or max(bw, bh) < 1.0:
                    continue
                el = element
                if name == 'wood_lt':
                    # light wood: the workbench / standing table (Edible)
                    el = 'workbench'
                items.extend(modules(el, x0, y0, x1, y1, 4))
            take(c)
            bench_mask[c['sl']] |= c['mask']

    # -- squares at bench ends and free-standing 2' tables
    near_bench = dilate(bench_mask, 0.8 * F)
    # tables under a shade canopy share its slat colour: solid squares survive the opening below
    sq = lab_mask(lab, 'table_s', 'wood_lt', 'pink', 'wood_md') & ~(used & ~canopy_region)
    sq = opening(closing(sq, 0.25 * F), 0.8 * F)
    for c in comps(sq, 1.0):
        w, h = c['x1'] - c['x0'], c['y1'] - c['y0']
        if not (1.0 <= w <= 2.9 and 1.0 <= h <= 2.9):
            continue
        sl = c['sl']
        at_bench = (near_bench[sl] & c['mask']).any()
        striped = lab_mask(lab, 'table_s')[sl][c['mask']].mean() > 0.4 or (theme == 'nature' and lab_mask(lab, 'wood_md')[sl][c['mask']].mean() > 0.4)
        if at_bench or not striped:
            items.append(item('stool', c['x0'], c['y0'], c['x1'], c['y1'], atBench=bool(at_bench)))
        else:
            items.append(item('table-2', c['x0'], c['y0'], c['x1'], c['y1']))
        take(c)

    # -- trees: canopies of any tint
    can = lab_mask(lab, 'canopy', 'canopy_g', 'canopy_np', 'canopy_w', 'canopy_k')
    # canopies carry grass-like strokes: judge by local density, then clean up
    can = ndi.uniform_filter(can.astype(np.float32), size=int(0.6 * F)) > 0.45
    can = opening(can, 0.6 * F)
    can = ndi.binary_fill_holes(can)
    Hh, Ww = lab.shape[0] / F, lab.shape[1] / F
    for c in comps(can, 2.5):
        w, h = c['x1'] - c['x0'], c['y1'] - c['y0']
        cut = c['x0'] < 0.2 or c['y0'] < 0.2 or c['x1'] > Ww - 0.2 or c['y1'] > Hh - 0.2
        n = 1 if cut else max(1, int(round(max(w, h) / max(min(w, h), 0.1))))
        for k in range(n):
            if w >= h:
                x0, x1, y0, y1 = c['x0'] + k * w / n, c['x0'] + (k + 1) * w / n, c['y0'], c['y1']
            else:
                x0, x1, y0, y1 = c['x0'], c['x1'], c['y0'] + k * h / n, c['y0'] + (k + 1) * h / n
            d = min(x1 - x0, y1 - y0)
            if c['area'] / n < 2.0:
                continue
            d_eq = 2 * math.sqrt(c['area'] / n / math.pi)
            dia = max(w, h) if cut else max(d, d_eq)
            items.append(item('large-tree' if dia >= 6 else 'small-tree', x0, y0, x1, y1, canopyFt=round(dia, 1)))

    # -- shrubs: yellow dots
    for c in comps(ndi.binary_opening(lab_mask(lab, 'shrub'), structure=disk(0.15 * F)), 0.12):
        items.append(item('shrub', c['x0'], c['y0'], c['x1'], c['y1']))

    # -- raised beds (edible): green beds with a timber (orange) or grey rim,
    # inside the interior pieces; round ones are the keyhole gardens
    if theme == 'edible' and kind != 'frame':
        green = lab_mask(lab, 'plant', 'canopy', 'shrub')
        pm = ndi.binary_fill_holes(green | lab_mask(lab, 'tick'))
        pm = ndi.binary_opening(pm, structure=disk(0.4 * F))
        wood_rim_c = lab_mask(lab, 'wood_md', 'wood_dk', 'wood_lt', 'canopy_w')
        grey_rim_c = lab_mask(lab, 'tick', 'gabion', 'canopy_k', 'mauve', 'unk')
        for c in comps(pm, 3):
            w, h = c['x1'] - c['x0'], c['y1'] - c['y0']
            sl = c['sl']
            full = np.zeros(lab.shape, bool)
            full[sl] = c['mask']
            band = dilate(full, 0.3 * F) & ~erode(full, 0.3 * F)
            nb = max(1, band.sum())
            wood_rim = (wood_rim_c & band).sum() / nb
            grey_rim = (grey_rim_c & band).sum() / nb
            fill = c['area'] / (w * h)
            roundish = abs(w - h) < 0.8 and fill < 0.83
            # timber-edged beds, or round beds with the grey keyhole rim; a
            # planting strip beside a gabion wall has neither all round
            if not (wood_rim > 0.2 or (roundish and grey_rim > 0.3)):
                continue
            if roundish:
                # the keyhole beds show their centre basket as a ring; plain
                # round beds are solid
                hole = (lab_mask(lab, 'ground')[sl] & c['mask']).mean() > 0.04
                items.append(item('keyhole-garden' if hole else 'raised-bed', c['x0'], c['y0'], c['x1'], c['y1'], shape='round'))
            else:
                items.append(item('raised-bed', c['x0'], c['y0'], c['x1'], c['y1'], shape='rect'))
            used[sl] |= c['mask']
    return items, used
