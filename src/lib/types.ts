// Shared data contracts between the workstreams. Changes here must be
// ADDITIVE (new optional fields) so parallel work does not break.
// Owner of each interface is noted; others read it.

export type ThemeId = 'edible' | 'sanctuary' | 'nature' | 'event';
export type SizeId = 'A' | 'B' | 'C' | 'D' | 'E';
/** The three printed piece sets per size. "corner-left" = street on the left of the park. */
export type LotKind = 'interior' | 'corner-left' | 'corner-right';
export type SunClass = 'sun' | 'part' | 'shade';

/** [lng, lat] in WGS84 */
export type LngLat = [number, number];

export interface SourceRef {
  label: string;
  url: string;
}

/**
 * Everything the site learned about one Philadelphia property.
 * Owner: philly-data workstream (src/lib/philly/). Stored on the project as `lot`
 * and on each candidate in `candidates`.
 */
export interface LotRecord {
  /** What the person typed */
  query: string;
  /** Normalised street address, e.g. "1322 N DOVER ST" */
  address: string;
  /** OPA account / parcel number (9 digits) */
  opa: string | null;
  pwdParcelId?: number | null;
  dorParcelId?: string | null;
  lat: number;
  lng: number;
  owners: string[];
  ownerType: 'city' | 'landbank' | 'pha' | 'redevelopment' | 'other-public' | 'private' | 'unknown';
  /** OPA category, e.g. "VACANT LAND" */
  category?: string | null;
  buildingDescription?: string | null;
  zoning?: string | null;
  areaSqFt?: number | null;
  frontageFt?: number | null;
  depthFt?: number | null;
  marketValue?: number | null;
  lastSale?: { date: string; price: number } | null;
  /** City vacancy indicator for land */
  vacantLand?: boolean | null;
  /** Parcel outline, outer ring, [lng,lat] */
  polygon: LngLat[];
  /** Guessed from geometry; the person can override */
  lotType?: 'mid-block' | 'corner' | 'alley' | 'unknown';
  councilDistrict?: string | null;
  /** Registered Community Organizations covering the lot */
  rcos?: { name: string; contact?: string; email?: string; phone?: string; website?: string }[];
  floodZone?: string | null;
  fetchedAt: string;
  sources: SourceRef[];
  /** Free-form extras the data layer wants to keep (trees nearby, permits…) */
  extra?: Record<string, unknown>;
}

/** A 3D/plan placed object in park-local feet (x along length, y along width). */
export interface PlacedItem {
  id: string;
  /** key into src/data/elements.ts */
  element: string;
  x: number;
  y: number;
  rotationDeg: number;
  /** theme the item came from (for colour), if any */
  theme?: ThemeId;
  /** footprint in feet, when it differs from elements.ts (e.g. a copy of a printed piece's bench) */
  w?: number;
  h?: number;
  /** shape variant carried over from the printed pieces (e.g. 'round' raised bed) */
  variant?: string;
}

/**
 * Planner state. Owner: planner workstream (src/lib/planner/, src/components/planner/).
 * Kept minimal here; the planner may add optional fields.
 */
export interface DesignState {
  v: 1;
  size: SizeId;
  lotKind: LotKind;
  frame: ThemeId;
  front: ThemeId;
  back: ThemeId;
  /** Final park dimensions after seams, feet */
  lengthFt: number;
  widthFt: number;
  /** Placement of the park rectangle on the parcel */
  placement?: { originLngLat: LngLat; bearingDeg: number; flip?: boolean };
  /** Items added, moved or removed relative to the template */
  added: PlacedItem[];
  removed: string[];
  moved: Record<string, { x: number; y: number; rotationDeg: number }>;
  /** Existing conditions marked on the lot (trees, downspouts, wet areas…) */
  existing?: ExistingItem[];
  updatedAt: string;
  // ---- planner additions (all optional) ----
  /** Which lot this design was made for (OPA or PWD parcel id, else address) */
  lotRef?: string;
  /** Size was picked automatically from the lot (true) or chosen by hand (false) */
  sizeAuto?: boolean;
  /** Lot kind was picked automatically from the lot's streets */
  lotKindAuto?: boolean;
  /** Stretch the pieces to fill the lot (default true) or keep the printed size */
  fitToLot?: boolean;
  /** Quarter turns of the park on the lot (0 = entrance on the lot's entrance edge) */
  turn?: 0 | 1 | 2 | 3;
  /** Park mirrored left-right on the lot */
  flipped?: boolean;
  /** Small nudge of the park on the lot, feet, along the lot's length and width */
  shiftFt?: [number, number];
}

