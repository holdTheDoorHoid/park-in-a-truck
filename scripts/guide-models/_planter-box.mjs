// Shared geometry for the two planter-box guides (planter-18, planter-24). Both
// PDFs build the same design at two sizes; each entry script passes its numbers.
// Plain Node, no dependencies. See src/lib/guides3d/schema.ts for the format.
//
// Axes (inches): x = the box's length left->right as seen from the front, y = up,
// z = toward the viewer. Origin = centre of the footprint at ground level.
//
// How the PDFs build the square box (both sizes):
//   step 2  each end frame, laid flat: two STILES either side of two RAILS. Stood
//           up, the stiles are vertical at the front and back edges and the rails
//           run across between them, top and bottom. Frame = (rail + 2 x 3.5) wide
//           by stile tall.
//   step 3  N SLATS laid on the frame, perpendicular to the stiles, covering the
//           stile length (N x 3.5 = stile length) and centred so a 1.5" strip of
//           frame shows at each side. Stood up, the slat layer faces INTO the box
//           and the frame faces out (photos on PDF p.9 show the frame outside).
//   step 4  N FACE boards each side, horizontal, between the two end frames: they
//           butt against the frames' inner faces and sit in the 1.5" strip beside
//           the slat layer, so the box length = face board + 2 x 1.5.
//   step 5  with the box upside down, M BOTTOM boards on the slat layers' edges,
//           parallel to the face boards, equal drainage gaps, centred. They sit
//           proud of the walls (PDF step 5 drawing), so the walls stand on them.
//   step 6  two overlapping geotextile pieces stapled inside (modelled as thin
//           fabric U-shapes, folded 1" below the top edge).

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const T = 1.5; // 2x4 actual thickness
export const W = 3.5; // 2x4 actual width
const FABRIC = 0.05; // drawn thickness of the geotextile
const FOLD_BELOW_TOP = 1; // "fold fabric a minimum of 1" below the top edge"

const r = (n) => Math.round(n * 1000) / 1000;

/**
 * @param {object} c
 * @param {string} c.slug
 * @param {{label:string,len:number}} c.stile   end-frame stiles (vertical)
 * @param {{label:string,len:number}} c.rail    end-frame rails (between the stiles)
 * @param {{label:string,len:number,count:number}} c.slat    end-panel slats
 * @param {{label:string,len:number,count:number}} c.face    face boards per side
 * @param {{label:string,len:number,count:number,gap:number}} c.bottom bottom boards
 * @param {string[]} c.notes extra notes
 * @param {object} [c.countOverrides]
 * @param {string} [c.asBuiltReason] set when the built size differs from the guide's stated size
 */
