// Fitting real furniture to a placed item — the pure parts (no three.js, tested).
//
// A placed item has a footprint (w along its own x, h along its own y, in feet). A
// build-guide model has a true size (inches). We never stretch a model by more than a
// few percent: an item longer than one module gets the module REPEATED along it (PiaT
// counts benches and workbenches in 4' modules, the stage in 4' x 4' squares, shade
// canopies in 8' x 8' modules). If no whole number of modules sits sensibly on the
// footprint, the item keeps its plain block.

import type { GroundFn } from '../ground';
import type { Vec2 } from '../geo';

/** Inches to feet. */
export const ft = (inches: number) => inches / 12;

/** How far a module may be stretched or squeezed to fill a footprint exactly (3%). */
export const MAX_STRETCH = 0.03;

export interface ModuleSpec {
  /** true size of one module in feet: along the item's x, along its y, and tall */
  lengthFt: number;
  depthFt: number;
  heightFt: number;
  /** may the module repeat along the item's x / y? */
  repeatX: boolean;
  repeatY: boolean;
  /**
   * How much of the footprint may stay empty, as a share of its size (default 0.25).
   * Free-standing modules (shade canopies) can sit apart, so they accept more.
   */
  under?: number;
}

export interface AxisFit {
  /** modules along this axis */
  n: number;
  /** scale applied to each module (1 = true size; never further than MAX_STRETCH from 1) */
  s: number;
}

/** Feet a row of modules may overhang the footprint: 0.6 ft or 15% of the row, whichever is more. */
export const overhangAllowed = (total: number) => Math.max(0.6, 0.15 * total);
/** Feet of footprint a row of modules may leave empty: 1 ft or `under` of the footprint, whichever is more. */
export const shortfallAllowed = (len: number, under = 0.25) => Math.max(1, under * len);

/**
 * How many modules of `module` feet go along `len` feet, and how much to stretch them.
 * Null when no whole number fits sensibly.
 */
export function fitAxis(len: number, module: number, repeat: boolean, under = 0.25): AxisFit | null {
  if (!(len > 0) || !(module > 0)) return null;
  const counts = repeat ? [...new Set([Math.floor(len / module), Math.ceil(len / module), Math.round(len / module)])].filter((n) => n >= 1) : [1];
  if (!counts.length) counts.push(1);
  let best: (AxisFit & { err: number }) | null = null;
  for (const n of counts) {
    const total = n * module;
    const err = Math.abs(total - len);
    let fit: AxisFit | null = null;
    if (err <= MAX_STRETCH * total) fit = { n, s: len / total };
    else if (total > len ? total - len <= overhangAllowed(total) : len - total <= shortfallAllowed(len, under)) fit = { n, s: 1 };
    if (fit && (!best || err < best.err)) best = { ...fit, err };
  }
  return best ? { n: best.n, s: best.s } : null;
}

export interface ModuleFit {
  nx: number;
  ny: number;
  /** stretch per module along x / y (1 = true size) */
  sx: number;
  sy: number;
  /** module centres in the item's own frame (feet from the item's centre) */
  centres: Vec2[];
  /** the row of modules' overall size, feet */
  lengthFt: number;
  depthFt: number;
}

/** Modules laid edge to edge and centred on the footprint, or null (→ keep the block). */
export function fitModules(w: number, h: number, spec: ModuleSpec): ModuleFit | null {
  const fx = fitAxis(w, spec.lengthFt, spec.repeatX, spec.under);
  const fy = fitAxis(h, spec.depthFt, spec.repeatY, spec.under);
  if (!fx || !fy) return null;
  const mx = spec.lengthFt * fx.s;
  const my = spec.depthFt * fy.s;
  const centres: Vec2[] = [];
  for (let j = 0; j < fy.n; j++)
    for (let i = 0; i < fx.n; i++) centres.push([(i - (fx.n - 1) / 2) * mx, (j - (fy.n - 1) / 2) * my]);
  return { nx: fx.n, ny: fy.n, sx: fx.s, sy: fy.s, centres, lengthFt: fx.n * mx, depthFt: fy.n * my };
}

