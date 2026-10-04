// Generates src/data/guides/models/stage.json — the 12' x 8' stage from
// public/downloads/guides/stage.pdf (steps 2-8, drawings on pp. 5-11).
// Run: node scripts/guide-models/stage.mjs
//
// Axes (inches): x = the stage's 144" length left->right as seen from the front,
// y = up, z = toward the viewer (96" deep). Origin = centre of the footprint at
// ground level.
//
// Cut list (77 boards): ST-1 (34) 144", ST-2 (11) 93", ST-3 (12) 86",
// ST-4 (8) 14.75", ST-5 (12) 7.75".
//
// How the PDF builds it:
//   step 2  four SMALL FRAMES, laid flat: two ST-4 (14.75") ends with two ST-3 (86")
//           between them -> 86 + 2 x 3.5 = 93" long, 14.75" tall, 86" x 7.75" opening.
//   step 3  on each, a second layer: two ST-2 (93") with two ST-5 (7.75") between
//           them at the ends -> also 93" x 14.75". Each joist frame is two layers,
//           3" thick, standing on edge front-to-back. "These frames should all face
//           towards the middle": the ST-2 layer faces the middle, the ST-4/ST-3 layer
//           faces out (the PDF cover shows the ST-4 ends as full-height posts on the
//           stage's end faces).
//   step 4  FACE boards: four ST-1 front and four back, flush with the top, 1/4" gaps
//           -> 4 x 3.5 + 3 x 0.25 = 14.75" = the frame height. The 93" frames fit
//           between them: 93 + 2 x 1.5 = 96".
//   step 5  an ST-5 block in the middle of each frame (toe-screwed at 45 degrees), in
//           the ST-2 layer between its rails.
//   step 6  the two END frames are closed with two ST-3 each, in the 86" x 7.75"
//           opening of their outer layer, 1/4" gaps -> 2 x 3.5 + 3 x 0.25 = 7.75".
//   step 7  three single ST-2 joists between the four frames, flush with the top of
//           the face boards, screwed through the face boards.
//   step 8  26 ST-1 deck boards across the joists, flush at both edges, equal gaps
//           -> (96 - 26 x 3.5) / 25 = 0.2". 14.75 + 1.5 = 16.25" tall.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const T = 1.5; // 2x4 actual thickness
const W = 3.5; // 2x4 actual width
const LENGTH = 144; // ST-1
const DEPTH = 96;
const FRAME_LEN = 93; // ST-2, and ST-3 + 2 x ST-4 width
const FRAME_H = 14.75; // ST-4
const FACE_GAP = 0.25;
const DECK_BOARDS = 26;
const LEN = { 'ST-1': 144, 'ST-2': 93, 'ST-3': 86, 'ST-4': 14.75, 'ST-5': 7.75 };

const r = (n) => Math.round(n * 1000) / 1000;
const parts = [];
const counters = {};
function board(idBase, ref, size, position, step, from) {
  counters[idBase] = (counters[idBase] ?? 0) + 1;
  parts.push({ id: `${idBase}#${counters[idBase]}`, ref, kind: 'lumber', size: size.map(r), position: position.map(r), step, from: from.map(r) });
}

// Seven joists front-to-back, equally spaced on centre: the two end frames flush with
// the ends, two inner frames, and the three single ST-2 joists (step 7) between them.
const endCentre = LENGTH / 2 - T; // 70.5 — an end frame is 3" thick
const spacing = (2 * endCentre) / 6; // 23.5
const joistX = [0, 1, 2, 3, 4, 5, 6].map((i) => -endCentre + i * spacing);
const frameX = [joistX[0], joistX[2], joistX[4], joistX[6]];
const singleX = [joistX[1], joistX[3], joistX[5]];

const zEnd = FRAME_LEN / 2 - W / 2; // 44.75: ends of a frame (ST-4 / ST-5 end blocks)
const yLow = W / 2; // bottom rail
const yHigh = FRAME_H - W / 2; // top rail, flush with the top of the face boards
const yMid = FRAME_H / 2; // 7.375: centre of the 7.75" opening

