// Workbench / standing table (PiaT "Standing Table assembly instructions")
// → src/data/guides/models/workbench.json
// Run: node scripts/guide-models/workbench.mjs
//
//   step 2  main frame: two A-1 side braces 41" apart, A-2 back brace between
//           their back ends, A-3 front brace across their front ends (44" wide)
//   step 3  four 4x4 A-5 legs in the inside corners, tops flush with the frame
//   step 4  five more frames (A-1 + A-2 + A-1, no front brace) wrap the legs;
//           the first goes 2" above the ground
//   step 5  next frame 2" higher, two 1x6 A-4 shelf boards on it
//   step 6  two more frame + shelf levels, then a last frame 2" above the top shelf
//   step 7  five-board top (2x6, 2x4, 2x6, 2x4, 2x6), 2" overhang left and right
//
// The guide has no dimension drawing; everything below follows from the cut
// list and the step text.

import { board, numberer, STOCK, writeModel } from './lib.mjs';

const [T, W] = STOCK['2x4']; // 1.5 × 3.5
const LEG = STOCK['4x4'][0]; // 3.5
const [SHELF_T, SHELF_W] = STOCK['1x6']; // 0.75 × 5.5
const WIDE = STOCK['2x6'][1]; // 5.5

const LEG_H = 34; // A-5
const SIDE = 20; // A-1, front to back
const BACK = 41; // A-2, between the side braces
const FRAME_L = BACK + 2 * T; // 44 = A-3 front brace, flush with the side braces
const FRAME_D = SIDE + T; // 21.5 main frame front to back (A-3 adds 1.5 in front)
const TOP_L = 48; // B-1, B-2
const TOP_OVERHANG = (TOP_L - FRAME_L) / 2; // 2" left and right, as step 7 says
const GAP = 2; // spacing between frame levels (step text)

// origin = centre of the main frame's footprint
const X_OUT = FRAME_L / 2; // outer face of the side braces (22)
const X_LEG_OUT = X_OUT - T; // legs sit inside the side braces (20.5)
const X_LEG_IN = X_LEG_OUT - LEG; // 17
const Z_BACK = -FRAME_D / 2; // back face of the back brace
const Z_LEG_BACK = Z_BACK + T; // back legs sit in front of the back brace
const Z_SIDE_FRONT = Z_BACK + SIDE; // front ends of the side braces
const Z_LEG_FRONT = Z_SIDE_FRONT; // front legs sit behind the front brace
const Z_FRONT = Z_BACK + FRAME_D;

// frame levels, bottom to top. Each frame goes 2" above the previous FRAME
// (step text), except the last, which goes 2" above the last SHELF.
const levels = [];
{
  const plan = [
    { step: 4, shelf: false }, // 2" above the ground
    { step: 5, shelf: true },
    { step: 6, shelf: true },
    { step: 6, shelf: true },
    { step: 6, shelf: false, aboveShelf: true },
  ];
  let y = GAP;
  for (const p of plan) {
    if (levels.length) {
      const prev = levels.at(-1);
      y = prev.y + W + (p.aboveShelf ? SHELF_T : 0) + GAP;
    }
    levels.push({ ...p, y });
  }
}
const MAIN_Y = LEG_H - W; // main frame top flush with the leg tops

const id = numberer();
const parts = [];

/** One frame piece: two side braces + the back brace (+ front brace on the main frame). */
function frame(y, step, withFront) {
  const from = withFront ? [0, 24, 0] : [0, 0, -26]; // lower frames slide on from behind (they're open at the front)
  for (const xs of [[-X_OUT, -X_LEG_OUT], [X_LEG_OUT, X_OUT]])
    parts.push(board(id('A-1'), 'A-1', xs, [y, y + W], [Z_BACK, Z_SIDE_FRONT], { step, from }));
  parts.push(board(id('A-2'), 'A-2', [-X_LEG_OUT, X_LEG_OUT], [y, y + W], [Z_BACK, Z_LEG_BACK], { step, from }));
  if (withFront) parts.push(board(id('A-3'), 'A-3', [-X_OUT, X_OUT], [y, y + W], [Z_SIDE_FRONT, Z_FRONT], { step, from }));
}

