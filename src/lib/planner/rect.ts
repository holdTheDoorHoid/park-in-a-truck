// The parcel's oriented rectangle and the "site frame" built on it.
//
// Site frame (DESIGN.md conventions): x runs along the lot's LONG edge, from the
// entrance edge x0 (the short edge on the street the lot is addressed to) into the
// lot; +y is on your LEFT when you stand at x0 looking toward +x. Edges: 'x0', 'x1'
// (short), 'y0' (right-hand long edge), 'y1' (left-hand long edge).

import type { LotKind, SiteFacts } from '../types';
import {
  bearingOf,
  distanceToPolyline,
  pointInPolygon,
  unitFromBearing,
  type LocalFrame,
  type Vec2,
} from './geo';

export type Edge = 'x0' | 'x1' | 'y0' | 'y1';

export interface OrientedRect {
  center: Vec2;
  /** unit vector along the long edge */
  u: Vec2;
  lengthFt: number;
  widthFt: number;
}

/** Andrew's monotone chain. Returns the hull counter-clockwise, no repeated point. */
export function convexHull(points: Vec2[]): Vec2[] {
  const pts = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (pts.length < 3) return pts;
  const cross = (o: Vec2, a: Vec2, b: Vec2) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: Vec2[] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2]!, lower[lower.length - 1]!, p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: Vec2[] = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i]!;
    while (upper.length >= 2 && cross(upper[upper.length - 2]!, upper[upper.length - 1]!, p) <= 0) upper.pop();
    upper.push(p);
  }
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

/**
 * Minimum-area enclosing rectangle (rotating calipers over the convex hull: the
 * optimal rectangle has one side flush with a hull edge). `u` is the long axis.
 */
export function minAreaRect(points: Vec2[]): OrientedRect {
  const hull = convexHull(points);
  if (hull.length < 3) {
    const a = hull[0] ?? [0, 0];
    const b = hull[1] ?? a;
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    return {
      center: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2],
      u: L ? [(b[0] - a[0]) / L, (b[1] - a[1]) / L] : [1, 0],
      lengthFt: L,
      widthFt: 0,
    };
  }
  let best: OrientedRect | null = null;
  let bestArea = Infinity;
  for (let i = 0; i < hull.length; i++) {
    const p = hull[i]!;
    const q = hull[(i + 1) % hull.length]!;
    const len = Math.hypot(q[0] - p[0], q[1] - p[1]);
    if (len < 1e-9) continue;
    const ex: Vec2 = [(q[0] - p[0]) / len, (q[1] - p[1]) / len];
    const ey: Vec2 = [-ex[1], ex[0]];
    let minA = Infinity;
    let maxA = -Infinity;
    let minB = Infinity;
    let maxB = -Infinity;
    for (const h of hull) {
      const a = h[0] * ex[0] + h[1] * ex[1];
      const b = h[0] * ey[0] + h[1] * ey[1];
      minA = Math.min(minA, a);
      maxA = Math.max(maxA, a);
      minB = Math.min(minB, b);
      maxB = Math.max(maxB, b);
    }
    const w = maxA - minA;
    const h = maxB - minB;
    const ar = w * h;
    if (ar < bestArea - 1e-9) {
      bestArea = ar;
      const ca = (minA + maxA) / 2;
      const cb = (minB + maxB) / 2;
      const center: Vec2 = [ca * ex[0] + cb * ey[0], ca * ex[1] + cb * ey[1]];
      best = w >= h ? { center, u: ex, lengthFt: w, widthFt: h } : { center, u: ey, lengthFt: h, widthFt: w };
    }
  }
  return best!;
}

/** A frame on the parcel's oriented rectangle. All points are local feet (ENU). */
export interface SiteFrame {
  lengthFt: number;
  widthFt: number;
  /** local position of site (0,0): the x0/y0 corner */
  corner: Vec2;
  center: Vec2;
  /** unit +x (entrance → back) and +y (to the left of +x) in local feet */
  u: Vec2;
  v: Vec2;
  bearingDeg: number;
  streetEdges: Edge[];
  lotKind: LotKind;
  /** where the frame came from */
  source: 'site-facts' | 'computed';
}

