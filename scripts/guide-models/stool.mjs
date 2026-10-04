// Stool (PiaT "Stool assembly instructions") → src/data/guides/models/stool.json
// Run: node scripts/guide-models/stool.mjs
//
// Two end frames, each two layers of 2x4 laid flat and stood up:
//   outer layer (step 2)  S-2 uprights + S-3 rails between them, 18.5 × 15.5
//   inner layer (step 3)  S-1 across the top, S-4 uprights, two S-4 at the foot
//                         with a 1.5" slot between them for the stretcher
// S-2 stretcher through the slots (step 4), then five S-1 top boards running
// between the frames: the two edge boards in step 4, three more in step 5.
// The stool is square; x runs between the two end frames.

import { board, numberer, STOCK, writeModel } from './lib.mjs';

const [T, W] = STOCK['2x4']; // 1.5 × 3.5
const SIZE = 18.5; // footprint, both ways (cover drawing)
const FRAME_H = 15.5; // S-2 upright = height of an end frame
const SLOT = 1.5; // gap between the two foot S-4s (a 2x4 on end as spacer)
const TOP_BOARDS = 5;
const TOP_GAP = (SIZE - TOP_BOARDS * W) / (TOP_BOARDS - 1); // equal gaps → 0.25"

const X_OUT = SIZE / 2; // outer face of an end frame
const X_MID = X_OUT - T; // outer layer | inner layer
const X_IN = X_MID - T; // inner face of an end frame
const Z = SIZE / 2;

const id = numberer();
const parts = [];

for (const side of [-1, 1]) {
  const outer = side < 0 ? [-X_OUT, -X_MID] : [X_MID, X_OUT];
  const inner = side < 0 ? [-X_MID, -X_IN] : [X_IN, X_MID];
  const out = (d) => ({ from: [side * d, 0, 0] }); // outer layer flies in from outside
  const inw = (d) => ({ from: [-side * d, 0, 0] }); // inner layer is laid on from the inside

  // step 2 — outer frame: S-2 uprights, S-3 rails at the top and foot
  for (const s of [-1, 1]) parts.push(board(id('S-2'), 'S-2', outer, [0, FRAME_H], s < 0 ? [-Z, -Z + W] : [Z - W, Z], { step: 2, ...out(20) }));
  for (const ys of [[FRAME_H - W, FRAME_H], [0, W]]) parts.push(board(id('S-3'), 'S-3', outer, ys, [-Z + W, Z - W], { step: 2, ...out(20) }));

  // step 3 — inner layer: S-1 across the top, S-4 uprights, S-4 pair at the foot
  parts.push(board(id('S-1'), 'S-1', inner, [FRAME_H - W, FRAME_H], [-Z, Z], { step: 3, ...inw(14) }));
  for (const s of [-1, 1]) parts.push(board(id('S-4'), 'S-4', inner, [W, FRAME_H - W], s < 0 ? [-Z, -Z + W] : [Z - W, Z], { step: 3, ...inw(14) }));
  parts.push(board(id('S-4'), 'S-4', inner, [0, W], [-Z, -SLOT / 2], { step: 3, ...inw(14) }));
  parts.push(board(id('S-4'), 'S-4', inner, [0, W], [SLOT / 2, Z], { step: 3, ...inw(14) }));
}

// step 4 — S-2 stretcher on edge in the foot slots, butting the outer frames' S-3
parts.push(board(id('S-2'), 'S-2', [-X_MID, X_MID], [0, W], [-T / 2, T / 2], { step: 4, from: [0, 20, 0] }));

// top boards across both frames, flush with the outside edges
const topZ = (i) => -Z + i * (W + TOP_GAP);
const top = (i, step) => board(id('S-1'), 'S-1', [-X_OUT, X_OUT], [FRAME_H, FRAME_H + T], [topZ(i), topZ(i) + W], { step, from: [0, 18, 0] });
parts.push(top(0, 4), top(TOP_BOARDS - 1, 4)); // step 4 — the two edge boards
for (let i = 1; i < TOP_BOARDS - 1; i++) parts.push(top(i, 5)); // step 5 — three between, equal gaps

writeModel({
  slug: 'stool',
  view: { azimuthDeg: -35, elevationDeg: 26 },
  notes: [
    'End frames: S-2 uprights (15.5") with S-3 rails (11.5") between them make an 18.5" × 15.5" outer frame; the inner layer (S-1 across the top, S-4 uprights, S-4 pair at the foot) sits on its inside face, as drawn standing in step 3.',
    'The inner layer is inside: the 15.5" S-2 stretcher only spans the frames if it passes through the inner layers (18.5 − 2 × 1.5 = 15.5) and butts the outer S-3 rails.',
    'Stretcher stands on edge in the 1.5" slot (a 2x4 on end as spacer), on the ground, centred front-to-back.',
    'Top: 5 S-1 boards (2 edge boards in step 4 + 3 in step 5) run between the frames, flush with the outside faces; equal gaps = (18.5 − 5 × 3.5) / 4 = 0.25".',
    'Height 15.5 + 1.5 = 17", matching the cover drawing.',
  ],
  parts,
});