// step 2 — main frame (it ends up at the top of the legs)
frame(MAIN_Y, 2, true);

// step 3 — legs in the four inside corners
for (const xs of [[-X_LEG_OUT, -X_LEG_IN], [X_LEG_IN, X_LEG_OUT]])
  for (const zs of [[Z_LEG_BACK, Z_LEG_BACK + LEG], [Z_LEG_FRONT - LEG, Z_LEG_FRONT]])
    parts.push(board(id('A-5'), 'A-5', xs, [0, LEG_H], zs, { step: 3, from: [0, 40, 0] }));

// steps 4–6 — the five lower frames, three of them carrying two shelf boards
// between the front and back legs (11.5" clear; two 1x6 = 11")
const SHELF_Z0 = -SHELF_W; // two boards side by side, centred front to back
for (const lv of levels) {
  frame(lv.y, lv.step, false);
  if (lv.shelf)
    for (const z0 of [SHELF_Z0, SHELF_Z0 + SHELF_W])
      parts.push(board(id('A-4'), 'A-4', [-TOP_L / 2, TOP_L / 2], [lv.y + W, lv.y + W + SHELF_T], [z0, z0 + SHELF_W], { step: lv.step, from: [0, 9, 0] }));
}

// step 7 — top: 2x6 in the middle, 2x4 either side, 2x6 on the outside edges
const order = [['B-1', WIDE], ['B-2', W], ['B-1', WIDE], ['B-2', W], ['B-1', WIDE]];
const topW = order.reduce((s, [, w]) => s + w, 0); // 23.5
let z = -topW / 2; // centred on the frame ("in the middle of the standing table")
for (const [ref, w] of order) {
  parts.push(board(id(ref), ref, [-TOP_L / 2, TOP_L / 2], [LEG_H, LEG_H + T], [z, z + w], { step: 7, from: [0, 20, 0] }));
  z += w;
}

const gapUnder = MAIN_Y - (levels.at(-1).y + W);

writeModel({
  slug: 'workbench',
  view: { azimuthDeg: -35, elevationDeg: 22 },
  notes: [
    'No dimension drawing in the guide. Built from the cut list and steps it comes to 48 × 23.5 × 35.5 in — the derived guide dimensions are right: 48" top boards (44" frame + 2" overhang each side), 3 × 5.5 + 2 × 3.5 = 23.5" top, 34" legs + 1.5" top.',
    'Main frame: A-1 side braces on edge, 41" apart; A-2 (41") between their back ends; A-3 (44") across their front ends — 41 + 2 × 1.5 = 44, so it is flush with them (the guide text\'s "overhangs slightly" does not happen with these lengths). Frame 44 × 21.5.',
    'Legs sit in the four inside corners of the main frame (step-3 drawing), leg tops flush with the frame top so the top boards bear on both.',
    'Lower frames (no front brace) wrap the legs the same way: side braces outside the legs, back brace behind the back legs; their side braces end flush with the front legs. They slide on from behind, since they are open at the front.',
    `Frame levels from the ground: 2" up, then 2" between frames (step text), with the last frame 2" above the top shelf. Bottoms at ${levels.map((l) => l.y).join(', ')}"; the main frame bottom is at ${MAIN_Y}", leaving ${gapUnder}" under it — consistent with the 2" spacing.`,
    'Shelves: two 1x6 A-4 boards side by side on top of frames 2, 3 and 4, centred front to back between the legs (11.5" clear between front and back legs, two 1x6 = 11"); their 48" length runs 2" past the side braces at each end, which is what the light patches on the ends of the cover drawing show.',
    'Top boards butt edge to edge (no gaps given), centred front to back on the frame: 1" overhang front and back.',
  ],
  parts,
});
