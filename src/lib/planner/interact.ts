// Moving things with the mouse (or a finger): the pure parts. Snapping a dragged item to
// the grid, turning it with the round handle, where a palette item lands when it is
// dropped, where a copy goes, and the drag gesture itself (so Esc can put things back).
// No DOM and no three.js here, so it can all be tested.

import type { LayoutItem, LayoutSurface, ThemeId } from '../types';
import { ELEMENTS } from '../../data/elements';
import type { Vec2 } from './geo';

/** Grid snap in feet; 0 = no snapping. */
export type SnapStep = 0 | 1 | 4;

const round1 = (v: number) => Math.round(v * 10) / 10;

/**
 * Snap an item so its footprint edges land on the grid (1 or 4 ft; 0 = free, to 0.1 ft),
 * keeping it near the park (its centre at most half its size outside the park edge).
 */
export function snapItem(it: Pick<LayoutItem, 'w' | 'h' | 'rotationDeg'>, p: Vec2, step: number, L: number, Wd: number): Vec2 {
  const turned = Math.round(Math.abs(it.rotationDeg) / 90) % 2 === 1;
  const hw = (turned ? it.h : it.w) / 2;
  const hh = (turned ? it.w : it.h) / 2;
  const sx = step > 0 ? Math.round((p[0] - hw) / step) * step + hw : round1(p[0]);
  const sy = step > 0 ? Math.round((p[1] - hh) / step) * step + hh : round1(p[1]);
  return [Math.max(-hw, Math.min(L + hw, sx)), Math.max(-hh, Math.min(Wd + hh, sy))];
}

/** Degrees into [0, 360). */
export function normDeg(deg: number): number {
  const d = ((deg % 360) + 360) % 360;
  return Math.abs(d - 360) < 1e-9 ? 0 : d;
}

/** Snap an angle to whole steps (15° by default); `free` keeps whole degrees. */
export function snapAngle(deg: number, step = 15, free = false): number {
  const s = free ? 1 : step;
  return normDeg(Math.round(deg / s) * s);
}

/** Signed angle (degrees, -180..180] from direction a to direction b, both seen from `center`. */
export function angleBetween(center: Vec2, a: Vec2, b: Vec2): number {
  const a0 = Math.atan2(a[1] - center[1], a[0] - center[0]);
  const a1 = Math.atan2(b[1] - center[1], b[0] - center[0]);
  let d = ((a1 - a0) * 180) / Math.PI;
  while (d <= -180) d += 360;
  while (d > 180) d -= 360;
  return d;
}

/**
 * Turning with the handle: the item started at `startDeg`; the pointer went from `grab`
 * to `now` around the item's `center` (all in the item's own frame). Snaps to 15°
 * unless `free` (Shift held).
 */
export function turnFromDrag(startDeg: number, center: Vec2, grab: Vec2, now: Vec2, free = false): number {
  return snapAngle(startDeg + angleBetween(center, grab, now), 15, free);
}

/** Footprint (length × width, feet) of a newly added element — the same rule the layout uses. */
export function addedFootprint(element: string): [number, number] {
  const fp = ELEMENTS[element]?.footprintFt;
  return fp ? [fp[0], fp[1]] : [2, 2];
}

/** The theme of the park piece under a point (so a new bench takes that piece's colours). */
export function themeAt(surfaces: Pick<LayoutSurface, 'polygon' | 'theme'>[], x: number, y: number): ThemeId | undefined {
  const zone = surfaces.find((s) => {
    if (!s.theme) return false;
    const xs = s.polygon.map((p) => p[0]);
    const ys = s.polygon.map((p) => p[1]);
    return x >= Math.min(...xs) && x <= Math.max(...xs) && y >= Math.min(...ys) && y <= Math.max(...ys);
  });
  return zone?.theme as ThemeId | undefined;
}

export interface Placed {
  x: number;
  y: number;
  w: number;
  h: number;
  theme: ThemeId;
}

type LayoutLike = { lengthFt: number; widthFt: number; surfaces: Pick<LayoutSurface, 'polygon' | 'theme'>[]; items: Pick<LayoutItem, 'x' | 'y'>[] };

