// Vocabulary of park elements shared by the planner, the cost estimator, the
// plant picker and the build guides. Ids are permanent once used in saved
// projects — add new ones, never rename.
//
// Owner: pieces workstream. The vocabulary comes from the Dream workbook
// "Assemble" page, the theme element lists, and the symbols on the printed park
// pieces (matched to the KEY pages' callouts — see docs/pieces.md). Others:
// propose additions in your report rather than editing.
//
// Sizes: real dimensions from the PiaT assembly guides where one exists
// (inches in the comments); otherwise typical sizes for the off-the-shelf item.
// footprintFt is [length, width] — length runs along the item's local x axis.

export type ElementKind = 'furnishing' | 'structure' | 'plant' | 'surface' | 'water' | 'habitat' | 'existing';

export interface ElementMeta {
  id: string;
  name: string;
  kind: ElementKind;
  /** Footprint in feet (length x width) for plan view and collision */
  footprintFt?: [number, number];
  heightFt?: number;
  /** Slug of the build guide in src/data/guides/ if Park in a Truck publishes one */
  guide?: string;
  /** Off-the-shelf product/how-to link when there is no PiaT guide */
  link?: string;
  /** Drawn on the printed park pieces (the extractor emits it) */
  onPieces?: boolean;
  /** How the cost estimator counts it when that differs from "one each" */
  countAs?: string;
}

const i = (n: number) => Math.round((n / 12) * 100) / 100;

