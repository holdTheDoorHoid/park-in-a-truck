// Generates src/data/guides/models/shade.json — the 8' shade structure from
// public/downloads/guides/shade.pdf (steps 2-8, drawings on pp. 5-11).
// Run: node scripts/guide-models/shade.mjs
//
// Axes (inches): x = left->right as seen from the front, y = up, z = toward the
// viewer. Origin = centre of the footprint at ground level.
//
// How the PDF builds it (all members 2x4, 1.5 x 3.5):
//   step 2  LEGS: an SS-2 (92.5") stacked face to face on an SS-1 (96"), flush at the
//           foot, leaving a 3.5" notch at the head. A leg is 3" thick (two layers) by
//           3.5" wide. Two legs + one SS-1 TOP BEAM laid in the notches = a leg pair
//           96" wide. Two leg pairs: the left and right sides (x = -48 / +48).
//   step 3  leg pairs flipped; two SS-1 BRACES on the SS-1 face of each, below the top
//           beam with even 3.5" gaps (a spare 2x4 as spacer). Stood up, the braces
//           face OUT: the step 3 drawing shows the braces on the outer face of the
//           near pair and the top beam on the inner face of the far one.
//           So each side, outside -> inside:  braces | SS-1 legs | SS-2 legs + top beam.
//   step 4  two SS-1 CROSS BEAMS at the top, front and back, on the outside faces of
//           the legs and spanning the full 96" (their ends cover the brace ends, PDF
//           step 4 detail); two SS-1 LONG BRACES under each, 3.5" gaps.
//   step 5  INTERIOR braces cut to fit "between your two posts", screwed to the brace
//           behind them. Side-to-side (front/back): SS-4 between the inner faces of
//           the two leg pairs = 96 - 2 x 4.5 = 87" (the cut list's +/-87). Front-to-back
//           (left/right): SS-3 between the two legs of a pair, in the SS-1 layer
//           against the outer brace = 96 - 2 x 3.5 = 89" (the cut list's 89").
//   step 6  one SS-1 TOP BRACE SUPPORT, on edge, midway between the leg pairs, fitted
//           between the two cross beams (whose inner faces are 96" apart) and flush
//           with the top.
//   step 7  fifteen SS-1 CANOPY boards laid flat across the top, running left-right
//           (resting on the two top beams and the support), spaced front to back.
//   step 8  an L bracket inside each post, an 18" J hook through it into the ground.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const T = 1.5; // 2x4 actual thickness
const W = 3.5; // 2x4 actual width
const SIDE = 96; // leg pair width and leg height (SS-1)
const SS2 = 92.5;
const GAP = 3.5; // spacer gap between the top member and the braces below it
const CANOPY_BOARDS = 15; // PDF step 7: "use (15) SS-1 pieces for the canopy"
const BRACKET = { leg: 3, width: 1.5, t: 0.19 }; // L bracket flanges (schematic)
const J_HOOK = { len: 18, dia: 0.375 };

const r = (n) => Math.round(n * 1000) / 1000;
const parts = [];
const counters = {};
function add(idBase, ref, kind, size, position, step, from, extra = {}) {
  counters[idBase] = (counters[idBase] ?? 0) + 1;
  const p = { id: `${idBase}#${counters[idBase]}`, ref, kind, size: size.map(r), position: position.map(r), step, ...extra };
  if (from) p.from = from.map(r);
  parts.push(p);
}
const board = (idBase, ref, size, position, step, from) => add(idBase, ref, 'lumber', size, position, step, from);

