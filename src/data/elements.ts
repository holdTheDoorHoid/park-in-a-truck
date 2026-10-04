// Vocabulary of park elements shared by the planner, the cost estimator, the
// plant picker and the build guides. Ids are permanent once used in saved
// projects — add new ones, never rename.
//
// Owner: pieces workstream (it discovers the real vocabulary from the park-piece
// keys). Others: propose additions in your report rather than editing.
//
// Seeded from the Dream workbook "Assemble" page and the theme element lists.

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
}

export const ELEMENTS: Record<string, ElementMeta> = {
  // built from PiaT assembly guides
  'gabion-wall': { id: 'gabion-wall', name: 'Gabion wall', kind: 'structure', guide: 'gabion-wall' },
  'gabion-bench': { id: 'gabion-bench', name: 'Wood-topped gabion bench', kind: 'furnishing', guide: 'gabion-bench' },
  'gabion-bench-8': { id: 'gabion-bench-8', name: "8' wood-topped gabion bench", kind: 'furnishing', guide: 'gabion-bench-8' },
  'bench-back': { id: 'bench-back', name: 'Bench with back', kind: 'furnishing', guide: 'bench-back' },
  'bench-4': { id: 'bench-4', name: "4' bench (no back)", kind: 'furnishing', guide: 'bench-4' },
  stool: { id: 'stool', name: 'Stool', kind: 'furnishing', guide: 'stool' },
  'table-2': { id: 'table-2', name: "2' table", kind: 'furnishing', guide: 'table-2' },
  'table-4': { id: 'table-4', name: "4' table", kind: 'furnishing', guide: 'table-4' },
  'table-6': { id: 'table-6', name: "6' table", kind: 'furnishing', guide: 'table-6' },
  'planter-18': { id: 'planter-18', name: '18" planter box (small)', kind: 'furnishing', guide: 'planter-18' },
  'planter-24': { id: 'planter-24', name: '24" planter box (large)', kind: 'furnishing', guide: 'planter-24' },
  'shade-canopy': { id: 'shade-canopy', name: 'Shade canopy', kind: 'structure', guide: 'shade' },
  stage: { id: 'stage', name: 'Stage', kind: 'structure', guide: 'stage' },
  workbench: { id: 'workbench', name: 'Workbench / standing table', kind: 'furnishing', guide: 'workbench' },

  // off-the-shelf or described in the workbooks
  'rain-barrel': { id: 'rain-barrel', name: 'Rain barrel', kind: 'water', link: 'https://phsonline.org/programs/stormwater-solutions/participate' },
  'compost-bin': { id: 'compost-bin', name: 'Compost bin', kind: 'habitat' },
  'raised-bed': { id: 'raised-bed', name: 'Raised bed', kind: 'structure' },
  'cold-frame': { id: 'cold-frame', name: 'Cold frame', kind: 'structure' },
  'communal-table': { id: 'communal-table', name: 'Communal table', kind: 'furnishing' },
  'event-tent': { id: 'event-tent', name: 'Event tent', kind: 'structure' },
  'flexible-seating': { id: 'flexible-seating', name: 'Flexible seating', kind: 'furnishing' },
  'outdoor-classroom': { id: 'outdoor-classroom', name: 'Outdoor classroom', kind: 'structure' },
  'nature-play': { id: 'nature-play', name: 'Nature play', kind: 'surface' },
  birdbath: { id: 'birdbath', name: 'Birdbath', kind: 'habitat' },
  'bird-accessories': { id: 'bird-accessories', name: 'Bird houses & feeders', kind: 'habitat' },
  shed: { id: 'shed', name: 'Shed', kind: 'structure' },

  // planting & surfaces (counted, not built)
  'planting-square': { id: 'planting-square', name: 'Planting square (4×4 ft)', kind: 'surface', footprintFt: [4, 4] },
  perennial: { id: 'perennial', name: 'Perennial', kind: 'plant' },
  shrub: { id: 'shrub', name: 'Shrub', kind: 'plant' },
  'small-tree': { id: 'small-tree', name: 'Small tree', kind: 'plant' },
  'large-tree': { id: 'large-tree', name: 'Large tree', kind: 'plant' },
  gravel: { id: 'gravel', name: 'Gravel surface', kind: 'surface' },

  // existing conditions (Assess workbook)
  'existing-tree': { id: 'existing-tree', name: 'Existing tree', kind: 'existing' },
  downspout: { id: 'downspout', name: "Neighbor's downspout", kind: 'existing' },
  'wet-area': { id: 'wet-area', name: 'Periodically wet area', kind: 'existing' },
  hydrant: { id: 'hydrant', name: 'Fire hydrant', kind: 'existing' },
  'utility-line': { id: 'utility-line', name: 'Overhead utility line', kind: 'existing' },
};