/**
 * Something already on the lot (Assess: "existing conditions"). Owner: planner.
 * `lngLat` is authoritative; x/y are park-local feet at the time of saving.
 */
export interface ExistingItem extends PlacedItem {
  /** existing-tree | downspout | wet-area | hydrant | utility-pole | utility-line | old-pavement */
  element: string;
  lngLat?: LngLat;
  /** tree canopy or wet-area radius, feet */
  radiusFt?: number;
  /** overhead line length or pavement length, feet */
  lengthFt?: number;
  /** pavement width, feet */
  widthFt?: number;
  /** false = will be removed when the park is built */
  keep?: boolean;
  /** 'city' = from the City's tree inventory; 'person' = added by hand */
  origin?: 'city' | 'person';
  /** City tree key (rounded "lng,lat") for trees from the inventory */
  cityKey?: string;
  species?: string | null;
  dbhIn?: number | null;
  note?: string;
  /**
   * Trees only: loses its leaves in winter or keeps them (shadows workstream, 2026-10-04).
   * Absent = decided from the City's species name, else deciduous (older saved trees).
   */
  leafHabit?: 'deciduous' | 'evergreen';
}

/**
 * What the design contains, counted the way the Dream workbook's
 * "Count your pieces / Count your plants" pages do.
 * Produced by the planner, consumed by the cost estimator and plant picker.
 */
export interface DesignTally {
  lengthFt: number;
  widthFt: number;
  /** 4ft x 4ft planting squares ("green squares") */
  plantingSquares: { sun: number; shade: number };
  naturePlaySquares: number;
  shrubs: { sun: number; shade: number };
  smallTrees: number;
  largeTrees: number;
  /** Feet of edging around gravel, split by what it sits on */
  gravelEdgeFt?: { hardscape: number; softscape: number };
  /** Feet of park outer edge (no building or gabion) */
  outerEdgeFt?: { hardscape: number; softscape: number };
  /** element id -> count, for furnishings and built elements */
  items: Record<string, number>;
  themes: ThemeId[];
  /** Feet of gabion wall (1-ft baskets, 4 ft long) along the park edge */
  gabionWallFt?: number;
  /** Feet of wood edging around raised beds ("How many feet are your wood edges?") */
  raisedBedEdgeFt?: number;
  /**
   * Footprints [w, h] in feet, one per item, for the elements whose size changes how
   * the cost estimator counts them: keyhole gardens (by diameter), shade canopies
   * (by area), sheds, stages and cold frames (by 4x4 squares). Optional — added by
   * the cost workstream; without it the estimator falls back to elements.ts
   * footprints (and asks for keyhole-garden sizes).
   */
  itemSizes?: Record<string, [number, number][]>;
}

export type FieldValue =
  | string
  | number
  | boolean
  | null
  | string[]
  | Record<string, string>[];

/** One park project saved in the browser. Owner: foundation (src/lib/project.ts). */
export interface Project {
  v: 1;
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  /** Workbook answers, keyed "<step>.<field>" e.g. "acquire.owner-contacted" */
  fields: Record<string, FieldValue>;
  /** Sub-steps marked done: "<step>/<substep-id>" -> ISO date */
  done: Record<string, string>;
  /** The chosen lot (after lookup) */
  lot: LotRecord | null;
  /** Other lots being considered (Acquire: "list the addresses of potential park properties") */
  candidates: LotRecord[];
  design: DesignState | null;
  /** Free-form per-widget state other workstreams need to persist */
  extra: Record<string, unknown>;
}

