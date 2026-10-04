// Pure geometry for the assembly viewer (no three.js here, so it is cheap to
// test and to import): the "cut pile" layout of step 1, exploded-view offsets,
// default fly-in directions, and part poses.
//
// Units inches, axes as in schema.ts (x length, y up, z toward the viewer).

import type { GuideModel, ModelPart } from './schema';
import { partBounds } from './validate';

export type V3 = [number, number, number];

/** Position + Euler XYZ rotation in degrees (same convention as ModelPart). */
export interface Pose {
  position: V3;
  rotation: V3;
}

export const assembledPose = (p: ModelPart): Pose => ({ position: [...p.position], rotation: [...(p.rotation ?? [0, 0, 0])] as V3 });

// ---------------------------------------------------------------------------
// Rotations

/** Euler XYZ (degrees) from a rotation matrix given as rows (three.js Euler.setFromRotationMatrix, order XYZ). */
export function eulerFromMatrix(R: number[][]): V3 {
  const m11 = R[0]![0]!, m12 = R[0]![1]!, m13 = R[0]![2]!;
  const m22 = R[1]![1]!, m23 = R[1]![2]!;
  const m32 = R[2]![1]!, m33 = R[2]![2]!;
  const y = Math.asin(Math.max(-1, Math.min(1, m13)));
  let x: number, z: number;
  if (Math.abs(m13) < 0.9999999) {
    x = Math.atan2(-m23, m33);
    z = Math.atan2(-m12, m11);
  } else {
    x = Math.atan2(m32, m22);
    z = 0;
  }
  const d = (r: number) => {
    const v = Math.round((r * 180) / Math.PI * 1e6) / 1e6;
    return Object.is(v, -0) ? 0 : v;
  };
  return [d(x), d(y), d(z)];
}

/** Local axis lengths of a part: [x, y, z] extents before rotation. */
function localDims(p: ModelPart): V3 {
  return [p.size[0], p.size[1], p.size[2]];
}

/**
 * A rotation that lays a part flat: its longest local axis along world x, its
 * shortest up (world y), the middle one along z. Returned with which local axis
 * ended up where, so callers can put labels on the up-facing side.
 */
export function layFlat(p: ModelPart): { rotation: V3; along: number; up: number; across: number; dims: V3 } {
  const s = localDims(p);
  // cylinders: [diameter, length, diameter], axis along local y
  const order = [0, 1, 2].sort((a, b) => s[b]! - s[a]! || a - b); // longest first
  const along = order[0]!;
  const across = order[1]!;
  const up = order[2]!;
  // R columns = where each local axis goes (rows = world x, y, z)
  const R = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  R[0]![along] = 1; // local `along` -> world x
  R[1]![up] = 1; // local `up` -> world y
  R[2]![across] = 1; // local `across` -> world z
  // keep it a proper rotation: an odd permutation needs one axis flipped (boxes are symmetric)
  const det =
    R[0]![0]! * (R[1]![1]! * R[2]![2]! - R[1]![2]! * R[2]![1]!) -
    R[0]![1]! * (R[1]![0]! * R[2]![2]! - R[1]![2]! * R[2]![0]!) +
    R[0]![2]! * (R[1]![0]! * R[2]![1]! - R[1]![1]! * R[2]![0]!);
  if (det < 0) R[2]![across] = -1;
  return { rotation: eulerFromMatrix(R), along, up, across, dims: [s[along]!, s[up]!, s[across]!] };
}

// ---------------------------------------------------------------------------
// Cut pile

export interface PileGroup {
  /** cut-list label, e.g. "B-1" */
  ref: string;
  count: number;
  /** board size laid flat: [length, thickness, width] */
  dims: V3;
  /** footprint on the ground, [minX, minZ, maxX, maxZ] */
  rect: [number, number, number, number];
  /** where to pin the group's label: back-centre of the group, on top */
  anchor: V3;
}

export interface PileLayout {
  /** part id -> pose in the pile */
  poses: Record<string, Pose>;
  groups: PileGroup[];
  bounds: { min: V3; max: V3 };
}

/** Parts that belong in the cut pile: lumber and sheet goods, plus cut-list mesh panels. */
export function isPileable(p: ModelPart, cutRefs: Set<string>): boolean {
  if (p.kind === 'lumber' || p.kind === 'sheet') return true;
  if (p.kind === 'mesh' && p.shape !== 'mesh-box' && !!p.ref && cutRefs.has(p.ref)) return true;
  return false;
}

