// Assemble a park from PiaT's park pieces, the way the Dream workbook does on
// paper: pick a FRAME, a FRONT and a BACK (any theme each — "all pieces are
// interchangeable"), then fit the taped-together park to the real lot with the
// two seams:
//   - LENGTH seam: cut between front and back and add a strip there;
//   - WIDTH seam: cut along the length (between the interior and the frame
//     strip on the street / y0 side) and add a strip there.
// Surfaces that touch or cross a seam stretch with it; furniture keeps its size
// and moves with its side. A lot smaller than the pieces is handled by cutting
// a strip out instead, where it clips the fewest elements (reported in
// `clipped`). Owner: pieces workstream.

import type { DesignState, LayoutItem, LayoutSurface, Material, ParkLayout, ThemeId } from '../types';
import { ELEMENTS } from '../../data/elements';
import { PIECE_KINDS, type PieceItem, type PieceKind, type PieceSet, type Rect } from './model';

export interface PieceThemes {
  frame: ThemeId;
  front: ThemeId;
  back: ThemeId;
}

export type LayoutEdits = Pick<DesignState, 'added' | 'removed' | 'moved'>;

/** Stable id of a template item: `<piece>-<theme>-<n>` (n = 1-based order in the set file). */
export function itemId(kind: PieceKind, theme: ThemeId, n: number): string {
  return `${kind}-${theme}-${n}`;
}

const EPS = 1e-6;

/** One axis of the seam transform. */
interface AxisMap {
  /** seam position in nominal coordinates */
  s: number;
  /** extra (or removed, if negative) feet */
  d: number;
  /** grow: points at exactly `s` move too (the low side stretches) */
  inclusive: boolean;
  /** shrink: the removed band [c, c + |d|) in nominal coordinates */
  cut?: [number, number];
}

function mapCoord(v: number, m: AxisMap): number {
  if (m.d >= 0) {
    if (m.d === 0) return v;
    return (m.inclusive ? v >= m.s - EPS : v > m.s + EPS) ? v + m.d : v;
  }
  const [c0, c1] = m.cut!;
  if (v <= c0 + EPS) return v;
  if (v >= c1 - EPS) return v + m.d;
  return c0;
}

function itemExtent(it: PieceItem, axis: 'x' | 'y'): [number, number] {
  const rot = ((it.rotationDeg % 180) + 180) % 180;
  const along = axis === 'x' ? (rot === 90 ? it.h : it.w) : rot === 90 ? it.w : it.h;
  const c = axis === 'x' ? it.x : it.y;
  return [c - along / 2, c + along / 2];
}

/** How much of an item a removed band takes away (0..1 of its extent on that axis). */
function cutShare(it: PieceItem, axis: 'x' | 'y', cut: [number, number]): number {
  const [a, b] = itemExtent(it, axis);
  const ov = Math.min(b, cut[1]) - Math.max(a, cut[0]);
  return ov <= 0 ? 0 : ov / Math.max(b - a, EPS);
}

/** Pick the band to remove: inside [lo, hi], clipping the fewest items, near the seam. */
function chooseCut(items: PieceItem[], axis: 'x' | 'y', lo: number, hi: number, len: number, seam: number): [number, number] {
  let best: [number, number] = [Math.max(lo, Math.min(seam, hi) - len), Math.max(lo, Math.min(seam, hi) - len) + len];
  let bestCost = Infinity;
  for (let c = lo; c + len <= hi + EPS; c += 0.5) {
    const cut: [number, number] = [c, c + len];
    let clipped = 0;
    let touched = 0;
    for (const it of items) {
      const share = cutShare(it, axis, cut);
      if (share > 0.5) clipped += 1;
      else if (share > 0) touched += 1;
    }
    const cost = clipped * 1000 + touched * 10 + Math.abs(c + len / 2 - seam);
    if (cost < bestCost - EPS) {
      bestCost = cost;
      best = cut;
    }
  }
  return best;
}

function mapRect(r: Rect, mx: AxisMap, my: AxisMap): Rect | null {
  const x0 = mapCoord(r[0], mx);
  const x1 = mapCoord(r[2], mx);
  const y0 = mapCoord(r[1], my);
  const y1 = mapCoord(r[3], my);
  if (x1 - x0 < EPS || y1 - y0 < EPS) return null;
  return [x0, y0, x1, y1];
}

function rectPolygon(r: Rect): [number, number][] {
  return [
    [r[0], r[1]],
    [r[2], r[1]],
    [r[2], r[3]],
    [r[0], r[3]],
  ];
}

/** The pieces' printed 4-ft grid, carried through the seams. */
function countLines(nominal: number, m: AxisMap): number[] {
  const out = new Set<number>();
  for (let v = 0; v <= nominal + EPS; v += 4) out.add(round(mapCoord(v, m)));
  if (m.d > 0) {
    // the seam strip [s, s + d] carries its own 4-ft marks
    out.add(round(m.s));
    out.add(round(m.s + m.d));
    for (let k = 4; k < m.d - EPS; k += 4) out.add(round(m.s + k));
  }
  out.add(round(nominal + m.d));
  return [...out].sort((a, b) => a - b);
}

