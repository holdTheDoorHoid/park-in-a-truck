// Fill in the cost estimator from the planner's tally of the design
// (project.extra.tally, a DesignTally). Everything the Dream workbook asks you
// to count by hand on "Count your pieces" that the design can answer is
// filled in; the rest stays manual. Items in the design that the spreadsheet
// has no line for are returned as `unmapped`, so the widget can say so.
//
// Sizes: the tally counts items by element id. Where the spreadsheet asks by
// size (keyhole gardens) or by 4x4 squares (sheds, stages, cold frames) or the
// unit differs (shade canopies -> 12'x8' trellises), the item sizes come from
// DesignTally.itemSizes when the tally carries them, else from the footprints
// in src/data/elements.ts (and its countAs notes). Keyhole-garden sizes have
// no safe default, so without itemSizes they stay manual.

import { ELEMENTS } from '../../data/elements';
import type { DesignTally } from '../types';
import type { CostInputKey, CostInputs } from './model';

export interface FromTally {
  /** Values the design answers */
  inputs: Partial<CostInputs>;
  /** Keys filled in from the design (or the lot, for the park size) */
  derived: CostInputKey[];
  /** Keys the design cannot answer; the person types them */
  manual: CostInputKey[];
  /** How a value was worked out, or what the design has for a question it cannot answer */
  notes: Partial<Record<CostInputKey, string>>;
  /** Furnishings in the design that the PiaT spreadsheet has no question for */
  unmapped: { element: string; name: string; count: number }[];
  /** Where the park size came from */
  sizeFrom?: 'design' | 'lot';
}

/** Element ids from src/data/elements.ts that feed a cost question one for one (or n for one). */
const ELEMENT_INPUTS: Partial<Record<CostInputKey, { ids: [string, number][]; note?: string; noteWhen?: string }>> = {
  woodToppedGabions: { ids: [['gabion-bench', 1], ['gabion-bench-8', 2]], note: "Counted in 4' modules; an 8' gabion bench is two.", noteWhen: 'gabion-bench-8' },
  benchesWithBack: { ids: [['bench-back', 1]], note: "Counted in 4' benches.", noteWhen: 'bench-back' },
  benchesNoBack: { ids: [['bench-4', 1]] },
  squareTables: { ids: [['table-2', 1]] },
  stools: { ids: [['stool', 1]] },
  gabionTables: { ids: [['gabion-table', 1]] },
  longTables: {
    ids: [['table-4', 1], ['table-6', 1], ['communal-table', 1]],
    note: "4' and 6' tables and communal tables are priced as the spreadsheet’s long tables.",
  },
  compostBins: { ids: [['compost-bin', 1]] },
  rainBarrels: { ids: [['rain-barrel', 1]] },
  // the spreadsheet's optional "CAFE TABLES + CHAIRS" (priced); its other cafe-table question is a fixed $0
  optCafeTableSets: { ids: [['cafe-table', 1]] },
  fountains: { ids: [['solar-fountain', 1]] },
  birdBaths: { ids: [['birdbath', 1]] },
  birdHouses: { ids: [['bird-accessories', 1]] },
  eventTents: { ids: [['event-tent', 1]] },
  hammocks: { ids: [['hammock', 1]] },
  porchSwings: { ids: [['porch-swing', 1]] },
};

/** Inputs no design can answer. */
const ALWAYS_MANUAL: CostInputKey[] = [
  'outerEdgeGabionConnections', // where an edge meets a gabion isn't in the tally
  'raisedBedGabionConnections',
  'benchesWithBackAndArms', // the pieces don't distinguish benches with armrests
  'cisterns4x4', // no cistern element
  'cisterns4x8',
  'cafeTableSets', // the off-the-shelf duplicate; the design fills the optional one instead
  'adirondackChairs', // no element
  'trashCans',
  'solarLights',
  'otherCosts',
];

/** Element kinds that are furniture or structures (plants, surfaces and existing conditions are counted elsewhere). */
const BUILT_KINDS = new Set(['furnishing', 'structure', 'water', 'habitat']);

/** Square feet of a 12' x 8' trellis — the unit the spreadsheet prices shade structures in. */
const TRELLIS_SQFT = 12 * 8;