const natural = (a: string, b: string) => a.localeCompare(b, 'en', { numeric: true });

interface GroupBox {
  ref: string;
  parts: ModelPart[];
  dims: V3; // length (x), thickness (y), width (z) laid flat
  stacked: boolean;
  cols: number;
  rows: number;
  w: number; // footprint x
  d: number; // footprint z
}

const BOARD_GAP = 0.5; // between boards of one group
const COL_GAP = 2; // between columns of one group
const GROUP_GAP = 5; // between groups in a row
const ROW_GAP = 9; // between rows (room for the labels)

function groupBox(ref: string, parts: ModelPart[]): GroupBox {
  const dims: V3 = [0, 0, 0];
  for (const p of parts) {
    const f = layFlat(p).dims;
    for (let i = 0; i < 3; i++) dims[i] = Math.max(dims[i]!, f[i]!);
  }
  const n = parts.length;
  // wide sheet goods and panels are stacked; boards lie side by side, wrapped
  // into a few columns when there are many short ones
  const stacked = dims[2] > 12;
  if (stacked) return { ref, parts, dims, stacked, cols: 1, rows: 1, w: dims[0], d: dims[2] };
  const cols = Math.max(1, Math.round(Math.sqrt((n * (dims[2] + BOARD_GAP)) / (dims[0] + COL_GAP))));
  const rows = Math.ceil(n / cols);
  return {
    ref,
    parts,
    dims,
    stacked,
    cols,
    rows,
    w: cols * dims[0] + (cols - 1) * COL_GAP,
    d: rows * dims[2] + (rows - 1) * BOARD_GAP,
  };
}

/** Next-fit rows in cut-list order for one row width. */
function rowsFor(groups: GroupBox[], width: number) {
  const rows: { items: GroupBox[]; w: number; d: number }[] = [];
  for (const g of groups) {
    const row = rows[rows.length - 1];
    if (row && row.w + GROUP_GAP + g.w <= width + 1e-9) {
      row.items.push(g);
      row.w += GROUP_GAP + g.w;
      row.d = Math.max(row.d, g.d);
    } else rows.push({ items: [g], w: g.w, d: g.d });
  }
  const w = Math.max(...rows.map((r) => r.w));
  const d = rows.reduce((s, r) => s + r.d, 0) + (rows.length - 1) * ROW_GAP;
  return { rows, w, d };
}

/**
 * Lay every cut board flat on the ground in tidy rows, one group per cut-list
 * label (in cut-list order), so step 1 reads like PiaT's "cut pile" drawing.
 * Rows are filled left to right, back (−z) to front; the row width is chosen so
 * the whole pile is roughly `aspect` times wider than deep.
 */
export function cutPileLayout(parts: ModelPart[], cutOrder: string[] = [], aspect = 1.5): PileLayout {
  const byRef = new Map<string, ModelPart[]>();
  for (const p of parts) {
    const ref = p.ref ?? p.id;
    if (!byRef.has(ref)) byRef.set(ref, []);
    byRef.get(ref)!.push(p);
  }
  const rank = (ref: string) => {
    const i = cutOrder.indexOf(ref);
    return i < 0 ? cutOrder.length : i;
  };
  const refs = [...byRef.keys()].sort((a, b) => rank(a) - rank(b) || natural(a, b));
  const groups = refs.map((ref) => groupBox(ref, byRef.get(ref)!.sort((a, b) => natural(a.id, b.id))));
  if (groups.length === 0) return { poses: {}, groups: [], bounds: { min: [0, 0, 0], max: [0, 0, 0] } };

  // pick the row width whose overall shape is closest to the wanted aspect
  const minW = Math.max(...groups.map((g) => g.w));
  const total = groups.reduce((s, g) => s + g.w, 0) + (groups.length - 1) * GROUP_GAP;
  let best = rowsFor(groups, minW);
  let bestScore = Infinity;
  for (let k = 0; k <= 40; k++) {
    const width = minW + ((total - minW) * k) / 40;
    const r = rowsFor(groups, width);
    const score = Math.abs(Math.log(r.w / r.d / aspect)) + (r.w * r.d) / (minW * minW * 400);
    if (score < bestScore - 1e-9) {
      best = r;
      bestScore = score;
    }
  }

  const poses: Record<string, Pose> = {};
  const out: PileGroup[] = [];
  const x0 = -best.w / 2;
  let z = -best.d / 2;
  for (const row of best.rows) {
    let x = x0 + (best.w - row.w) / 2; // centre each row
    for (const g of row.items) {
      const [L, Tk, Wd] = g.dims;
      g.parts.forEach((p, i) => {
        const flat = layFlat(p);
        const [l, t, w] = flat.dims;
        let cx: number, cy: number, cz: number;
        if (g.stacked) {
          cx = x + L / 2;
          cz = z + Wd / 2;
          cy = i * Tk + t / 2;
        } else {
          const col = Math.floor(i / g.rows);
          const rowI = i % g.rows;
          cx = x + col * (L + COL_GAP) + l / 2;
          cz = z + rowI * (Wd + BOARD_GAP) + w / 2;
          cy = t / 2;
        }
        poses[p.id] = { position: [round(cx), round(cy), round(cz)], rotation: flat.rotation };
      });
      const height = g.stacked ? g.parts.length * Tk : Tk;
      out.push({
        ref: g.ref,
        count: g.parts.length,
        dims: g.dims,
        rect: [round(x), round(z), round(x + g.w), round(z + g.d)],
        anchor: [round(x + g.w / 2), round(height), round(z)],
      });
      x += g.w + GROUP_GAP;
    }
    z += row.d + ROW_GAP;
  }
  const maxH = Math.max(...out.map((g) => g.anchor[1]));
  return {
    poses,
    groups: out,
    bounds: { min: [round(-best.w / 2), 0, round(-best.d / 2)], max: [round(best.w / 2), round(maxH), round(best.d / 2)] },
  };
}

