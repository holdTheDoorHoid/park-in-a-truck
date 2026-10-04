// 4' Table (PiaT "4' Table assembly instructions") → src/data/guides/models/table-4.json
// Run: node scripts/guide-models/table-4.mjs
// Shared table design: see table-common.mjs.

import { writeModel } from './lib.mjs';
import { buildTable, COMMON_NOTES } from './table-common.mjs';

const TOP_LENGTH = 48; // T-1 top boards
const FRAME_SPAN = TOP_LENGTH; // top boards end flush with the outside of both end frames (cover drawing)
// check: stretcher T-2 = FRAME_SPAN − 2 × 1.5 = 45 ✓

const { parts } = buildTable({
  frameSpan: FRAME_SPAN,
  topLength: TOP_LENGTH,
  ref: { leg: 'T-3', rail: 'T-6', crossTop: 'T-4', upright: 'T-5', foot: 'T-7', stretcher: 'T-2', top: 'T-1' },
});

writeModel({
  slug: 'table-4',
  view: { azimuthDeg: -35, elevationDeg: 24 },
  notes: [
    ...COMMON_NOTES,
    'Frame spacing: the 48" T-1 top boards end flush with the outside of both end frames (cover drawing), so the frames stand 48" apart outside to outside; the 45" T-2 stretcher fits exactly between the outer layers.',
  ],
  parts,
});
