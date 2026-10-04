// Bench + Back (PiaT "Bench + Back assembly instructions")
// → src/data/guides/models/bench-back.json
// Run: node scripts/guide-models/bench-back.mjs
//
//   step 2  end frames, outer layer: BB-3 legs (25") + BB-5 rails between them
//   step 3  inner layer on each: the stool's lower ring (BB-6 feet with a 1.5"
//           slot, BB-6 uprights, BB-4 seat support across), then a BB-4 arm
//           flush with the top and two BB-7 under it, a 1.5" slot above the
//           seat support
//   step 4  BB-1 stretcher on edge in the foot slots; BB-1 front and back seat
//           boards in the seat slots
//   step 5  three more BB-1 seat boards between them, equal gaps
//   step 6  two backrest brackets bolted under the seat, 5" in from the board ends
//   step 7  three BB-2 back boards on the brackets: top one 1/2" above the
//           bracket tops, 1/4" gaps
//
// x runs along the bench, z is front (+) / back (−).

import { board, boundsOf, numberer, STOCK, writeModel } from './lib.mjs';

const [T, W] = STOCK['2x4']; // 1.5 × 3.5
const LENGTH = 48; // cover
const DEPTH = 18.5; // cover; = BB-5 11.5 + 2 × 3.5
const ARM_H = 25; // BB-3 leg = top of the arms (the cover's 25")
const RING_H = 15.5; // inner-layer lower ring: 3.5 foot + 8.5 BB-6 + 3.5 BB-4 (same as the stool)
const SLOT = 1.5; // both slots are set with a 2x4 on end as spacer
const SEAT_Y = RING_H; // seat boards rest on the BB-4 seat supports
const SEAT_TOP = SEAT_Y + T; // 17" seat height (= stool height)
const BB7 = 4;
const SEAT_BOARDS = 5; // 2 in the side slots (step 4) + 3 between (step 5)
const SEAT_GAP = (DEPTH - SEAT_BOARDS * W) / (SEAT_BOARDS - 1); // 0.25" equal gaps

// Backrest bracket (hairpinlegs.com "Bed Bracket / Backrest", the linked part):
// 1/4" × 1-1/2" bar, 5-1/2" base, 18" tall, 10° bend 6" up from the base.
const BAR_W = 1.5;
const BAR_T = 0.25;
const BR_FOOT = 5.5;
const BR_UPRIGHT = 6;
const BR_RECLINE_LEN = 12; // 6 + 12·cos10° ≈ 17.8" tall
const RECLINE = 10; // degrees back from vertical
const BR_INSET = 5; // "5 inches inward" from the BB-1 ends

const BACK_ABOVE = 0.5; // top back board sits 1/2" above the bracket top
const BACK_GAP = 0.25;
const BACK_L = 41; // BB-2

const X_OUT = LENGTH / 2; // outside of an end frame
const X_MID = X_OUT - T; // outer layer | inner layer (= BB-1 ends: 45" boards)
const X_IN = X_MID - T; // inside face of an end frame
const Z = DEPTH / 2;

const id = numberer();
const parts = [];

