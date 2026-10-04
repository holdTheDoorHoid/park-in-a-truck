// Direct-sun hours per grid cell, by casting a ray from each cell toward the sun for
// every sample of the growing season. Pure (no DOM, no three) so it runs in a Web
// Worker and in tests.
//
// Blocking model (documented choice):
// - Buildings are prisms (footprint × City height) on flat ground and block fully.
// - Tree crowns are spheres that let 40% of the light through (60% blocking), the
//   middle of the 50–80% range usually quoted for summer canopy, and they compound
//   when a ray passes through more than one crown.
// - Cells are tested at 1 ft above the ground (perennial height).

import type { LngLat, SiteFacts, SunClass } from '../types';
import { bearingOf, unitFromBearing, type LocalFrame, type Vec2 } from './geo';
import type { SunSample } from './sun';

export interface GridSpec {
  /** local feet of the grid's (0,0) corner and its unit axes */
  origin: Vec2;
  ux: Vec2;
  uy: Vec2;
  cellFt: number;
  nx: number;
  ny: number;
  /** 1 = cell is part of the lot (others are skipped), row-major y rows of x */
  mask?: Uint8Array;
}

export interface Prism {
  /** open ring, local feet */
  ring: Vec2[];
  heightFt: number;
}

export interface Crown {
  x: number;
  y: number;
  /** centre height, ft */
  z: number;
  r: number;
}

export interface SunHoursInput {
  grid: GridSpec;
  buildings: Prism[];
  crowns: Crown[];
  samples: SunSample[];
  days: number;
  sampleHeightFt?: number;
  crownTransmit?: number;
}

export const CROWN_BLOCKING = 0.6;
export const SUN_HOURS = { sun: 6, part: 3 } as const;

interface PreppedPrism {
  xs: Float64Array;
  ys: Float64Array;
  n: number;
  h: number;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function prep(p: Prism): PreppedPrism {
  const n = p.ring.length;
  const xs = new Float64Array(n);
  const ys = new Float64Array(n);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  p.ring.forEach(([x, y], i) => {
    xs[i] = x;
    ys[i] = y;
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  });
  return { xs, ys, n, h: p.heightFt, minX, minY, maxX, maxY };
}

function inside(b: PreppedPrism, x: number, y: number): boolean {
  let c = false;
  const { xs, ys, n } = b;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const yi = ys[i]!;
    const yj = ys[j]!;
    if (yi > y !== yj > y && x < ((xs[j]! - xs[i]!) * (y - yi)) / (yj - yi) + xs[i]!) c = !c;
  }
  return c;
}

/** Distance along the horizontal ray (x,y)+s·(hx,hy) to where it first enters the footprint. */
function entry(b: PreppedPrism, x: number, y: number, hx: number, hy: number): number {
  if (inside(b, x, y)) return 0;
  let best = Infinity;
  const { xs, ys, n } = b;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const ax = xs[j]!;
    const ay = ys[j]!;
    const ex = xs[i]! - ax;
    const ey = ys[i]! - ay;
    const den = hx * ey - hy * ex;
    if (Math.abs(den) < 1e-12) continue;
    const wx = ax - x;
    const wy = ay - y;
    const s = (wx * ey - wy * ex) / den;
    if (s < 0 || s >= best) continue;
    const t = (wx * hy - wy * hx) / den;
    if (t >= 0 && t <= 1) best = s;
  }
  return best;
}

