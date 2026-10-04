// PLACEHOLDER park layout, used until the pieces workstream's real assembly
// (src/lib/pieces/: assemble + tally, from the printed piece sets) lands.
//
// It mimics the shape of the paper system — a FRAME band of planting with trees
// around the edge (open at the entrance), a FRONT piece near the entrance (gravel,
// seating, tables) and a BACK piece (4×4 planting squares and the like) — so the
// planner, the cost estimator and the plant picker have something real to work
// against. Same function names and arguments as src/lib/pieces/ so swapping is a
// one-line import change in ./park.ts.
//
// Item x/y are the CENTRE of the item's footprint (park-local feet).

import type { DesignTally, LayoutItem, LayoutSurface, LotKind, ParkLayout, PlacedItem, SizeId, SunClass, ThemeId } from '../types';
import { SIZES } from '../sizing';
import { catalogEntry } from './catalog';

export interface PieceSet {
  size: SizeId;
  lotKind: LotKind;
  /** the printed pieces' own size before seams, feet */
  nominal: { lengthFt: number; widthFt: number };
  placeholder: true;
}

export interface PieceThemes {
  frame: ThemeId;
  front: ThemeId;
  back: ThemeId;
}

export interface LayoutEdits {
  added?: PlacedItem[];
  removed?: string[];
  moved?: Record<string, { x: number; y: number; rotationDeg: number }>;
}

/** Nominal piece size: the bottom of each size's range (the workbook's D set is 88 × 32). */
export async function loadSet(size: SizeId, lotKind: LotKind): Promise<PieceSet> {
  const s = SIZES.find((x) => x.id === size) ?? SIZES[0]!;
  return { size, lotKind, nominal: { lengthFt: s.long[0], widthFt: s.short[0] }, placeholder: true };
}

type Rect = { x0: number; y0: number; x1: number; y1: number };

function rectPoly(r: Rect): [number, number][] {
  return [
    [r.x0, r.y0],
    [r.x1, r.y0],
    [r.x1, r.y1],
    [r.x0, r.y1],
  ];
}