for (const side of [-1, 1]) {
  const outer = side < 0 ? [-X_OUT, -X_MID] : [X_MID, X_OUT];
  const inner = side < 0 ? [-X_MID, -X_IN] : [X_IN, X_MID];
  const out = { from: [side * 24, 0, 0] };
  const inw = { from: [-side * 16, 0, 0] };
  const edge = (s) => (s < 0 ? [-Z, -Z + W] : [Z - W, Z]); // front/back 3.5" strip

  // step 2 — outer frame: legs full height, BB-5 rails at the top and foot
  for (const s of [-1, 1]) parts.push(board(id('BB-3'), 'BB-3', outer, [0, ARM_H], edge(s), { step: 2, ...out }));
  for (const ys of [[ARM_H - W, ARM_H], [0, W]]) parts.push(board(id('BB-5'), 'BB-5', outer, ys, [-Z + W, Z - W], { step: 2, ...out }));

  // step 3, first drawing — lower ring: BB-6 feet with the stretcher slot, BB-6 uprights, BB-4 seat support
  parts.push(board(id('BB-6'), 'BB-6', inner, [0, W], [-Z, -SLOT / 2], { step: 3, ...inw }));
  parts.push(board(id('BB-6'), 'BB-6', inner, [0, W], [SLOT / 2, Z], { step: 3, ...inw }));
  for (const s of [-1, 1]) parts.push(board(id('BB-6'), 'BB-6', inner, [W, RING_H - W], edge(s), { step: 3, ...inw }));
  parts.push(board(id('BB-4'), 'BB-4', inner, [RING_H - W, RING_H], [-Z, Z], { step: 3, ...inw }));

  // step 3, second drawing — arm BB-4 flush with the top rail, BB-7s below it,
  // set off the seat support by the 1.5" spacer (this leaves 1/2" under the arm)
  parts.push(board(id('BB-4'), 'BB-4', inner, [ARM_H - W, ARM_H], [-Z, Z], { step: 3, ...inw }));
  for (const s of [-1, 1]) parts.push(board(id('BB-7'), 'BB-7', inner, [SEAT_TOP, SEAT_TOP + BB7], edge(s), { step: 3, ...inw }));
}

// step 4 — stretcher on edge in the foot slots; front and back seat boards in the seat slots
parts.push(board(id('BB-1'), 'BB-1', [-X_MID, X_MID], [0, W], [-T / 2, T / 2], { step: 4, from: [0, 24, 0] }));
const seatZ = (i) => -Z + i * (W + SEAT_GAP);
const seat = (i, step, from) => board(id('BB-1'), 'BB-1', [-X_MID, X_MID], [SEAT_Y, SEAT_TOP], [seatZ(i), seatZ(i) + W], { step, from });
parts.push(seat(0, 4, [0, 0, -20]), seat(SEAT_BOARDS - 1, 4, [0, 0, 20])); // slide in from behind / the front
// step 5 — three seat boards between them
for (let i = 1; i < SEAT_BOARDS - 1; i++) parts.push(seat(i, 5, [0, 20, 0]));

// step 6 — backrest brackets: foot bolted under the back seat boards, upright
// against the back edge of the seat, then reclined 10°
const rad = (RECLINE * Math.PI) / 180;
const up = [0, Math.cos(rad), -Math.sin(rad)]; // along the reclined bar, upward
const fwd = [0, Math.sin(rad), Math.cos(rad)]; // its front-face normal
const at = (p, s, n) => p.map((v, k) => v + s * up[k] + n * fwd[k]);
const Z_BAR = -Z; // the bar's front face lies against the back of the seat
const BEND = [0, SEAT_Y - BAR_T + BR_UPRIGHT, Z_BAR]; // front face of the bar at the bend
const steel = { kind: 'bracket', color: '#3d3d3d', step: 6, from: [0, 0, -18] };
for (const side of [-1, 1]) {
  const xs = side < 0 ? [-(X_MID - BR_INSET), -(X_MID - BR_INSET - BAR_W)] : [X_MID - BR_INSET - BAR_W, X_MID - BR_INSET];
  const name = side < 0 ? 'left' : 'right';
  const xc = (xs[0] + xs[1]) / 2;
  parts.push(board(`bracket-${name}-foot`, 'Backrest brackets', xs, [SEAT_Y - BAR_T, SEAT_Y], [Z_BAR, Z_BAR - BAR_T + BR_FOOT], steel));
  parts.push(board(`bracket-${name}-upright`, 'Backrest brackets', xs, [SEAT_Y - BAR_T, BEND[1]], [Z_BAR - BAR_T, Z_BAR], steel));
  const c = at([xc, BEND[1], BEND[2]], BR_RECLINE_LEN / 2, -BAR_T / 2);
  parts.push({ id: `bracket-${name}-recline`, ref: 'Backrest brackets', size: [BAR_W, BR_RECLINE_LEN, BAR_T], position: c, rotation: [-RECLINE, 0, 0], ...steel });
}

