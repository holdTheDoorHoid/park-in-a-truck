// Simple, recognisable shapes for park elements that have no PiaT build guide (rain
// barrel, compost bin, raised bed, café table, shed, the planted trees and shrubs …).
// Pure: each element becomes a list of primitive parts in the item's own frame, which
// the three.js side draws as a few shared instanced meshes. Clean and slightly toy-like,
// like the rest of the planner.
//
// Frame: feet; x along the item's length, y across it, z up; origin = the footprint's
// centre on the ground. A part's `at` is the centre of its BASE.

import { ELEMENTS } from '../../../data/elements';

export type Prim = 'box' | 'cyl' | 'cone' | 'ball' | 'wedge' | 'pyramid';
/** what the part is made of, when it is not plain painted/solid colour */
export type PartMat = 'glass' | 'stone';

export interface PrimPart {
  prim: Prim;
  mat?: PartMat;
  /** centre of the part's base, item frame (feet) */
  at: [number, number, number];
  /** size along the item's x, y and up (feet). cyl/cone/ball: x and y are diameters */
  size: [number, number, number];
  /** turn in radians about the item's x, y and up axes (about the base centre), applied x first, then y, then up */
  rot?: [number, number, number];
  color: string;
}

export interface ProcItem {
  id: string;
  element: string;
  w: number;
  h: number;
  heightFt?: number;
  variant?: string;
}

export interface ProcColors {
  /** the item's theme: front (flowers, fabric) */
  front: string;
  /** the printed pieces' theme colours for chairs and the shed (src/data/themes.ts `plan`) */
  seat: string;
  shed: string;
  /** the element's planner colour (src/lib/planner/catalog.ts) */
  base: string;
}

export const WOOD = '#b98a5a';
const WOOD_DARK = '#8f6a45';
const METAL = '#5f676d';
const SOIL = '#6e5139';
const LEAF = '#5aa55e';
const LEAF_DARK = '#3f8a4b';
const WATER = '#5aaedc';
const STONE = '#a7a29a';
const CANVAS = '#f4f2ec';

/** Seeded pseudo-random numbers (mulberry32) so an item looks the same every time it is drawn. */
export function seeded(key: string): () => number {
  let seed = 0;
  for (let i = 0; i < key.length; i++) seed = (Math.imul(seed, 31) + key.charCodeAt(i)) | 0;
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const box = (x: number, y: number, z: number, sx: number, sy: number, sz: number, color: string, rot?: [number, number, number]): PrimPart => ({
  prim: 'box',
  at: [x, y, z],
  size: [sx, sy, sz],
  color,
  ...(rot ? { rot } : {}),
});
const cyl = (x: number, y: number, z: number, d: number, sz: number, color: string, rot?: [number, number, number]): PrimPart => ({
  prim: 'cyl',
  at: [x, y, z],
  size: [d, d, sz],
  color,
  ...(rot ? { rot } : {}),
});
const ball = (x: number, y: number, z: number, sx: number, sy: number, sz: number, color: string): PrimPart => ({ prim: 'ball', at: [x, y, z], size: [sx, sy, sz], color });

/** A chair facing +y (towards the table when `face` is +1) or -y, seat 1.4 ft square. */
function chair(x: number, y: number, face: 1 | -1, color: string, turn = 0): PrimPart[] {
  const s = 1.4;
  const seatZ = 1.45;
  const parts: PrimPart[] = [];
  // turn the chair about its own centre: rotate the offsets
  const c = Math.cos(turn);
  const sn = Math.sin(turn);
  const at = (ox: number, oy: number): [number, number] => [x + ox * c - oy * sn, y + ox * sn + oy * c];
  for (const [lx, ly] of [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ] as const) {
    const [px, py] = at((lx * (s - 0.15)) / 2, (ly * (s - 0.15)) / 2);
    parts.push(box(px, py, 0, 0.12, 0.12, seatZ, color, turn ? [0, 0, turn] : undefined));
  }
  const [sx, sy] = at(0, 0);
  parts.push(box(sx, sy, seatZ, s, s, 0.12, color, turn ? [0, 0, turn] : undefined));
  const [bx, by] = at(0, (-face * (s - 0.12)) / 2);
  parts.push(box(bx, by, seatZ + 0.12, s, 0.12, 1.3, color, turn ? [0, 0, turn] : undefined));
  return parts;
}

/** Leafy clump of `n` balls in a circle of diameter `d`, `tall` feet high. */
function clump(rnd: () => number, cx: number, cy: number, d: number, tall: number, colors: string[], n = 3): PrimPart[] {
  const parts: PrimPart[] = [];
  const r = d / 2;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + rnd() * 0.8;
    const off = n === 1 ? 0 : r * (0.28 + rnd() * 0.12);
    const bd = d * (n === 1 ? 1 : 0.68 + rnd() * 0.1);
    const bt = tall * (0.8 + rnd() * 0.2);
    parts.push(ball(cx + Math.cos(a) * off, cy + Math.sin(a) * off, 0, bd, bd, bt, colors[k % colors.length]!));
  }
  return parts;
}