export function assemble(set: PieceSet, themes: PieceThemes, lengthFt: number, widthFt: number, edits: LayoutEdits = {}): ParkLayout {
  const L = Math.max(8, lengthFt);
  const W = Math.max(6, widthFt);
  const surfaces: LayoutSurface[] = [];
  const items: LayoutItem[] = [];
  const counters: Record<string, number> = {};

  const add = (element: string, x: number, y: number, rotationDeg: number, theme: ThemeId, source: string, within?: Rect) => {
    const c = catalogEntry(element);
    const turned = Math.abs(rotationDeg) % 180 === 90;
    const hw = (turned ? c.h : c.w) / 2;
    const hh = (turned ? c.w : c.h) / 2;
    if (within && (x - hw < within.x0 - 0.01 || x + hw > within.x1 + 0.01 || y - hh < within.y0 - 0.01 || y + hh > within.y1 + 0.01)) return false;
    const key = `${source}:${element}`;
    counters[key] = (counters[key] ?? 0) + 1;
    items.push({ id: `${key}:${counters[key]}`, element, x, y, rotationDeg, theme, w: c.w, h: c.h, heightFt: c.heightFt, source });
    return true;
  };

  // ---- FRAME: planting band around the edge, open at the entrance (x0) ----
  const fw = W >= 16 ? 4 : 3;
  const frameT = themes.frame;
  surfaces.push({ id: 'frame:y0', material: 'planting', theme: frameT, polygon: rectPoly({ x0: 0, y0: 0, x1: L, y1: fw }) });
  surfaces.push({ id: 'frame:y1', material: 'planting', theme: frameT, polygon: rectPoly({ x0: 0, y0: W - fw, x1: L, y1: W }) });
  surfaces.push({ id: 'frame:x1', material: 'planting', theme: frameT, polygon: rectPoly({ x0: L - fw, y0: fw, x1: L, y1: W - fw }) });
  const gap = Math.min(6, W - 2 * fw);
  const side = (W - 2 * fw - gap) / 2;
  if (side >= 2) {
    surfaces.push({ id: 'frame:x0a', material: 'planting', theme: frameT, polygon: rectPoly({ x0: 0, y0: fw, x1: fw, y1: fw + side }) });
    surfaces.push({ id: 'frame:x0b', material: 'planting', theme: frameT, polygon: rectPoly({ x0: 0, y0: W - fw - side, x1: fw, y1: W - fw }) });
  }
  surfaces.push({
    id: 'frame:entrance',
    material: 'gravel',
    theme: themes.front,
    polygon: rectPoly({ x0: 0, y0: side >= 2 ? fw + side : fw, x1: fw, y1: side >= 2 ? W - fw - side : W - fw }),
  });

  // trees and shrubs along the two long bands
  const big = W >= 28 && L >= 60;
  for (const yy of [fw / 2, W - fw / 2]) {
    const treeXs: number[] = [];
    for (let x = 10; x <= L - 6; x += 16) treeXs.push(x);
    if (big) treeXs[treeXs.length - 1] = L - 9;
    treeXs.forEach((x, i) => add(big && i === treeXs.length - 1 ? 'large-tree' : 'small-tree', x, yy, 0, frameT, 'frame'));
    for (let x = 2; x <= L - 2; x += 4) {
      if (treeXs.some((t) => Math.abs(t - x) < 4)) continue;
      add('shrub', x, yy, 0, frameT, 'frame');
    }
  }
  const frameExtra: Record<ThemeId, string> = { edible: 'rain-barrel', nature: 'bird-accessories', sanctuary: 'birdbath', event: 'workbench' };

  // ---- FRONT and BACK pieces inside the frame ----
  const ix0 = fw;
  const ix1 = L - fw;
  const iy0 = fw;
  const iy1 = W - fw;
  const iL = ix1 - ix0;
  const fL = Math.max(8, Math.min(iL - 8, Math.round((iL * 0.5) / 4) * 4));
  const front: Rect = { x0: ix0, y0: iy0, x1: ix0 + fL, y1: iy1 };
  const back: Rect = { x0: ix0 + fL, y0: iy0, x1: ix1, y1: iy1 };
  surfaces.push({ id: 'front:base', material: 'gravel', theme: themes.front, polygon: rectPoly(front) });
  surfaces.push({ id: 'back:base', material: themes.back === 'event' ? 'gravel' : 'mulch', theme: themes.back, polygon: rectPoly(back) });

  const fcx = (front.x0 + front.x1) / 2;
  const fcy = (front.y0 + front.y1) / 2;
  const fW = front.y1 - front.y0;
  const ft = themes.front;
  switch (ft) {
    case 'edible': {
      if (!add('communal-table', fcx, fcy, 0, ft, 'front', front)) add('table-4', fcx, fcy, fW < 6 ? 90 : 0, ft, 'front', front);
      for (const dx of [-2.5, 2.5]) {
        add('stool', fcx + dx, fcy - 2.6, 0, ft, 'front', front);
        add('stool', fcx + dx, fcy + 2.6, 0, ft, 'front', front);
      }
      add('planter-24', front.x0 + 1.5, front.y0 + 1.5, 0, ft, 'front', front);
      add('planter-24', front.x0 + 1.5, front.y1 - 1.5, 0, ft, 'front', front);
      break;
    }
    case 'sanctuary': {
      const n = Math.max(1, Math.floor((front.x1 - front.x0 - 2) / 6));
      for (let i = 0; i < n; i++) {
        const x = front.x0 + 3 + i * 6;
        add('bench-back', x, front.y0 + 1.2, 0, ft, 'front', front);
        if (fW >= 8) add('bench-back', x, front.y1 - 1.2, 180, ft, 'front', front);
      }
      add('table-2', fcx, fcy, 0, ft, 'front', front);
      break;
    }
    case 'nature': {
      const rows = fW >= 12 ? 2 : 1;
      for (let r = 0; r < rows; r++) {
        for (let x = front.x0 + 3; x + 2 <= front.x1 - 1; x += 5) {
          add('nature-play', x, rows === 1 ? fcy : fcy + (r ? 2.5 : -2.5), 0, ft, 'front', front);
        }
      }
      add('bench-4', front.x1 - 3, front.y0 + 0.9, 0, ft, 'front', front);
      break;
    }
    case 'event': {
      for (let x = front.x0 + 2; x + 1 <= front.x1 - 1; x += 3) {
        for (let y = front.y0 + 1.5; y + 1 <= front.y1 - 0.5; y += 3) {
          if (Math.abs(y - fcy) < 1.2 && fW >= 8) continue; // centre aisle
          add('flexible-seating', x, y, 0, ft, 'front', front);
        }
      }
      break;
    }
  }

  const bt = themes.back;
  const bW = back.y1 - back.y0;
  const bcx = (back.x0 + back.x1) / 2;
  const bcy = (back.y0 + back.y1) / 2;
  const squares = (spacing: number) => {
    const rows = Math.max(1, Math.floor((bW - 1) / spacing + 0.001));
    const cols = Math.max(1, Math.floor((back.x1 - back.x0 - 1) / spacing + 0.001));
    const offY = bcy - ((rows - 1) * spacing) / 2;
    const offX = bcx - ((cols - 1) * spacing) / 2;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) add('planting-square', offX + c * spacing, offY + r * spacing, 0, bt, 'back', back);
  };
  switch (bt) {
    case 'edible': {
      const rot = bW >= 9 ? 0 : 90;
      const step = rot ? 6 : 10;
      for (let x = back.x0 + (rot ? 3 : 5); x + (rot ? 2 : 4) <= back.x1 - 1; x += step) {
        if (bW >= 12) {
          add('raised-bed', x, bcy - 3, rot, bt, 'back', back);
          add('raised-bed', x, bcy + 3, rot, bt, 'back', back);
        } else add('raised-bed', x, bcy, rot, bt, 'back', back);
      }
      add('compost-bin', back.x1 - 2, back.y0 + 2, 0, bt, 'back', back);
      break;
    }
    case 'sanctuary':
      squares(6);
      add('bench-4', bcx, bcy, 90, bt, 'back', back);
      break;
    case 'nature':
      squares(5);
      add('birdbath', back.x1 - 1.5, back.y1 - 1.5, 0, bt, 'back', back);
      break;
    case 'event':
      if (!add('stage', back.x1 - 4.5, bcy, 90, bt, 'back', back) && !add('stage', bcx, bcy, 0, bt, 'back', back)) {
        add('table-6', bcx, bcy, 0, bt, 'back', back);
      }
      break;
  }
  add(frameExtra[frameT], back.x1 - 1.5, back.y0 + 1.5, 0, frameT, 'frame', back) ||
    add(frameExtra[frameT], front.x0 + 1.5, front.y0 + 1.5, 0, frameT, 'frame', front);

  // ---- the person's edits ----
  const removed = new Set(edits.removed ?? []);
  const out: LayoutItem[] = [];
  for (const it of items) {
    if (removed.has(it.id)) continue;
    const mv = edits.moved?.[it.id];
    out.push(mv ? { ...it, x: mv.x, y: mv.y, rotationDeg: mv.rotationDeg } : it);
  }
  for (const a of edits.added ?? []) {
    if (removed.has(a.id)) continue;
    const c = catalogEntry(a.element);
    const mv = edits.moved?.[a.id];
    out.push({ ...a, ...(mv ?? {}), w: c.w, h: c.h, heightFt: c.heightFt, source: 'added' });
  }
  return {
    lengthFt: L,
    widthFt: W,
    streetEdges: set.lotKind === 'corner-left' ? ['x0', 'y1'] : set.lotKind === 'corner-right' ? ['x0', 'y0'] : ['x0'],
    surfaces,
    items: out,
  };
}