function round(v: number): number {
  return Math.round(v * 1000) / 1000;
}

/**
 * Assemble a park layout from a piece set.
 *
 * @param set      the set for the lot's size and kind (src/data/pieces)
 * @param themes   which theme each piece comes from
 * @param lengthFt final length (x); defaults to the set's nominal length
 * @param widthFt  final width (y); defaults to the set's nominal width
 * @param edits    the person's changes (DesignState.added / removed / moved)
 */
export function assemble(
  set: PieceSet,
  themes: PieceThemes,
  lengthFt: number = set.nominal.lengthFt,
  widthFt: number = set.nominal.widthFt,
  edits?: LayoutEdits,
): ParkLayout {
  const L0 = set.nominal.lengthFt;
  const W0 = set.nominal.widthFt;
  const dL = lengthFt - L0;
  const dW = widthFt - W0;

  // template items with their stable ids
  const chosen = PIECE_KINDS.map((kind) => ({ kind, theme: themes[kind], piece: set.themes[themes[kind]][kind] }));
  const all: { kind: PieceKind; theme: ThemeId; id: string; it: PieceItem }[] = [];
  for (const c of chosen) c.piece.items.forEach((it, n) => all.push({ kind: c.kind, theme: c.theme, id: itemId(c.kind, c.theme, n + 1), it }));

  // interior span (where a strip may be cut out when shrinking)
  const front = set.themes[themes.front].front.extent[0]!;
  const back = set.themes[themes.back].back.extent[0]!;
  const ix: [number, number] = [Math.min(front[0], back[0]), Math.max(front[2], back[2])];
  const iy: [number, number] = [Math.min(front[1], back[1]), Math.max(front[3], back[3])];

  const mx: AxisMap = { s: set.seams.length.x, d: dL, inclusive: true };
  const my: AxisMap = { s: set.seams.width.y, d: dW, inclusive: set.seams.width.stretch === 'below' };
  const its = all.map((a) => a.it);
  if (dL < 0) mx.cut = chooseCut(its, 'x', ix[0], ix[1], -dL, mx.s);
  if (dW < 0) my.cut = chooseCut(its, 'y', iy[0], iy[1], -dW, my.s);

  // surfaces
  const surfaces: LayoutSurface[] = [];
  for (const c of chosen) {
    let n = 0;
    for (const [mat, rects] of Object.entries(c.piece.surfaces) as [Material, Rect[]][]) {
      for (const r of rects) {
        const m = mapRect(r, mx, my);
        n += 1;
        if (!m) continue;
        surfaces.push({ id: `${c.kind}-${c.theme}-s${n}`, material: mat, theme: c.theme, polygon: rectPolygon(m) });
      }
    }
  }

  // template items
  const removed = new Set(edits?.removed ?? []);
  const moved = edits?.moved ?? {};
  const items: LayoutItem[] = [];
  const clipped: string[] = [];
  for (const a of all) {
    const { it } = a;
    if (mx.cut && cutShare(it, 'x', mx.cut) > 0.5) {
      clipped.push(a.id);
      continue;
    }
    if (my.cut && cutShare(it, 'y', my.cut) > 0.5) {
      clipped.push(a.id);
      continue;
    }
    if (removed.has(a.id)) continue;
    const meta = ELEMENTS[it.element];
    let x = mapCoord(it.x, mx);
    let y = mapCoord(it.y, my);
    let rotationDeg = it.rotationDeg;
    const mv = moved[a.id];
    if (mv) {
      x = mv.x;
      y = mv.y;
      rotationDeg = mv.rotationDeg;
    }
    const li: LayoutItem = { id: a.id, element: it.element, x: round(x), y: round(y), rotationDeg, theme: a.theme, w: it.w, h: it.h, source: a.kind };
    if (it.shape === 'round') li.variant = 'round';
    if (meta?.heightFt !== undefined) li.heightFt = meta.heightFt;
    items.push(li);
  }

  // the person's own additions
  for (const p of edits?.added ?? []) {
    if (removed.has(p.id)) continue;
    const meta = ELEMENTS[p.element];
    const [w, h] = meta?.footprintFt ?? [2, 2];
    const mv = moved[p.id];
    const li: LayoutItem = { ...p, w, h, source: 'added' };
    if (mv) Object.assign(li, { x: mv.x, y: mv.y, rotationDeg: mv.rotationDeg });
    if (meta?.heightFt !== undefined) li.heightFt = meta.heightFt;
    items.push(li);
  }

  const pieces = chosen.map((c) => ({
    kind: c.kind,
    theme: c.theme,
    rects: c.piece.extent.map((r) => mapRect(r, mx, my)).filter((r): r is Rect => r !== null),
  }));

  return {
    lengthFt,
    widthFt,
    streetEdges: [...set.streetEdges],
    surfaces,
    items,
    setId: set.id,
    nominal: { lengthFt: L0, widthFt: W0 },
    seams: {
      length: { at: dL >= 0 ? mx.s : mx.cut![0], deltaFt: dL },
      width: { at: dW >= 0 ? my.s : my.cut![0], deltaFt: dW },
    },
    countGrid: { xs: countLines(L0, mx), ys: countLines(W0, my) },
    pieces,
    clipped,
  };
}