export function siteToLocal(f: SiteFrame, [x, y]: Vec2): Vec2 {
  return [f.corner[0] + x * f.u[0] + y * f.v[0], f.corner[1] + x * f.u[1] + y * f.v[1]];
}
export function localToSite(f: SiteFrame, p: Vec2): Vec2 {
  const dx = p[0] - f.corner[0];
  const dy = p[1] - f.corner[1];
  return [dx * f.u[0] + dy * f.u[1], dx * f.v[0] + dy * f.v[1]];
}

/** Build a frame from a rectangle and a chosen +x direction (u must be ±rect.u). */
export function frameFrom(rect: OrientedRect, u: Vec2, streetEdges: Edge[], lotKind: LotKind, source: SiteFrame['source']): SiteFrame {
  const v: Vec2 = [-u[1], u[0]]; // left of u
  const corner: Vec2 = [
    rect.center[0] - (u[0] * rect.lengthFt) / 2 - (v[0] * rect.widthFt) / 2,
    rect.center[1] - (u[1] * rect.lengthFt) / 2 - (v[1] * rect.widthFt) / 2,
  ];
  return {
    lengthFt: rect.lengthFt,
    widthFt: rect.widthFt,
    corner,
    center: rect.center,
    u,
    v,
    bearingDeg: bearingOf(u),
    streetEdges,
    lotKind,
    source,
  };
}

export interface FrameInputs {
  /** parcel outline, local feet, open ring */
  parcel: Vec2[];
  /** neighbouring parcels, local feet */
  parcels?: Vec2[][];
  buildings?: Vec2[][];
  streets?: { name?: string | null; line: Vec2[] }[];
  /** e.g. "1322 N DOVER ST" — the street it is addressed to is the entrance */
  address?: string;
}

/** "1322 N DOVER ST" -> "DOVER". Used to match the address street to a centreline. */
export function streetKey(s: string | null | undefined): string {
  if (!s) return '';
  const words = s
    .toUpperCase()
    .replace(/^[\d-]+[A-Z]?\s+/, '')
    .split(/\s+/)
    .filter((w) => !['N', 'S', 'E', 'W', 'ST', 'AVE', 'RD', 'DR', 'PL', 'LN', 'BLVD', 'TER', 'CT', 'WAY', 'PKWY'].includes(w));
  return words.join(' ');
}

interface EdgeInfo {
  edge: Edge;
  mid: Vec2;
  outward: Vec2;
  /** fraction of the outside strip that is not another parcel or a building (0..1) */
  open: number;
  /** distance from the edge midpoint to the nearest street centreline */
  streetDist: number;
  nearestStreet: string;
}

function edgeInfos(rect: OrientedRect, inputs: FrameInputs): EdgeInfo[] {
  const u = rect.u;
  const v: Vec2 = [-u[1], u[0]];
  const hl = rect.lengthFt / 2;
  const hw = rect.widthFt / 2;
  const c = rect.center;
  const at = (a: number, b: number): Vec2 => [c[0] + a * u[0] + b * v[0], c[1] + a * u[1] + b * v[1]];
  const defs: { edge: Edge; a: [number, number]; b: [number, number]; out: Vec2 }[] = [
    { edge: 'x0', a: [-hl, -hw], b: [-hl, hw], out: [-u[0], -u[1]] },
    { edge: 'x1', a: [hl, -hw], b: [hl, hw], out: [u[0], u[1]] },
    { edge: 'y0', a: [-hl, -hw], b: [hl, -hw], out: [-v[0], -v[1]] },
    { edge: 'y1', a: [-hl, hw], b: [hl, hw], out: [v[0], v[1]] },
  ];
  const blockers = [...(inputs.parcels ?? []), ...(inputs.buildings ?? [])];
  return defs.map((d) => {
    const A = at(...d.a);
    const B = at(...d.b);
    let open = 0;
    const N = 7;
    for (let i = 0; i < N; i++) {
      const t = (i + 0.5) / N;
      const p: Vec2 = [A[0] + (B[0] - A[0]) * t + d.out[0] * 4, A[1] + (B[1] - A[1]) * t + d.out[1] * 4];
      if (!blockers.some((r) => pointInPolygon(p, r))) open++;
    }
    const mid: Vec2 = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2];
    let streetDist = Infinity;
    let nearestStreet = '';
    for (const s of inputs.streets ?? []) {
      const dd = distanceToPolyline(mid, s.line);
      if (dd < streetDist) {
        streetDist = dd;
        nearestStreet = streetKey(s.name);
      }
    }
    return { edge: d.edge, mid, outward: d.out, open: open / N, streetDist, nearestStreet };
  });
}