// ---- tally ------------------------------------------------------------------

export type SunAt = (x: number, y: number) => SunClass;

const PLANT_ELEMENTS = new Set(['planting-square', 'perennial', 'shrub', 'small-tree', 'large-tree', 'nature-play']);

function polyBox(p: [number, number][]) {
  const xs = p.map((q) => q[0]);
  const ys = p.map((q) => q[1]);
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
}

/**
 * Count the design the way the Dream workbook's "Count your pieces / Count your plants"
 * pages do. `sunAt` says whether a spot gets sun; part sun counts as shade (DESIGN §5).
 */
export function tally(layout: ParkLayout, sunAt: SunAt = () => 'sun'): DesignTally {
  const two = (x: number, y: number): 'sun' | 'shade' => (sunAt(x, y) === 'sun' ? 'sun' : 'shade');
  const plantingSquares = { sun: 0, shade: 0 };
  const shrubs = { sun: 0, shade: 0 };
  let smallTrees = 0;
  let largeTrees = 0;
  let naturePlaySquares = 0;
  const items: Record<string, number> = {};

  for (const s of layout.surfaces) {
    const b = polyBox(s.polygon);
    if (s.material === 'planting') {
      // every 4×4 square of planting band ("green squares")
      for (let x = b.x0; x + 2 <= b.x1; x += 4) {
        for (let y = b.y0; y + 2 <= b.y1; y += 4) {
          const cx = Math.min(x + 2, (x + b.x1) / 2);
          const cy = Math.min(y + 2, (y + b.y1) / 2);
          plantingSquares[two(cx, cy)]++;
        }
      }
    } else if (s.material === 'nature-play') {
      naturePlaySquares += Math.round(((b.x1 - b.x0) * (b.y1 - b.y0)) / 16);
    }
  }
  for (const it of layout.items) {
    switch (it.element) {
      case 'planting-square':
        plantingSquares[two(it.x, it.y)]++;
        break;
      case 'shrub':
        shrubs[two(it.x, it.y)]++;
        break;
      case 'small-tree':
        smallTrees++;
        break;
      case 'large-tree':
        largeTrees++;
        break;
      case 'nature-play':
        naturePlaySquares += Math.max(1, Math.round((it.w * it.h) / 16));
        break;
    }
    if (!PLANT_ELEMENTS.has(it.element)) items[it.element] = (items[it.element] ?? 0) + 1;
  }
  const L = layout.lengthFt;
  const W = layout.widthFt;
  const themes = [...new Set(layout.surfaces.map((s) => s.theme).filter(Boolean))] as ThemeId[];
  return {
    lengthFt: L,
    widthFt: W,
    plantingSquares,
    naturePlaySquares,
    shrubs,
    smallTrees,
    largeTrees,
    // edge lengths depend on the neighbours: the planner measures them on the lot (edges.ts)
    items,
    themes,
  };
}
