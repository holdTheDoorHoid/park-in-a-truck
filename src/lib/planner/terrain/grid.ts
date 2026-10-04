// An elevation grid (USGS 3DEP lidar, metres above sea level) and the smooth ground
// function the planner builds from it. Pure: no DOM, no three.js.
//
// The grid is aligned with longitude/latitude: cell (i, j) has its centre at
//   lng = west + (i + 0.5) · (east − west) / nx,   lat = north − (j + 0.5) · (north − south) / ny
// (row 0 is the northern edge, like an image). Local feet are linear in lng/lat (geo.ts),
// so a local point maps to fractional grid coordinates with one multiply-add per axis.

import type { LngLat } from '../../types';
import type { LocalFrame, Vec2 } from '../geo';
import type { GroundFn } from '../ground';

export const FT_PER_M = 1 / 0.3048;

export interface ElevationSource {
  /** e.g. "USGS 3DEP lidar" */
  name: string;
  /** year the lidar was flown (Philadelphia: 2015) */
  year?: number;
  /** grid cell size, metres */
  cellM: number;
}

export interface ElevationGrid {
  west: number;
  south: number;
  east: number;
  north: number;
  nx: number;
  ny: number;
  /** metres above sea level (NAVD88), row-major from the north-west corner; NaN = no data */
  z: Float32Array;
  source: ElevationSource;
}

/** 3DEP in Philadelphia: the Delaware Valley lidar project, flown April–November 2015, 1 m grid. */
export const PHILLY_LIDAR: ElevationSource = { name: 'USGS 3DEP lidar', year: 2015, cellM: 1 };

/**
 * Fill no-data cells from their neighbours (a few rings of averaging), so interpolation
 * never meets a hole. Returns false when the grid has no data at all.
 */
export function fillGaps(g: ElevationGrid): boolean {
  const { nx, ny, z } = g;
  let missing = 0;
  for (let k = 0; k < z.length; k++) if (!Number.isFinite(z[k]!)) missing++;
  if (missing === z.length) return false;
  for (let pass = 0; missing > 0 && pass < nx + ny; pass++) {
    const next = z.slice();
    missing = 0;
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const k = j * nx + i;
        if (Number.isFinite(z[k]!)) continue;
        let s = 0;
        let c = 0;
        for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          const a = i + di;
          const b = j + dj;
          if (a < 0 || b < 0 || a >= nx || b >= ny) continue;
          const v = z[b * nx + a]!;
          if (Number.isFinite(v)) {
            s += v;
            c++;
          }
        }
        if (c) next[k] = s / c;
        else missing++;
      }
    }
    z.set(next);
  }
  return true;
}

/** Bilinear sample at fractional grid coordinates (cell centres at integers), clamped to the edge. */
export function bilinear(z: Float32Array, nx: number, ny: number, gx: number, gy: number): number {
  const x = Math.max(0, Math.min(nx - 1, gx));
  const y = Math.max(0, Math.min(ny - 1, gy));
  const i = Math.min(nx - 2, Math.floor(x));
  const j = Math.min(ny - 2, Math.floor(y));
  if (nx < 2 || ny < 2) return z[0]!;
  const tx = x - i;
  const ty = y - j;
  const k = j * nx + i;
  const a = z[k]!;
  const b = z[k + 1]!;
  const c = z[k + nx]!;
  const d = z[k + nx + 1]!;
  return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
}

/** Elevation in metres at a longitude/latitude (bilinear, clamped at the grid's edge). */
export function sampleM(g: ElevationGrid, [lng, lat]: LngLat): number {
  const gx = ((lng - g.west) / (g.east - g.west)) * g.nx - 0.5;
  const gy = ((g.north - lat) / (g.north - g.south)) * g.ny - 0.5;
  return bilinear(g.z, g.nx, g.ny, gx, gy);
}