/** The first of several candidate modules that fits (e.g. the whole 12' x 8' stage, else 4' squares). */
export function chooseFit<T extends { spec: ModuleSpec }>(w: number, h: number, candidates: T[]): { candidate: T; fit: ModuleFit } | null {
  for (const c of candidates) {
    const fit = fitModules(w, h, c.spec);
    if (fit) return { candidate: c, fit };
  }
  return null;
}

// ---- gabion walls ---------------------------------------------------------------

/** PiaT's standard gabion basket: 12" x 12" x 48", one course. */
export const BASKET_FT = 4;

/**
 * Baskets along a wall of `len` feet: standard 4' baskets end to end; a remainder of
 * half a foot or more becomes one shorter basket at the end, a smaller one is taken up
 * by the last basket. Returns [start, length] pairs from the wall's start.
 */
export function wallBaskets(len: number): [number, number][] {
  if (!(len > 0.05)) return [];
  const n = Math.floor(len / BASKET_FT + 1e-9);
  const rem = len - n * BASKET_FT;
  const out: [number, number][] = [];
  for (let i = 0; i < n; i++) out.push([i * BASKET_FT, BASKET_FT]);
  if (rem >= 0.5 || n === 0) out.push([n * BASKET_FT, rem]);
  else if (rem > 1e-9) out[n - 1] = [(n - 1) * BASKET_FT, BASKET_FT + rem];
  return out;
}

/**
 * A gabion band (a park surface drawn 1 ft wide along the street edges) as a wall:
 * its axis-aligned bounds in park feet → start point, direction, length and depth.
 * Null for shapes that are not a thin band.
 */
export function bandAsWall(polygon: Vec2[]): { start: Vec2; dir: Vec2; lengthFt: number; depthFt: number } | null {
  if (polygon.length < 3) return null;
  const xs = polygon.map((p) => p[0]);
  const ys = polygon.map((p) => p[1]);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const y0 = Math.min(...ys);
  const y1 = Math.max(...ys);
  const dx = x1 - x0;
  const dy = y1 - y0;
  if (Math.min(dx, dy) <= 0) return null;
  // a band, not a block: clearly longer than it is deep
  if (Math.max(dx, dy) < 1.5 * Math.min(dx, dy)) return null;
  return dx >= dy
    ? { start: [x0, (y0 + y1) / 2], dir: [1, 0], lengthFt: dx, depthFt: dy }
    : { start: [(x0 + x1) / 2, y0], dir: [0, 1], lengthFt: dy, depthFt: dx };
}

// ---- standing on the ground -------------------------------------------------------

/**
 * The lowest ground (feet above the lot's datum) under a rectangular footprint: the
 * corners, edges and inside, sampled at most `step` feet apart. Furniture is built
 * level, so its base goes here and it never floats.
 */
export function lowestGround(ground: GroundFn, c: Vec2, xd: Vec2, yd: Vec2, hw: number, hh: number, step = 2): number {
  const nx = Math.max(1, Math.ceil((2 * hw) / step));
  const ny = Math.max(1, Math.ceil((2 * hh) / step));
  let lo = Infinity;
  for (let j = 0; j <= ny; j++) {
    const b = -hh + (2 * hh * j) / ny;
    for (let i = 0; i <= nx; i++) {
      const a = -hw + (2 * hw * i) / nx;
      const z = ground(c[0] + a * xd[0] + b * yd[0], c[1] + a * xd[1] + b * yd[1]);
      if (Number.isFinite(z) && z < lo) lo = z;
    }
  }
  return Number.isFinite(lo) ? lo : 0;
}

/** Is the ground flat (within `tol` feet) over a set of local points? */
export function flatOver(ground: GroundFn, pts: Vec2[], tol = 0.02): boolean {
  let lo = Infinity;
  let hi = -Infinity;
  for (const [x, y] of pts) {
    const z = ground(x, y);
    if (!Number.isFinite(z)) continue;
    lo = Math.min(lo, z);
    hi = Math.max(hi, z);
  }
  return !(hi - lo > tol);
}
