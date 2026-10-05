// Part of the lot (2026-10-04): the park in just part of a lot — a side yard, the open ground
// beside a building that's in use. The part is a rectangle in site-frame feet lined up with
// the lot (DesignState.area, the same shape as lotfit.ts FitArea). Pure, tested
// (__tests__/area.test.ts): dragging its sides, corners and middle; the number boxes and slide
// arrows; the default rectangle on the open ground; which way the park runs in it.

import type { DesignState, LotKind } from '../types';
import { inscribedRect, FIT_TOLERANCE_FT, type FitArea } from './lotfit';
import { bbox, type Vec2 } from './geo';
import type { SiteFrame } from './rect';
import type { Turn } from './placement';

/** The smallest part, feet along and across the lot. */
export const AREA_MIN_FT = 4;

type Bounds = Pick<SiteFrame, 'lengthFt' | 'widthFt'>;
type PartFields = Pick<DesignState, 'useArea' | 'area' | 'turn'>;

export type AreaSide = 'x0' | 'x1' | 'y0' | 'y1';
/** What a press on the part grabbed: one side, a corner (two sides) or the middle (the whole part). */
export type AreaHandle = { kind: 'side'; side: AreaSide } | { kind: 'corner'; x: 'x0' | 'x1'; y: 'y0' | 'y1' } | { kind: 'move' };

/** The part the park uses, or null = the whole lot. */
export const partOf = (d: Pick<DesignState, 'useArea' | 'area'> | null | undefined): FitArea | null => (d?.useArea && d.area ? d.area : null);

export const sameArea = (a: FitArea | null | undefined, b: FitArea | null | undefined): boolean =>
  Boolean(a && b && a.x0 === b.x0 && a.y0 === b.y0 && a.lengthFt === b.lengthFt && a.widthFt === b.widthFt);

const edgesOf = (a: FitArea) => ({ x0: a.x0, x1: a.x0 + a.lengthFt, y0: a.y0, y1: a.y0 + a.widthFt });
const fromEdges = (e: { x0: number; x1: number; y0: number; y1: number }): FitArea => ({
  x0: tidy(e.x0),
  y0: tidy(e.y0),
  lengthFt: tidy(e.x1 - e.x0),
  widthFt: tidy(e.y1 - e.y0),
});
/** (float dust off: 12.000000001 → 12) */
const tidy = (v: number) => Math.round(v * 1000) / 1000;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const minAlong = (b: Bounds) => Math.min(AREA_MIN_FT, b.lengthFt);
const minAcross = (b: Bounds) => Math.min(AREA_MIN_FT, b.widthFt);

/** Keep a part inside the site frame and at least the smallest size (a saved part on a lot whose outline changed). */
export function clampArea(a: FitArea, b: Bounds): FitArea {
  const L = clamp(a.lengthFt, minAlong(b), b.lengthFt);
  const W = clamp(a.widthFt, minAcross(b), b.widthFt);
  const x0 = clamp(a.x0, 0, b.lengthFt - L);
  const y0 = clamp(a.y0, 0, b.widthFt - W);
  const out = { x0: tidy(x0), y0: tidy(y0), lengthFt: tidy(L), widthFt: tidy(W) };
  return sameArea(out, a) ? a : out;
}

/**
 * Drag a side, a corner or the middle of the part by `delta` (site feet, from where the press
 * started). The moved sides land on whole feet (or the edge of the site frame), the part
 * stays at least 4 × 4 ft and inside the site frame. Past the lot line is allowed (the
 * overhang warning reports it).
 */
export function dragArea(start: FitArea, h: AreaHandle, delta: Vec2, b: Bounds): FitArea {
  const e = edgesOf(start);
  if (h.kind === 'move') {
    const x0 = clamp(Math.round(start.x0 + delta[0]), 0, Math.max(0, b.lengthFt - start.lengthFt));
    const y0 = clamp(Math.round(start.y0 + delta[1]), 0, Math.max(0, b.widthFt - start.widthFt));
    return fromEdges({ x0, x1: x0 + start.lengthFt, y0, y1: y0 + start.widthFt });
  }
  const sides: AreaSide[] = h.kind === 'side' ? [h.side] : [h.x, h.y];
  const mx = minAlong(b);
  const my = minAcross(b);
  for (const s of sides) {
    const target = Math.round(e[s] + (s[0] === 'x' ? delta[0] : delta[1]));
    if (s === 'x0') e.x0 = clamp(target, 0, Math.max(0, e.x1 - mx));
    else if (s === 'x1') e.x1 = clamp(target, Math.min(b.lengthFt, e.x0 + mx), b.lengthFt);
    else if (s === 'y0') e.y0 = clamp(target, 0, Math.max(0, e.y1 - my));
    else e.y1 = clamp(target, Math.min(b.widthFt, e.y0 + my), b.widthFt);
  }
  return fromEdges(e);
}