/** Elevation in FEET above sea level at a local point (x east, y north, feet). */
export function elevationFt(g: ElevationGrid, lf: LocalFrame): GroundFn {
  // gx = ax + bx·x, gy = ay + by·y — local feet are linear in lng/lat
  const sx = g.nx / (g.east - g.west);
  const sy = g.ny / (g.north - g.south);
  const ax = (lf.origin[0] - g.west) * sx - 0.5;
  const bx = sx / lf.ftPerDegLng;
  const ay = (g.north - lf.origin[1]) * sy - 0.5;
  const by = -sy / lf.ftPerDegLat;
  const { z, nx, ny } = g;
  return (x, y) => bilinear(z, nx, ny, ax + bx * x, ay + by * y) * FT_PER_M;
}

/** Points on a `step`-ft lattice inside a polygon (cell centres); the centroid-ish first vertex if none. */
export function samplesInside(ring: Vec2[], step = 1): Vec2[] {
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
  const out: Vec2[] = [];
  for (let y = minY + step / 2; y < maxY; y += step) {
    for (let x = minX + step / 2; x < maxX; x += step) if (inside([x, y], ring)) out.push([x, y]);
  }
  if (!out.length && ring.length) {
    const n = ring.length;
    out.push([ring.reduce((s, p) => s + p[0], 0) / n, ring.reduce((s, p) => s + p[1], 0) / n]);
  }
  return out;
}

function inside(p: Vec2, ring: Vec2[]): boolean {
  let c = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i]!;
    const b = ring[j]!;
    if (a[1] > p[1] !== b[1] > p[1] && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) c = !c;
  }
  return c;
}

/** The lot's datum: the average ground elevation (feet above sea level) inside the lot. */
export function lotDatumFt(elev: GroundFn, parcel: Vec2[]): number {
  const pts = samplesInside(parcel, 1);
  let s = 0;
  for (const [x, y] of pts) s += elev(x, y);
  return s / pts.length;
}

/**
 * The planner's ground: feet above the lot's datum (the lot's average elevation), so a
 * flat lot gives 0 everywhere — the contract in ../ground.ts.
 */
export function groundFromGrid(g: ElevationGrid, lf: LocalFrame, parcel: Vec2[]): { ground: GroundFn; datumElevFt: number; elev: GroundFn } {
  const elev = elevationFt(g, lf);
  const datumElevFt = lotDatumFt(elev, parcel);
  return { ground: (x, y) => elev(x, y) - datumElevFt, datumElevFt, elev };
}

// ---- compact storage for the demo-lot fixtures ------------------------------------------

export interface EncodedGrid {
  bbox: [number, number, number, number];
  nx: number;
  ny: number;
  /** metres; values are baseM + cm/100 */
  baseM: number;
  /** base64 of little-endian Int16 centimetres above baseM; −32768 = no data */
  cm: string;
  source: ElevationSource;
}

const NO_DATA_CM = -32768;

function toBase64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

function fromBase64(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

export function encodeGrid(g: ElevationGrid): EncodedGrid {
  let min = Infinity;
  for (const v of g.z) if (Number.isFinite(v)) min = Math.min(min, v);
  const baseM = Number.isFinite(min) ? Math.floor(min) : 0;
  const buf = new DataView(new ArrayBuffer(g.z.length * 2));
  g.z.forEach((v, k) => buf.setInt16(k * 2, Number.isFinite(v) ? Math.max(-32767, Math.min(32767, Math.round((v - baseM) * 100))) : NO_DATA_CM, true));
  return { bbox: [g.west, g.south, g.east, g.north], nx: g.nx, ny: g.ny, baseM, cm: toBase64(new Uint8Array(buf.buffer)), source: g.source };
}

export function decodeGrid(e: EncodedGrid): ElevationGrid {
  const bytes = fromBase64(e.cm);
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const z = new Float32Array(e.nx * e.ny);
  for (let k = 0; k < z.length; k++) {
    const v = dv.getInt16(k * 2, true);
    z[k] = v === NO_DATA_CM ? NaN : e.baseM + v / 100;
  }
  const [west, south, east, north] = e.bbox;
  return { west, south, east, north, nx: e.nx, ny: e.ny, z, source: e.source };
}