const round = (n: number) => Math.round(n * 1e4) / 1e4;

// ---------------------------------------------------------------------------
// Exploded view, fly-in directions, bounds

/** Footprint centre (x, z) and overall extents of a set of parts, from their world bounds. */
export function partsBounds(parts: ModelPart[]): { min: V3; max: V3 } {
  const min: V3 = [Infinity, Infinity, Infinity];
  const max: V3 = [-Infinity, -Infinity, -Infinity];
  for (const p of parts) {
    const b = partBounds(p);
    for (let i = 0; i < 3; i++) {
      min[i] = Math.min(min[i]!, b.min[i]!);
      max[i] = Math.max(max[i]!, b.max[i]!);
    }
  }
  if (!parts.length) return { min: [0, 0, 0], max: [0, 0, 0] };
  return { min, max };
}

/**
 * Exploded view: every part's centre is pushed away from the footprint centre
 * (horizontally) and away from the ground (vertically), like scaling the
 * positions — not the parts — so neighbours separate and nothing sinks below
 * ground. Returns an offset per part (same order).
 */
export function explodedOffsets(parts: ModelPart[], k: { xz?: number; y?: number } = {}): V3[] {
  const kxz = k.xz ?? 0.6;
  const ky = k.y ?? 0.7;
  const b = partsBounds(parts);
  const cx = (b.min[0] + b.max[0]) / 2;
  const cz = (b.min[2] + b.max[2]) / 2;
  return parts.map((p) => {
    const [x, , z] = p.position;
    const lowest = partBounds(p).min[1];
    // lift by the part's height off the ground, so parts resting on the ground stay there
    return [round((x - cx) * kxz), round(Math.max(0, lowest) * ky), round((z - cz) * kxz)];
  });
}

/**
 * Where a part flies in from, as an offset from its place: the model's `from`
 * when given; otherwise straight down from above, or — for upright members
 * (posts, legs) — in from the side, outward from the middle of the piece.
 */
export function flyOffset(p: ModelPart, model: Pick<GuideModel, 'bounds'>, centre: V3 = [0, 0, 0]): V3 {
  if (p.from) return [...p.from] as V3;
  const maxDim = Math.max(model.bounds.length, model.bounds.width, model.bounds.height);
  const D = Math.min(72, Math.max(18, maxDim * 0.5));
  const b = partBounds(p);
  const ext = [b.max[0] - b.min[0], b.max[1] - b.min[1], b.max[2] - b.min[2]];
  const vertical = ext[1]! > ext[0]! && ext[1]! > ext[2]! && ext[1]! > 2 * Math.min(ext[0]!, ext[2]!);
  if (!vertical) return [0, D, 0];
  let dx = p.position[0] - centre[0];
  let dz = p.position[2] - centre[2];
  const len = Math.hypot(dx, dz);
  if (len < 1e-6) {
    dx = 0;
    dz = 1;
  } else {
    dx /= len;
    dz /= len;
  }
  return [round(dx * D), 0, round(dz * D)];
}
