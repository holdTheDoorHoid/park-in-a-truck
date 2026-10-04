// Small, dependency-free plane geometry for parcels.
//
// Everything is measured in a local tangent plane in FEET centred on the lot
// (x = east, y = north). Over a few hundred feet the error of this projection is
// far below a tape measure's (< 0.05%), and it keeps the maths simple.

import type { LngLat } from '../types';

export type XY = [number, number];

const FT_PER_M = 1 / 0.3048;

export interface Projector {
  origin: LngLat;
  toXY(p: LngLat): XY;
  toLngLat(p: XY): LngLat;
}

/** Local feet projection around `origin` (WGS84 ellipsoid radii of curvature). */
export function makeProjector(origin: LngLat): Projector {
  const phi = (origin[1] * Math.PI) / 180;
  const mPerDegLat = 111132.92 - 559.82 * Math.cos(2 * phi) + 1.175 * Math.cos(4 * phi) - 0.0023 * Math.cos(6 * phi);
  const mPerDegLng = 111412.84 * Math.cos(phi) - 93.5 * Math.cos(3 * phi) + 0.118 * Math.cos(5 * phi);
  const fx = mPerDegLng * FT_PER_M;
  const fy = mPerDegLat * FT_PER_M;
  return {
    origin,
    toXY: ([lng, lat]) => [(lng - origin[0]) * fx, (lat - origin[1]) * fy],
    toLngLat: ([x, y]) => [origin[0] + x / fx, origin[1] + y / fy],
  };
}

/** Distance in feet between two lng/lat points (good to < 0.1% within a few miles). */
export function distanceFt(a: LngLat, b: LngLat): number {
  const pr = makeProjector([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]);
  const [x1, y1] = pr.toXY(a);
  const [x2, y2] = pr.toXY(b);
  return Math.hypot(x2 - x1, y2 - y1);
}

/** Drop the repeated closing vertex of a GeoJSON ring. */
export function openRing<T extends number[]>(ring: T[]): T[] {
  if (ring.length > 1) {
    const a = ring[0]!;
    const b = ring[ring.length - 1]!;
    if (a[0] === b[0] && a[1] === b[1]) return ring.slice(0, -1);
  }
  return ring.slice();
}

/** Signed area (counter-clockwise positive). */
export function signedArea(r: XY[]): number {
  let s = 0;
  for (let i = 0; i < r.length; i++) {
    const [x1, y1] = r[i]!;
    const [x2, y2] = r[(i + 1) % r.length]!;
    s += x1 * y2 - x2 * y1;
  }
  return s / 2;
}

export function centroid(r: XY[]): XY {
  const a = signedArea(r);
  if (Math.abs(a) < 1e-9) {
    const n = r.length || 1;
    return [r.reduce((s, p) => s + p[0], 0) / n, r.reduce((s, p) => s + p[1], 0) / n];
  }
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < r.length; i++) {
    const [x1, y1] = r[i]!;
    const [x2, y2] = r[(i + 1) % r.length]!;
    const f = x1 * y2 - x2 * y1;
    cx += (x1 + x2) * f;
    cy += (y1 + y2) * f;
  }
  return [cx / (6 * a), cy / (6 * a)];
}

/** Andrew's monotone chain; counter-clockwise, no repeated point. */
export function convexHull(pts: XY[]): XY[] {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const cross = (o: XY, a: XY, b: XY) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: XY[] = [];
  for (const pt of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2]!, lower[lower.length - 1]!, pt) <= 0) lower.pop();
    lower.push(pt);
  }
  const upper: XY[] = [];
  for (let i = p.length - 1; i >= 0; i--) {
    const pt = p[i]!;
    while (upper.length >= 2 && cross(upper[upper.length - 2]!, upper[upper.length - 1]!, pt) <= 0) upper.pop();
    upper.push(pt);
  }
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

export interface OrientedRect {
  center: XY;
  /** unit vector along the LONG side */
  u: XY;
  /** unit vector along the SHORT side (u rotated +90°) */
  v: XY;
  length: number;
  width: number;
  area: number;
}

/**
 * Minimum-area enclosing rectangle (rotating calipers over the convex hull:
 * the optimum always has one side flush with a hull edge).
 */
export function minAreaRect(pts: XY[]): OrientedRect {
  const hull = convexHull(pts);
  let best: OrientedRect | null = null;
  const n = hull.length;
  for (let i = 0; i < n; i++) {
    const a = hull[i]!;
    const b = hull[(i + 1) % n]!;
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len < 1e-6) continue;
    const ux = (b[0] - a[0]) / len;
    const uy = (b[1] - a[1]) / len;
    let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
    for (const p of hull) {
      const pu = p[0] * ux + p[1] * uy;
      const pv = -p[0] * uy + p[1] * ux;
      if (pu < minU) minU = pu;
      if (pu > maxU) maxU = pu;
      if (pv < minV) minV = pv;
      if (pv > maxV) maxV = pv;
    }
    const du = maxU - minU;
    const dv = maxV - minV;
    const area = du * dv;
    if (!best || area < best.area - 1e-6) {
      const cu = (minU + maxU) / 2;
      const cv = (minV + maxV) / 2;
      const center: XY = [cu * ux - cv * uy, cu * uy + cv * ux];
      // make u the long axis
      if (du >= dv) best = { center, u: [ux, uy], v: [-uy, ux], length: du, width: dv, area };
      else best = { center, u: [-uy, ux], v: [-ux, -uy], length: dv, width: du, area };
    }
  }
  if (!best) {
    const c = pts[0] ?? [0, 0];
    return { center: c, u: [1, 0], v: [0, 1], length: 0, width: 0, area: 0 };
  }
  return best;
}

