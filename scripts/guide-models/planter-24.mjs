// Generates src/data/guides/models/planter-24.json — the 24" x 24" planter box
// from public/downloads/guides/planter-24.pdf (steps 2-6, drawings on pp. 5-9).
// Run: node scripts/guide-models/planter-24.mjs   (geometry: _planter-box.mjs)
//
// 24x24 cut list: P-1 (33) 21", P-2 (4) 17".
//   end frames   2 x (2 P-1 stiles + 2 P-2 rails)   -> 17 + 2 x 3.5 = 24" wide, 21" tall
//   end slats    2 x 6 P-1                          -> 6 x 3.5 = 21", 21 + 2 x 1.5 = 24"
//   face boards  2 x 6 P-1                          -> box length 21 + 2 x 1.5 = 24"
//   bottom       5 P-1, 5/8" gaps                   -> 5 x 3.5 + 4 x 0.625 = 20" of the 21" inside
//   P-1 total    4 + 12 + 12 + 5 = 33  (matches the cut list); P-2 = the 4 rails

import { planterBox } from './_planter-box.mjs';

const BOX = '(24"x24" box)';

planterBox({
  slug: 'planter-24',
  stile: { label: `P-1 ${BOX}`, len: 21 },
  rail: { label: `P-2 ${BOX}`, len: 17 },
  slat: { label: `P-1 ${BOX}`, len: 21, count: 6 },
  face: { label: `P-1 ${BOX}`, len: 21, count: 6 },
  bottom: { label: `P-1 ${BOX}`, len: 21, count: 5, gap: 0.625 },
  asBuiltReason:
    'The walls are six 3.5" boards (21") standing on the 1.5" bottom boards, which sit proud under the walls (PDF step 5 drawing), so the box is 22.5" tall. The PDF never states a height; 24" is the footprint.',
  notes: [
    'Labels follow the cut list and the drawings, not the step text. Step 2 text says to lay two P-1 and put two P-2 "on either side" (that would make a 28" x 17" frame); the drawing labels P-1 as the outer pieces, and only P-1 stiles with P-2 rails give the 24" frame.',
    'Step 3 text and drawing call the end slats "P-2", but there are only four P-2 (the rails) and the slats must be 21" long (6 x 3.5 = 21" = the stile; 21 + 2 x 1.5 = 24") — they are P-1, as the cut list note "planter face, end & bottom" says.',
    'Step 4 text says "secure the P-2 or P-3 lumber" and step 5 text says "five P-2 pieces (or five P-3)"; this PDF has no P-3 and the step 5 drawing labels the bottom boards P-1. Modelled as P-1; the 33 P-1 = 4 stiles + 12 slats + 12 face + 5 bottom.',
  ],
});
