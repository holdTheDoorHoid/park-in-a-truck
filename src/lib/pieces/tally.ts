// Count a park layout the way the Dream workbook's "Count your pieces" and
// "Count your plants" pages do. Owner: pieces workstream.
//
//  - green squares: the pieces are printed on a 4-ft grid and you count the
//    4×4 squares that are green. A square counts when at least half of it is
//    planting (the frame strips are 3 ft of planting beside a 1-ft gabion wall
//    and the workbook counts each of those squares). Squares in a seam strip
//    narrower than 4 ft count for their share. Sun or shade is judged at the
//    square's centre; "part" sun counts as shade, as on the workbook page.
//  - nature-play squares: the same, for the nature-play surface.
//  - shrubs (yellow dots) by sun/shade; small and large trees.
//  - furnishings and built elements by element id (plants excluded).
//  - edging (cost estimator "EDGING"): feet of boundary between gravel and
//    planting / nature play, and the park's outer edge where there is no
//    gabion wall or building. Whether that sits on hardscape is unknown here, so
//    it is all reported as softscape.

import type { DesignTally, LayoutSurface, Material, ParkLayout, SunClass, ThemeId } from '../types';
import { PLANT_ELEMENTS } from '../../data/elements';

const RES = 0.5; // raster cell, feet

type SunAt = (x: number, y: number) => SunClass;

interface Raster {
  nx: number;
  ny: number;
  mat: (Material | null)[];
}

function bbox(poly: [number, number][]): [number, number, number, number] {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const [x, y] of poly) {
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  }
  return [x0, y0, x1, y1];
}

function pointInPoly(x: number, y: number, poly: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]!;
    const [xj, yj] = poly[j]!;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Rasterise surfaces at half-foot cells (later surfaces win, like drawing order). */
export function rasterise(layout: ParkLayout, res = RES): Raster {
  const nx = Math.max(1, Math.round(layout.lengthFt / res));
  const ny = Math.max(1, Math.round(layout.widthFt / res));
  const mat: (Material | null)[] = new Array(nx * ny).fill(null);
  for (const s of layout.surfaces as LayoutSurface[]) {
    const [x0, y0, x1, y1] = bbox(s.polygon);
    const rect = s.polygon.length === 4 && s.polygon.every(([x, y]) => (x === x0 || x === x1) && (y === y0 || y === y1));
    const i0 = Math.max(0, Math.floor(x0 / res + 1e-6));
    const i1 = Math.min(nx, Math.ceil(x1 / res - 1e-6));
    const j0 = Math.max(0, Math.floor(y0 / res + 1e-6));
    const j1 = Math.min(ny, Math.ceil(y1 / res - 1e-6));
    for (let j = j0; j < j1; j++) {
      for (let i = i0; i < i1; i++) {
        const cx = (i + 0.5) * res;
        const cy = (j + 0.5) * res;
        if (rect ? cx > x0 && cx < x1 && cy > y0 && cy < y1 : pointInPoly(cx, cy, s.polygon)) mat[j * nx + i] = s.material;
      }
    }
  }
  return { nx, ny, mat };
}

function lines(total: number, given?: number[]): number[] {
  if (given && given.length >= 2) return given;
  const out: number[] = [];
  for (let v = 0; v < total - 1e-6; v += 4) out.push(v);
  out.push(total);
  return out;
}

interface SquareCount {
  sun: number;
  shade: number;
  total: number;
}

function countSquares(r: Raster, layout: ParkLayout, which: Material, sunAt?: SunAt): SquareCount {
  const xs = lines(layout.lengthFt, layout.countGrid?.xs);
  const ys = lines(layout.widthFt, layout.countGrid?.ys);
  let sun = 0;
  let shade = 0;
  for (let b = 0; b + 1 < ys.length; b++) {
    for (let a = 0; a + 1 < xs.length; a++) {
      const x0 = xs[a]!;
      const x1 = xs[a + 1]!;
      const y0 = ys[b]!;
      const y1 = ys[b + 1]!;
      const i0 = Math.round(x0 / RES);
      const i1 = Math.round(x1 / RES);
      const j0 = Math.round(y0 / RES);
      const j1 = Math.round(y1 / RES);
      let hit = 0;
      let n = 0;
      for (let j = j0; j < j1 && j < r.ny; j++) {
        for (let i = i0; i < i1 && i < r.nx; i++) {
          n += 1;
          if (r.mat[j * r.nx + i] === which) hit += 1;
        }
      }
      if (n === 0 || hit / n < 0.5) continue;
      const weight = Math.min(1, ((x1 - x0) * (y1 - y0)) / 16);
      const cls = sunAt ? sunAt((x0 + x1) / 2, (y0 + y1) / 2) : 'sun';
      if (cls === 'sun') sun += weight;
      else shade += weight;
    }
  }
  return { sun, shade, total: sun + shade };
}

const SOFT: Material[] = ['planting', 'nature-play', 'mulch', 'lawn'];