/** A tree: trunk and a crown of a few leafy lumps; crown `d` across, top at `H`. */
export function treeParts(d: number, H: number, color: string, rnd: () => number): PrimPart[] {
  const crownH = Math.min(H * 0.62, Math.max(d * 1.25, d + 2));
  const crownZ = H - crownH;
  const trunkD = Math.max(0.3, Math.min(1.4, d * 0.07 + H * 0.012));
  const parts: PrimPart[] = [cyl(0, 0, 0, trunkD, crownZ + crownH * 0.35, '#6b5340')];
  // a main lump and three around it, lower down
  parts.push(ball(0, 0, crownZ + crownH * 0.18, d * 0.82, d * 0.82, crownH * 0.82, color));
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2 + rnd() * 1.2;
    const off = d * 0.2;
    parts.push(ball(Math.cos(a) * off, Math.sin(a) * off, crownZ + rnd() * crownH * 0.12, d * 0.58, d * 0.58, crownH * 0.62, k === 1 ? shade(color, 0.88) : color));
  }
  return parts;
}

/** A colour a little darker (f < 1) or lighter (f > 1). */
export function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) =>
    Math.max(0, Math.min(255, Math.round(f <= 1 ? v * f : v + (255 - v) * (f - 1))))
      .toString(16)
      .padStart(2, '0');
  return `#${ch((n >> 16) & 255)}${ch((n >> 8) & 255)}${ch(n & 255)}`;
}

const meta = (id: string) => ELEMENTS[id];
/** the element's real size in feet: [length, width, height] */
function realSize(id: string, fallback: [number, number, number]): [number, number, number] {
  const m = meta(id);
  return [m?.footprintFt?.[0] ?? fallback[0], m?.footprintFt?.[1] ?? fallback[1], m?.heightFt ?? fallback[2]];
}

/**
 * The parts for one item, or null when the element has no shape of its own. Sized-to-fit
 * things (beds, sheds, tents, tables) follow the drawn footprint; products (barrels,
 * birdbaths, hammocks …) and plants keep their real size and stand centred on it.
 */
