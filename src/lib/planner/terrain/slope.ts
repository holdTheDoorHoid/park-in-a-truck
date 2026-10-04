// What the ground does on a lot, as numbers and in plain words: high and low points, how
// far it falls, the average slope, the steepest part, which way rain runs, and any dip
// inside the lot. Plus the drawing aids for the plan view: contour lines and drain arrows.
// Pure (no DOM, no three.js).
//
// Directions are given the way a person standing at the lot's entrance sees them: the
// FRONT is the entrance edge on the street (site frame x0), the BACK is x1, LEFT is y1
// and RIGHT is y0 (rect.ts / DESIGN.md §6).

import type { GroundFn } from '../ground';
import { bearingOf, distanceToRing, pointInPolygon, type Vec2 } from '../geo';
import { localToSite, siteToLocal, type Edge, type SiteFrame } from '../rect';
import { samplesInside } from './grid';
import { compassWord, oneDecimal, pt, type PlannerKey, type PlannerT } from '../words';

export { compassWord };

export type Toward = 'front' | 'back' | 'left' | 'right' | 'front-left' | 'front-right' | 'back-left' | 'back-right';

export interface SlopeSummary {
  /** highest and lowest ground on the lot (lightly smoothed), local feet + ft above the datum */
  high: { p: Vec2; ft: number };
  low: { p: Vec2; ft: number };
  /** high − low, feet */
  fallFt: number;
  /** slope of the plane that best fits the lot's ground, percent */
  avgPct: number;
  /** downhill direction of that plane (unit, local feet); null when practically flat */
  downhill: Vec2 | null;
  /** which way that is, seen from the entrance */
  toward: Toward | null;
  /** the steepest stretch inside the lot, measured over 8 ft; null when not notably steeper than average */
  steepest: { p: Vec2; pct: number } | null;
  /** a low spot inside the lot that is lower than anywhere along the lot's edge */
  dip: { p: Vec2; depthFt: number } | null;
  /** varies by less than 6 inches and slopes under 1% */
  flat: boolean;
}

/** Ground averaged over a small cross (±r ft) — lidar is noisy at the inch level. */
function smooth(ground: GroundFn, x: number, y: number, r = 1.5): number {
  return (ground(x, y) * 2 + ground(x + r, y) + ground(x - r, y) + ground(x, y + r) + ground(x, y - r)) / 6;
}

/** Least-squares plane z = a + b·x + c·y through the points (centred for stability). Returns [b, c]. */
export function fitPlane(pts: Vec2[], z: number[]): Vec2 {
  const n = pts.length;
  if (n < 3) return [0, 0];
  let mx = 0;
  let my = 0;
  let mz = 0;
  for (let i = 0; i < n; i++) {
    mx += pts[i]![0];
    my += pts[i]![1];
    mz += z[i]!;
  }
  mx /= n;
  my /= n;
  mz /= n;
  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  let sxz = 0;
  let syz = 0;
  for (let i = 0; i < n; i++) {
    const dx = pts[i]![0] - mx;
    const dy = pts[i]![1] - my;
    const dz = z[i]! - mz;
    sxx += dx * dx;
    sxy += dx * dy;
    syy += dy * dy;
    sxz += dx * dz;
    syz += dy * dz;
  }
  const det = sxx * syy - sxy * sxy;
  if (Math.abs(det) < 1e-9) {
    // all points on a line: slope along it only
    return sxx > syy ? [sxx ? sxz / sxx : 0, 0] : [0, syy ? syz / syy : 0];
  }
  return [(sxz * syy - syz * sxy) / det, (syz * sxx - sxz * sxy) / det];
}

/** Which way a local direction points, seen from the entrance. */
export function towardOf(dir: Vec2, frame: Pick<SiteFrame, 'u' | 'v'>): Toward {
  const du = dir[0] * frame.u[0] + dir[1] * frame.u[1];
  const dv = dir[0] * frame.v[0] + dir[1] * frame.v[1];
  const fb = du < 0 ? 'front' : 'back';
  const lr = dv > 0 ? 'left' : 'right';
  // within ~27° of an axis counts as straight toward that edge
  if (Math.abs(du) >= 2 * Math.abs(dv)) return fb;
  if (Math.abs(dv) >= 2 * Math.abs(du)) return lr;
  return `${fb}-${lr}` as Toward;
}

/** The lot edges a direction points at ('front-left' → x0 and y1). */
export function edgesOf(t: Toward): Edge[] {
  const map: Record<string, Edge> = { front: 'x0', back: 'x1', left: 'y1', right: 'y0' };
  return t.split('-').map((k) => map[k]!);
}

