// 2' Table (PiaT "2' Table assembly instructions") → src/data/guides/models/table-2.json
// Run: node scripts/guide-models/table-2.mjs
// Shared table design: see table-common.mjs.

import { writeModel } from './lib.mjs';
import { buildTable, COMMON_NOTES } from './table-common.mjs';

const TOP_LENGTH = 25.5; // T-2 top boards
const FRAME_SPAN = TOP_LENGTH; // top boards sit flush with the outside of both end frames (no overhang drawn)
// check: stretcher T-3 = FRAME_SPAN − 2 × 1.5 = 22.5 ✓

const { parts } = buildTable({
  frameSpan: FRAME_SPAN,
  topLength: TOP_LENGTH,
  ref: { leg: 'T-1', rail: 'T-5', crossTop: 'T-2', upright: 'T-4', foot: 'T-6', stretcher: 'T-3', top: 'T-2' },
});

writeModel({
  slug: 'table-2',
  view: { azimuthDeg: -35, elevationDeg: 26 },
  countOverrides: {
    'T-2': {
      count: 9,
      reason:
        'The cut list says 11 T-2, but the steps use 9: one across each end frame (step 3), two edge boards (step 4) and five top boards (step 5). The cover and step-5 drawings show a 7-board top, and the 6 2x4x8\' boards on the materials list (576") cannot yield the cut list\'s 613" total; with 9 T-2 it is 562".',
    },
  },
  notes: [
    ...COMMON_NOTES,
    'Frame spacing: the 25.5" T-2 top boards end flush with the outside of both end frames (no overhang drawn), so the frames stand 25.5" apart outside to outside; the 22.5" T-3 stretcher then fits exactly between the outer layers.',
    'Cover says 26" × 25.5"; the parts build 25.5" × 25.5" (the 26" is the rounded frame depth).',
  ],
  parts,
});