function edges(r: Raster, layout: ParkLayout) {
  let gravelEdge = 0;
  const at = (i: number, j: number) => r.mat[j * r.nx + i] ?? null;
  for (let j = 0; j < r.ny; j++) {
    for (let i = 0; i < r.nx; i++) {
      const m = at(i, j);
      if (m !== 'gravel') continue;
      const nbrs: [number, number][] = [
        [i + 1, j],
        [i - 1, j],
        [i, j + 1],
        [i, j - 1],
      ];
      for (const [a, b] of nbrs) {
        if (a < 0 || b < 0 || a >= r.nx || b >= r.ny) continue;
        const n = at(a, b);
        if (n && SOFT.includes(n)) gravelEdge += RES;
      }
    }
  }
  // outer edge without a gabion wall or a building (shed) on it
  const sheds = layout.items.filter((it) => it.element === 'shed');
  const underShed = (x: number, y: number) =>
    sheds.some((s) => {
      const rot = ((s.rotationDeg % 180) + 180) % 180 === 90;
      const w = rot ? s.h : s.w;
      const h = rot ? s.w : s.h;
      return Math.abs(x - s.x) <= w / 2 + 0.01 && Math.abs(y - s.y) <= h / 2 + 0.01;
    });
  let outer = 0;
  const border: [number, number][] = [];
  for (let i = 0; i < r.nx; i++) border.push([i, 0], [i, r.ny - 1]);
  for (let j = 0; j < r.ny; j++) border.push([0, j], [r.nx - 1, j]);
  for (const [i, j] of border) {
    const m = at(i, j);
    if (!m || m === 'gabion') continue;
    const x = (i + 0.5) * RES;
    const y = (j + 0.5) * RES;
    if (underShed(x, y)) continue;
    outer += RES;
  }
  // corners appear twice in `border` only when the raster is one cell wide
  return { gravelEdge, outer };
}

/** Count everything the Dream workbook asks for. `sunAt` classifies a point (park feet). */
const SIZED_ELEMENTS = new Set(['keyhole-garden', 'shade-canopy', 'shed', 'stage', 'cold-frame']);

export function tally(layout: ParkLayout, sunAt?: SunAt): DesignTally {
  const r = rasterise(layout);
  const planting = countSquares(r, layout, 'planting', sunAt);
  const play = countSquares(r, layout, 'nature-play');
  const shrubs = { sun: 0, shade: 0 };
  let smallTrees = 0;
  let largeTrees = 0;
  const items: Record<string, number> = {};
  // Sizes for the cost questions that depend on them (keyhole gardens by
  // diameter, canopies by area, shed / stage / cold-frame squares).
  const itemSizes: Record<string, [number, number][]> = {};
  let bedEdge = 0;
  for (const it of layout.items) {
    if (it.element === 'shrub') {
      const cls = sunAt ? sunAt(it.x, it.y) : 'sun';
      if (cls === 'sun') shrubs.sun += 1;
      else shrubs.shade += 1;
      continue;
    }
    if (it.element === 'small-tree') {
      smallTrees += 1;
      continue;
    }
    if (it.element === 'large-tree') {
      largeTrees += 1;
      continue;
    }
    if (PLANT_ELEMENTS.has(it.element)) continue;
    items[it.element] = (items[it.element] ?? 0) + 1;
    if (SIZED_ELEMENTS.has(it.element)) (itemSizes[it.element] ??= []).push([it.w, it.h]);
    if (it.element === 'raised-bed') bedEdge += it.variant === 'round' ? Math.PI * Math.max(it.w, it.h) : 2 * (it.w + it.h);
  }
  let gabionArea = 0;
  for (const s of layout.surfaces) {
    if (s.material !== 'gabion') continue;
    const [x0, y0, x1, y1] = bbox(s.polygon);
    gabionArea += (x1 - x0) * (y1 - y0);
  }
  const e = edges(r, layout);
  const themes: ThemeId[] = [];
  for (const p of layout.pieces ?? []) if (!themes.includes(p.theme)) themes.push(p.theme);
  if (!themes.length) for (const s of layout.surfaces) if (s.theme && !themes.includes(s.theme)) themes.push(s.theme);
  return {
    lengthFt: layout.lengthFt,
    widthFt: layout.widthFt,
    plantingSquares: { sun: Math.round(planting.sun), shade: Math.round(planting.shade) },
    naturePlaySquares: Math.round(play.total),
    shrubs,
    smallTrees,
    largeTrees,
    gravelEdgeFt: { hardscape: 0, softscape: Math.round(e.gravelEdge) },
    outerEdgeFt: { hardscape: 0, softscape: Math.round(e.outer) },
    items,
    themes,
    // gabion walls are drawn 1 ft wide
    gabionWallFt: Math.round(gabionArea),
    raisedBedEdgeFt: Math.round(bedEdge),
    itemSizes,
  };
}