// step 7 — back boards on the front face of the reclined bars
for (let k = 0; k < 3; k++) {
  const sTop = BR_RECLINE_LEN + BACK_ABOVE - k * (W + BACK_GAP); // top edge, measured up the bar from the bend
  const c = at([0, BEND[1], BEND[2]], sTop - W / 2, T / 2);
  parts.push({ id: id('BB-2'), ref: 'BB-2', kind: 'lumber', size: [BACK_L, W, T], position: c, rotation: [-RECLINE, 0, 0], step: 7, from: [0, 6, -24] });
}

const model = {
  slug: 'bench-back',
  view: { azimuthDeg: -35, elevationDeg: 22 },
  notes: [
    'End frames: outer layer BB-3 legs (25") with BB-5 rails (11.5") at top and foot; inner layer on its inside face. Its lower ring is the stool\'s (BB-6 feet 8.5 + 1.5 slot + 8.5, BB-6 uprights 8.5, BB-4 seat support 18.5 → 15.5" tall). Above it the step text puts a BB-4 arm flush with the top rail, two BB-7 under it, and a 1.5" slot above the seat support. 15.5 + 1.5 + 4 + 3.5 = 24.5, half an inch short of the 25" legs: modelled the 1.5" spacer slot (it has to grip the 1.5" seat boards) and left a 1/2" gap between the BB-7s and the arm. If the BB-7s are meant to butt the arm, the seat slot is 2" instead.',
    'Seat: 5 flat BB-1 (45") at 15.5–17" — the front and back boards slide through the seat slots in step 4, three more go between them in step 5 — all ending against the outer layers (48 − 2 × 1.5 = 45). Through the outer frame\'s opening you see the three middle board ends, exactly as the cover drawing shows. Equal gaps (18.5 − 5 × 3.5) / 4 = 0.25".',
    'Step 5 text in the guide JSON says "an equal 1\\" gap"; the PDF callout reads "EQUAL" with a dimension mark, not 1", and 1" gaps do not fit (3 boards + 2 × 1" + the two side boards > 18.5"). Modelled 0.25".',
    'Stretcher: BB-1 on edge in the foot slots, on the ground, centred front to back (step-4 drawing).',
    'Backrest brackets are the linked hairpinlegs.com part: 1/4" × 1-1/2" bar, 5-1/2" base, 18" tall, 10° bend 6" up (vendor spec). Each is modelled as three steel boxes (foot, upright, reclined arm) sharing the ref "Backrest brackets" — 2 brackets, not 6. The foot is bolted under the back seat boards, the upright rises against the back edge of the seat. The PDF drawings show more recline (≈16° on the cover, ≈26° in step 6); the vendor\'s 10° was used.',
    'Brackets 5" in from the BB-1 ends (step text), i.e. their outer edges 17.5" from the centre.',
    'Back boards (41", centred, 0.5" clear of the end frames) sit on the front of the reclined bars, lag-screwed from behind (step-7 drawing): top board 1/2" above the bracket tops, 1/4" gaps.',
    'Overall size: the cover\'s 48 × 18.5 × 25 is the base — 25" is the arm height and 18.5" the frame depth. With the backrest the bench is about 33.8" tall and 20.8" deep (the reclined brackets reach 2.3" behind the frame). The guide\'s height needs to become the overall height (or the 25" be labelled arm height) for this model to pass the size check.',
  ],
  parts,
};
// asBuilt: the parts' own overall size, with the reason (see the last note)
const b = boundsOf(parts);
model.asBuilt = {
  length: Math.round(b.size[0] * 100) / 100,
  width: Math.round(b.size[2] * 100) / 100,
  height: Math.round(b.size[1] * 100) / 100,
  reason:
    "The reclined backrest brackets reach about 2.3\" behind the 18.5\"-deep end frames.",
};
writeModel(model);