frameX.forEach((xc, i) => {
  const s = Math.sign(xc); // which half of the stage
  const isEnd = i === 0 || i === frameX.length - 1;
  const name = isEnd ? (s < 0 ? 'left-end' : 'right-end') : s < 0 ? 'left-inner' : 'right-inner';
  const xOuter = xc + s * (T / 2); // ST-4/ST-3 layer, away from the middle
  const xInner = xc - s * (T / 2); // ST-2/ST-5 layer, toward the middle
  const fromAbove = [0, 30, 0];

  // step 2 — small frame
  for (const zs of [-1, 1]) board(`${name}-ST4`, 'ST-4', [T, LEN['ST-4'], W], [xOuter, FRAME_H / 2, zs * zEnd], 2, fromAbove);
  for (const y of [yLow, yHigh]) board(`${name}-ST3-rail`, 'ST-3', [T, W, LEN['ST-3']], [xOuter, y, 0], 2, fromAbove);

  // step 3 — section frame layer
  for (const y of [yLow, yHigh]) board(`${name}-ST2-rail`, 'ST-2', [T, W, LEN['ST-2']], [xInner, y, 0], 3, fromAbove);
  for (const zs of [-1, 1]) board(`${name}-ST5-end`, 'ST-5', [T, LEN['ST-5'], W], [xInner, yMid, zs * zEnd], 3, fromAbove);

  // step 5 — centre block between the ST-2 rails
  board(`${name}-ST5-centre`, 'ST-5', [T, LEN['ST-5'], W], [xInner, yMid, 0], 5, [0, 24, 0]);

  // step 6 — end frames only: two ST-3 close the outer opening, 1/4" gaps
  if (isEnd)
    for (const k of [0, 1]) {
      const y = W + FACE_GAP + W / 2 + k * (W + FACE_GAP); // 5.5, 9.25
      board(`${name}-ST3-fill`, 'ST-3', [T, W, LEN['ST-3']], [xOuter, y, 0], 6, [s * 30, 0, 0]);
    }
});

// step 4 — face boards, four each side, flush with the top, 1/4" gaps
for (const zs of [-1, 1]) {
  const face = zs > 0 ? 'front' : 'back';
  for (let k = 0; k < 4; k++)
    board(`${face}-face`, 'ST-1', [LENGTH, W, T], [0, W / 2 + k * (W + FACE_GAP), zs * (DEPTH / 2 - T / 2)], 4, [0, 0, zs * 36]);
}

// step 7 — three single ST-2 joists, on edge, flush with the top
for (const x of singleX) board('joist', 'ST-2', [T, W, LEN['ST-2']], [x, yHigh, 0], 7, [0, 30, 0]);

// step 8 — deck
const deckGap = (DEPTH - DECK_BOARDS * W) / (DECK_BOARDS - 1);
for (let i = 0; i < DECK_BOARDS; i++)
  board('deck', 'ST-1', [LENGTH, T, W], [0, FRAME_H + T / 2, -DEPTH / 2 + W / 2 + i * (W + deckGap)], 8, [0, 30, 0]);

const model = {
  slug: 'stage',
  units: 'in',
  bounds: { length: LENGTH, width: DEPTH, height: r(FRAME_H + T) },
  view: { azimuthDeg: -35, elevationDeg: 30 },
  notes: [
    'Generated by scripts/guide-models/stage.mjs — edit the script, not this file.',
    'Each of the four joist frames is two 93" x 14.75" layers: ST-4 ends + ST-3 rails (step 2) and ST-2 rails + ST-5 end blocks (step 3). The ST-2 layer faces the middle of the stage ("all face towards the middle"), so on the two end frames the ST-4/ST-3 layer is the outside face, as on the PDF cover.',
    `Joist positions are not dimensioned in the PDF. The drawings show seven members front-to-back (four frames, three single ST-2 joists between them) about evenly spaced; modelled at equal ${r(spacing)}" centres with the end frames flush with the ends of the face boards.`,
    'Step 5 centre blocks sit in each frame\'s ST-2 layer between its rails; on the end frames the two step-6 ST-3 fill boards in the outer layer are screwed to them ("secure boards to center ST-5").',
    'Step 6 fill boards: two ST-3 in the 86" x 7.75" opening of each end frame\'s outer layer, with three equal 1/4" gaps, so the ends read as four boards like the front and back.',
    `Deck: 26 ST-1 flush with the front and back faces, equal gaps of ${r(deckGap)}" (the PDF says use a carpenter's square as the spacer and "equal spacing").`,
    'The frames are built flat (steps 2-3) and stood up in step 4; the model shows every part in its final position.',
    'Cut list vs materials: ST-2 (11) and ST-3 (12) are 93" and 86" — one per 8\' board — so the cut list needs about 23-25 2x4x8\' boards, while the materials list says 16. Not a modelling issue; noted for the guide.',
    'Screws are not modelled.',
  ],
  parts,
};

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '../../src/data/guides/models/stage.json');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(model, null, 2) + '\n');
console.log(`wrote ${out}: ${parts.length} parts`);