/** Where an element dropped from the palette at park point `p` lands (snapped like a drag). */
export function dropPlacement(layout: LayoutLike, element: string, p: Vec2, step: number, fallback: ThemeId): Placed {
  const [w, h] = addedFootprint(element);
  const [x, y] = snapItem({ w, h, rotationDeg: 0 }, p, step, layout.lengthFt, layout.widthFt);
  return { x, y, w, h, theme: themeAt(layout.surfaces, x, y) ?? fallback };
}

const taken = (items: Pick<LayoutItem, 'x' | 'y'>[], x: number, y: number) => items.some((o) => Math.abs(o.x - x) < 0.5 && Math.abs(o.y - y) < 0.5);

/**
 * A plain click on a palette item: the middle of the park, as before — but if something
 * already sits exactly there (the last thing added), step along by the new item's length
 * so repeated clicks don't pile up in one spot.
 */
export function addPlacement(layout: LayoutLike, element: string, fallback: ThemeId): Placed {
  const [w, h] = addedFootprint(element);
  const L = layout.lengthFt;
  const Wd = layout.widthFt;
  const cx = Math.round(L / 2);
  const cy = Math.round(Wd / 2);
  let x = cx;
  for (let k = 0; k < 24; k++) {
    // 0, +1, -1, +2, -2 … lengths from the middle
    const n = k === 0 ? 0 : (k % 2 ? 1 : -1) * Math.ceil(k / 2);
    const tx = cx + n * w;
    if (tx - w / 2 < 0 || tx + w / 2 > L) continue;
    if (!taken(layout.items, tx, cy)) {
      x = tx;
      break;
    }
  }
  return { x, y: cy, w, h, theme: themeAt(layout.surfaces, x, cy) ?? fallback };
}

/**
 * Where a copy of `it` goes: right next to it, offset by its own length along its own
 * direction (so repeated copies make a row), or on the other side / alongside when that
 * would leave the park. Never exactly on top of another item of the same kind.
 */
export function duplicatePlacement(
  it: Pick<LayoutItem, 'x' | 'y' | 'w' | 'h' | 'rotationDeg' | 'element'>,
  L: number,
  Wd: number,
  others: Pick<LayoutItem, 'x' | 'y' | 'element'>[] = [],
): Vec2 {
  const [cw, ch] = addedFootprint(it.element);
  const w = it.w || cw;
  const h = it.h || ch;
  const r = (it.rotationDeg * Math.PI) / 180;
  const xd: Vec2 = [Math.cos(r), Math.sin(r)];
  const yd: Vec2 = [-Math.sin(r), Math.cos(r)];
  const along = (w + cw) / 2;
  const across = (h + ch) / 2;
  const cands: Vec2[] = [
    [it.x + xd[0] * along, it.y + xd[1] * along],
    [it.x - xd[0] * along, it.y - xd[1] * along],
    [it.x + yd[0] * across, it.y + yd[1] * across],
    [it.x - yd[0] * across, it.y - yd[1] * across],
  ].map(([x, y]) => [round1(x!), round1(y!)] as Vec2);
  // half-extent of the copy's footprint along the park axes (it keeps the original's turn)
  const c = Math.abs(Math.cos(r));
  const s = Math.abs(Math.sin(r));
  const ex = (cw * c + ch * s) / 2;
  const ey = (cw * s + ch * c) / 2;
  const inside = ([x, y]: Vec2) => x - ex >= -0.01 && x + ex <= L + 0.01 && y - ey >= -0.01 && y + ey <= Wd + 0.01;
  const free = ([x, y]: Vec2) => !others.some((o) => o.element === it.element && Math.abs(o.x - x) < 0.5 && Math.abs(o.y - y) < 0.5);
  return cands.find((p) => inside(p) && free(p)) ?? cands.find(inside) ?? cands[0]!;
}

/** Things worth turning with a handle (round things look the same any way round). */
export function isTurnable(kind: 'item' | 'existing', element: string, shape?: string): boolean {
  if (kind === 'existing') return element === 'utility-line' || element === 'old-pavement' || element === 'utility-pole';
  return !(shape === 'tree-small' || shape === 'tree-large' || shape === 'shrub' || shape === 'barrel');
}

// ---- the drag gesture --------------------------------------------------------

export interface Pose {
  x: number;
  y: number;
  rotationDeg: number;
}