export function proceduralParts(it: ProcItem, col: ProcColors): PrimPart[] | null {
  const w = Math.max(0.5, it.w);
  const h = Math.max(0.5, it.h);
  const rnd = seeded(it.id + ':' + it.element);
  switch (it.element) {
    case 'rain-barrel': {
      const [d0, , H] = realSize('rain-barrel', [2, 2, 3]);
      const d = Math.min(d0, Math.max(w, h));
      const c = col.base;
      return [
        cyl(0, 0, 0, d * 0.94, H - 0.08, c),
        cyl(0, 0, H * 0.22, d, 0.12, shade(c, 0.85)),
        cyl(0, 0, H * 0.7, d, 0.12, shade(c, 0.85)),
        cyl(0, 0, H - 0.08, d * 0.98, 0.08, shade(c, 0.75)),
        box(0, -d * 0.47 - 0.05, 0.35, 0.16, 0.2, 0.16, METAL),
      ];
    }
    case 'compost-bin': {
      const H = it.heightFt ?? realSize('compost-bin', [4, 4, 3])[2];
      const parts: PrimPart[] = [];
      const t = 0.12;
      // corner posts
      for (const [a, b] of [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ] as const)
        parts.push(box((a * (w - t)) / 2, (b * (h - t)) / 2, 0, t * 1.4, t * 1.4, H, WOOD_DARK));
      // slatted back and sides, open slats at the front
      const slats = 5;
      for (let k = 0; k < slats; k++) {
        const z = 0.15 + (k * (H - 0.4)) / (slats - 1);
        parts.push(box(0, h / 2 - t / 2, z, w - t, t, 0.32, WOOD));
        parts.push(box(-w / 2 + t / 2, 0, z, t, h - t, 0.32, WOOD));
        parts.push(box(w / 2 - t / 2, 0, z, t, h - t, 0.32, WOOD));
        if (k < 2) parts.push(box(0, -h / 2 + t / 2, z, w - t, t, 0.32, WOOD));
      }
      parts.push(ball(0, 0, 0, w * 0.8, h * 0.8, H * 0.75, '#5c4430'));
      return parts;
    }
    case 'raised-bed': {
      const H = it.heightFt ?? realSize('raised-bed', [8, 4, 1.5])[2];
      const parts: PrimPart[] = [];
      const t = 0.17;
      if (it.variant === 'round') {
        const d = Math.min(w, h);
        parts.push(cyl(0, 0, 0, d, H, WOOD), cyl(0, 0, H - 0.02, d - 2 * t, 0.04, SOIL));
        parts.push(...clump(rnd, 0, 0, d * 0.55, 1.2, [LEAF, LEAF_DARK], 3).map((p) => ({ ...p, at: [p.at[0], p.at[1], H - 0.1] as [number, number, number] })));
        return parts;
      }
      parts.push(box(0, -h / 2 + t / 2, 0, w, t, H, WOOD), box(0, h / 2 - t / 2, 0, w, t, H, WOOD));
      parts.push(box(-w / 2 + t / 2, 0, 0, t, h - 2 * t, H, WOOD), box(w / 2 - t / 2, 0, 0, t, h - 2 * t, H, WOOD));
      parts.push(box(0, 0, 0, w - 2 * t, h - 2 * t, H - 0.12, SOIL));
      // a row (or two) of plants
      const rows = h >= 3 ? 2 : 1;
      const per = Math.max(1, Math.round((w - 0.6) / 1.6));
      for (let j = 0; j < rows; j++)
        for (let i = 0; i < per; i++) {
          const x = -w / 2 + 0.3 + ((i + 0.5) * (w - 0.6)) / per;
          const y = rows === 1 ? 0 : (j - 0.5) * (h - 2 * t) * 0.5;
          const d = Math.min(1.3, (h - 2 * t) / rows) * (0.8 + rnd() * 0.2);
          parts.push(ball(x, y, H - 0.3, d, d, d * 0.9, rnd() < 0.5 ? LEAF : LEAF_DARK));
        }
      return parts;
    }
    case 'keyhole-garden': {
      const H = it.heightFt ?? realSize('keyhole-garden', [6, 6, 2.5])[2];
      const d = Math.min(w, h);
      const r = d / 2;
      const parts: PrimPart[] = [];
      // a ring of stones in two courses, with the keyhole notch towards -y
      const seg = Math.max(10, Math.round((Math.PI * d) / 1.15));
      const notch = Math.PI / 2 + Math.PI; // -y
      const gap = Math.max(0.55 / r, 0.28);
      const segLen = (Math.PI * d) / seg;
      for (let course = 0; course < 2; course++)
        for (let k = 0; k < seg; k++) {
          const a = ((k + course * 0.5) / seg) * Math.PI * 2;
          const da = Math.atan2(Math.sin(a - notch), Math.cos(a - notch));
          if (Math.abs(da) < gap) continue;
          const sh = 0.94 + rnd() * 0.12;
          parts.push(box(Math.cos(a) * (r - 0.35), Math.sin(a) * (r - 0.35), course * (H / 2), segLen * 1.02, 0.7, H / 2 - 0.02, shade(STONE, sh), [0, 0, a + Math.PI / 2]));
        }
      parts.push(cyl(0, 0, 0, d - 1.3, H - 0.15, SOIL));
      // the compost basket in the middle, reached through the notch
      parts.push(cyl(0, 0, 0, Math.max(0.9, d * 0.2), H + 0.35, '#8e989e'));
      parts.push(box(0, -r / 2 - 0.1, 0, Math.min(1.1, d * 0.2), r + 0.2, 0.1, '#b9a27f'));
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2 + 0.6;
        if (Math.abs(Math.atan2(Math.sin(a - notch), Math.cos(a - notch))) < 0.6) continue;
        const bd = d * 0.2;
        parts.push(ball(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55, H - 0.25, bd, bd, bd * 0.8, k % 2 ? LEAF : LEAF_DARK));
      }
      return parts;
    }
    case 'cold-frame': {
      const H = it.heightFt ?? realSize('cold-frame', [3, 3, 1.5])[2];
      const t = 0.12;
      const lo = H * 0.6;
      const tilt = Math.atan2(H - lo, h);
      return [
        box(0, h / 2 - t / 2, 0, w, t, H, WOOD),
        box(0, -h / 2 + t / 2, 0, w, t, lo, WOOD),
        box(-w / 2 + t / 2, 0, 0, t, h - 2 * t, (H + lo) / 2, WOOD),
        box(w / 2 - t / 2, 0, 0, t, h - 2 * t, (H + lo) / 2, WOOD),
        box(0, 0, 0, w - 2 * t, h - 2 * t, 0.25, SOIL),
        ...clump(rnd, -w * 0.2, 0, Math.min(w, h) * 0.3, 0.5, [LEAF], 1),
        ...clump(rnd, w * 0.2, 0, Math.min(w, h) * 0.3, 0.5, [LEAF_DARK], 1),
        { prim: 'box', mat: 'glass', at: [0, 0, (H + lo) / 2 - 0.04], size: [w, Math.hypot(h, H - lo), 0.06], rot: [tilt, 0, 0], color: '#cfe6ee' },
      ];
    }
    case 'communal-table': {
      const tl = Math.max(3, w - 1);
      const td = Math.max(2.5, Math.min(3, h));
      const parts: PrimPart[] = [
        box(0, 0, 2.35, tl, td, 0.15, WOOD),
        box(-tl / 2 + 0.6, 0, 0, 0.25, td * 0.8, 2.35, WOOD_DARK),
        box(tl / 2 - 0.6, 0, 0, 0.25, td * 0.8, 2.35, WOOD_DARK),
        box(0, 0, 0.5, tl - 1.2, 0.25, 0.25, WOOD_DARK),
      ];
      const n = Math.max(1, Math.floor(tl / 2.2));
      for (let i = 0; i < n; i++) {
        const x = -tl / 2 + ((i + 0.5) * tl) / n;
        parts.push(...chair(x, -td / 2 - 0.25, 1, col.seat), ...chair(x, td / 2 + 0.25, -1, col.seat));
      }
      return parts;
    }
    case 'cafe-table': {
      const d = Math.min(2, Math.max(1.5, h));
      const gapX = Math.max(d / 2 + 0.55, w / 2 - 0.7);
      return [
        cyl(0, 0, 0, d * 0.5, 0.06, METAL),
        cyl(0, 0, 0, 0.15, 2.4, METAL),
        cyl(0, 0, 2.4, d, 0.1, WOOD),
        ...chair(-gapX, 0, 1, col.seat, -Math.PI / 2),
        ...chair(gapX, 0, 1, col.seat, Math.PI / 2),
      ];
    }
    case 'event-tent': {
      const H = it.heightFt ?? realSize('event-tent', [10, 10, 9])[2];
      const eave = H - 2;
      const parts: PrimPart[] = [];
      for (const [a, b] of [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ] as const)
        parts.push(box((a * (w - 0.2)) / 2, (b * (h - 0.2)) / 2, 0, 0.15, 0.15, eave, '#c9ced1'));
      parts.push({ prim: 'pyramid', at: [0, 0, eave], size: [w, h, H - eave], color: CANVAS });
      // the valance round the edge
      parts.push(box(0, -h / 2, eave - 0.6, w, 0.05, 0.6, CANVAS), box(0, h / 2, eave - 0.6, w, 0.05, 0.6, CANVAS));
      parts.push(box(-w / 2, 0, eave - 0.6, 0.05, h, 0.6, CANVAS), box(w / 2, 0, eave - 0.6, 0.05, h, 0.6, CANVAS));
      return parts;
    }
    case 'flexible-seating':
      return chair(0, 0, 1, col.seat);
    case 'birdbath': {
      const H = it.heightFt ?? realSize('birdbath', [2, 2, 2.5])[2];
      const d = Math.min(2, Math.max(w, h));
      const c = col.base;
      return [
        cyl(0, 0, 0, d * 0.55, 0.15, c),
        { prim: 'cone', at: [0, 0, 0.15], size: [d * 0.42, d * 0.42, 0.45], color: c },
        cyl(0, 0, 0.15, d * 0.2, H - 0.45, c),
        cyl(0, 0, H - 0.45, d * 0.45, 0.15, c),
        cyl(0, 0, H - 0.3, d, 0.25, c),
        cyl(0, 0, H - 0.07, d * 0.86, 0.04, WATER),
      ];
    }
    case 'bird-accessories': {
      const H = it.heightFt ?? realSize('bird-accessories', [1, 1, 6])[2];
      const house = shade(col.front, 1.2);
      return [
        box(0, 0, 0, 0.3, 0.3, H - 0.8, '#6b5a4a'),
        box(0, 0, H - 0.8, 0.75, 0.75, 0.65, house),
        { prim: 'wedge', at: [0, 0, H - 0.15], size: [0.95, 1.0, 0.4], color: '#5b4a3a' },
        cyl(0, -0.38, H - 0.45, 0.2, 0.03, '#2b2420', [Math.PI / 2, 0, 0]),
      ];
    }
    case 'shed': {
      const H = it.heightFt ?? realSize('shed', [8, 4, 7])[2];
      const eave = H - 1.4;
      const c = col.base;
      return [
        box(0, 0, 0, w - 0.3, h - 0.3, eave, c),
        { prim: 'wedge', at: [0, 0, eave], size: [w - 0.3, h - 0.3, H - eave], color: c },
        // roof slopes, a little proud of the walls
        box(0, -(h - 0.3) / 4, eave + (H - eave) / 2 - 0.05, w, Math.hypot((h - 0.3) / 2, H - eave) + 0.3, 0.12, '#4f575d', [Math.atan2(H - eave, (h - 0.3) / 2), 0, 0]),
        box(0, (h - 0.3) / 4, eave + (H - eave) / 2 - 0.05, w, Math.hypot((h - 0.3) / 2, H - eave) + 0.3, 0.12, '#4f575d', [-Math.atan2(H - eave, (h - 0.3) / 2), 0, 0]),
        box(0, -(h - 0.3) / 2 - 0.03, 0, Math.min(2.6, w * 0.4), 0.08, Math.min(6.2, eave - 0.3), col.shed),
      ];
    }
    case 'hammock': {
      // a steel stand: base beam with feet, arms rising outward to the hooks, and the
      // hammock hanging between them in a curve
      const [L0, , H0] = realSize('hammock', [10, 4, 4]);
      const L = Math.min(L0, Math.max(w, 6));
      const H = it.heightFt ?? H0;
      const foot = L * 0.36;
      const hook = L * 0.47;
      const tilt = Math.atan2(hook - foot, H);
      const arm = Math.hypot(hook - foot, H);
      const parts: PrimPart[] = [
        box(0, 0, 0, foot * 2, 0.25, 0.22, METAL),
        box(-foot, 0, 0, 0.22, 1.8, 0.2, METAL),
        box(foot, 0, 0, 0.22, 1.8, 0.2, METAL),
        box(-foot, 0, 0.1, 0.2, 0.2, arm, METAL, [0, -tilt, 0]),
        box(foot, 0, 0.1, 0.2, 0.2, arm, METAL, [0, tilt, 0]),
      ];
      const fabric = shade(col.seat, 1.1);
      const top = H - 0.35;
      const low = 1.5;
      const z = (x: number) => low + (top - low) * (x / (hook - 0.3)) ** 2;
      const n = 8;
      for (let k = 0; k < n; k++) {
        const x0 = -(hook - 0.3) + (k * 2 * (hook - 0.3)) / n;
        const x1 = x0 + (2 * (hook - 0.3)) / n;
        const dz = z(x1) - z(x0);
        const len = Math.hypot(x1 - x0, dz);
        parts.push(box((x0 + x1) / 2, 0, (z(x0) + z(x1)) / 2 - 0.04, len + 0.05, 1.5, 0.08, fabric, [0, -Math.atan2(dz, x1 - x0), 0]));
      }
      return parts;
    }
    case 'porch-swing': {
      const [L0, D0, H0] = realSize('porch-swing', [7, 5, 7]);
      const L = Math.min(L0, Math.max(w, 5));
      const D = Math.min(D0, Math.max(h, 3));
      const H = it.heightFt ?? H0;
      const legTilt = Math.atan2(D / 2 - 0.2, H);
      const legLen = Math.hypot(D / 2 - 0.2, H);
      const seatW = L - 2.2;
      const parts: PrimPart[] = [];
      for (const sx of [-1, 1])
        for (const sy of [-1, 1]) parts.push(box((sx * (L - 0.4)) / 2, (sy * (D - 0.4)) / 2, 0, 0.3, 0.3, legLen, WOOD_DARK, [sy * legTilt, 0, 0]));
      parts.push(box(0, 0, H - 0.3, L, 0.3, 0.35, WOOD_DARK));
      for (const sx of [-1, 1]) for (const sy of [-0.6, 0.6]) parts.push(cyl((sx * (seatW - 0.3)) / 2, sy, 1.75, 0.05, H - 2.05, METAL));
      parts.push(box(0, 0, 1.5, seatW, 1.7, 0.25, WOOD), box(0, -0.8, 1.75, seatW, 0.15, 1.4, WOOD));
      return parts;
    }
    case 'solar-fountain': {
      const H = it.heightFt ?? realSize('solar-fountain', [3, 3, 2.5])[2];
      const d = Math.min(3, Math.max(w, h));
      return [
        cyl(0, 0, 0, d, 1.2, STONE),
        cyl(0, 0, 1.15, d * 0.88, 0.06, WATER),
        cyl(0, 0, 1.2, 0.12, H - 1.2, '#bfe3f5'),
        ball(0, 0, H - 0.25, 0.5, 0.5, 0.35, '#bfe3f5'),
        box(d * 0.42, 0, 0, 0.06, 0.06, 1.6, METAL),
        box(d * 0.42, 0, 1.6, 0.6, 0.45, 0.04, '#24384f', [0.5, 0, 0]),
      ];
    }
    case 'outdoor-classroom': {
      // three benches round a square: one along the back, one up each side
      const parts: PrimPart[] = [];
      const seatZ = 1.35;
      const bench = (x: number, y: number, len: number, alongX: boolean) => {
        const d = 1.4;
        parts.push(box(x, y, seatZ, alongX ? len : d, alongX ? d : len, 0.15, WOOD));
        const legs = Math.max(2, Math.round(len / 4) + 1);
        for (let k = 0; k < legs; k++) {
          const o = -len / 2 + 0.4 + (k * (len - 0.8)) / (legs - 1);
          parts.push(box(alongX ? x + o : x, alongX ? y : y + o, 0, alongX ? 0.25 : d * 0.8, alongX ? d * 0.8 : 0.25, seatZ, WOOD_DARK));
        }
      };
      bench(0, -h / 2 + 0.75, w, true);
      bench(-w / 2 + 0.75, 0.75, h - 1.5, false);
      bench(w / 2 - 0.75, 0.75, h - 1.5, false);
      return parts;
    }
    case 'nature-play': {
      const parts: PrimPart[] = [box(0, 0, 0, w - 0.2, h - 0.2, 0.15, '#cdb07d')];
      const area = w * h;
      const stumps = Math.max(2, Math.round(area / 9));
      for (let k = 0; k < stumps; k++) {
        const d = 0.8 + rnd() * 0.5;
        const x = (rnd() - 0.5) * (w - d - 0.4);
        const y = (rnd() - 0.5) * (h - d - 0.4);
        parts.push(cyl(x, y, 0.1, d, 0.6 + rnd() * 0.9, k % 2 ? WOOD : WOOD_DARK));
      }
      if (Math.min(w, h) >= 3.5) {
        // a log lying on the chips, turned any which way
        const len = Math.min(w, h) * 0.7;
        const yaw = rnd() * Math.PI;
        const cx = (rnd() - 0.5) * Math.max(0, w - len - 0.4) * 0.5;
        const cy = (rnd() - 0.5) * Math.max(0, h - len - 0.4) * 0.5;
        parts.push(cyl(cx - (Math.cos(yaw) * len) / 2, cy - (Math.sin(yaw) * len) / 2, 0.55, 0.8, len, WOOD, [0, Math.PI / 2, yaw]));
      }
      const rocks = Math.max(1, Math.round(area / 20));
      for (let k = 0; k < rocks; k++) {
        const d = 0.9 + rnd() * 0.6;
        parts.push(ball((rnd() - 0.5) * (w - d), (rnd() - 0.5) * (h - d), 0, d, d * 0.9, d * 0.65, shade(STONE, 0.85 + rnd() * 0.2)));
      }
      return parts;
    }
    case 'gabion-table': {
      const H = it.heightFt ?? realSize('gabion-table', [4, 2, 2.5])[2];
      return [
        { prim: 'box', mat: 'stone', at: [0, 0, 0], size: [w - 0.3, h * 0.6, H - 0.15], color: '#ffffff' },
        box(0, 0, H - 0.15, w, h, 0.15, WOOD),
      ];
    }
    case 'planting-square': {
      const parts: PrimPart[] = [box(0, 0, 0, w - 0.2, h - 0.2, 0.18, '#7a5c40')];
      const nx = Math.max(1, Math.round(w / 1.4));
      const ny = Math.max(1, Math.round(h / 1.4));
      const flower = shade(col.front, 1.15);
      for (let j = 0; j < ny; j++)
        for (let i = 0; i < nx; i++) {
          const x = -w / 2 + ((i + 0.5) * w) / nx;
          const y = -h / 2 + ((j + 0.5) * h) / ny;
          const d = Math.min(w / nx, h / ny) * (0.75 + rnd() * 0.15);
          parts.push(ball(x, y, 0.1, d, d, d * 0.8, (i + j) % 2 ? flower : LEAF));
        }
      return parts;
    }
    case 'perennial': {
      const [d0, , H0] = realSize('perennial', [1, 1, 2]);
      const d = Math.max(d0, Math.min(w, h));
      const H = Math.min(it.heightFt ?? H0, 2);
      const flower = shade(col.front, 1.15);
      return [...clump(rnd, 0, 0, d, H * 0.7, [LEAF, LEAF_DARK], 3), ball(0, 0, H * 0.55, d * 0.45, d * 0.45, H * 0.35, flower)];
    }
    case 'shrub': {
      const [d0, , H0] = realSize('shrub', [3, 3, 4]);
      const d = Math.max(d0, Math.min(w, h));
      const H = it.heightFt ?? H0;
      return clump(rnd, 0, 0, d, H, ['#6ba34c', '#5a9446', '#7aae55'], 3);
    }
    case 'small-tree':
    case 'large-tree': {
      const [d0, , H0] = realSize(it.element, it.element === 'small-tree' ? [4, 4, 15] : [9, 9, 35]);
      const d = Math.max(1, Math.max(w, h) || d0);
      return treeParts(d, it.heightFt ?? H0, col.base, rnd);
    }
    default:
      return null;
  }
}

