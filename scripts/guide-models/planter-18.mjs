// Generates src/data/guides/models/planter-18.json — the 18" x 18" planter box
// from public/downloads/guides/planter-18.pdf (steps 2-6, drawings on pp. 5-9).
// Run: node scripts/guide-models/planter-18.mjs   (geometry: _planter-box.mjs)
//
// 18x18 cut list: P-1 (4) 17.5", P-2 (24) 15", P-3 (4) 11".
//   end frames   2 x (2 P-1 stiles + 2 P-3 rails)   -> 11 + 2 x 3.5 = 18" wide, 17.5" tall
//   end slats    2 x 5 P-2                          -> 5 x 3.5 = 17.5", 15 + 2 x 1.5 = 18"
//   face boards  2 x 5 P-2                          -> box length 15 + 2 x 1.5 = 18"
//   bottom       4 P-2, 1/4" gaps                   -> 4 x 3.5 + 3 x 0.25 = 14.75" of the 15" inside
//   P-2 total    10 + 10 + 4 = 24  (matches the cut list)

import { planterBox } from './_planter-box.mjs';

const BOX = '(18"x18" box)';

planterBox({
  slug: 'planter-18',
  stile: { label: `P-1 ${BOX}`, len: 17.5 },
  rail: { label: `P-3 ${BOX}`, len: 11 },
  slat: { label: `P-2 ${BOX}`, len: 15, count: 5 },
  face: { label: `P-2 ${BOX}`, len: 15, count: 5 },
  bottom: { label: `P-2 ${BOX}`, len: 15, count: 4, gap: 0.25 },
  asBuiltReason:
    'The walls are five 3.5" boards (17.5") standing on the 1.5" bottom boards, which sit proud under the walls (PDF step 5 drawing), so the box is 19" tall. The PDF never states a height; 18" is the footprint.',
  notes: [
    'PDF step 3 says "the frame created in step three" (meaning step two); its tip says to use a spare P-3 on end as the 1.5" spacer while the photo labels the spacer "P-2" — either works, both are 1.5" thick.',
  ],
});