/**
 * Work out the oriented rectangle, entrance edge, street edges and lot kind from the
 * parcel geometry and its surroundings. Used when the philly-data workstream has not
 * written project.extra.site (or to fill gaps in it).
 */
export function computeSiteFrame(inputs: FrameInputs): SiteFrame {
  const rect = minAreaRect(inputs.parcel);
  const infos = edgeInfos(rect, inputs);
  const haveBlockers = Boolean(inputs.parcels?.length || inputs.buildings?.length);
  const haveStreets = Boolean(inputs.streets?.length);
  const isStreet = (e: EdgeInfo) =>
    haveBlockers ? e.open >= 0.6 && (!haveStreets || e.streetDist < 70) : haveStreets ? e.streetDist < 40 : false;
  const want = streetKey(inputs.address);
  const score = (e: EdgeInfo) =>
    (isStreet(e) ? 10 : 0) + (want && e.nearestStreet === want && e.streetDist < 70 ? 5 : 0) + e.open * 2 - Math.min(e.streetDist, 500) / 100;
  const x0 = infos[0]!;
  const x1 = infos[1]!;
  const entranceIsPlus = score(x1) > score(x0);
  const u: Vec2 = entranceIsPlus ? [-rect.u[0], -rect.u[1]] : rect.u;
  // Edge names are relative to the chosen +x; remap if we flipped.
  const remap: Record<Edge, Edge> = entranceIsPlus ? { x0: 'x1', x1: 'x0', y0: 'y1', y1: 'y0' } : { x0: 'x0', x1: 'x1', y0: 'y0', y1: 'y1' };
  const streets = infos.filter(isStreet).map((e) => remap[e.edge]);
  if (!streets.includes('x0') && !streets.length) streets.push('x0');
  const order: Edge[] = ['x0', 'x1', 'y0', 'y1'];
  const streetEdges = order.filter((e) => streets.includes(e));
  const lotKind: LotKind = streetEdges.includes('y1') ? 'corner-left' : streetEdges.includes('y0') ? 'corner-right' : 'interior';
  return frameFrom(rect, u, streetEdges, lotKind, 'computed');
}

/**
 * Prefer the philly-data workstream's facts (project.extra.site.rect etc.) when present;
 * the rectangle size still comes from the parcel so the two always agree on the lot.
 */
export function siteFrameFromFacts(facts: SiteFacts | undefined, frame: LocalFrame, inputs: FrameInputs): SiteFrame {
  const computed = computeSiteFrame(inputs);
  if (!facts?.rect) return computed;
  const u = unitFromBearing(facts.rect.bearingDeg);
  const center = frame.toLocal(facts.rect.center);
  const L = facts.lengthFt ?? computed.lengthFt;
  const W = facts.widthFt ?? computed.widthFt;
  const streetEdges = facts.streetEdges?.length ? facts.streetEdges : computed.streetEdges;
  const lotKind = facts.lotKind ?? computed.lotKind;
  return frameFrom({ center, u, lengthFt: L, widthFt: W }, u, streetEdges, lotKind, 'site-facts');
}