/** Average direct-sun hours per day for each cell (NaN where the mask excludes the cell). */
export function computeSunHours(input: SunHoursInput, onProgress?: (f: number) => void): Float32Array {
  const { grid, samples, days } = input;
  const z0 = input.sampleHeightFt ?? 1;
  const transmit = input.crownTransmit ?? 1 - CROWN_BLOCKING;
  const N = grid.nx * grid.ny;
  const px = new Float64Array(N);
  const py = new Float64Array(N);
  const hours = new Float32Array(N);
  let gMinX = Infinity;
  let gMinY = Infinity;
  let gMaxX = -Infinity;
  let gMaxY = -Infinity;
  for (let j = 0; j < grid.ny; j++) {
    for (let i = 0; i < grid.nx; i++) {
      const k = j * grid.nx + i;
      const a = (i + 0.5) * grid.cellFt;
      const b = (j + 0.5) * grid.cellFt;
      const x = grid.origin[0] + a * grid.ux[0] + b * grid.uy[0];
      const y = grid.origin[1] + a * grid.ux[1] + b * grid.uy[1];
      px[k] = x;
      py[k] = y;
      if (grid.mask && !grid.mask[k]) {
        hours[k] = NaN;
        continue;
      }
      if (x < gMinX) gMinX = x;
      if (y < gMinY) gMinY = y;
      if (x > gMaxX) gMaxX = x;
      if (y > gMaxY) gMaxY = y;
    }
  }
  const prisms = input.buildings.filter((b) => b.ring.length >= 3 && b.heightFt > z0).map(prep);
  const crowns = input.crowns;
  const lit = new Float32Array(N);
  const relevant: PreppedPrism[] = [];

  for (let si = 0; si < samples.length; si++) {
    const s = samples[si]!;
    if (s.altitudeDeg <= 0.5) continue;
    const alt = (s.altitudeDeg * Math.PI) / 180;
    const az = (s.azimuthDeg * Math.PI) / 180;
    const hx = Math.sin(az);
    const hy = Math.cos(az);
    const tanA = Math.tan(alt);
    const dx = Math.cos(alt) * hx;
    const dy = Math.cos(alt) * hy;
    const dz = Math.sin(alt);

    // Buildings whose shadow can reach the grid this sample.
    relevant.length = 0;
    for (const b of prisms) {
      const reach = Math.min((b.h - z0) / tanA, 2000);
      const sx0 = Math.min(gMinX, gMinX + hx * reach);
      const sx1 = Math.max(gMaxX, gMaxX + hx * reach);
      const sy0 = Math.min(gMinY, gMinY + hy * reach);
      const sy1 = Math.max(gMaxY, gMaxY + hy * reach);
      if (b.maxX >= sx0 && b.minX <= sx1 && b.maxY >= sy0 && b.minY <= sy1) relevant.push(b);
    }

    for (let k = 0; k < N; k++) {
      if (Number.isNaN(hours[k])) continue;
      const x = px[k]!;
      const y = py[k]!;
      let l = 1;
      for (let bi = 0; bi < relevant.length; bi++) {
        const b = relevant[bi]!;
        const reach = (b.h - z0) / tanA;
        // quick reject: the ray segment's box vs the footprint's box
        const ex = x + hx * reach;
        const ey = y + hy * reach;
        if (Math.max(x, ex) < b.minX || Math.min(x, ex) > b.maxX || Math.max(y, ey) < b.minY || Math.min(y, ey) > b.maxY) continue;
        const sIn = entry(b, x, y, hx, hy);
        if (sIn !== Infinity && z0 + sIn * tanA < b.h) {
          l = 0;
          break;
        }
      }
      if (l > 0) {
        for (let ci = 0; ci < crowns.length; ci++) {
          const c = crowns[ci]!;
          const ox = x - c.x;
          const oy = y - c.y;
          const oz = z0 - c.z;
          const bb = ox * dx + oy * dy + oz * dz;
          const cc = ox * ox + oy * oy + oz * oz - c.r * c.r;
          const disc = bb * bb - cc;
          if (disc > 0 && -bb + Math.sqrt(disc) > 0) l *= transmit;
        }
      }
      lit[k] = l;
    }
    for (let k = 0; k < N; k++) if (!Number.isNaN(hours[k])) hours[k]! += s.weight * lit[k]!;
    if (onProgress && si % 20 === 0) onProgress(si / samples.length);
  }
  const d = Math.max(1, days);
  for (let k = 0; k < N; k++) if (!Number.isNaN(hours[k])) hours[k]! /= d;
  onProgress?.(1);
  return hours;
}