/**
 * Remove near-duplicate and near-collinear vertices so a parcel's sides read like
 * a person would measure them. `tol` is the largest sideways wobble (feet) that
 * still counts as one straight side.
 */
export function simplifyRing(ring: XY[], tol = 0.5): XY[] {
  let r = ring.slice();
  // near-duplicates
  r = r.filter((p, i) => {
    const q = r[(i + 1) % r.length]!;
    return Math.hypot(q[0] - p[0], q[1] - p[1]) > 0.25 || r.length <= 3;
  });
  let changed = true;
  while (changed && r.length > 3) {
    changed = false;
    let worst = -1;
    let worstD = Infinity;
    for (let i = 0; i < r.length; i++) {
      const a = r[(i - 1 + r.length) % r.length]!;
      const p = r[i]!;
      const b = r[(i + 1) % r.length]!;
      const d = distToSegment(p, a, b);
      if (d < worstD) {
        worstD = d;
        worst = i;
      }
    }
    if (worst >= 0 && worstD < tol) {
      r.splice(worst, 1);
      changed = true;
    }
  }
  return r;
}

export function distToSegment(p: XY, a: XY, b: XY): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy;
  let t = l2 ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

export function distToPolyline(p: XY, line: XY[]): number {
  let d = Infinity;
  for (let i = 0; i < line.length - 1; i++) d = Math.min(d, distToSegment(p, line[i]!, line[i + 1]!));
  return d;
}

/** Ray–segment intersection: distance along the (unit) ray, or null. */
export function rayHitsSegment(o: XY, dir: XY, a: XY, b: XY): number | null {
  const ex = b[0] - a[0];
  const ey = b[1] - a[1];
  const den = dir[0] * ey - dir[1] * ex;
  if (Math.abs(den) < 1e-12) return null;
  const wx = a[0] - o[0];
  const wy = a[1] - o[1];
  const t = (wx * ey - wy * ex) / den;
  const s = (wx * dir[1] - wy * dir[0]) / den;
  if (t < 0 || s < 0 || s > 1) return null;
  return t;
}

export function pointInRing(p: XY, ring: XY[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]!;
    const [xj, yj] = ring[j]!;
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Distance from a point to a polygon (0 when inside). */
export function distToRing(p: XY, ring: XY[]): number {
  if (pointInRing(p, ring)) return 0;
  return distToPolyline(p, [...ring, ring[0]!]);
}

/** Compass bearing of a vector (x east, y north), degrees clockwise from north, 0–360. */
export function bearingOf(dx: number, dy: number): number {
  const b = (Math.atan2(dx, dy) * 180) / Math.PI;
  return (b + 360) % 360;
}

/** Smallest angle between two undirected lines, degrees 0–90. */
export function lineAngleDiff(a: XY, b: XY): number {
  const dot = Math.abs(a[0] * b[0] + a[1] * b[1]) / (Math.hypot(...a) * Math.hypot(...b) || 1);
  return (Math.acos(Math.min(1, dot)) * 180) / Math.PI;
}

type Geom =
  | { type: 'Polygon'; coordinates: number[][][] }
  | { type: 'MultiPolygon'; coordinates: number[][][][] }
  | { type: string; coordinates: unknown };

/** The largest outer ring of a (Multi)Polygon, open (no repeated closing point), [lng,lat]. */
export function largestOuterRing(g: Geom | null | undefined): LngLat[] {
  if (!g) return [];
  const polys: number[][][][] =
    g.type === 'Polygon'
      ? [g.coordinates as number[][][]]
      : g.type === 'MultiPolygon'
        ? (g.coordinates as number[][][][])
        : [];
  let best: LngLat[] = [];
  let bestA = -1;
  for (const poly of polys) {
    const ring = poly[0];
    if (!ring || ring.length < 3) continue;
    const ll = openRing(ring.map((c) => [c[0]!, c[1]!] as LngLat));
    const pr = makeProjector(ll[0]!);
    const a = Math.abs(signedArea(ll.map(pr.toXY)));
    if (a > bestA) {
      bestA = a;
      best = ll;
    }
  }
  return best;
}

/** Bounding box of points, optionally grown by `padFt` on every side. */
export function bboxOf(pts: LngLat[], padFt = 0): [number, number, number, number] {
  let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
  for (const [x, y] of pts) {
    if (x < w) w = x;
    if (x > e) e = x;
    if (y < s) s = y;
    if (y > n) n = y;
  }
  if (padFt && pts.length) {
    const pr = makeProjector([(w + e) / 2, (s + n) / 2]);
    const [dx, dy] = pr.toLngLat([padFt, padFt]).map((v, i) => v - pr.origin[i]!) as [number, number];
    w -= dx;
    e += dx;
    s -= dy;
    n += dy;
  }
  return [w, s, e, n];
}

/** Round to a number of decimals (for display and stable storage). */
export function roundTo(n: number, d = 1): number {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}
