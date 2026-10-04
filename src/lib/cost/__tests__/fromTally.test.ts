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

  it('counts furnishings by element id', () => {
    expect(r.inputs).toMatchObject({
      gabionBaskets: 6,
      woodToppedGabions: 3, // one 4' + one 8' (= two 4')
      benchesWithBack: 2,
      benchesNoBack: 1,
      squareTables: 1,
      longTables: 3, // 4' + two 6'
      stools: 4,
      trellises: 1,
      compostBins: 1,
      rainBarrels: 2,
      sheds4x4: 1,
      sheds4x8: 0,
      coldFrameSquares: 2,
      birdBaths: 1,
      birdHouses: 3,
      eventTents: 1,
    });
    expect(r.notes.longTables).toMatch(/long tables/);
    expect(r.notes.sheds4x4).toMatch(/4'x8'/);
  });

  it('splits every question into derived or manual, never both', () => {
    const d = new Set(r.derived);
    const m = new Set(r.manual);
    for (const k of INPUT_KEYS) expect(d.has(k) !== m.has(k), k).toBe(true);
    for (const k of ['keyholeGardensLarge', 'cisterns4x4', 'otherCosts', 'benchesWithBackAndArms', 'gabionTables', 'solarLights'] as const)
      expect(m.has(k), k).toBe(true);
    // No footprint for the stage in elements.ts yet, so its squares stay manual.
    expect(m.has('stageSquares')).toBe(true);
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
});