/** The extent of a list of parts in the item's frame, turns included (bounding boxes). */
export function partsExtent(parts: PrimPart[]): { x: [number, number]; y: [number, number]; z: [number, number] } {
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  for (const p of parts) {
    const [rx, ry, rz] = p.rot ?? [0, 0, 0];
    for (const cx of [-0.5, 0.5])
      for (const cy of [-0.5, 0.5])
        for (const cz of [0, 1]) {
          let x = cx * p.size[0];
          let y = cy * p.size[1];
          let z = cz * p.size[2];
          // about x, then y, then up (see PrimPart.rot)
          [y, z] = [y * Math.cos(rx) - z * Math.sin(rx), y * Math.sin(rx) + z * Math.cos(rx)];
          [x, z] = [x * Math.cos(ry) + z * Math.sin(ry), -x * Math.sin(ry) + z * Math.cos(ry)];
          [x, y] = [x * Math.cos(rz) - y * Math.sin(rz), x * Math.sin(rz) + y * Math.cos(rz)];
          const v = [p.at[0] + x, p.at[1] + y, p.at[2] + z];
          for (let k = 0; k < 3; k++) {
            lo[k] = Math.min(lo[k]!, v[k]!);
            hi[k] = Math.max(hi[k]!, v[k]!);
          }
        }
  }
  return { x: [lo[0]!, hi[0]!], y: [lo[1]!, hi[1]!], z: [lo[2]!, hi[2]!] };
}