/**
 * One press-drag-release on a thing in the planner: moving it, or turning it with the
 * handle. Nothing is saved while it runs; `finish()` gives the pose to save (one undo
 * step), `cancel()` (Esc) puts it back where it started.
 */
export class DragGesture {
  private pose: Pose | null = null;
  moved = false;
  over = false;
  done = false;

  constructor(
    readonly mode: 'move' | 'turn',
    readonly start: Pose,
    private startAt: Vec2,
    /** screen pixels before a press counts as a drag (a click still just picks) */
    private threshold = 4,
  ) {}

  /** The pointer moved to `at` (screen px); `next` is where the thing would now be. Returns true if the preview changed. */
  update(at: Vec2, next: Pose | null, over = false): boolean {
    if (this.done) return false;
    if (!this.moved) {
      if (Math.hypot(at[0] - this.startAt[0], at[1] - this.startAt[1]) < this.threshold) return false;
      this.moved = true;
    }
    if (!next) return false;
    const changed = !this.pose || this.pose.x !== next.x || this.pose.y !== next.y || this.pose.rotationDeg !== next.rotationDeg || this.over !== over;
    this.pose = next;
    this.over = over;
    return changed;
  }

  /** Where to draw the thing right now (null = where it's saved). */
  get preview(): Pose | null {
    return this.done ? null : this.pose;
  }

  /** Let go: the pose to save, or null when nothing changed (a click, or dropped where it started). */
  finish(): Pose | null {
    if (this.done) return null;
    this.done = true;
    const p = this.pose;
    if (!this.moved || !p) return null;
    if (p.x === this.start.x && p.y === this.start.y && p.rotationDeg === this.start.rotationDeg) return null;
    return p;
  }

  /** Esc: forget the drag; the thing goes back to where it started. */
  cancel(): Pose {
    this.done = true;
    this.pose = null;
    return this.start;
  }
}

// ---- wet areas drawn as outlines (terrain, 2026-10-04) --------------------------------
//
// Click (tap) around the area point by point; finish by clicking the first point again,
// double-clicking, Enter or the Finish button; Esc cancels. The outline is saved as
// corners in feet east/north of its centre (ExistingItem.outline), so dragging the area
// only changes its lngLat. Older saves have a circle (radiusFt) and still work.

/** How close (screen px) a click must be to the first point to close the outline. */
export const CLOSE_PX = { mouse: 12, touch: 24 } as const;

/** An outline being drawn: points in local feet, plus where each was clicked on screen. */
export class PolygonDraft {
  points: Vec2[] = [];
  private screen: Vec2[] = [];

  get canFinish(): boolean {
    return this.points.length >= 3;
  }

  /**
   * A click at ground point `p` (local feet), screen position `at`. Returns 'close' when it
   * lands on the first point (and there are enough points to make an area), 'skip' for the
   * second click of a double-click (on top of the last point), else 'add'.
   */
  click(p: Vec2, at: Vec2, closePx: number = CLOSE_PX.mouse): 'add' | 'close' | 'skip' {
    const n = this.points.length;
    if (n >= 3 && Math.hypot(at[0] - this.screen[0]![0], at[1] - this.screen[0]![1]) <= closePx) return 'close';
    if (n && Math.hypot(at[0] - this.screen[n - 1]![0], at[1] - this.screen[n - 1]![1]) < 6) return 'skip';
    this.points.push([p[0], p[1]]);
    this.screen.push([at[0], at[1]]);
    return 'add';
  }

  /** The camera moved: screen positions of the points so far (for closing on the first one). */
  reproject(toScreen: (p: Vec2) => Vec2 | null) {
    this.screen = this.points.map((p) => toScreen(p) ?? [Infinity, Infinity]);
  }

  undo() {
    this.points.pop();
    this.screen.pop();
  }
}

/** Shoelace area (absolute), square feet. */
export function polygonArea(pts: Vec2[]): number {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]!;
    const q = pts[(i + 1) % pts.length]!;
    a += p[0] * q[1] - q[0] * p[1];
  }
  return Math.abs(a) / 2;
}