const PLACE: Record<string, PlannerKey> = {
  'front-left': 'slope.placeFrontLeft',
  'front-right': 'slope.placeFrontRight',
  'back-left': 'slope.placeBackLeft',
  'back-right': 'slope.placeBackRight',
  front: 'slope.placeFront',
  back: 'slope.placeBack',
  left: 'slope.placeLeft',
  right: 'slope.placeRight',
  '': 'slope.placeMiddle',
};

/** "the back right corner", "the front edge", "the left side", "the middle of the lot". */
export function whereOnLot(p: Vec2, frame: SiteFrame, t: PlannerT = pt()): string {
  const [s, u] = localToSite(frame, p);
  const fs = s / Math.max(1, frame.lengthFt);
  const ft = u / Math.max(1, frame.widthFt);
  const fb = fs < 0.25 ? 'front' : fs > 0.75 ? 'back' : '';
  // narrow lots: left/right only near the very edges
  const edge = frame.widthFt < 24 ? 0.2 : 0.25;
  const lr = ft > 1 - edge ? 'left' : ft < edge ? 'right' : '';
  return t(PLACE[[fb, lr].filter(Boolean).join('-')]!);
}

export function slopeSummary(ground: GroundFn, parcel: Vec2[], frame: SiteFrame): SlopeSummary {
  const area = Math.abs(parcel.reduce((s, p, i) => {
    const q = parcel[(i + 1) % parcel.length]!;
    return s + p[0] * q[1] - q[0] * p[1];
  }, 0)) / 2;
  const step = area > 10000 ? 2 : 1;
  const pts = samplesInside(parcel, step);
  const raw = pts.map(([x, y]) => ground(x, y));
  const sm = pts.map(([x, y]) => smooth(ground, x, y));
  let hi = 0;
  let lo = 0;
  sm.forEach((v, i) => {
    if (v > sm[hi]!) hi = i;
    if (v < sm[lo]!) lo = i;
  });
  const fallFt = sm[hi]! - sm[lo]!;
  const [b, c] = fitPlane(pts, raw);
  const g = Math.hypot(b, c);
  const avgPct = g * 100;
  const flat = fallFt < 0.5 && avgPct < 1;
  const downhill: Vec2 | null = !flat && avgPct >= 0.5 ? [-b / g, -c / g] : null;

  // steepest: central differences over ±4 ft, only where both ends are on the lot
  const d = 4;
  let steepest: { p: Vec2; pct: number } | null = null;
  const lattice = step * 2;
  for (const p of samplesInside(parcel, lattice)) {
    const [x, y] = p;
    const ends: Vec2[] = [
      [x + d, y],
      [x - d, y],
      [x, y + d],
      [x, y - d],
    ];
    if (!ends.every((e) => pointInPolygon(e, parcel))) continue;
    const gx = (ground(x + d, y) - ground(x - d, y)) / (2 * d);
    const gy = (ground(x, y + d) - ground(x, y - d)) / (2 * d);
    const pct = Math.hypot(gx, gy) * 100;
    if (!steepest || pct > steepest.pct) steepest = { p, pct };
  }
  if (steepest && (steepest.pct < Math.max(3, avgPct * 1.5) || flat)) steepest = null;

  // a dip: the lowest ground inside the lot is clearly lower than anywhere along its edge
  let edgeMin = Infinity;
  for (let i = 0; i < parcel.length; i++) {
    const a = parcel[i]!;
    const q = parcel[(i + 1) % parcel.length]!;
    const L = Math.hypot(q[0] - a[0], q[1] - a[1]);
    const k = Math.max(1, Math.ceil(L));
    for (let s = 0; s < k; s++) {
      const t = s / k;
      edgeMin = Math.min(edgeMin, smooth(ground, a[0] + (q[0] - a[0]) * t, a[1] + (q[1] - a[1]) * t));
    }
  }
  const lowP = pts[lo]!;
  const depth = edgeMin - sm[lo]!;
  const dip = depth >= 0.3 && distanceToRing(lowP, parcel) >= 2 ? { p: lowP, depthFt: depth } : null;

  return {
    high: { p: pts[hi]!, ft: sm[hi]! },
    low: { p: lowP, ft: sm[lo]! },
    fallFt,
    avgPct,
    downhill,
    toward: downhill ? towardOf(downhill, frame) : null,
    steepest,
    dip,
    flat,
  };
}

// ---- plain words --------------------------------------------------------------------

/** "4 inches", "2.3 ft", "14 ft" */
export function lengthWords(ft: number, t: PlannerT = pt()): string {
  if (ft < 0.96) return t('slope.inches', { count: Math.max(1, Math.round(ft * 12)) });
  return t('slope.feet', { ft: ft < 9.95 ? oneDecimal(ft, t) : Math.round(ft) });
}