// ---- assembled park layout ------------------------------------------------
//
// Park-local coordinates, in FEET: x runs along the park's LENGTH (long edge),
// y along its WIDTH (short edge), origin at one corner. The FRONT piece sits at
// low x (nearest the entrance), the BACK at high x. `streetEdges` says which
// edges face a street: 'x0' is the short edge at x=0, 'y0' the long edge at y=0.
// Owner: pieces workstream (src/lib/pieces/). Consumers: planner, cost, plants.

export type Material =
  | 'planting'
  | 'gravel'
  | 'wood-deck'
  | 'paver'
  | 'mulch'
  | 'nature-play'
  | 'lawn'
  | 'gabion'
  | 'edge'
  | 'existing-pavement'
  | 'other';

export interface LayoutSurface {
  id: string;
  material: Material;
  theme?: ThemeId;
  /** closed ring in park-local feet */
  polygon: [number, number][];
}

export interface LayoutItem extends PlacedItem {
  /** footprint in feet along x and y before rotation */
  w: number;
  h: number;
  heightFt?: number;
  /** which piece it came from: frame | front | back | seam | added */
  source?: string;
  /** drawing variant, e.g. 'round' for a round raised bed */
  variant?: string;
}

export interface ParkLayout {
  lengthFt: number;
  widthFt: number;
  streetEdges: ('x0' | 'x1' | 'y0' | 'y1')[];
  surfaces: LayoutSurface[];
  items: LayoutItem[];
  // ---- optional extras filled in by assemble() (src/lib/pieces/assemble.ts)
  /** piece set the layout was built from, e.g. "D-corner-right" */
  setId?: string;
  /** the set's printed size before seams */
  nominal?: { lengthFt: number; widthFt: number };
  /** where the seams went in (at = position in the final layout, deltaFt < 0 = trimmed) */
  seams?: { length: { at: number; deltaFt: number }; width: { at: number; deltaFt: number } };
  /** lines of the pieces' printed 4-ft grid after seams (x and y positions, feet) — the
   *  squares counted in "Count your pieces" */
  countGrid?: { xs: number[]; ys: number[] };
  /** each piece's footprint and theme, for drawing piece outlines */
  pieces?: { kind: 'frame' | 'front' | 'back'; theme: ThemeId; rects: [number, number, number, number][] }[];
  /** template item ids that no longer fit after trimming to a smaller lot */
  clipped?: string[];
}

// ---- project.extra keys shared between workstreams --------------------------
// Each key has ONE writer; everyone else only reads.

/** project.extra.site — facts about the chosen lot for the planner and the Assess summary. */
export interface SiteFacts {
  // written by philly-data when a lot is chosen
  sizeId?: SizeId;
  sizeExact?: boolean;
  tooSmall?: boolean;
  tooBig?: boolean;
  /** Long and short edges of the parcel's oriented rectangle, feet */
  lengthFt?: number;
  widthFt?: number;
  /**
   * Oriented rectangle: centre, and bearing of the park's +x axis (along the long edge),
   * degrees clockwise from north. x0 = the short edge on the street the lot is addressed to
   * (the entrance); 'y1' is on your LEFT when you stand at x0 looking toward +x.
   */
  rect?: { center: LngLat; bearingDeg: number };
  streetEdges?: ('x0' | 'x1' | 'y0' | 'y1')[];
  /** interior | corner-left (street along y1) | corner-right (street along y0) */
  lotKind?: LotKind;
  // written by planner (sun study / existing conditions)
  sunClass?: 'full-sun' | 'mostly-sun' | 'mostly-shade' | 'deep-shade';
  treesKept?: number;
}
// project.extra.tally      : DesignTally          (planner)
// project.extra.sunGrid    : planner-defined       (planner)
// project.extra.costInputs : cost-defined          (cost)
// project.extra.plants     : resources-defined     (resources)
// project.extra.buildSchedule, project.extra.stewardship : content-b
