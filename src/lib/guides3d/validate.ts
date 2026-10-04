// Checks a 3D assembly model against its build guide, so modelling mistakes
// fail a test instead of reaching people:
//   - every cut-list part in scope appears exactly `qty` times (ref = part label)
//   - lumber parts have the real cross-section of their stock and their cut length
//   - the model's overall size matches the guide's dimensions (±1 in)
//   - every part's step exists in the guide
//   - no two solid parts pass through each other (touching is fine)
//
// A model may limit which cut-list parts it covers (e.g. a planter guide with two
// box sizes models one) and may override a count when the guide's own cut list
// is known to be wrong — always with a reason.

import { STOCK, stockKey, type GuideModel, type ModelPart } from './schema';

export interface GuideLike {
  slug: string;
  dimensionsIn: { length: number; width: number; height: number };
  cutList: { part: string; qty: number; stock: string; lengthIn: number }[];
  steps: { n: number }[];
}

export interface ModelScope {
  /** cut-list part labels this model covers (default: all) */
  cutListScope?: string[];
  /** part label -> the count the model uses instead, with the reason */
  countOverrides?: Record<string, { count: number; reason: string }>;
}

type V3 = [number, number, number];

const deg = Math.PI / 180;

/** Rotation matrix for Euler XYZ (three.js order): R = Rx · Ry · Rz. Rows. */
export function rotationMatrix(r: V3 = [0, 0, 0]): number[][] {
  const [a, b, c] = [r[0] * deg, r[1] * deg, r[2] * deg];
  const [ca, sa, cb, sb, cc, sc] = [Math.cos(a), Math.sin(a), Math.cos(b), Math.sin(b), Math.cos(c), Math.sin(c)];
  return [
    [cb * cc, -cb * sc, sb],
    [ca * sc + sa * sb * cc, ca * cc - sa * sb * sc, -sa * cb],
    [sa * sc - ca * sb * cc, sa * cc + ca * sb * sc, ca * cb],
  ];
}

/** Box half-extents and world axes (columns of R). Cylinders are treated as their bounding box. */
function obb(p: ModelPart) {
  const R = rotationMatrix(p.rotation);
  const axes: V3[] = [0, 1, 2].map((j) => [R[0]![j]!, R[1]![j]!, R[2]![j]!] as V3);
  const half: V3 = [p.size[0] / 2, p.size[1] / 2, p.size[2] / 2];
  return { c: p.position, axes, half };
}

const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/** Penetration depth of two oriented boxes along the separating-axis test (0 = apart or touching). */
export function overlapDepth(p: ModelPart, q: ModelPart): number {
  const A = obb(p);
  const B = obb(q);
  const d: V3 = [B.c[0] - A.c[0], B.c[1] - A.c[1], B.c[2] - A.c[2]];
  const candidates: V3[] = [...A.axes, ...B.axes];
  for (const a of A.axes) for (const b of B.axes) {
    const x = cross(a, b);
    const len = Math.hypot(...x);
    if (len > 1e-6) candidates.push([x[0] / len, x[1] / len, x[2] / len]);
  }
  let min = Infinity;
  for (const ax of candidates) {
    const ra = A.half.reduce((s, h, i) => s + h * Math.abs(dot(A.axes[i]!, ax)), 0);
    const rb = B.half.reduce((s, h, i) => s + h * Math.abs(dot(B.axes[i]!, ax)), 0);
    const pen = ra + rb - Math.abs(dot(d, ax));
    if (pen <= 0) return 0;
    min = Math.min(min, pen);
  }
  return min;
}

/** World-space bounding box of a part. */
export function partBounds(p: ModelPart): { min: V3; max: V3 } {
  const { c, axes, half } = obb(p);
  const ext: V3 = [0, 1, 2].map((k) => half.reduce((s, h, i) => s + h * Math.abs(axes[i]![k]!), 0)) as V3;
  return { min: [c[0] - ext[0], c[1] - ext[1], c[2] - ext[2]], max: [c[0] + ext[0], c[1] + ext[1], c[2] + ext[2]] };
}