/** "3% (about 1 ft in 33 ft)" */
export function slopeWords(pct: number, t: PlannerT = pt()): string {
  const p = pct < 1 ? Math.round(pct * 10) / 10 : Math.round(pct);
  if (pct < 0.3) return t('slope.pct', { pct: p });
  return t('slope.pctRun', { pct: p, run: Math.round(100 / pct) });
}

const TOWARD_WORDS: Record<Toward, PlannerKey> = {
  front: 'slope.towardFront',
  back: 'slope.towardBack',
  left: 'slope.towardLeft',
  right: 'slope.towardRight',
  'front-left': 'slope.towardFrontLeft',
  'front-right': 'slope.towardFrontRight',
  'back-left': 'slope.towardBackLeft',
  'back-right': 'slope.towardBackRight',
};

export interface SlopeWords {
  /** one or two sentences for the summary */
  headline: string;
  /** further facts (steepest part, dip), each a sentence */
  more: string[];
}

/**
 * The summary in plain words. `streets` names the street along each lot edge that has one
 * (from the City's centrelines); only facts, no advice. `t`: the language (the page's by default).
 */
export function describeSlope(s: SlopeSummary, frame: SiteFrame, streets: Partial<Record<Edge, string>> = {}, t: PlannerT = pt()): SlopeWords {
  const more: string[] = [];
  if (s.flat) {
    return { headline: t('slope.flat', { amount: t('slope.inches', { count: s.fallFt < 0.3 ? 4 : 6 }) }), more };
  }
  const from = whereOnLot(s.high.p, frame, t);
  const to = whereOnLot(s.low.p, frame, t);
  const amount = lengthWords(s.fallFt, t);
  const slope = slopeWords(s.avgPct, t);
  let headline = from === to ? t('slope.varies', { amount, slope }) : t('slope.falls', { amount, from, to, slope });
  if (s.downhill && s.toward) {
    const edges = edgesOf(s.toward);
    const street = edges.map((e) => streets[e]).find(Boolean);
    const onStreet = edges.some((e) => frame.streetEdges.includes(e));
    const where = t(TOWARD_WORDS[s.toward]);
    const compass = compassWord(bearingOf(s.downhill), t);
    headline += ' ' + (street ? t('slope.rainStreet', { where, street, compass }) : onStreet ? t('slope.rainTheStreet', { where, compass }) : t('slope.rain', { where, compass }));
  }
  if (s.steepest) more.push(t('slope.steepest', { where: whereOnLot(s.steepest.p, frame, t), slope: slopeWords(s.steepest.pct, t) }));
  if (s.dip) more.push(t('slope.dip', { where: whereOnLot(s.dip.p, frame, t), amount: lengthWords(s.dip.depthFt, t) }));
  return { headline, more };
}

// ---- drawing aids -------------------------------------------------------------------

/** A contour interval that gives a handful of lines across the lot: 3 in, 6 in, 1, 2, 5 or 10 ft. */
export function contourInterval(fallFt: number): number | null {
  if (fallFt < 0.25) return null;
  for (const i of [0.25, 0.5, 1, 2, 5, 10]) if (fallFt / i <= 12) return i;
  return 20;
}

export interface ContourSegment {
  a: Vec2;
  b: Vec2;
  /** height of the line above the datum, ft */
  level: number;
}

/**
 * Contour lines (marching squares) over a lattice of `cell` ft covering the ring's bounding
 * box (plus `margin`), kept where they cross the ring (segment middles inside it).
 */
