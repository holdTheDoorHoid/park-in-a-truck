// The three PiaT 2x4 tables (2', 4', 6') share one design and differ only in
// how far apart the end frames stand and how long the top boards are:
//
//   end frame, outer layer (step 2)  two 27" legs + two 18.5" rails between them
//   end frame, inner layer (step 3)  one 25.5" board across the top, two 20"
//                                    uprights, two 12" feet with a 1.5" slot
//   step 4                           stretcher on edge through the foot slots,
//                                    two top boards on the front and back edges
//   step 5                           five more top boards, equal gaps
//
// x runs between the end frames (the top boards' direction), z is front/back.
// Each table's script passes its own cut-list labels and lengths.

import { board, numberer, STOCK } from './lib.mjs';

const [T, W] = STOCK['2x4']; // 1.5 × 3.5

export const FRAME = {
  HEIGHT: 27, // leg length = height of an end frame (top boards sit on it)
  DEPTH: 25.5, // 18.5 rail + 2 × 3.5 legs = 25.5 front to back
  SLOT: 1.5, // gap between the two inner-layer feet (a 2x4 on end as spacer)
  TOP_BOARDS: 7, // 2 edge boards (step 4) + 5 (step 5)
};

/**
 * @param {object} o
 * @param {number} o.frameSpan  outside face to outside face of the two end frames (x)
 * @param {number} o.topLength  top board length (centred; overhangs if longer than frameSpan)
 * @param {object} o.ref        cut-list labels: leg, rail, crossTop, upright, foot, stretcher, top
 */
export function buildTable({ frameSpan, topLength, ref }) {
  const { HEIGHT, DEPTH, SLOT, TOP_BOARDS } = FRAME;
  const X_OUT = frameSpan / 2; // outer face of an end frame
  const X_MID = X_OUT - T; // outer layer | inner layer
  const X_IN = X_MID - T; // inner face of an end frame
  const Z = DEPTH / 2;
  const TOP_GAP = (DEPTH - TOP_BOARDS * W) / (TOP_BOARDS - 1); // equal gaps, edge boards flush with the legs

  const id = numberer();
  const parts = [];

  for (const side of [-1, 1]) {
    const outer = side < 0 ? [-X_OUT, -X_MID] : [X_MID, X_OUT];
    const inner = side < 0 ? [-X_MID, -X_IN] : [X_IN, X_MID];
    const out = { from: [side * 24, 0, 0] }; // outer frame flies in from outside
    const inw = { from: [-side * 16, 0, 0] }; // inner layer is laid onto its inside face

    // step 2 — outer frame: legs full height, rails between them at top and foot
    for (const s of [-1, 1]) parts.push(board(id(ref.leg), ref.leg, outer, [0, HEIGHT], s < 0 ? [-Z, -Z + W] : [Z - W, Z], { step: 2, ...out }));
    for (const ys of [[HEIGHT - W, HEIGHT], [0, W]]) parts.push(board(id(ref.rail), ref.rail, outer, ys, [-Z + W, Z - W], { step: 2, ...out }));

    // step 3 — inner layer: full-depth board across the top, uprights, two feet with the slot
    parts.push(board(id(ref.crossTop), ref.crossTop, inner, [HEIGHT - W, HEIGHT], [-Z, Z], { step: 3, ...inw }));
    for (const s of [-1, 1]) parts.push(board(id(ref.upright), ref.upright, inner, [W, HEIGHT - W], s < 0 ? [-Z, -Z + W] : [Z - W, Z], { step: 3, ...inw }));
    parts.push(board(id(ref.foot), ref.foot, inner, [0, W], [-Z, -SLOT / 2], { step: 3, ...inw }));
    parts.push(board(id(ref.foot), ref.foot, inner, [0, W], [SLOT / 2, Z], { step: 3, ...inw }));
  }

  // step 4 — stretcher on edge in the foot slots, butting the outer frames' foot rails
  parts.push(board(id(ref.stretcher), ref.stretcher, [-X_MID, X_MID], [0, W], [-T / 2, T / 2], { step: 4, from: [0, 24, 0] }));

  // top boards, flush with the legs front and back
  const topZ = (i) => -Z + i * (W + TOP_GAP);
  const top = (i, step) =>
    board(id(ref.top), ref.top, [-topLength / 2, topLength / 2], [HEIGHT, HEIGHT + T], [topZ(i), topZ(i) + W], { step, from: [0, 22, 0] });
  parts.push(top(0, 4), top(TOP_BOARDS - 1, 4)); // step 4 — the two edge boards
  for (let i = 1; i < TOP_BOARDS - 1; i++) parts.push(top(i, 5)); // step 5 — five between, equal gaps

  return { parts, TOP_GAP };
}

export const COMMON_NOTES = [
  'End frames: two 27" legs with 18.5" rails between them (outer layer, step 2); the inner layer (step 3) is a 25.5" board across the top, two 20" uprights and two 12" feet with a 1.5" slot, as drawn standing in step 3. 3.5 + 20 + 3.5 = 27 and 12 + 1.5 + 12 = 25.5 check out.',
  'The inner layer faces inward: the stretcher is exactly the frame spacing minus the two 1.5" outer layers, so it passes through the inner layers\' foot slots and butts the outer foot rails.',
  'Stretcher stands on edge (3.5" tall) in the 1.5" slot, on the ground, centred front to back.',
  'Top: 7 boards running between the frames (2 edge boards in step 4, flush with the outside of the legs, + 5 in step 5), as the cover and step-5 drawings show. Equal gaps = (25.5 − 7 × 3.5) / 6 ≈ 0.17".',
  'Front-to-back depth is 25.5" (18.5 + 2 × 3.5, legs flush with the edge boards); the cover drawing rounds it to 26".',
];