/**
 * The number boxes: a new length (along the lot) and/or width (across it), whole feet; the
 * part keeps its near corner and moves back inside the frame if it has to.
 */
export function resizeArea(a: FitArea, size: { lengthFt?: number; widthFt?: number }, b: Bounds): FitArea {
  const L = size.lengthFt === undefined ? a.lengthFt : clamp(Math.round(size.lengthFt), minAlong(b), Math.max(minAlong(b), b.lengthFt));
  const W = size.widthFt === undefined ? a.widthFt : clamp(Math.round(size.widthFt), minAcross(b), Math.max(minAcross(b), b.widthFt));
  const x0 = clamp(a.x0, 0, Math.max(0, b.lengthFt - L));
  const y0 = clamp(a.y0, 0, Math.max(0, b.widthFt - W));
  return fromEdges({ x0, x1: x0 + L, y0, y1: y0 + W });
}

/** The slide arrows: one foot along (dx) or across (dy) the lot, staying inside the frame. */
export function slideArea(a: FitArea, d: Vec2, b: Bounds): FitArea {
  const x0 = clamp(a.x0 + d[0], 0, Math.max(0, b.lengthFt - a.lengthFt));
  const y0 = clamp(a.y0 + d[1], 0, Math.max(0, b.widthFt - a.widthFt));
  return fromEdges({ x0, x1: x0 + a.lengthFt, y0, y1: y0 + a.widthFt });
}

/** Can the part slide that way at all? (greys out the arrow) */
export const canSlide = (a: FitArea, d: Vec2, b: Bounds): boolean => !sameArea(slideArea(a, d, b), fromEdges(edgesOf(a)));

/**
 * Round a rectangle found on the fine grid to whole feet: each side to the nearest foot,
 * unless that pushes it out by more than the lot-line tolerance (then inward).
 */
export function roundArea(a: FitArea, b: Bounds, tol = FIT_TOLERANCE_FT): FitArea {
  const e = edgesOf(a);
  const lo = (v: number) => (v - Math.round(v) > tol ? Math.ceil(v) : Math.round(v));
  const hi = (v: number) => (Math.round(v) - v > tol ? Math.floor(v) : Math.round(v));
  const r = { x0: lo(e.x0), x1: hi(e.x1), y0: lo(e.y0), y1: hi(e.y1) };
  // the frame's own edges (often a fraction of a foot) count as whole
  if (e.x0 <= 0.01) r.x0 = 0;
  if (e.y0 <= 0.01) r.y0 = 0;
  if (e.x1 >= b.lengthFt - 0.01) r.x1 = Math.min(r.x1, b.lengthFt);
  if (e.y1 >= b.widthFt - 0.01) r.y1 = Math.min(r.y1, b.widthFt);
  return clampArea(fromEdges(r), b);
}

/**
 * Where "Just part of it" starts: the biggest stretch of OPEN ground — the largest rectangle,
 * lined up with the lot, inside the parcel and not under a building (`buildings`: outlines in
 * local feet; only those overlapping the parcel matter). On a vacant lot that's simply the
 * whole lot; the hint tells people to drag its sides in. Whole feet.
 */
export function openGround(frame: SiteFrame, parcelLocal: Vec2[], buildings: Vec2[][]): FitArea {
  const lb = bbox(parcelLocal);
  const near = buildings.filter((r) => {
    if (r.length < 3) return false;
    const b = bbox(r);
    return b.maxX > lb.minX && b.minX < lb.maxX && b.maxY > lb.minY && b.minY < lb.maxY;
  });
  const a = inscribedRect(frame, parcelLocal, FIT_TOLERANCE_FT, near);
  return roundArea(a, frame);
}

