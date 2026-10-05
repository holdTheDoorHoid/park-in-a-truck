// Fitting the stretched park INSIDE the lot (fix round 2026-10-04, build-lead A6). Pure, tested.
//
// The site frame is the smallest rectangle round the parcel, so on a lot that is not
// quite square-cornered, a park stretched to that rectangle hangs over the lot line at
// the corners. The park is stretched instead to the largest rectangle (lined up with the
// frame) that fits inside the parcel, and placed in it.

import { distanceToRing, pointInPolygon, type Vec2 } from './geo';
import { localToSite, type SiteFrame } from './rect';

/** A rectangle in site-frame feet (x along the lot from the entrance edge, y across it). */
export interface FitArea {
  x0: number;
  y0: number;
  lengthFt: number;
  widthFt: number;
}

/** How far over the line still counts as on the lot — the same allowance as the overhang check. */
export const FIT_TOLERANCE_FT = 0.35;

/** How far a spot may be inside a building's outline and still count as open ground (part of the lot). */
export const OBSTACLE_TOLERANCE_FT = 0.5;

/**
 * The largest rectangle lined up with the site frame that fits inside the parcel (local
 * feet). Found on a fine grid (¼ ft; ½ ft on big lots) with the "largest rectangle in a
 * histogram" method, so it works for any lot shape.
 *
 * `obstacles` (part of the lot, 2026-10-04): outlines (local feet) the rectangle must keep
 * out of — the buildings standing on the lot — so it finds the biggest stretch of OPEN
 * ground. A grid corner more than `obstacleTol` inside one of them is not usable.
 */
export function inscribedRect(
  frame: SiteFrame,
  parcelLocal: Vec2[],
  tol = FIT_TOLERANCE_FT,
  obstacles: Vec2[][] = [],
  obstacleTol = OBSTACLE_TOLERANCE_FT,
): FitArea {
  const ring = parcelLocal.map((p) => localToSite(frame, p));
  if (ring.length < 3) return { x0: 0, y0: 0, lengthFt: frame.lengthFt, widthFt: frame.widthFt };
  const blocks = obstacles
    .filter((r) => r.length >= 3)
    .map((r) => {
      const s = r.map((p) => localToSite(frame, p));
      const xs = s.map((p) => p[0]);
      const ys = s.map((p) => p[1]);
      return { ring: s, minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
    });
  const blocked = (p: Vec2) =>
    blocks.some(
      (b) => p[0] > b.minX && p[0] < b.maxX && p[1] > b.minY && p[1] < b.maxY && pointInPolygon(p, b.ring) && distanceToRing(p, b.ring) > obstacleTol,
    );
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of ring) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  const cell = (maxX - minX) * (maxY - minY) > 6000 ? 0.5 : 0.25;
  const nx = Math.max(1, Math.ceil((maxX - minX) / cell));
  const ny = Math.max(1, Math.ceil((maxY - minY) / cell));
  // a cell is usable when all four of its corners are on the lot (within the tolerance)
  const cx = nx + 1;
  const corner = new Uint8Array(cx * (ny + 1));
  for (let j = 0; j <= ny; j++)
    for (let i = 0; i <= nx; i++) {
      const p: Vec2 = [minX + i * cell, minY + j * cell];
      corner[j * cx + i] = (pointInPolygon(p, ring) || distanceToRing(p, ring) <= tol) && !blocked(p) ? 1 : 0;
    }
  const ok = (i: number, j: number) => corner[j * cx + i]! & corner[j * cx + i + 1]! & corner[(j + 1) * cx + i]! & corner[(j + 1) * cx + i + 1]!;
  const heights = new Int32Array(nx);
  let best = { area: -1, i0: 0, j0: 0, w: nx, h: ny };
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) heights[i] = ok(i, j) ? heights[i]! + 1 : 0;
    // largest rectangle under this row's histogram
    const stack: number[] = [];
    for (let i = 0; i <= nx; i++) {
      const h = i < nx ? heights[i]! : 0;
      while (stack.length && heights[stack[stack.length - 1]!]! >= h) {
        const top = stack.pop()!;
        const height = heights[top]!;
        const left = stack.length ? stack[stack.length - 1]! + 1 : 0;
        const width = i - left;
        const area = width * height;
        if (area > best.area) best = { area, i0: left, j0: j - height + 1, w: width, h: height };
      }
      stack.push(i);
    }
  }
  if (best.area <= 0) return { x0: 0, y0: 0, lengthFt: frame.lengthFt, widthFt: frame.widthFt };
  return { x0: minX + best.i0 * cell, y0: minY + best.j0 * cell, lengthFt: best.w * cell, widthFt: best.h * cell };
}

/** Feet the park may be stretched to along a fitted side (whole feet, a hair of tolerance). */
export const fitFeet = (len: number) => Math.floor(len + 0.05);

// ---- sliding the park on the lot ---------------------------------------------------

export type SlideDir = 'front' | 'back' | 'left' | 'right';

/** One foot's slide in each direction, in site-frame feet (left = toward the frame's +y). */
export const SLIDE: Record<SlideDir, Vec2> = { front: [-1, 0], back: [1, 0], left: [0, 1], right: [0, -1] };

/** Square feet of park over the lot line with the park slid by `shift` (site feet). */
export type OutsideAt = (shift: Vec2) => number;

/**
 * Which slides have room: a slide that would push a park that fits over the lot line is
 * "blocked". When the park already hangs over, nothing is blocked (any slide may help).
 */
export function slideRoom(outsideAt: OutsideAt, shift: Vec2): { now: number; blocked: Record<SlideDir, boolean> } {
  const now = outsideAt(shift);
  const blocked = {} as Record<SlideDir, boolean>;
  for (const k of Object.keys(SLIDE) as SlideDir[]) {
    const d = SLIDE[k];
    blocked[k] = now === 0 && outsideAt([shift[0] + d[0], shift[1] + d[1]]) > 0;
  }
  return { now, blocked };
}

/**
 * The slide (site feet) that leaves the least of the park over the lot line, searched
 * within `reach` feet of where the park fits by default; ties go to the smallest slide.
 */
export function bestSlide(outsideAt: OutsideAt, reach = 8): Vec2 {
  let best: Vec2 = [0, 0];
  let bestOut = outsideAt(best);
  const consider = (p: Vec2) => {
    const o = outsideAt(p);
    if (o < bestOut || (o === bestOut && Math.hypot(...p) < Math.hypot(...best))) {
      best = p;
      bestOut = o;
    }
  };
  for (let x = -reach; x <= reach; x++) for (let y = -reach; y <= reach; y++) consider([x, y]);
  const [bx, by] = best;
  for (let x = -0.75; x <= 0.75; x += 0.25) for (let y = -0.75; y <= 0.75; y += 0.25) if (x || y) consider([bx + x, by + y]);
  return [Math.round(best[0] * 4) / 4, Math.round(best[1] * 4) / 4];
}