export function contours(ground: GroundFn, ring: Vec2[], interval: number, cell = 1, margin = 0): ContourSegment[] {
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
  minX -= margin + cell;
  minY -= margin + cell;
  const nx = Math.ceil((maxX + margin + cell - minX) / cell) + 1;
  const ny = Math.ceil((maxY + margin + cell - minY) / cell) + 1;
  const v = new Float64Array(nx * ny);
  let lo = Infinity;
  let hi = -Infinity;
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const h = ground(minX + i * cell, minY + j * cell);
      v[j * nx + i] = h;
      lo = Math.min(lo, h);
      hi = Math.max(hi, h);
    }
  }
  const out: ContourSegment[] = [];
  const keep = (a: Vec2, b: Vec2) => margin > 0 || pointInPolygon([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], ring);
  for (let level = Math.ceil(lo / interval) * interval; level <= hi; level += interval) {
    const L = Math.round(level * 1000) / 1000;
    for (let j = 0; j < ny - 1; j++) {
      for (let i = 0; i < nx - 1; i++) {
        const x0 = minX + i * cell;
        const y0 = minY + j * cell;
        // corners counter-clockwise from bottom-left
        const c = [v[j * nx + i]!, v[j * nx + i + 1]!, v[(j + 1) * nx + i + 1]!, v[(j + 1) * nx + i]!];
        const P: Vec2[] = [
          [x0, y0],
          [x0 + cell, y0],
          [x0 + cell, y0 + cell],
          [x0, y0 + cell],
        ];
        let code = 0;
        for (let k = 0; k < 4; k++) if (c[k]! >= L) code |= 1 << k;
        if (code === 0 || code === 15) continue;
        // crossing on each edge k (between corner k and k+1)
        const cross = (k: number): Vec2 => {
          const a = c[k]!;
          const b = c[(k + 1) % 4]!;
          const t = (L - a) / (b - a);
          const p = P[k]!;
          const q = P[(k + 1) % 4]!;
          return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
        };
        const edges: number[] = [];
        for (let k = 0; k < 4; k++) if (((code >> k) & 1) !== ((code >> ((k + 1) % 4)) & 1)) edges.push(k);
        if (edges.length === 2) {
          const a = cross(edges[0]!);
          const b = cross(edges[1]!);
          if (keep(a, b)) out.push({ a, b, level: L });
        } else if (edges.length === 4) {
          // saddle: pair edges by the centre value
          const centre = (c[0]! + c[1]! + c[2]! + c[3]!) / 4;
          const bl = (code & 1) === 1;
          const pairs = bl === centre >= L ? [[0, 1], [2, 3]] : [[3, 0], [1, 2]];
          for (const [e1, e2] of pairs) {
            const a = cross(e1!);
            const b = cross(e2!);
            if (keep(a, b)) out.push({ a, b, level: L });
          }
        }
      }
    }
  }
  return out;
}

export interface DrainArrow {
  p: Vec2;
  /** downhill, unit, local feet */
  dir: Vec2;
  pct: number;
}

/** Feet between drain arrows: about four across the lot, 4–10 ft apart. */
export function arrowSpacing(lengthFt: number, widthFt: number): number {
  return Math.max(4, Math.min(10, Math.min(lengthFt, widthFt) / 4));
}

/** Arrows pointing downhill on a lattice aligned with the lot (skipped where it's flatter than 0.5%). */
export function drainArrows(ground: GroundFn, parcel: Vec2[], frame: SiteFrame, spacing?: number): DrainArrow[] {
  const sp = spacing ?? arrowSpacing(frame.lengthFt, frame.widthFt);
  const out: DrainArrow[] = [];
  const nu = Math.max(1, Math.round(frame.lengthFt / sp));
  const nv = Math.max(1, Math.round(frame.widthFt / sp));
  const d = 4;
  for (let i = 0; i < nu; i++) {
    for (let j = 0; j < nv; j++) {
      const p = siteToLocal(frame, [((i + 0.5) * frame.lengthFt) / nu, ((j + 0.5) * frame.widthFt) / nv]);
      if (!pointInPolygon(p, parcel) || distanceToRing(p, parcel) < 1) continue;
      const gx = (ground(p[0] + d, p[1]) - ground(p[0] - d, p[1])) / (2 * d);
      const gy = (ground(p[0], p[1] + d) - ground(p[0], p[1] - d)) / (2 * d);
      const g = Math.hypot(gx, gy);
      if (g * 100 < 0.5) continue;
      out.push({ p, dir: [-gx / g, -gy / g], pct: g * 100 });
    }
  }
  return out;
}

// ---- buildings ------------------------------------------------------------------------

/**
 * The ground a building stands on. The City's `base_elevation` (LI_BUILDING_FOOTPRINTS)
 * matches the LOWEST lidar ground along the building's outline (checked 2026-10-04 on 230
 * buildings around four lots: median difference 0.15–0.37 ft, against 1–2 ft for the mean
 * ground under it), and the City's heights are measured from it. So: the roof is at that
 * lowest ground + the City height, and the walls go down to the lowest ground, so nothing
 * floats on a slope. Elevations here are feet above sea level.
 */
export function buildingBase(ring: Vec2[], elev: GroundFn, cityBaseFt?: number | null): { baseFt: number; refFt: number } {
  let min = Infinity;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i]!;
    const b = ring[(i + 1) % ring.length]!;
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const k = Math.max(1, Math.ceil(L / 1.5));
    for (let s = 0; s < k; s++) min = Math.min(min, elev(a[0] + ((b[0] - a[0]) * s) / k, a[1] + ((b[1] - a[1]) * s) / k));
  }
  // a City value far from the lidar is from another survey or datum: trust the lidar
  const ref = cityBaseFt != null && Number.isFinite(cityBaseFt) && Math.abs(cityBaseFt - min) <= 5 ? cityBaseFt : min;
  return { baseFt: Math.min(min, ref), refFt: ref };
}