/** Does the part's long side run across the lot? (null = about square: either way) */
export function runsAcross(a: FitArea): boolean | null {
  if (Math.abs(a.widthFt - a.lengthFt) < 0.5) return null;
  return a.widthFt > a.lengthFt;
}

/** A quarter turn across the lot: the entrance toward the side street on a corner lot, else toward the frame's y0 side. */
export const acrossTurn = (lotKind: LotKind): Turn => (lotKind === 'corner-left' ? 3 : 1);

/**
 * After the part changes: the quarter turn that runs the park the long way along it, or
 * null when the park already does (or the part is about square). Turn 1 puts the park's
 * entrance on the frame's y0 side (the street side of a "corner-right" lot), turn 3 on y1
 * ("corner-left"); placement.ts makePlacement.
 */
export function turnForArea(a: FitArea, turn: Turn, lotKind: LotKind): Turn | null {
  const across = runsAcross(a);
  if (across === null || across === (turn % 2 === 1)) return null;
  return across ? acrossTurn(lotKind) : 0;
}

/** The turn "Put it back" returns to: the park along the lot, or the long way along a part that runs across. */
export function homeTurn(d: Pick<DesignState, 'useArea' | 'area' | 'lotKind'>): Turn {
  const a = partOf(d);
  return a && runsAcross(a) ? acrossTurn(d.lotKind) : 0;
}

/** Is the park turned against the way its space runs (a park across a long part, or along one that runs across)? */
export function turnedAgainst(d: PartFields): boolean {
  const odd = (d.turn ?? 0) % 2 === 1;
  const a = partOf(d);
  if (!a) return odd;
  const across = runsAcross(a);
  return across === null ? false : across !== odd;
}

/**
 * What the park can stretch to along its OWN length and width. `fit` is the rectangle it is
 * placed in (the part, or the largest rectangle inside the lot). In a part with the park
 * turned a quarter, the part's sides swap: the park fills the part the way it actually runs.
 * The whole lot keeps its old behaviour (no swap).
 */
export function stretchTo(d: PartFields, fit: Bounds): Bounds {
  if (partOf(d) && (d.turn ?? 0) % 2 === 1) return { lengthFt: fit.widthFt, widthFt: fit.lengthFt };
  return { lengthFt: fit.lengthFt, widthFt: fit.widthFt };
}

/** Clip a ring to an axis-lined box (Sutherland–Hodgman; fine for filling a lot outline). */
export function clipToBox(ring: Vec2[], minX: number, maxX: number, minY: number, maxY: number): Vec2[] {
  let out = ring;
  const planes: [(p: Vec2) => number][] = [[(p) => p[0] - minX], [(p) => maxX - p[0]], [(p) => p[1] - minY], [(p) => maxY - p[1]]];
  for (const [side] of planes) {
    const src = out;
    out = [];
    for (let i = 0; i < src.length; i++) {
      const p = src[i]!;
      const q = src[(i + 1) % src.length]!;
      const sp = side(p);
      const sq = side(q);
      if (sp >= 0) out.push(p);
      if (sp >= 0 !== sq >= 0) {
        const t = sp / (sp - sq);
        out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
      }
    }
    if (out.length < 3) return [];
  }
  return out;
}

/**
 * The rest of the lot, outside the part (site feet), as up to four pieces — the end strips
 * and the two side strips between them — for the light dimming on the Size step.
 */
export function outsidePieces(parcelSite: Vec2[], a: FitArea): Vec2[][] {
  const b = bbox(parcelSite);
  const big = 1e4;
  const e = edgesOf(a);
  const pieces = [
    clipToBox(parcelSite, b.minX - 1, e.x0, -big, big),
    clipToBox(parcelSite, e.x1, b.maxX + 1, -big, big),
    clipToBox(parcelSite, e.x0, e.x1, -big, e.y0),
    clipToBox(parcelSite, e.x0, e.x1, e.y1, big),
  ];
  const area2 = (r: Vec2[]) => Math.abs(r.reduce((s, p, i) => s + p[0] * r[(i + 1) % r.length]![1] - r[(i + 1) % r.length]![0] * p[1], 0));
  return pieces.filter((r) => r.length >= 3 && area2(r) > 0.2);
}