export function planterBox(c) {
  const parts = [];
  const counters = {};
  const add = (ref, kind, size, position, step, from, idBase = ref) => {
    counters[idBase] = (counters[idBase] ?? 0) + 1;
    const p = { id: `${idBase}#${counters[idBase]}`, ref, kind, size: size.map(r), position: position.map(r), step };
    if (from) p.from = from.map(r);
    parts.push(p);
  };

  const frameWidth = c.rail.len + 2 * W; // across z
  const wallHeight = c.stile.len;
  const length = c.face.len + 2 * T; // along x: face boards between the two frames
  const yBase = T; // the walls stand on the proud bottom boards
  const xFrame = length / 2 - T / 2; // outer layer
  const xSlat = length / 2 - T - T / 2; // inner layer
  const zStile = frameWidth / 2 - W / 2;
  const zFace = frameWidth / 2 - T / 2;

  if (Math.abs(c.slat.count * W - wallHeight) > 1e-9) throw new Error('slats must cover the stile length');
  if (Math.abs(c.face.count * W - wallHeight) > 1e-9) throw new Error('face boards must cover the wall height');
  if (Math.abs(frameWidth - c.slat.len - 2 * T) > 1e-9) throw new Error('slats leave 1.5" each side');

  for (const side of [-1, 1]) {
    const name = side < 0 ? 'left' : 'right';
    const out = [side * 30, 0, 0];
    // step 2 — end frame (outer layer)
    for (const zs of [-1, 1])
      add(c.stile.label, 'lumber', [T, wallHeight, W], [side * xFrame, yBase + wallHeight / 2, zs * zStile], 2, out, `${name}-stile`);
    for (const y of [yBase + W / 2, yBase + wallHeight - W / 2])
      add(c.rail.label, 'lumber', [T, W, c.rail.len], [side * xFrame, y, 0], 2, out, `${name}-rail`);
    // step 3 — slats on the frame (inner layer)
    for (let i = 0; i < c.slat.count; i++)
      add(c.slat.label, 'lumber', [T, W, c.slat.len], [side * xSlat, yBase + W / 2 + i * W, 0], 3, [side * 22, 0, 0], `${name}-slat`);
  }

  // step 4 — face boards, front and back
  for (const zs of [-1, 1]) {
    const name = zs > 0 ? 'front' : 'back';
    for (let i = 0; i < c.face.count; i++)
      add(c.face.label, 'lumber', [c.face.len, W, T], [0, yBase + W / 2 + i * W, zs * zFace], 4, [0, 0, zs * 30], `${name}-face`);
  }

  // step 5 — bottom boards, proud of the walls, equal gaps, centred across the inside width
  const span = c.bottom.count * W + (c.bottom.count - 1) * c.bottom.gap;
  for (let i = 0; i < c.bottom.count; i++) {
    const z = -span / 2 + W / 2 + i * (W + c.bottom.gap);
    add(c.bottom.label, 'lumber', [c.bottom.len, T, W], [0, T / 2, z], 5, [0, -10, 0], 'bottom');
  }

  // step 6 — geotextile: two U-shaped pieces, one across the length, one across the width
  const inX = length - 4 * T; // between the two slat layers
  const inZ = frameWidth - 2 * T; // between the face boards
  const yFloor = yBase; // fabric lies on the bottom boards
  const sideH = wallHeight - FOLD_BELOW_TOP;
  const fab = (id, size, pos) => {
    parts.push({ id, ref: 'Geotextile fabric', kind: 'fabric', size: size.map(r), position: pos.map(r), step: 6, from: [0, 30, 0] });
  };
  // piece A runs down the left slats, across the floor and up the right slats
  fab('fabric-A#floor', [inX, FABRIC, inZ], [0, yFloor + FABRIC / 2, 0]);
  for (const s of [-1, 1]) fab(`fabric-A#${s < 0 ? 'left' : 'right'}`, [FABRIC, sideH, inZ], [s * (inX / 2 - FABRIC / 2), yFloor + sideH / 2, 0]);
  // piece B, laid over it the other way: down the back, across, up the front
  fab('fabric-B#floor', [inX - 2 * FABRIC, FABRIC, inZ], [0, yFloor + 1.5 * FABRIC, 0]);
  for (const s of [-1, 1]) fab(`fabric-B#${s < 0 ? 'back' : 'front'}`, [inX - 2 * FABRIC, sideH, FABRIC], [0, yFloor + sideH / 2, s * (inZ / 2 - FABRIC / 2)]);

  const height = yBase + wallHeight;
  const model = {
    slug: c.slug,
    units: 'in',
    bounds: { length: r(length), width: r(frameWidth), height: r(height) },
    view: { azimuthDeg: -35, elevationDeg: 28 },
    cutListScope: [c.stile.label, c.rail.label, c.slat.label, c.face.label, c.bottom.label].filter((v, i, a) => a.indexOf(v) === i),
    ...(c.countOverrides ? { countOverrides: c.countOverrides } : {}),
    ...(c.asBuiltReason ? { asBuilt: { length: r(length), width: r(frameWidth), height: r(height), reason: c.asBuiltReason } } : {}),
    notes: [
      `Generated by scripts/guide-models/${c.slug}.mjs (geometry in _planter-box.mjs) — edit the script, not this file.`,
      'Only the square box is modelled (cutListScope). The long box in the same PDF is built the same way with P-1A face and bottom boards and is NOT modelled.',
      `As built the box is ${r(length)}" long x ${r(frameWidth)}" deep x ${r(height)}" tall: the walls are ${c.face.count} boards (${r(wallHeight)}") standing on the ${c.bottom.count} bottom boards (+1.5"). The PDFs never state a height; the guide's dimensionsIn height is the nominal size.`,
      'End frames: the stile/rail frame faces OUT and the slat layer faces IN (PDF photos of finished boxes show the frame outside). The 1.5" strip the slats leave each side is where the face boards sit.',
      'Face boards butt against the inner face of the end frames and run past the slat layer ends (the 1.5" gap of step 3); box length = face board + 2 x 1.5".',
      `Bottom: the PDF does this step with the box upside down and lays the boards on top; here they are shown in their final place under the walls. They rest on the slat layers' edges (inset 1.5" from each end, flush with the frame's inner face) and are centred across the inside width with ${c.bottom.gap}" drainage gaps.`,
      'Geotextile: two thin U-shaped fabric pieces (kind "fabric"), folded 1" below the top edge; their exact overlap is schematic. Screws and staples are not modelled.',
      ...c.notes,
    ],
    parts,
  };

  const here = dirname(fileURLToPath(import.meta.url));
  const out = join(here, `../../src/data/guides/models/${c.slug}.json`);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(model, null, 2) + '\n');
  console.log(`wrote ${out}: ${parts.length} parts`);
  return model;
}