export function inputsFromTally(
  tally: DesignTally | null | undefined,
  lot?: { lengthFt?: number; widthFt?: number } | null,
): FromTally {
  const inputs: Partial<CostInputs> = {};
  const derived = new Set<CostInputKey>();
  const notes: Partial<Record<CostInputKey, string>> = {};
  const used = new Set<string>();
  const set = (k: CostInputKey, v: number, note?: string) => {
    inputs[k] = v;
    derived.add(k);
    if (note) notes[k] = note;
  };
  const count = (id: string) => {
    used.add(id);
    const v = tally?.items?.[id];
    return typeof v === 'number' && Number.isFinite(v) ? v : 0;
  };
  /** One [w, h] per item: from the tally when it has them, else the element's footprint. */
  const sizes = (id: string): { list: [number, number][]; measured: boolean } => {
    const n = count(id);
    const given = tally?.itemSizes?.[id];
    if (given && given.length === n) return { list: given, measured: true };
    const fp = ELEMENTS[id]?.footprintFt;
    return { list: fp ? Array.from({ length: n }, () => fp) : [], measured: false };
  };
  const squares = ([w, h]: [number, number]) => Math.max(1, Math.round((w * h) / 16));
  const plural = (n: number, word: string, words = `${word}s`) => `${n} ${n === 1 ? word : words}`;

  // Park size: the design's final dimensions, else the lot's.
  let sizeFrom: FromTally['sizeFrom'];
  if (tally && tally.lengthFt > 0 && tally.widthFt > 0) {
    set('longSideFt', round2(Math.max(tally.lengthFt, tally.widthFt)));
    set('shortSideFt', round2(Math.min(tally.lengthFt, tally.widthFt)));
    sizeFrom = 'design';
  } else if (lot?.lengthFt && lot?.widthFt) {
    set('longSideFt', round2(Math.max(lot.lengthFt, lot.widthFt)), 'From your lot’s measurements.');
    set('shortSideFt', round2(Math.min(lot.lengthFt, lot.widthFt)), 'From your lot’s measurements.');
    sizeFrom = 'lot';
  }

  if (tally) {
    set('plantingSquares', (tally.plantingSquares?.sun ?? 0) + (tally.plantingSquares?.shade ?? 0));
    set('naturePlaySquares', tally.naturePlaySquares ?? 0);
    set('shrubs', (tally.shrubs?.sun ?? 0) + (tally.shrubs?.shade ?? 0));
    set('smallTrees', tally.smallTrees ?? 0);
    set('largeTrees', tally.largeTrees ?? 0);
    used.add('planting-square').add('nature-play').add('shrub').add('small-tree').add('large-tree').add('perennial');

    if (tally.gravelEdgeFt) {
      const { hardscape, softscape } = tally.gravelEdgeFt;
      set('gravelEdgeFt', round2(hardscape + softscape));
      set('gravelEdgeOnHardscapeFt', round2(hardscape));
      set('gravelEdgeOnSoftscapeFt', round2(softscape));
    }
    if (tally.outerEdgeFt) {
      const { hardscape, softscape } = tally.outerEdgeFt;
      set('outerEdgeFt', round2(hardscape + softscape));
      set('outerEdgeOnHardscapeFt', round2(hardscape));
      set('outerEdgeOnSoftscapeFt', round2(softscape));
    }

    for (const [key, spec] of Object.entries(ELEMENT_INPUTS) as [CostInputKey, NonNullable<(typeof ELEMENT_INPUTS)[CostInputKey]>][]) {
      const total = spec.ids.reduce((a, [id, mult]) => a + count(id) * mult, 0);
      const showNote = spec.noteWhen ? count(spec.noteWhen) > 0 : total > 0;
      set(key, total, showNote ? spec.note : undefined);
    }

    // Gabion baskets ("HOW MANY 1' GABION BASKETS", 1'x1'x4' each): the wall drawn
    // along the edges (gabionWallFt) plus any 4-ft wall pieces added in the planner,
    // one basket per 4 ft per course, as many courses as the wall is high in elements.ts.
    {
      const added = count('gabion-wall') * (ELEMENTS['gabion-wall']?.footprintFt?.[0] ?? 4);
      const wallFt = (tally.gabionWallFt ?? 0) + added;
      const courses = Math.max(1, Math.round(ELEMENTS['gabion-wall']?.heightFt ?? 1));
      const baskets = Math.ceil(round2(wallFt) / 4) * courses;
      if (tally.gabionWallFt !== undefined || added > 0)
        set(
          'gabionBaskets',
          baskets,
          wallFt > 0 ? `${round2(wallFt)} ft of gabion wall: one 4-ft basket per 4 ft, ${plural(courses, 'basket')} high (as the 3D model draws it).` : undefined,
        );
    }

    // Raised beds: "How many feet are your wood edges?" = the beds' perimeters.
    if (tally.raisedBedEdgeFt !== undefined) {
      used.add('raised-bed');
      set('raisedBedWoodEdgeFt', round2(tally.raisedBedEdgeFt), tally.raisedBedEdgeFt > 0 ? 'The perimeter of your raised beds.' : undefined);
    }

    // Shade canopies -> the spreadsheet's 12'x8' trellis: each canopy's area / 96 sq ft, rounded up.
    {
      const { list, measured } = sizes('shade-canopy');
      const n = list.reduce((a, [w, h]) => a + Math.ceil(round2((w * h) / TRELLIS_SQFT)), 0);
      set(
        'trellises',
        n,
        list.length
          ? `Your ${plural(list.length, 'shade canopy', 'shade canopies')}${measured ? '' : " (8'x8' each)"} in 12'x8' trellises, the size the spreadsheet prices.`
          : undefined,
      );
    }

    // Stage: the spreadsheet asks for 4'x4' squares of stage; the pieces draw a stage as 4' squares.
    {
      const n = count('stage');
      const given = tally.itemSizes?.stage;
      const sq = given && given.length === n ? given.reduce((a, s) => a + squares(s), 0) : n;
      set('stageSquares', sq, n ? "4'x4' squares of stage." : undefined);
    }

    // Sheds: 1 square (4'x4') or 2 squares (4'x8').
    {
      const { list, measured } = sizes('shed');
      const one = list.filter((s) => squares(s) <= 1).length;
      const two = list.length - one;
      set('sheds4x4', one);
      set('sheds4x8', two);
      if (list.length && !measured) notes.sheds4x8 = "Counted as 4'x8' sheds (the planner's shed); move them to 4'x4' if yours are smaller.";
      if (list.some((s) => squares(s) > 2)) notes.sheds4x8 = 'Sheds bigger than 2 squares are counted here.';
    }

    // Cold frames: squares of cold frame (a 3'x3' frame fills one square).
    {
      const { list } = sizes('cold-frame');
      const sq = list.reduce((a, s) => a + squares(s), 0);
      set('coldFrameSquares', sq, sq ? `${plural(list.length, 'cold frame')}, one 4'x4' square each.` : undefined);
    }

    // Keyhole gardens by size across: small < 5 ft, medium 5–7 ft, large > 7 ft.
    {
      const n = count('keyhole-garden');
      const given = tally.itemSizes?.['keyhole-garden'];
      if (given && given.length === n) {
        const across = given.map(([w, h]) => Math.max(w, h));
        set('keyholeGardensSmall', across.filter((d) => d < 5).length);
        set('keyholeGardensMedium', across.filter((d) => d >= 5 && d <= 7).length);
        set('keyholeGardensLarge', across.filter((d) => d > 7).length);
      } else if (n > 0) {
        // sizes unknown: the pieces draw both 5.75-ft and 7.75-ft gardens, so no safe default
        notes.keyholeGardensMedium = `Your design has ${n} keyhole garden${n === 1 ? '' : 's'}: enter them by size (small under 5 ft, medium 5–7 ft, large over 7 ft across).`;
      } else {
        set('keyholeGardensSmall', 0);
        set('keyholeGardensMedium', 0);
        set('keyholeGardensLarge', 0);
      }
    }
  }

  const all = Object.keys(emptyKeys) as CostInputKey[];
  const manual = new Set<CostInputKey>(ALWAYS_MANUAL);
  for (const k of all) if (!derived.has(k)) manual.add(k);

  const unmapped: FromTally['unmapped'] = [];
  for (const [id, c] of Object.entries(tally?.items ?? {})) {
    if (used.has(id) || !(typeof c === 'number' && c > 0)) continue;
    const meta = ELEMENTS[id];
    if (meta && !BUILT_KINDS.has(meta.kind)) continue;
    unmapped.push({ element: id, name: meta?.name ?? id, count: c });
  }

  return { inputs, derived: [...derived], manual: [...manual], notes, unmapped, sizeFrom };
}

