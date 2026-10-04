import { describe, expect, it } from 'vitest';
import type { DesignTally } from '../../types';
import { INPUT_KEYS, estimate } from '../model';
import { inputsFromTally } from '../fromTally';

const tally: DesignTally = {
  lengthFt: 90,
  widthFt: 35,
  plantingSquares: { sun: 14, shade: 6 },
  naturePlaySquares: 4,
  shrubs: { sun: 5, shade: 3 },
  smallTrees: 2,
  largeTrees: 1,
  gravelEdgeFt: { hardscape: 16, softscape: 48 },
  outerEdgeFt: { hardscape: 0, softscape: 70 },
  items: {
    'gabion-wall': 6,
    'gabion-bench': 1,
    'gabion-bench-8': 1,
    'bench-back': 2,
    'bench-4': 1,
    'table-2': 1,
    'table-4': 1,
    'table-6': 2,
    stool: 4,
    'shade-canopy': 1,
    'compost-bin': 1,
    'rain-barrel': 2,
    shed: 1,
    'cold-frame': 1,
    birdbath: 1,
    'bird-accessories': 3,
    'event-tent': 1,
    'planter-18': 2,
    'existing-tree': 3,
    'planting-square': 20,
    'mystery-thing': 1,
  },
  themes: ['edible', 'nature'],
};

