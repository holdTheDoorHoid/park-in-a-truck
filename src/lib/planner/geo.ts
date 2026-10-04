// Geometry helpers for the planner. Everything in the planner works in FEET on a
// local tangent plane around the lot: x = east, y = north (ENU, "local feet").
// Lng/lat only appear at the edges (City data in, saved placement out).

import type { LngLat } from '../types';

export type Vec2 = [number, number];

const FT_PER_M = 1 / 0.3048;

/** A local east/north frame in feet around an origin. Linear, so the round trip is exact. */
export interface LocalFrame {
  origin: LngLat;
  ftPerDegLng: number;
  ftPerDegLat: number;
  toLocal(p: LngLat): Vec2;
  toLngLat(p: Vec2): LngLat;
}

/** Metres per degree of latitude/longitude on the WGS84 ellipsoid at latitude `lat`. */
export function metresPerDegree(lat: number): { lat: number; lng: number } {
  const φ = (lat * Math.PI) / 180;
  return {
    lat: 111132.954 - 559.822 * Math.cos(2 * φ) + 1.175 * Math.cos(4 * φ),
    lng: 111412.84 * Math.cos(φ) - 93.5 * Math.cos(3 * φ) + 0.118 * Math.cos(5 * φ),
  };
}

export function makeFrame(origin: LngLat): LocalFrame {
  const m = metresPerDegree(origin[1]);
  const ftLng = m.lng * FT_PER_M;
  const ftLat = m.lat * FT_PER_M;
  return {
    origin,
    ftPerDegLng: ftLng,
    ftPerDegLat: ftLat,
    toLocal: ([lng, lat]) => [(lng - origin[0]) * ftLng, (lat - origin[1]) * ftLat],
    toLngLat: ([x, y]) => [origin[0] + x / ftLng, origin[1] + y / ftLat],
  };
}

// ---- polygons -------------------------------------------------------------

/** Drop a duplicated closing vertex so rings are "open" (first !== last). */
export function openRing<T extends number[]>(ring: T[]): T[] {
  if (ring.length > 1) {
    const a = ring[0]!;
    const b = ring[ring.length - 1]!;
    if (a[0] === b[0] && a[1] === b[1]) return ring.slice(0, -1);
  }
  return ring;
}

/** Signed area (positive = counter-clockwise in an x-east/y-north frame). */
export function signedArea(ring: Vec2[]): number {
  let a = 0;
  for (let i = 0, n = ring.length; i < n; i++) {
    const p = ring[i]!;
    const q = ring[(i + 1) % n]!;
    a += p[0] * q[1] - q[0] * p[1];
  }
  return a / 2;
}

export function area(ring: Vec2[]): number {
  return Math.abs(signedArea(ring));
}

export function centroid(ring: Vec2[]): Vec2 {
  const a = signedArea(ring);
  if (Math.abs(a) < 1e-9) {
    const n = ring.length || 1;
    return [ring.reduce((s, p) => s + p[0], 0) / n, ring.reduce((s, p) => s + p[1], 0) / n];
  }
  let cx = 0;
  let cy = 0;
  for (let i = 0, n = ring.length; i < n; i++) {
    const p = ring[i]!;
    const q = ring[(i + 1) % n]!;
    const f = p[0] * q[1] - q[0] * p[1];
    cx += (p[0] + q[0]) * f;
    cy += (p[1] + q[1]) * f;
  }
  return [cx / (6 * a), cy / (6 * a)];
}

export function pointInPolygon(p: Vec2, ring: Vec2[]): boolean {
  let inside = false;
  const [x, y] = p;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]!;
    const [xj, yj] = ring[j]!;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Shortest distance from a point to a polygon's boundary (0 if on it). */
export function distanceToRing(p: Vec2, ring: Vec2[]): number {
  let best = Infinity;
  for (let i = 0, n = ring.length; i < n; i++) best = Math.min(best, distanceToSegment(p, ring[i]!, ring[(i + 1) % n]!));
  return best;
}

export function distanceToSegment(p: Vec2, a: Vec2, b: Vec2): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy;
  let t = l2 ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

export function distanceToPolyline(p: Vec2, line: Vec2[]): number {
  let best = Infinity;
  for (let i = 0; i + 1 < line.length; i++) best = Math.min(best, distanceToSegment(p, line[i]!, line[i + 1]!));
  return best;
}

export function bbox(points: Vec2[]): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of points) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY };
}

// ---- bearings -------------------------------------------------------------

/** Bearing (degrees clockwise from north) of a local direction vector. */
export function bearingOf(v: Vec2): number {
  const b = (Math.atan2(v[0], v[1]) * 180) / Math.PI;
  return (b + 360) % 360;
}

/** Unit local vector for a bearing (degrees clockwise from north). */
export function unitFromBearing(deg: number): Vec2 {
  const r = (deg * Math.PI) / 180;
  return [Math.sin(r), Math.cos(r)];
}

// ---- Web Mercator tiles (aerial ground texture) -----------------------------

export function lngLatToTile(lng: number, lat: number, z: number): Vec2 {
  const n = 2 ** z;
  const x = ((lng + 180) / 360) * n;
  const φ = (lat * Math.PI) / 180;
  const y = ((1 - Math.log(Math.tan(φ) + 1 / Math.cos(φ)) / Math.PI) / 2) * n;
  return [x, y];
}

export function tileToLngLat(x: number, y: number, z: number): LngLat {
  const n = 2 ** z;
  const lng = (x / n) * 360 - 180;
  const lat = (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n))) * 180) / Math.PI;
  return [lng, lat];
}
