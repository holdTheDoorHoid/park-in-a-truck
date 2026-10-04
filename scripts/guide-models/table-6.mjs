// 6' Table (PiaT "6' Table assembly instructions") → src/data/guides/models/table-6.json
// Run: node scripts/guide-models/table-6.mjs
// Shared table design: see table-common.mjs. Same base as the 4' table; the
// 72" top overhangs the frames by 12" at each end.

import { writeModel } from './lib.mjs';
import { buildTable, COMMON_NOTES } from './table-common.mjs';

const TOP_LENGTH = 72; // T-1 top boards
const OVERHANG = 12; // each end, step 5
const FRAME_SPAN = TOP_LENGTH - 2 * OVERHANG; // 48" outside to outside, as on the cover
// check: stretcher T-2 = FRAME_SPAN − 2 × 1.5 = 45 ✓

const { parts } = buildTable({
  frameSpan: FRAME_SPAN,
  topLength: TOP_LENGTH,
  ref: { leg: 'T-3', rail: 'T-6', crossTop: 'T-4', upright: 'T-5', foot: 'T-7', stretcher: 'T-2', top: 'T-1' },
});

writeModel({
  slug: 'table-6',
  view: { azimuthDeg: -35, elevationDeg: 24 },
  notes: [
    ...COMMON_NOTES,
    'Frame spacing 48" outside to outside (cover: 48" base, 72" top); every top board overhangs it by 12" at each end, including the two edge boards placed in step 4 (the step-4 drawing shows them frame-length, reused from the 4\' table).',
    'Top board count: cut list says 7 T-1 and the cover drawing shows a 7-board top, so 2 go on in step 4 and 5 in step 5. The step-5 text says "four more" (6 in all) and its drawing shows 6 boards, while its tip says 2 edge + 3 middle; modelled the 7 the cut list and cover agree on.',
  ],
  parts,
});