describe('inputsFromTally', () => {
  const r = inputsFromTally(tally);

  it('reads the park size and the counts from "Count your pieces"', () => {
    expect(r.sizeFrom).toBe('design');
    expect(r.inputs).toMatchObject({
      longSideFt: 90,
      shortSideFt: 35,
      plantingSquares: 20,
      naturePlaySquares: 4,
      shrubs: 8,
      smallTrees: 2,
      largeTrees: 1,
      gravelEdgeFt: 64,
      gravelEdgeOnHardscapeFt: 16,
      gravelEdgeOnSoftscapeFt: 48,
      outerEdgeFt: 70,
      outerEdgeOnHardscapeFt: 0,
      outerEdgeOnSoftscapeFt: 70,
    });
  });

  it('counts furnishings by element id, sizing them from elements.ts when the tally has no sizes', () => {
    expect(r.inputs).toMatchObject({
      // 6 added 4-ft gabion-wall pieces = 24 ft -> 6 baskets a course x 2 courses (elements.ts: 2 ft high)
      gabionBaskets: 12,
      woodToppedGabions: 3, // one 4' + one 8' (= two 4')
      benchesWithBack: 2,
      benchesNoBack: 1,
      squareTables: 1,
      longTables: 3, // 4' + two 6'
      stools: 4,
      trellises: 1, // one 8'x8' canopy = 64 sq ft -> 1 trellis of 12'x8'
      compostBins: 1,
      rainBarrels: 2,
      sheds4x4: 0, // the shed's footprint is 8'x4' = 2 squares
      sheds4x8: 1,
      coldFrameSquares: 1, // a 3'x3' cold frame fills one 4'x4' square
      stageSquares: 0,
      keyholeGardensSmall: 0,
      keyholeGardensMedium: 0,
      keyholeGardensLarge: 0,
      birdBaths: 1,
      birdHouses: 3,
      eventTents: 1,
    });
    expect(r.notes.longTables).toMatch(/long tables/);
    expect(r.notes.sheds4x8).toMatch(/4'x4'/);
    expect(r.notes.gabionBaskets).toMatch(/2 baskets high/);
  });

  it('splits every question into derived or manual, never both', () => {
    const d = new Set(r.derived);
    const m = new Set(r.manual);
    for (const k of INPUT_KEYS) expect(d.has(k) !== m.has(k), k).toBe(true);
    for (const k of ['cisterns4x4', 'otherCosts', 'benchesWithBackAndArms', 'solarLights', 'trashCans', 'adirondackChairs', 'cafeTableSets', 'outerEdgeGabionConnections', 'raisedBedGabionConnections'] as const)
      expect(m.has(k), k).toBe(true);
    // derivable now that the pieces have ids and footprints for them
    for (const k of ['stageSquares', 'gabionTables', 'optCafeTableSets', 'hammocks', 'porchSwings', 'fountains', 'keyholeGardensMedium'] as const) expect(d.has(k), k).toBe(true);
    // this older tally has no raised-bed feet, so that question stays manual
    expect(m.has('raisedBedWoodEdgeFt')).toBe(true);
  });

  it('reports furnishings the spreadsheet has no question for, ignoring plants and existing conditions', () => {
    expect(r.unmapped).toEqual([
      { element: 'planter-18', name: '18" planter box (small)', count: 2 },
      { element: 'mystery-thing', name: 'mystery-thing', count: 1 },
    ]);
  });

  it('orders long and short sides whichever way the design is turned', () => {
    const t = inputsFromTally({ ...tally, lengthFt: 30, widthFt: 80 });
    expect(t.inputs.longSideFt).toBe(80);
    expect(t.inputs.shortSideFt).toBe(30);
  });

  it('falls back to the lot when there is no design yet', () => {
    const t = inputsFromTally(null, { lengthFt: 16.4, widthFt: 50.25 });
    expect(t.sizeFrom).toBe('lot');
    expect(t.inputs).toEqual({ longSideFt: 50.25, shortSideFt: 16.4 });
    expect(t.derived.sort()).toEqual(['longSideFt', 'shortSideFt']);
    expect(t.manual).toContain('plantingSquares');
    expect(inputsFromTally(undefined).derived).toEqual([]);
  });

  it('leaves edges manual when the planner did not measure them', () => {
    const t = inputsFromTally({ ...tally, gravelEdgeFt: undefined, outerEdgeFt: undefined });
    expect(t.manual).toEqual(expect.arrayContaining(['gravelEdgeFt', 'gravelEdgeOnHardscapeFt', 'outerEdgeFt', 'outerEdgeOnSoftscapeFt']));
    expect(t.inputs.gravelEdgeFt).toBeUndefined();
  });

  it('feeds straight into estimate()', () => {
    const e = estimate(r.inputs);
    expect(e.total).toBeGreaterThan(0);
    expect(e.lines.some((l) => l.item === 'Perennials' && l.qty === 80)).toBe(true);
  });

  // A tally as the pieces' tally() writes it now: gabion wall and raised-bed feet,
  // the new element ids, and (when it carries them) each sized item's footprint.
  const pieces: DesignTally = {
    lengthFt: 88,
    widthFt: 32,
    plantingSquares: { sun: 30, shade: 12 },
    naturePlaySquares: 0,
    shrubs: { sun: 10, shade: 4 },
    smallTrees: 3,
    largeTrees: 2,
    gravelEdgeFt: { hardscape: 0, softscape: 210 },
    outerEdgeFt: { hardscape: 0, softscape: 60 },
    gabionWallFt: 80,
    raisedBedEdgeFt: 45.13,
    items: {
      'keyhole-garden': 3,
      'shade-canopy': 2,
      shed: 2,
      stage: 4,
      'cold-frame': 4,
      'cafe-table': 6,
      'communal-table': 1,
      hammock: 1,
      'porch-swing': 2,
      'solar-fountain': 1,
      'gabion-table': 2,
      'raised-bed': 2,
      workbench: 3,
    },
    itemSizes: {
      'keyhole-garden': [[5.75, 5.75], [7.75, 7.75], [4.5, 4.5]],
      'shade-canopy': [[16, 16], [6, 5.5]],
      shed: [[4, 4], [8, 4]],
      stage: [[4, 4], [4, 4], [4, 4], [12, 8]], // three drawn squares + one 12'x8' stage added in the planner
      'cold-frame': [[3, 3], [3, 3], [3, 3], [3, 3]],
    },
    themes: ['edible', 'event'],
  };

  it('uses the pieces’ tally: wall and bed feet, new ids, sizes', () => {
    const t = inputsFromTally(pieces);
    expect(t.inputs).toMatchObject({
      gabionBaskets: 40, // 80 ft / 4 = 20 baskets a course x 2 courses
      raisedBedWoodEdgeFt: 45.13,
      keyholeGardensSmall: 1, // 4.5 ft across
      keyholeGardensMedium: 1, // 5.75 ft
      keyholeGardensLarge: 1, // 7.75 ft
      trellises: 4, // 16x16 = 256 / 96 = 2.67 -> 3; 6x5.5 = 33 / 96 -> 1
      sheds4x4: 1,
      sheds4x8: 1,
      stageSquares: 9, // 3 squares + 12x8 = 6 squares
      coldFrameSquares: 4,
      optCafeTableSets: 6,
      longTables: 1,
      hammocks: 1,
      porchSwings: 2,
      fountains: 1,
      gabionTables: 2,
    });
    expect(t.unmapped).toEqual([{ element: 'workbench', name: 'Workbench / standing table', count: 3 }]);
    expect(t.notes.trellises).toMatch(/2 shade canopies in 12'x8' trellises/);
    expect(t.notes.raisedBedWoodEdgeFt).toMatch(/perimeter/);
  });

  it('asks for keyhole-garden sizes when the tally has none, and counts stage items as 4-ft squares', () => {
    const t = inputsFromTally({ ...pieces, itemSizes: undefined });
    expect(t.manual).toEqual(expect.arrayContaining(['keyholeGardensSmall', 'keyholeGardensMedium', 'keyholeGardensLarge']));
    expect(t.notes.keyholeGardensMedium).toMatch(/3 keyhole gardens: enter them by size/);
    expect(t.inputs.stageSquares).toBe(4); // one 4'x4' square per drawn stage item (elements.ts countAs)
    expect(t.inputs.trellises).toBe(2); // 8'x8' each -> one trellis each
    expect(t.inputs).toMatchObject({ sheds4x4: 0, sheds4x8: 2, coldFrameSquares: 4 });
  });

  it('prices the pieces’ tally in the estimate', () => {
    const e = estimate(inputsFromTally(pieces).inputs);
    const total = (item: string) => e.lines.filter((l) => l.item === item).reduce((a, l) => a + l.total, 0);
    expect(total("1'x1'x4' 5 gauge baskets")).toBe(40 * 70);
    expect(total('Cafe tables + chairs')).toBe(6 * 160);
    expect(total('Porch swing')).toBe(2 * 300);
    expect(total('Keyhole gardens, large')).toBe(120);
    // 9 squares of stage: no cut list in the spreadsheet, so it needs a price
    expect(e.priceNeeded.map((p) => p.id)).toContain('stage-other');
  });
});
