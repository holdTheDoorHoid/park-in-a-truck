// Generates src/data/guides/models/gabion-bench.json — the 4' wood-topped gabion
// bench from public/downloads/guides/gabion-bench.pdf (steps 2-10, pp. 6-14).
// Run: node scripts/guide-models/gabion-bench.mjs   (geometry: _gabion-bench.mjs)
//
// Cut list: GB-1 (3) 15", GB-2 (7) 48"; mesh 18-4a 48x18 bottom, 18-4b (2) 48x18
// long sides, 18-4c (2) 18x18 short sides.
//   GB-2  2 frame rails + 5 top boards = 7      GB-1  2 frame ends + 1 middle = 3
//
// Steps (guide numbering = PDF numbering):
//   2  mesh sides stapled to the frame boards   3  frame screwed together
//   4  middle GB-1                              5  corners hog-ringed (no new parts)
//   6  centre brace of spare mesh               7  18-4a closes the basket ("top" while upside down)
//   8  flip + set on gravel (no new parts)      9  stone fill
//   10 the five GB-2 top boards (ends first, then three equally spaced)

import { gabionBench } from './_gabion-bench.mjs';

gabionBench({
  slug: 'gabion-bench',
  length: 48,
  railLabel: 'GB-2',
  endLabel: 'GB-1',
  braceX: [0],
  mesh: { bottom: '18-4a', long: '18-4b', short: '18-4c' },
  steps: { sideMesh: 2, rails: 3, ends: 3, braces: 4, brace: 6, bottomMesh: 7, fill: 9, topEnds: 10, topMiddle: 10 },
  notes: [
    'Step 2 staples each mesh panel to its frame board and step 3 screws the boards into a frame; the model adds the mesh panels in step 2 and the frame boards in step 3 so each step shows its new work.',
    'PDF step 4 and step 6 call the middle board GB-1 (cut list: 3 GB-1 = 2 ends + the middle); its step 10 says the top boards sit "on top of the frame created in step six" (meaning the frame of steps 3-4).',
  ],
});
