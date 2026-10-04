// Fill in the cost estimator from the planner's tally of the design
// (project.extra.tally, a DesignTally). Everything the Dream workbook asks you
// to count by hand on "Count your pieces" that the design can answer is
// filled in; the rest stays manual. Items in the design that the spreadsheet
// has no line for are returned as `unmapped`, so the widget can say so.

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
  /** How a derived value was worked out, when it is not a plain count */
  notes: Partial<Record<CostInputKey, string>>;
  /** Furnishings in the design that the PiaT spreadsheet has no question for */
  unmapped: { element: string; name: string; count: number }[];
  /** Where the park size came from */
  sizeFrom?: 'design' | 'lot';
}

/** Element ids from src/data/elements.ts that feed a cost question. */
const ELEMENT_INPUTS: Partial<Record<CostInputKey, { ids: [string, number][]; note?: string; noteWhen?: string }>> = {
  gabionBaskets: { ids: [['gabion-wall', 1]], note: "Each gabion-wall piece counted as one 1'x1'x4' basket." },
  woodToppedGabions: { ids: [['gabion-bench', 1], ['gabion-bench-8', 2]], note: "8' gabion benches count as two 4' ones.", noteWhen: 'gabion-bench-8' },
  benchesWithBack: { ids: [['bench-back', 1]] },
  benchesNoBack: { ids: [['bench-4', 1]] },
  squareTables: { ids: [['table-2', 1]] },
  stools: { ids: [['stool', 1]] },
  trellises: { ids: [['shade-canopy', 1]], note: 'Shade canopies are priced as the spreadsheet’s 12x8 trellis.' },
  longTables: {
    ids: [['table-4', 1], ['table-6', 1], ['communal-table', 1]],
    note: "4' and 6' tables and communal tables are priced as the spreadsheet’s long tables.",
  },
  compostBins: { ids: [['compost-bin', 1]] },
  rainBarrels: { ids: [['rain-barrel', 1]] },
  eventTents: { ids: [['event-tent', 1]] },
  birdBaths: { ids: [['birdbath', 1]] },
  birdHouses: { ids: [['bird-accessories', 1]] },
};

/** Inputs no design can answer (keyhole gardens, cisterns, chairs, costs…). */
const ALWAYS_MANUAL: CostInputKey[] = [
  'outerEdgeGabionConnections',
  'raisedBedWoodEdgeFt',
  'raisedBedGabionConnections',
  'benchesWithBackAndArms',
  'gabionTables',
  'keyholeGardensLarge',
  'keyholeGardensMedium',
  'keyholeGardensSmall',
  'cisterns4x4',
  'cisterns4x8',
  'cafeTableSets',
  'optCafeTableSets',
  'fountains',
  'adirondackChairs',
  'hammocks',
  'porchSwings',
  'trashCans',
  'solarLights',
  'otherCosts',
];

/** Element kinds that are furniture or structures (plants, surfaces and existing conditions are counted elsewhere). */
const BUILT_KINDS = new Set(['furnishing', 'structure', 'water', 'habitat']);

const squaresOf = (id: string): number | undefined => {
  const fp = ELEMENTS[id]?.footprintFt;
  return fp ? Math.max(1, Math.round((fp[0] * fp[1]) / 16)) : undefined;
};

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

    // Stage: the sheet wants squares in a row (length / 4). Only possible when the element has a footprint.
    const stages = count('stage');
    const stageFp = ELEMENTS.stage?.footprintFt;
    if (stageFp) set('stageSquares', stages * Math.round(Math.max(...stageFp) / 4), stages ? 'Stage length ÷ 4.' : undefined);

    // Sheds: 1 square (4x4) or 2 squares (4x8), by footprint when known, else counted as 4x4.
    const sheds = count('shed');
    const shedSq = squaresOf('shed') ?? 1;
    set('sheds4x4', shedSq <= 1 ? sheds : 0);
    set('sheds4x8', shedSq > 1 ? sheds : 0);
    if (sheds && !ELEMENTS.shed?.footprintFt) notes.sheds4x4 = "Counted as 4'x4' sheds; move them to 4'x8' if yours are bigger.";

    // Cold frames: the sheet asks for squares and prices one 2x8 cold frame per 2 squares.
    const frames = count('cold-frame');
    const frameSq = squaresOf('cold-frame') ?? 2;
    set('coldFrameSquares', frames * frameSq, frames ? `${frameSq} squares per cold frame.` : undefined);
  }

  const manual = new Set<CostInputKey>(ALWAYS_MANUAL);
  const all: CostInputKey[] = [
    'longSideFt', 'shortSideFt', 'plantingSquares', 'naturePlaySquares',
    'gravelEdgeFt', 'gravelEdgeOnHardscapeFt', 'gravelEdgeOnSoftscapeFt',
    'outerEdgeFt', 'outerEdgeOnHardscapeFt', 'outerEdgeOnSoftscapeFt',
    'shrubs', 'smallTrees', 'largeTrees', 'gabionBaskets', 'woodToppedGabions',
    'benchesWithBack', 'benchesNoBack', 'squareTables', 'stools', 'stageSquares', 'trellises',
    'longTables', 'compostBins', 'sheds4x4', 'sheds4x8', 'rainBarrels', 'coldFrameSquares',
    'birdBaths', 'birdHouses', 'eventTents',
  ];
  for (const k of all) if (!derived.has(k)) manual.add(k);

  const unmapped: FromTally['unmapped'] = [];
  for (const [id, c] of Object.entries(tally?.items ?? {})) {
    if (used.has(id) || !(typeof c === 'number' && c > 0)) continue;
    const meta = ELEMENTS[id];
    if (meta && !BUILT_KINDS.has(meta.kind)) continue;
    if (id === 'stage') continue; // handled above (manual when no footprint)
    unmapped.push({ element: id, name: meta?.name ?? id, count: c });
  }
  if (count('stage') > 0 && !derived.has('stageSquares'))
    notes.stageSquares = `Your design has ${count('stage')} stage${count('stage') === 1 ? '' : 's'}: count the squares in a row.`;

  return { inputs, derived: [...derived], manual: [...manual], notes, unmapped, sizeFrom };
}

const round2 = (v: number) => Math.round(v * 100) / 100;