const round2 = (v: number) => Math.round(v * 100) / 100;

/** Every CostInputs key (kept here so this module needs no runtime import from model.ts). */
const emptyKeys: Record<CostInputKey, 0> = {
  longSideFt: 0,
  shortSideFt: 0,
  plantingSquares: 0,
  naturePlaySquares: 0,
  gravelEdgeFt: 0,
  gravelEdgeOnHardscapeFt: 0,
  gravelEdgeOnSoftscapeFt: 0,
  outerEdgeFt: 0,
  outerEdgeOnHardscapeFt: 0,
  outerEdgeOnSoftscapeFt: 0,
  outerEdgeGabionConnections: 0,
  shrubs: 0,
  smallTrees: 0,
  largeTrees: 0,
  gabionBaskets: 0,
  raisedBedWoodEdgeFt: 0,
  raisedBedGabionConnections: 0,
  woodToppedGabions: 0,
  benchesWithBackAndArms: 0,
  benchesWithBack: 0,
  benchesNoBack: 0,
  squareTables: 0,
  stools: 0,
  gabionTables: 0,
  stageSquares: 0,
  trellises: 0,
  longTables: 0,
  compostBins: 0,
  keyholeGardensLarge: 0,
  keyholeGardensMedium: 0,
  keyholeGardensSmall: 0,
  sheds4x4: 0,
  sheds4x8: 0,
  cisterns4x4: 0,
  cisterns4x8: 0,
  rainBarrels: 0,
  cafeTableSets: 0,
  coldFrameSquares: 0,
  optCafeTableSets: 0,
  fountains: 0,
  birdBaths: 0,
  birdHouses: 0,
  eventTents: 0,
  adirondackChairs: 0,
  hammocks: 0,
  porchSwings: 0,
  trashCans: 0,
  solarLights: 0,
  otherCosts: 0,
};