export const ELEMENTS: Record<string, ElementMeta> = {
  // ---- built from PiaT assembly guides
  // 12" x 12" x 48" gabion baskets, two high. (The workbook's GABION WALL link
  // opens the generic 12-inch basket assembly, so there is no separate guide.)
  'gabion-wall': { id: 'gabion-wall', name: 'Gabion wall', kind: 'structure', footprintFt: [4, 1], heightFt: 2, onPieces: true,
    countAs: 'feet of wall (drawn as the grey 1-ft band along the street edges)' },
  // 48" x 18" x 18"
  'gabion-bench': { id: 'gabion-bench', name: 'Wood-topped gabion bench', kind: 'furnishing', guide: 'gabion-bench',
    footprintFt: [4, i(18)], heightFt: i(18), onPieces: true, countAs: "4' modules" },
  // 96" x 18" x 18"
  'gabion-bench-8': { id: 'gabion-bench-8', name: "8' wood-topped gabion bench", kind: 'furnishing', guide: 'gabion-bench-8',
    footprintFt: [8, i(18)], heightFt: i(18) },
  // not drawn on the pieces; the cost estimator asks for it
  'gabion-table': { id: 'gabion-table', name: 'Wood-topped gabion table', kind: 'furnishing', footprintFt: [4, 2], heightFt: 2.5 },
  // 48" x 18.5", 25" tall
  'bench-back': { id: 'bench-back', name: 'Bench with back', kind: 'furnishing', guide: 'bench-back',
    footprintFt: [4, i(18.5)], heightFt: i(25), onPieces: true, countAs: "4' benches" },
  // 48" x 18.5" x 17"
  'bench-4': { id: 'bench-4', name: "4' bench (no back)", kind: 'furnishing', guide: 'bench-4', footprintFt: [4, i(18.5)], heightFt: i(17) },
  // 18.5" x 18.5" x 17"
  stool: { id: 'stool', name: 'Stool', kind: 'furnishing', guide: 'stool', footprintFt: [i(18.5), i(18.5)], heightFt: i(17), onPieces: true },
  // 26" x 25.5" x 28.5"
  'table-2': { id: 'table-2', name: "2' table", kind: 'furnishing', guide: 'table-2', footprintFt: [i(26), i(25.5)], heightFt: i(28.5), onPieces: true },
  // 48" x 26" x 28.5"
  'table-4': { id: 'table-4', name: "4' table", kind: 'furnishing', guide: 'table-4', footprintFt: [4, i(26)], heightFt: i(28.5) },
  // 72" x 26" x 28.5"
  'table-6': { id: 'table-6', name: "6' table", kind: 'furnishing', guide: 'table-6', footprintFt: [6, i(26)], heightFt: i(28.5) },
  // 18" x 18" x 18" (also 18" x 48")
  'planter-18': { id: 'planter-18', name: '18" planter box (small)', kind: 'furnishing', guide: 'planter-18', footprintFt: [1.5, 1.5], heightFt: 1.5 },
  // 24" x 24" x 24" (also 24" x 48")
  'planter-24': { id: 'planter-24', name: '24" planter box (large)', kind: 'furnishing', guide: 'planter-24', footprintFt: [2, 2], heightFt: 2 },
  // 96" x 96" x 96"
  'shade-canopy': { id: 'shade-canopy', name: 'Shade canopy', kind: 'structure', guide: 'shade', footprintFt: [8, 8], heightFt: 8,
    onPieces: true, countAs: "8' x 8' modules (area / 64); drawn canopies are 16' x 12'–24'" },
  // 144" x 96" x 16.25"
  stage: { id: 'stage', name: 'Stage', kind: 'structure', guide: 'stage', footprintFt: [12, 8], heightFt: i(16.25), onPieces: true,
    countAs: "4' x 4' squares of stage (the pieces draw it in 4' squares)" },
  // 48" x 23.5" x 35.5"
  workbench: { id: 'workbench', name: 'Workbench / standing table', kind: 'furnishing', guide: 'workbench',
    footprintFt: [4, i(23.5)], heightFt: i(35.5), onPieces: true, countAs: "4' modules" },

  // ---- off-the-shelf or described in the workbooks
  'rain-barrel': { id: 'rain-barrel', name: 'Rain barrel', kind: 'water', footprintFt: [2, 2], heightFt: 3, onPieces: true,
    link: 'https://phsonline.org/programs/stormwater-solutions/participate' },
  'compost-bin': { id: 'compost-bin', name: 'Compost bin', kind: 'habitat', footprintFt: [4, 4], heightFt: 3, onPieces: true },
  'raised-bed': { id: 'raised-bed', name: 'Raised bed', kind: 'structure', footprintFt: [8, 4], heightFt: 1.5, onPieces: true,
    countAs: 'beds; wood edging = perimeter (DesignTally.raisedBedEdgeFt)' },
  // the round "keyhole-style self-composting vegetable bed" (Edible theme)
  'keyhole-garden': { id: 'keyhole-garden', name: 'Keyhole garden (round raised bed)', kind: 'structure', footprintFt: [6, 6], heightFt: 2.5,
    onPieces: true, countAs: 'by size: small < 5 ft, medium 5–7 ft, large > 7 ft across' },
  'cold-frame': { id: 'cold-frame', name: 'Cold frame', kind: 'structure', footprintFt: [3, 3], heightFt: 1.5, onPieces: true },
  // a long table with chairs around it (drawn ~10' x 3' plus chairs)
  'communal-table': { id: 'communal-table', name: 'Communal table', kind: 'furnishing', footprintFt: [10, 3], heightFt: 2.5, onPieces: true },
  // TABLES + CHAIRS: a small table with a chair each side
  'cafe-table': { id: 'cafe-table', name: 'Café table + chairs', kind: 'furnishing', footprintFt: [3.5, 2], heightFt: 2.5, onPieces: true },
  'event-tent': { id: 'event-tent', name: 'Event tent', kind: 'structure', footprintFt: [10, 10], heightFt: 9 },
  'flexible-seating': { id: 'flexible-seating', name: 'Flexible seating', kind: 'furnishing', footprintFt: [2.5, 3], heightFt: 3 },
  'outdoor-classroom': { id: 'outdoor-classroom', name: 'Outdoor classroom', kind: 'structure', footprintFt: [12, 12], heightFt: 1.5 },
  'nature-play': { id: 'nature-play', name: 'Nature play', kind: 'surface', footprintFt: [8, 8], heightFt: 1.5,
    countAs: 'squares (DesignTally.naturePlaySquares)' },
  birdbath: { id: 'birdbath', name: 'Birdbath', kind: 'habitat', footprintFt: [2, 2], heightFt: 2.5 },
  'bird-accessories': { id: 'bird-accessories', name: 'Bird houses & feeders', kind: 'habitat', footprintFt: [1, 1], heightFt: 6 },
  // 1 square (4' x 4') or 2 squares (4' x 8')
  shed: { id: 'shed', name: 'Shed', kind: 'structure', footprintFt: [8, 4], heightFt: 7, onPieces: true, countAs: "4' x 4' squares" },
  // Sanctuary optional elements
  hammock: { id: 'hammock', name: 'Free-standing hammock', kind: 'furnishing', footprintFt: [10, 4], heightFt: 4 },
  'porch-swing': { id: 'porch-swing', name: 'Free-standing porch swing', kind: 'furnishing', footprintFt: [7, 5], heightFt: 7 },
  'solar-fountain': { id: 'solar-fountain', name: 'Solar fountain', kind: 'water', footprintFt: [3, 3], heightFt: 2.5 },

  // ---- planting & surfaces (counted, not built)
  'planting-square': { id: 'planting-square', name: 'Planting square (4×4 ft)', kind: 'surface', footprintFt: [4, 4], heightFt: 0 },
  perennial: { id: 'perennial', name: 'Perennial', kind: 'plant', footprintFt: [1, 1], heightFt: 2 },
  // pieces draw shrubs as ~0.8-ft yellow dots; the footprint here is the plant
  shrub: { id: 'shrub', name: 'Shrub', kind: 'plant', footprintFt: [3, 3], heightFt: 4, onPieces: true },
  // canopy under 6 ft across on the pieces = small tree
  'small-tree': { id: 'small-tree', name: 'Small tree', kind: 'plant', footprintFt: [4, 4], heightFt: 15, onPieces: true },
  'large-tree': { id: 'large-tree', name: 'Large tree', kind: 'plant', footprintFt: [9, 9], heightFt: 35, onPieces: true },
  gravel: { id: 'gravel', name: 'Gravel surface', kind: 'surface' },

  // ---- existing conditions (Assess workbook)
  'existing-tree': { id: 'existing-tree', name: 'Existing tree', kind: 'existing', footprintFt: [10, 10], heightFt: 30 },
  downspout: { id: 'downspout', name: "Neighbor's downspout", kind: 'existing', footprintFt: [0.5, 0.5], heightFt: 20 },
  'wet-area': { id: 'wet-area', name: 'Periodically wet area', kind: 'existing', footprintFt: [8, 6], heightFt: 0 },
  hydrant: { id: 'hydrant', name: 'Fire hydrant', kind: 'existing', footprintFt: [1, 1], heightFt: 2.5 },
  'utility-line': { id: 'utility-line', name: 'Overhead utility line', kind: 'existing' },
};

/** Elements that are plants (counted on "Count your plants", not as furnishings). */
export const PLANT_ELEMENTS = new Set(['perennial', 'shrub', 'small-tree', 'large-tree']);