export function modelBounds(m: GuideModel): { size: V3; min: V3; max: V3 } {
  const min: V3 = [Infinity, Infinity, Infinity];
  const max: V3 = [-Infinity, -Infinity, -Infinity];
  for (const p of m.parts) {
    if (p.kind === 'fastener') continue;
    const b = partBounds(p);
    for (let i = 0; i < 3; i++) {
      min[i] = Math.min(min[i]!, b.min[i]!);
      max[i] = Math.max(max[i]!, b.max[i]!);
    }
  }
  return { size: [max[0] - min[0], max[1] - min[1], max[2] - min[2]], min, max };
}

const SOLID = new Set(['lumber', 'sheet', 'bracket', 'other']);

export function validateModel(model: GuideModel & ModelScope, guide: GuideLike, opts: { overlapTolIn?: number } = {}): string[] {
  const problems: string[] = [];
  const tol = opts.overlapTolIn ?? 0.06;
  if (model.slug !== guide.slug) problems.push(`slug ${model.slug} ≠ guide ${guide.slug}`);

  const ids = new Set<string>();
  for (const p of model.parts) {
    if (ids.has(p.id)) problems.push(`duplicate part id ${p.id}`);
    ids.add(p.id);
    if (p.size.some((s) => !(s > 0))) problems.push(`${p.id}: size must be positive`);
  }

  // counts per cut-list part
  const scope = new Set(model.cutListScope ?? guide.cutList.map((c) => c.part));
  for (const c of guide.cutList) {
    if (!scope.has(c.part)) continue;
    const parts = model.parts.filter((p) => p.ref === c.part);
    const want = model.countOverrides?.[c.part]?.count ?? c.qty;
    if (model.countOverrides?.[c.part] && !model.countOverrides[c.part]!.reason.trim()) problems.push(`${c.part}: count override needs a reason`);
    if (parts.length !== want) problems.push(`${c.part}: ${parts.length} parts in the model, cut list says ${want}`);
    // lumber dimensions
    const k = stockKey(c.stock);
    for (const p of parts) {
      if (p.kind !== 'lumber' || !k) continue;
      const [t, w] = STOCK[k]!;
      const dims = [...p.size].sort((a, b) => a - b);
      const want3 = [t, w, c.lengthIn].sort((a, b) => a - b);
      if (dims.some((v, i) => Math.abs(v - want3[i]!) > 0.13))
        problems.push(`${p.id}: size ${p.size.join('×')} but ${c.part} is ${k} (${t}×${w}) cut to ${c.lengthIn}"`);
    }
  }
  for (const p of model.parts) {
    if (p.ref && !guide.cutList.some((c) => c.part === p.ref) && p.kind === 'lumber')
      problems.push(`${p.id}: ref ${p.ref} is not in the cut list`);
  }

  // steps
  const steps = new Set(guide.steps.map((s) => s.n));
  for (const p of model.parts) if (!steps.has(p.step)) problems.push(`${p.id}: step ${p.step} is not a step in the guide`);

  // overall size
  const b = modelBounds(model);
  const want = [guide.dimensionsIn.length, guide.dimensionsIn.height, guide.dimensionsIn.width];
  const names = ['length (x)', 'height (y)', 'width (z)'];
  for (let i = 0; i < 3; i++)
    if (Math.abs(b.size[i]! - want[i]!) > 1) problems.push(`overall ${names[i]} is ${b.size[i]!.toFixed(2)}" but the guide says ${want[i]}"`);
  if (Math.abs(b.min[1]) > 0.05) problems.push(`model should stand on the ground (lowest point y=${b.min[1].toFixed(2)})`);
  const mbs = model.bounds;
  if (Math.abs(mbs.length - b.size[0]) > 0.5 || Math.abs(mbs.height - b.size[1]) > 0.5 || Math.abs(mbs.width - b.size[2]) > 0.5)
    problems.push(`declared bounds ${mbs.length}×${mbs.width}×${mbs.height} don't match the parts (${b.size[0].toFixed(1)}×${b.size[2].toFixed(1)}×${b.size[1].toFixed(1)})`);

  // interpenetration of solid parts
  const solid = model.parts.filter((p) => SOLID.has(p.kind));
  for (let i = 0; i < solid.length; i++)
    for (let j = i + 1; j < solid.length; j++) {
      const depth = overlapDepth(solid[i]!, solid[j]!);
      if (depth > tol) problems.push(`${solid[i]!.id} and ${solid[j]!.id} pass through each other by ${depth.toFixed(2)}"`);
    }
  return problems;
}