// x layers of each leg pair, measured inward from the outside face at |x| = 48
const H = SIDE / 2; // 48
const xBrace = H - T / 2; // 47.25  outside layer: the step 3 braces
const xLegSS1 = H - 1.5 * T; // 45.75 middle layer: SS-1 legs (+ SS-3 interior braces)
const xLegSS2 = H - 2.5 * T; // 44.25 inside layer: SS-2 legs + top beam
const xInnerFace = H - 3 * T; // 43.5  inside face of a leg pair
const zLeg = H - W / 2; // 46.25 legs at the front and back edges of each pair
const zCross = H + T / 2; // 48.75 cross beams and long braces, outside the legs
const zSS4 = H - T / 2; // 47.25 interior long braces, just inside the long braces
const yTop = SIDE - W / 2; // 94.25 top members, flush with the leg tops
const yBraces = [yTop - W - GAP, yTop - 2 * (W + GAP)]; // 87.25, 80.25

for (const s of [-1, 1]) {
  const side = s < 0 ? 'left' : 'right';
  // step 2 — legs and the top beam of each leg pair
  for (const zs of [-1, 1]) {
    board(`${side}-leg-SS1`, 'SS-1', [T, SIDE, W], [s * xLegSS1, SIDE / 2, zs * zLeg], 2, [0, 40, 0]);
    board(`${side}-leg-SS2`, 'SS-2', [T, SS2, W], [s * xLegSS2, SS2 / 2, zs * zLeg], 2, [0, 40, 0]);
  }
  board(`${side}-top-beam`, 'SS-1', [T, W, SIDE], [s * xLegSS2, yTop, 0], 2, [0, 30, 0]);
  // step 3 — two braces on the outside face
  for (const y of yBraces) board(`${side}-brace`, 'SS-1', [T, W, SIDE], [s * xBrace, y, 0], 3, [s * 30, 0, 0]);
  // step 5 — SS-3 interior braces between the legs, against each brace
  for (const y of yBraces) board(`${side}-interior`, 'SS-3', [T, W, SIDE - 2 * W], [s * xLegSS1, y, 0], 5, [-s * 30, 0, 0]);
}

for (const zs of [-1, 1]) {
  const face = zs > 0 ? 'front' : 'back';
  // step 4 — cross beam and long braces on the outside of the legs
  board(`${face}-cross-beam`, 'SS-1', [SIDE, W, T], [0, yTop, zs * zCross], 4, [0, 0, zs * 30]);
  for (const y of yBraces) board(`${face}-long-brace`, 'SS-1', [SIDE, W, T], [0, y, zs * zCross], 4, [0, 0, zs * 30]);
  // step 5 — SS-4 interior braces between the leg pairs' inside faces, behind each long brace
  for (const y of yBraces) board(`${face}-interior`, 'SS-4', [2 * xInnerFace, W, T], [0, y, zs * zSS4], 5, [0, 0, -zs * 24]);
}

// step 6 — top brace support, midway between the leg pairs, between the cross beams
board('top-support', 'SS-1', [T, W, SIDE], [0, yTop, 0], 6, [0, 30, 0]);

// step 7 — canopy: boards run left-right across the leg pairs; spread front to back over
// the full 99" between the cross beams' outside faces, equal gaps, flush both edges
const canopySpan = 2 * (H + T); // 99
const canopyGap = (canopySpan - CANOPY_BOARDS * W) / (CANOPY_BOARDS - 1);
const yCanopy = SIDE + T / 2;
for (let i = 0; i < CANOPY_BOARDS; i++) {
  const z = canopySpan / 2 - W / 2 - i * (W + canopyGap); // laid "from one side to the other": back to front here
  board('canopy', 'SS-1', [SIDE, T, W], [0, yCanopy, -z], 7, [0, 30, 0]);
}