/** Area centroid (falls back to the vertex average for degenerate outlines). */
export function polygonCentroid(pts: Vec2[]): Vec2 {
  let a = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]!;
    const q = pts[(i + 1) % pts.length]!;
    const f = p[0] * q[1] - q[0] * p[1];
    a += f;
    cx += (p[0] + q[0]) * f;
    cy += (p[1] + q[1]) * f;
  }
  if (Math.abs(a) < 1e-9) {
    const n = pts.length || 1;
    return [pts.reduce((s, p) => s + p[0], 0) / n, pts.reduce((s, p) => s + p[1], 0) / n];
  }
  return [cx / (3 * a), cy / (3 * a)];
}

/**
 * A drawn outline (local feet) as it is saved: its centre, and the corners as offsets in
 * feet east/north of it (0.1 ft), with near-duplicate corners dropped; `radiusFt` is the
 * radius of a circle of the same area (for anything that only knows circles).
 */
export function outlineFromPoints(points: Vec2[]): { center: Vec2; outline: [number, number][]; radiusFt: number } {
  const pts: Vec2[] = [];
  for (const p of points) {
    const last = pts[pts.length - 1];
    if (!last || Math.hypot(p[0] - last[0], p[1] - last[1]) >= 0.2) pts.push(p);
  }
  if (pts.length > 3 && Math.hypot(pts[0]![0] - pts[pts.length - 1]![0], pts[0]![1] - pts[pts.length - 1]![1]) < 0.2) pts.pop();
  const center = polygonCentroid(pts);
  const outline = pts.map(([x, y]) => [Math.round((x - center[0]) * 10) / 10, Math.round((y - center[1]) * 10) / 10] as [number, number]);
  return { center, outline, radiusFt: Math.max(0.5, Math.round(Math.sqrt(polygonArea(pts) / Math.PI) * 10) / 10) };
}

/** The ground a wet area covers, local feet: its drawn outline, or (older saves) a circle. */
export function wetAreaPolygon(it: { outline?: [number, number][] | null; radiusFt?: number }, center: Vec2, segments = 32): Vec2[] {
  if (it.outline && it.outline.length >= 3) return it.outline.map(([dx, dy]) => [center[0] + dx, center[1] + dy] as Vec2);
  const r = it.radiusFt ?? 5;
  return Array.from({ length: segments }, (_, i) => {
    const a = (i / segments) * Math.PI * 2;
    return [center[0] + r * Math.cos(a), center[1] + r * Math.sin(a)] as Vec2;
  });
}

/** An outline with one corner moved to `p` (offsets from `center`). */
export function moveCorner(outline: [number, number][], i: number, p: Vec2, center: Vec2): [number, number][] {
  return outline.map((o, k) => (k === i ? [Math.round((p[0] - center[0]) * 10) / 10, Math.round((p[1] - center[1]) * 10) / 10] : o));
}

/** An outline with a new corner at `p` inserted after corner `i`. */
export function insertCorner(outline: [number, number][], i: number, p: Vec2, center: Vec2): [number, number][] {
  const out = outline.slice();
  out.splice(i + 1, 0, [Math.round((p[0] - center[0]) * 10) / 10, Math.round((p[1] - center[1]) * 10) / 10]);
  return out;
}

/** The polygon pushed outward by `pad` feet (mitred corners, capped), for selection rings. */
export function padPolygon(pts: Vec2[], pad: number): Vec2[] {
  const n = pts.length;
  if (n < 3 || !pad) return pts;
  const ccw = polygonSignedArea(pts) > 0;
  return pts.map((p, i) => {
    const a = pts[(i - 1 + n) % n]!;
    const b = pts[(i + 1) % n]!;
    const n1 = outward(a, p, ccw);
    const n2 = outward(p, b, ccw);
    let mx = n1[0] + n2[0];
    let my = n1[1] + n2[1];
    const m = Math.hypot(mx, my) || 1;
    mx /= m;
    my /= m;
    const cos = Math.max(0.35, mx * n1[0] + my * n1[1]);
    return [p[0] + (mx * pad) / cos, p[1] + (my * pad) / cos] as Vec2;
  });
}

function polygonSignedArea(pts: Vec2[]): number {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]!;
    const q = pts[(i + 1) % pts.length]!;
    a += p[0] * q[1] - q[0] * p[1];
  }
  return a / 2;
}

function outward(a: Vec2, b: Vec2, ccw: boolean): Vec2 {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const L = Math.hypot(dx, dy) || 1;
  // outside of a CCW ring is to the right of each edge
  return ccw ? [dy / L, -dx / L] : [-dy / L, dx / L];
}
