// Generates src/data/guides/models/gabion-bench-8.json — the 8' wood-topped gabion
// bench from public/downloads/guides/gabion-bench-8.pdf (steps 2-10, pp. 6-14).
// Run: node scripts/guide-models/gabion-bench-8.mjs   (geometry: _gabion-bench.mjs)
//
// Cut list: GB-1 (7) 96", GB-2 (6) 15"; mesh 18-8a 96x18 bottom, 18-8b (2) 96x18
// long sides, 18-8c (2) 18x18 short sides.
//   GB-1  2 frame rails + 5 top boards = 7
//   GB-2  2 end caps + 3 cross braces = 5   (cut list says 6 — see countOverrides)
//
// Steps (guide numbering = PDF numbering):
//   2  frame: GB-1 rails + GB-2 end caps        3  three GB-2 cross braces, 4 equal bays
//   4  mesh sides stapled on, corners ringed    5  centre brace of spare mesh
//   6  18-8a closes the basket                  7  flip + set on gravel (no new parts)
//   8  stone fill                               9  the two outer GB-1 top boards
//   10 the three middle GB-1 top boards, equally spaced

import { gabionBench } from './_gabion-bench.mjs';

const LENGTH = 96;
const T = 1.5;
// Cross braces: one in the middle, one centred in each half (PDF step 3 drawing:
// four equal bays between the end caps).
const capInner = LENGTH / 2 - T; // 46.5
const quarter = (T / 2 + capInner) / 2; // 23.625: midway between the middle brace's face and the end cap's face

gabionBench({
  slug: 'gabion-bench-8',
  length: LENGTH,
  railLabel: 'GB-1',
  endLabel: 'GB-2',
  braceX: [-quarter, 0, quarter],
  mesh: { bottom: '18-8a', long: '18-8b', short: '18-8c' },
  steps: { rails: 2, ends: 2, braces: 3, sideMesh: 4, brace: 5, bottomMesh: 6, fill: 8, topEnds: 9, topMiddle: 10 },
  countOverrides: {
    'GB-2': {
      count: 5,
      reason:
        'The steps use five 15" GB-2: two frame end caps (step 2) and three cross braces (step 3). The cut list says 6, but its own step 1 drawing shows a pile of 5 and no step uses a sixth.',
    },
  },
  notes: [
    'Labels follow the cut list and drawings: the PDF text of steps 10-11 calls the top boards "GB-2", but its drawing callouts and the cut list (7 GB-1 = 2 rails + 5 top) make them GB-1; the closing mesh panel the step 6 text calls "BM-3" is 18-8a.',
    'Only one mesh centre brace (under the middle GB-2), as step 5 says; the two quarter braces are wood only.',
    'PDF step 10 detail marks 1/4" at the top boards, but five 3.5" boards with 1/4" gaps are 18.5" — wider than the 18" frame they must be flush with. Modelled with equal 1/8" gaps, flush both sides, as step 10 ("flush with wood below") and step 11 ("equally space") say.',
  ],
});