// step 8 — L bracket on the inside face of each post, J hook through it into the ground
for (const s of [-1, 1])
  for (const zs of [-1, 1]) {
    const xFace = s * xInnerFace;
    add('L-bracket', 'L brackets', 'bracket', [BRACKET.t, BRACKET.leg, BRACKET.width], [xFace - s * (BRACKET.t / 2), BRACKET.leg / 2, zs * zLeg], 8, [-s * 18, 0, 0]);
    add('L-bracket-foot', 'L brackets', 'bracket', [BRACKET.leg - BRACKET.t, BRACKET.t, BRACKET.width], [xFace - s * (BRACKET.t + (BRACKET.leg - BRACKET.t) / 2), BRACKET.t / 2, zs * zLeg], 8, [-s * 18, 0, 0]);
    const xHook = xFace - s * (BRACKET.leg * 0.6);
    add('J-hook', 'J hooks', 'fastener', [J_HOOK.dia, J_HOOK.len, J_HOOK.dia], [xHook, BRACKET.t + 0.5 - J_HOOK.len / 2, zs * zLeg], 8, [0, 24, 0], { shape: 'cylinder' });
  }

const lumberCount = parts.filter((p) => p.ref === 'SS-1').length;

const model = {
  slug: 'shade',
  units: 'in',
  bounds: { length: SIDE, width: r(canopySpan), height: r(SIDE + T) },
  asBuilt: {
    length: SIDE,
    width: r(canopySpan),
    height: r(SIDE + T),
    reason:
      'The legs are 96" tall and the canopy boards (1.5") lie on top of them, so it stands 97.5". Front to back it is 99": the two top cross beams and their long braces are screwed to the outside faces of the 96"-wide leg pairs — the 96" top support fits between the cross beams (step 6), and step 7 lets the last canopy board be narrower than 3.5" because 3.5" spacing does not fit 99".',
  },
  view: { azimuthDeg: -35, elevationDeg: 22 },
  countOverrides: {
    'SS-1': {
      count: lumberCount,
      reason: `The cut list says 14, but the steps use ${lumberCount} 96" SS-1: 4 legs, 2 leg-pair top beams (step 2), 4 leg-pair braces (step 3), 2 cross beams + 4 long braces (step 4), 1 top support (step 6) and 15 canopy boards (step 7, "use (15) SS-1 pieces").`,
    },
  },
  notes: [
    'Generated by scripts/guide-models/shade.mjs — edit the script, not this file.',
    'Leg pairs are the left and right sides; the cross beams and long braces are the front and back. Each leg pair, outside to inside: the two step-3 braces, the SS-1 legs, the SS-2 legs with the top beam in their notches. The step 3 drawing shows the braces on the outer face of the near pair and the top beam on the inner face of the far one.',
    'Interior braces sit at the heights of the braces they are screwed to. SS-4 (87") spans between the two leg pairs\' inside faces just inside the front/back long braces; SS-3 (89") spans between the two legs of a pair in the SS-1 layer, against the outer brace. Both lengths fall out of this layout exactly, which is how the layout was confirmed; the cut list calls SS-4 a rough "+/- 87" to be cut to fit.',
    'The cross beams sit on the outside faces of the legs and span the full 96", so the frame is 99" front to back. The PDF step 4 detail shows the cross beam end covering the brace ends, and the 96" top support of step 6 fits between the cross beams.',
    `Canopy: 15 boards (PDF step 7) running left-right on the two top beams and the support. With the 3.5" spacer the PDF calls for, 14 boards fill 98" and the 15th would be ripped to about 1" ("the last piece may be less than 3.5"). The model shows 15 full boards spread evenly over the 99", flush with both edges: ${r(canopyGap)}" gaps.`,
    'Step 7 screw counts (75 + 70) suggest more boards than 15; the drawing shows 15 and the text says 15, so 15 are modelled.',
    'Step 8: an L bracket on the inside face of each post (drawn as two thin flanges) and an 18" J hook through it, mostly below ground (kind "fastener", excluded from the size). Concrete deck blocks for posts in planting beds, lag screws and wood screws are not modelled.',
    'The legs and leg pairs are assembled flat on the ground (steps 2-3) and stood up; the model shows every part in its final standing position.',
  ],
  parts,
};

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '../../src/data/guides/models/shade.json');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(model, null, 2) + '\n');
console.log(`wrote ${out}: ${parts.length} parts (${lumberCount} SS-1)`);