export function classify(hours: number): SunClass {
  return hours >= SUN_HOURS.sun ? 'sun' : hours >= SUN_HOURS.part ? 'part' : 'shade';
}

// ---- the saved grid (project.extra.sunGrid) --------------------------------

export interface SunGrid {
  v: 1;
  /** lng/lat of the grid's (0,0) corner */
  origin: LngLat;
  /** bearing of the grid's +x axis (degrees clockwise from north); +y is 90° to its left */
  bearingDeg: number;
  cellFt: number;
  nx: number;
  ny: number;
  /**
   * Average direct-sun hours per day over the season, ×10, one byte per cell, rows of x
   * stacked along y, base64. 255 = not part of the lot.
   */
  hoursX10: string;
  season: { from: string; to: string; everyDays: number; everyMinutes: number };
  /** fraction of light a tree crown blocks */
  crownBlocking: number;
  thresholds: { sunMinHours: number; partMinHours: number };
  /** share of lot cells in each class (0..1) */
  summary: { sun: number; part: number; shade: number };
  sunClass: NonNullable<SiteFacts['sunClass']>;
  computedAt: string;
  inputs: { buildings: number; trees: number };
  /** the lot the grid was computed for (see design.ts lotRef) */
  lotRef?: string;
}

export function encodeHours(hours: Float32Array): string {
  const bytes = new Uint8Array(hours.length);
  hours.forEach((h, i) => {
    bytes[i] = Number.isNaN(h) ? 255 : Math.min(254, Math.round(h * 10));
  });
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

export function decodeHours(b64: string): Float32Array {
  const bin = atob(b64);
  const out = new Float32Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    const v = bin.charCodeAt(i);
    out[i] = v === 255 ? NaN : v / 10;
  }
  return out;
}

export function summarise(hours: Float32Array): SunGrid['summary'] {
  let sun = 0;
  let part = 0;
  let shade = 0;
  for (const h of hours) {
    if (Number.isNaN(h)) continue;
    const c = classify(h);
    if (c === 'sun') sun++;
    else if (c === 'part') part++;
    else shade++;
  }
  const n = sun + part + shade || 1;
  return { sun: sun / n, part: part / n, shade: shade / n };
}

/**
 * Whole-lot sun class for the Assess summary (documented thresholds):
 * 'full-sun' when ≥80% of the lot gets 6+ hours, 'mostly-sun' ≥50%, 'mostly-shade' ≥20%,
 * otherwise 'deep-shade'.
 */
export function lotSunClass(summary: SunGrid['summary']): NonNullable<SiteFacts['sunClass']> {
  if (summary.sun >= 0.8) return 'full-sun';
  if (summary.sun >= 0.5) return 'mostly-sun';
  if (summary.sun >= 0.2) return 'mostly-shade';
  return 'deep-shade';
}

export function gridSpecFromSaved(g: SunGrid, lf: LocalFrame): GridSpec {
  const ux = unitFromBearing(g.bearingDeg);
  return { origin: lf.toLocal(g.origin), ux, uy: [-ux[1], ux[0]], cellFt: g.cellFt, nx: g.nx, ny: g.ny };
}

export function gridBearing(spec: GridSpec): number {
  return bearingOf(spec.ux);
}

/** Look up a grid's hours at a local point (NaN outside the grid or the lot). */
export function hoursAt(spec: GridSpec, hours: Float32Array, [x, y]: Vec2): number {
  const dx = x - spec.origin[0];
  const dy = y - spec.origin[1];
  const a = dx * spec.ux[0] + dy * spec.ux[1];
  const b = dx * spec.uy[0] + dy * spec.uy[1];
  const i = Math.floor(a / spec.cellFt);
  const j = Math.floor(b / spec.cellFt);
  if (i < 0 || j < 0 || i >= spec.nx || j >= spec.ny) return NaN;
  return hours[j * spec.nx + i]!;
}
