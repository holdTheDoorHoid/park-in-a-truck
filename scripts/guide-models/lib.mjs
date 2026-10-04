// Shared helpers for the guide 3D model generators (plain Node, no deps).
// Format: src/lib/guides3d/schema.ts — inches; x = length (left→right seen
// from the front), y = up, z = toward the viewer; origin = centre of the
// footprint at ground level; Euler XYZ degrees.
//
// Most boards are axis-aligned, so they are described by the span they occupy
// on each axis: board(id, ref, [x0, x1], [y0, y1], [z0, z1]). That keeps every
// generator readable as "this board runs from here to there".

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Actual cross-sections [thickness, width] of the stock these guides use. */
export const STOCK = {
  '1x6': [0.75, 5.5],
  '2x4': [1.5, 3.5],
  '2x6': [1.5, 5.5],
  '4x4': [3.5, 3.5],
};

const r3 = (v) => Math.round(v * 1000) / 1000 + 0; // +0 turns -0 into 0

/** An axis-aligned part occupying [x0,x1] × [y0,y1] × [z0,z1]. */
export function board(id, ref, xs, ys, zs, extra = {}) {
  const span = [xs, ys, zs].map(([a, b]) => [Math.min(a, b), Math.max(a, b)]);
  return {
    id,
    ref,
    kind: 'lumber',
    size: span.map(([a, b]) => r3(b - a)),
    position: span.map(([a, b]) => r3((a + b) / 2)),
    ...extra,
  };
}

/** Numbers parts "REF#1", "REF#2", … in the order they are created. */
export function numberer() {
  const n = {};
  return (ref) => `${ref}#${(n[ref] = (n[ref] ?? 0) + 1)}`;
}

/** Mirror an x span about the centre plane (left ↔ right). */
export const mirrorX = ([a, b]) => [-b, -a];
/** Mirror a z span about the centre plane (front ↔ back). */
export const mirrorZ = ([a, b]) => [-b, -a];

// Rotation matrix for Euler XYZ (three.js): R = Rx · Ry · Rz — same as validate.ts.
function rot([ax, ay, az] = [0, 0, 0]) {
  const d = Math.PI / 180;
  const [ca, sa, cb, sb, cc, sc] = [Math.cos(ax * d), Math.sin(ax * d), Math.cos(ay * d), Math.sin(ay * d), Math.cos(az * d), Math.sin(az * d)];
  return [
    [cb * cc, -cb * sc, sb],
    [ca * sc + sa * sb * cc, ca * cc - sa * sb * sc, -sa * cb],
    [sa * sc - ca * sb * cc, sa * cc + ca * sb * sc, ca * cb],
  ];
}

/** World-space bounding box of all non-fastener parts. */
export function boundsOf(parts) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const p of parts) {
    if (p.kind === 'fastener') continue;
    const R = rot(p.rotation);
    for (let k = 0; k < 3; k++) {
      const ext = [0, 1, 2].reduce((s, i) => s + (p.size[i] / 2) * Math.abs(R[k][i]), 0);
      min[k] = Math.min(min[k], p.position[k] - ext);
      max[k] = Math.max(max[k], p.position[k] + ext);
    }
  }
  return { min, max, size: max.map((v, i) => v - min[i]) };
}

/**
 * Write src/data/guides/models/<slug>.json. Fills in `units` and `bounds`
 * (from the parts), rounds numbers, and prints a one-line summary.
 */
export function writeModel(model) {
  const b = boundsOf(model.parts);
  const out = {
    slug: model.slug,
    units: 'in',
    bounds: { length: r3(b.size[0]), width: r3(b.size[2]), height: r3(b.size[1]) },
    ...(model.view ? { view: model.view } : {}),
    ...(model.cutListScope ? { cutListScope: model.cutListScope } : {}),
    ...(model.countOverrides ? { countOverrides: model.countOverrides } : {}),
    ...(model.asBuilt ? { asBuilt: model.asBuilt } : {}),
    notes: model.notes ?? [],
    parts: model.parts.map((p) => ({
      ...p,
      size: p.size.map(r3),
      position: p.position.map(r3),
      ...(p.rotation ? { rotation: p.rotation.map(r3) } : {}),
      ...(p.from ? { from: p.from.map(r3) } : {}),
    })),
  };
  const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const file = join(root, 'src', 'data', 'guides', 'models', `${model.slug}.json`);
  // pretty at the top level, one line per part (easy to read and diff)
  const { parts: ps, ...head } = out;
  const json = JSON.stringify(head, null, 2).replace(/\n}$/, `,\n  "parts": [\n${ps.map((p) => '    ' + JSON.stringify(p)).join(',\n')}\n  ]\n}\n`);
  JSON.parse(json); // sanity
  writeFileSync(file, json);
  const steps = [...new Set(out.parts.map((p) => p.step))].sort((a, b) => a - b);
  console.log(
    `${model.slug}: ${out.parts.length} parts, steps ${steps.join(',')}, ` +
      `${out.bounds.length} L × ${out.bounds.width} W × ${out.bounds.height} H in → ${file}`,
  );
  return out;
}
