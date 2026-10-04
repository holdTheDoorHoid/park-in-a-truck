// The corrected model (the default estimate()): the spreadsheet's prices and
// assumptions with its arithmetic and reference mistakes fixed
// (src/lib/cost/corrections.ts).
//
// Part 1 works each fixture out by hand, starting from the spreadsheet's own
// TOTAL COSTS (INSERT HERE!F142, recalculated by LibreOffice and stored in the
// fixture) and adding or removing exactly what each correction changes. With the
// tool rental counted once, FINAL COST = TOTAL COSTS × 1.35 + other costs.
//
// Part 2 proves each correction on its own: the same answers with that one fix
// switched off must differ by exactly what the fix is about.

import { describe, expect, it } from 'vitest';
import { ALL_FIXES, FIXES, type FixId } from '../corrections';
import { emptyInputs, estimate, type CostInputs } from '../model';

interface Fixture {
  name: string;
  inputs: CostInputs;
  insertHere: Record<string, number | string>;
}
const fixtures = Object.fromEntries(
  Object.values(import.meta.glob<Fixture>('./fixtures/*.json', { eager: true, import: 'default' })).map((f) => [f.name, f]),
) as Record<string, Fixture>;

const CENT = 0.01;
const near = (actual: number, expected: number, label = '') =>
  expect(Math.abs(actual - expected), `${label}: got ${actual}, expected ${expected}`).toBeLessThan(CENT);

/** Hand-worked expectations: the sheet's TOTAL COSTS, then each correction's change to it. */
const HAND: Record<string, { sheetF142: number; changes: number[]; corrected: number; other: number; priceNeeded: [string, number][] }> = {
  // 27 x 56 ft, 7 planting squares, 10 shrubs, 2 small trees, 4 gabion tables, 2 trellises, 5 long tables
  'sheet-defaults': {
    sheetF142: 4321.86666666667,
    changes: [
      +585, // gabion tables now counted: mesh 4 x $120 = 480; stone 4 x 8 cu ft = 32 / 27 x 1.4 = 1.66 -> 2 tons x $52.50 = 105
      +40, // same item, same price: the tables' 8 "2x4"s are 2x4x8s at $5
      +24.4, // whole units: stakes 1,512 sq ft / 20 = 75.6 = 3.024 packages -> 4: +0.976 x $25
      +58.3333333, // whole units: delivery (3 CY soil + 1 CY mulch) / 18 = 0.222 -> 1: +0.7778 x $75
    ],
    corrected: 5029.6, // x 1.35 = 6,789.96 (the spreadsheet says 6,482.80)
    other: 0,
    priceNeeded: [],
  },
  // 50 x 16 ft, 6 planting squares, gravel edge 24 ft (soft), outer edge 40 ft (10 hard + 30 soft, 2 gabion connections)
  'size-a-no-furnishings': {
    sheetF142: 1895.7,
    changes: [
      -78, // outer edges counted once: the repeated block was 1x6x12 4 x $4 = 16 + 2x4 $5 + 8 L-brackets $28 + 2 x 16 screws $24 + 2x4 $5
      -39, // supports by split: hardscape 10 ft -> 2 L-brackets ($7) + 2 x 4 screws ($6) instead of 8 ($28) + 2 x 16 ($24); 2x4s unchanged
      +5, // connections: outer-edge question 2 -> 1 more 2x4x8 ($5)
      +10, // whole units: stakes 800 / 20 = 40 = 1.6 packages -> 2: +0.4 x $25
      +62.5, // whole units: delivery (2 + 1 CY) / 18 = 0.167 -> 1: +0.8333 x $75
      +0.7, // whole units: gravel-edge L-brackets 24 / 5 = 4.8 -> 5: +0.2 x $3.50
      +0.6, // whole units: screws 9.6 -> 10 of each of 2 kinds: +0.4 x $0.75 x 2
    ],
    corrected: 1857.5, // x 1.35 = 2,507.625
    other: 0,
    priceNeeded: [],
  },
  // 64 x 28 ft, 3 play squares, 2 benches with backs, a 4-square (16') stage, 2 fountains, $125.50 other costs
  'size-b-stage16': {
    sheetF142: 4273.25333333333,
    changes: [
      -28, // play area counted once: 48 sq ft x 0.33 / 27 = 0.59 -> 1 CY x $28
      +6.8, // 16' stage screws from its own cut list: (35 + 6) x 4 = 164 instead of 124: +40 x $0.17
      +120, // 16' stage corner braces: 8 x 3 = 24 x $5 (the sheet's COUNTIF tested an empty cell)
      +10.4, // whole units: stakes 1,792 / 20 = 89.6 = 3.584 packages -> 4: +0.416 x $25
      +54.1666667, // whole units: delivery (3 + 2 CY) / 18 = 0.278 -> 1: +0.7222 x $75
      // price needed (left out, were $0): bench 4x4x6 x2, 2x10x8 x1, 2x6x8 x2, 2x8x8 x1; 16' stage 1x6x16 x6, 2x4x16 x3, 4x4x8 x2, 2x4x10 x1
    ],
    corrected: 4436.62, // x 1.35 + 125.50 = 6,114.937
    other: 125.5,
    priceNeeded: [
      ['lumber:4x4x6', 2],
      ['lumber:2x10x8', 1],
      ['lumber:2x6x8', 2],
      ['lumber:2x8x8', 1],
      ['lumber:1x6x16', 6],
      ['lumber:2x4x16', 3],
      ['lumber:4x4x8', 2],
      ['lumber:2x4x10', 1],
    ],
  },
  // 82.5 x 33.25 ft and many items; outer edge 61.5 ft = 20 hard + 41.5 soft
  'size-c-fractions': {
    sheetF142: 9042.46291666667,
    changes: [
      -28, // play area counted once: 80 sq ft x 0.33 / 27 = 0.98 -> 1 CY x $28
      -123.95, // outer edges counted once: 6 boards $24 + 2x4 $5 + 12.3 L-brackets $43.05 + 2 x 24.6 screws $36.90 + 2 soft 2x4s $10 + 1 gabion 2x4 $5
      -29.05, // supports by split: L-brackets 20 / 5 = 4 ($14) instead of 12.3 ($43.05)
      -24.9, // ... screws 2 x 8 ($12) instead of 2 x 24.6 ($36.90)
      -5, // ... softscape 2x4s 41.5 / 5 / 1.5 / 8 = 0.69 -> 1 instead of 2
      +5, // connections: 3 (outer edge) + 3 (raised beds) = 6 -> 2 2x4x8s instead of 1
      +172.5, // gabion table counted: mesh $120 + stone 8 cu ft -> 1 ton $52.50
      +300, // porch swing: 1 x $300 (the sheet used the hammock count, 0)
      +11.56, // 8' stage screws: (17 + 6) x 4 = 92 instead of 24: +68 x $0.17
      +37.5, // same price: bench-with-armrests 2x4x8s 7.5 x $5
      +10, // same price: gabion table 2 x 2x4x8 x $5
      +12.84375, // whole units: stakes 2,743.125 / 20 / 25 = 5.486 -> 6: +0.51375 x $25
      +33.3333333, // whole units: delivery (7 + 3 CY) / 18 = 0.556 -> 1: +0.4444 x $75
      +2.1, // whole units: gravel-edge L-brackets 37 / 5 = 7.4 -> 8: +0.6 x $3.50
      +1.8, // whole units: screws 14.8 -> 16 of each of 2 kinds: +1.2 x $0.75 x 2
      +2.5, // whole units: bench-with-armrests 2x4x8s 7.5 -> 8: +0.5 x $5
      +150, // whole units: cold frames 3 squares / 2 = 1.5 -> 2: +0.5 x $300
      // price needed: the 8' stage's 4x4x10 (was $0)
    ],
    corrected: 9570.7, // x 1.35 = 12,920.445
    other: 0,
    priceNeeded: [['lumber:4x4x10', 1]],
  },
  // 110 x 55 ft with every item; outer edge 130 ft = 30 hard + 100 soft
  'size-e-everything': {
    sheetF142: 22363.64,
    changes: [
      -84, // play area counted once: 192 sq ft x 0.33 / 27 = 2.35 -> 3 CY x $28
      -248, // outer edges counted once: 11 boards $44 + 2 2x4s $10 + 26 L-brackets $91 + 2 x 52 screws $78 + 3 soft 2x4s $15 + 2 gabion 2x4s $10
      -5, // supports by split: hardscape 2x4s 30 / 5 / 2 / 8 = 0.375 -> 1 instead of 2
      -70, // ... L-brackets 6 instead of 26
      -60, // ... screws 2 x 12 instead of 2 x 52
      -5, // ... softscape 2x4s 100 / 5 / 1.5 / 8 = 1.67 -> 2 instead of 3
      +5, // connections: 4 + 6 = 10 -> 3 2x4x8s instead of 6 -> 2
      +360, // 3 wood-topped gabions: 2'x18"x4' baskets 3 x $120
      +105, // ... stone 3 x 12 = 36 cu ft / 27 x 1.4 = 1.87 -> 2 tons x $52.50
      +85, // ... 2x4x8s 3 x 5.5 = 16.5 -> 17 x $5
      +18.36, // ... screws 3 x 36 = 108 x $0.17
      +292.5, // 2 gabion tables counted: mesh $240 + stone 16 cu ft -> 1 ton $52.50
      +300, // porch swings: 2 instead of the hammock count 1: +1 x $300
      +75, // same price: bench-with-armrests 2x4x8s 2 x 7.5 = 15 x $5
      +20, // same price: gabion tables 4 x 2x4x8 x $5
      +320, // same price: off-the-shelf cafe tables and chairs 2 x $160
      +22.5, // whole units: stakes 6,050 / 20 / 25 = 12.1 -> 13: +0.9 x $25
      +62.5, // whole units: delivery (15 + 6 CY) / 18 = 1.17 -> 2: +0.8333 x $75
      // price needed: bench 4x4x6 x4, 2x10x8 x2, 2x6x8 x4, 2x8x8 x2; 12' stage 4x4x12 x1; cisterns 1 + 1
    ],
    corrected: 23557.5, // x 1.35 + 500 = 32,302.625
    other: 500,
    priceNeeded: [
      ['lumber:4x4x6', 4],
      ['lumber:2x10x8', 2],
      ['lumber:2x6x8', 4],
      ['lumber:2x8x8', 2],
      ['lumber:4x4x12', 1],
      ['cistern-4x4', 1],
      ['cistern-4x8', 1],
    ],
  },
  // 60 x 40 ft, 75 planting squares, gravel edge 60 ft (hard), outer edge 48 ft (soft), 1-square stage, 1 cold-frame square, 2 hammocks
  'rounding-boundaries': {
    sheetF142: 10511.9666666667,
    changes: [
      -88.4, // outer edges counted once: 4 boards $16 + 2x4 $5 + 9.6 L-brackets $33.60 + 2 x 19.2 screws $28.80 + soft 2x4 $5
      -5, // supports by split: no hardscape -> no hardscape 2x4 ...
      -33.6, // ... no L-brackets
      -28.8, // ... no screws (softscape 2x4 unchanged: 48 / 5 / 1.5 / 8 = 0.8 -> 1)
      -600, // porch swings: 0 (the sheet used the hammock count, 2 x $300)
      +5, // whole units: stakes 2,400 / 20 / 25 = 4.8 -> 5: +0.2 x $25
      +20.8333333, // whole units: delivery (23 + 8 CY) / 18 = 1.72 -> 2: +0.2778 x $75
      +150, // whole units: cold frames 1 square / 2 = 0.5 -> 1: +0.5 x $300
      // price needed: the 1-square stage (no cut list) — was $0
    ],
    corrected: 9932, // x 1.35 = 13,408.20
    other: 0,
    priceNeeded: [['stage-other', 1]],
  },
};

describe('corrected estimate, worked by hand from each fixture', () => {
  for (const [name, h] of Object.entries(HAND)) {
    it(name, () => {
      const f = fixtures[name]!;
      expect(h.sheetF142).toBeCloseTo(f.insertHere.F142 as number, 6);
      near(h.sheetF142 + h.changes.reduce((a, b) => a + b, 0), h.corrected, 'hand arithmetic');
      const e = estimate(f.inputs);
      near(e.summary.totalCosts, h.corrected, 'TOTAL COSTS');
      near(e.summary.toolRental, h.corrected * 0.15, 'tool rental 15%');
      near(e.summary.contingency, h.corrected * 0.2, 'contingency 20%');
      near(e.total, h.corrected * 1.35 + h.other, 'FINAL COST');
      // the order list now adds up to the estimate's total costs
      near(e.orderList.total, h.corrected, 'order list total');
      expect(e.priceNeeded.map((p) => [p.id, p.qty])).toEqual(h.priceNeeded);
      // the fix-by-fix effects add up to the difference from the spreadsheet
      const c = e.corrections!;
      near(c.sheetTotal, f.insertHere.F146 as number, 'sheet total');
      near(c.sheetTotal + c.fixes.reduce((a, x) => a + x.effect, 0) + c.pricesAdded, e.total, 'effects add up');
    });
  }

  it('the sample park: $6,789.96 instead of the spreadsheet’s $6,482.80', () => {
    const e = estimate(fixtures['sheet-defaults']!.inputs);
    near(e.total, 6789.96);
    near(e.corrections!.sheetTotal, 6482.8);
  });
});

// ---- one correction at a time --------------------------------------------------

const without = (id: FixId) => ALL_FIXES.filter((f) => f !== id);
const both = (i: Partial<CostInputs>, id: FixId) => ({ on: estimate(i), off: estimate(i, { fixes: without(id) }) });
const park: Partial<CostInputs> = { ...emptyInputs, longSideFt: 50, shortSideFt: 20 };

describe('each correction changes what it should', () => {
  it('lists every fix once, in order', () => {
    expect(FIXES.map((f) => f.id)).toEqual(ALL_FIXES);
    expect(new Set(ALL_FIXES).size).toBe(ALL_FIXES.length);
  });

  it('toolRentalOnce: the 20% contingency no longer adds the tool rental', () => {
    const { on, off } = both(park, 'toolRentalOnce');
    const t = on.summary.totalCosts;
    near(on.summary.contingency, t * 0.2);
    near(off.summary.contingency, t * 0.2 + t * 0.15);
    near(off.total - on.total, t * 0.15);
    expect(on.lines.some((l) => l.item === 'Tool rental, again')).toBe(false);
  });

  it('playAreaOnce: the play-area mulch is in the base total once', () => {
    const { on, off } = both({ ...park, naturePlaySquares: 5 }, 'playAreaOnce'); // 80 sq ft x 0.33 / 27 -> 1 CY x $28
    near(on.summary.playArea, 28);
    near(off.summary.baseDesign - on.summary.baseDesign, 28);
    expect(on.lines.filter((l) => l.category === 'doubleCounted')).toEqual([]);
  });

  it('edgesOnce: the outer-edge block is in the base total once, and "raised beds" is no longer a copy', () => {
    const i = { ...park, outerEdgeFt: 48, outerEdgeOnSoftscapeFt: 48 }; // 4 boards $16 + softscape 2x4 $5 = $21
    const { on, off } = both(i, 'edgesOnce');
    near(on.summary.outerEdge, 21);
    expect(on.summary.raisedBeds).toBe(0);
    near(off.summary.baseDesign - on.summary.baseDesign, 21);
  });

  it('edgeSupportsSplit: hardscape supports use the hardscape feet, softscape the softscape feet', () => {
    const i = { ...park, outerEdgeFt: 40, outerEdgeOnHardscapeFt: 10, outerEdgeOnSoftscapeFt: 30 };
    const { on, off } = both(i, 'edgeSupportsSplit');
    const brackets = (e: ReturnType<typeof estimate>) => e.lines.find((l) => l.category === 'outerEdge' && l.item === 'L-brackets')!.qty;
    expect(brackets(on)).toBe(2); // 10 ft / 5
    expect(brackets(off)).toBe(8); // 40 ft / 5
    near(off.summary.outerEdge - on.summary.outerEdge, 6 * 3.5 + 2 * 12 * 0.75); // 6 brackets + 2 x 12 screws
    // no split given: both kinds still counted, with a warning
    const unsplit = estimate({ ...park, outerEdgeFt: 40 });
    expect(unsplit.lines.find((l) => l.category === 'outerEdge' && l.item === 'L-brackets')!.qty).toBe(8);
    expect(unsplit.warnings.join(' ')).toMatch(/hardscape and on softscape/);
  });

  it('edgeGabionConnections: the outer-edge connection question counts', () => {
    const { on, off } = both({ ...park, outerEdgeGabionConnections: 4 }, 'edgeGabionConnections');
    near(on.summary.outerEdge, 5); // 4 / 4 -> 1 2x4x8
    near(off.summary.outerEdge, 0);
  });

  it('woodToppedGabions: priced from the sheet’s rows 90–97 instead of #REF!', () => {
    const { on, off } = both({ ...park, woodToppedGabions: 1 }, 'woodToppedGabions');
    // basket $120 + stone 12 cu ft / 27 x 1.4 = 0.62 -> 1 ton $52.50 + 2x4x8 5.5 -> 6 x $5 + 36 screws x $0.17
    near(on.summary.woodToppedGabions!, 120 + 52.5 + 30 + 6.12);
    expect(off.summary.woodToppedGabions).toBeNull();
    near(on.summary.baseFurnishings - off.summary.baseFurnishings, 208.62);
    expect(off.warnings.join(' ')).toMatch(/#REF!/);
    expect(on.warnings.join(' ')).not.toMatch(/#REF!/);
  });

  it('gabionTables: included in the total', () => {
    const { on, off } = both({ ...park, gabionTables: 1 }, 'gabionTables');
    near(on.summary.gabionTables, 120 + 52.5 + 10); // mesh + 1 ton of stone + 2 2x4x8s
    expect(off.summary.gabionTables).toBe(0);
    near(on.summary.baseFurnishings - off.summary.baseFurnishings, 182.5);
    expect(on.lines.filter((l) => l.group === 'Wood-topped gabion table').every((l) => l.inTotal)).toBe(true);
  });

  it('porchSwings: the porch-swing count, not the hammock count', () => {
    const { on, off } = both({ ...park, porchSwings: 2, hammocks: 1 }, 'porchSwings');
    near(on.summary.porchSwings, 600);
    near(off.summary.porchSwings, 300);
  });

  it('stageCutLists: the 16-foot and 8-foot stages read their own rows', () => {
    const s16 = both({ ...park, stageSquares: 4 }, 'stageCutLists');
    const qty = (e: ReturnType<typeof estimate>, item: string) => e.lines.filter((l) => l.group?.startsWith('Stage') && l.item === item).reduce((a, l) => a + l.qty, 0);
    expect(qty(s16.on, '1x6x16')).toBe(6);
    expect(qty(s16.off, '1x6x16')).toBe(1);
    expect(qty(s16.on, 'Corner braces')).toBe(24);
    expect(qty(s16.off, 'Corner braces')).toBe(0);
    expect(qty(s16.on, '2.5" wood screws')).toBe(164);
    expect(qty(s16.off, '2.5" wood screws')).toBe(124);
    near(s16.on.summary.stage - s16.off.summary.stage, 24 * 5 + 40 * 0.17);
    const s8 = both({ ...park, stageSquares: 2 }, 'stageCutLists');
    expect(qty(s8.on, '2.5" wood screws')).toBe(92);
    expect(qty(s8.off, '2.5" wood screws')).toBe(24);
  });

  it('samePrice: items priced elsewhere in the sheet get that price', () => {
    const { on, off } = both({ ...park, benchesWithBackAndArms: 2, cafeTableSets: 1 }, 'samePrice');
    const arms2x4 = (e: ReturnType<typeof estimate>) => e.lines.find((l) => l.group === "4' bench with back and armrests" && l.item === '2x4x8')!;
    expect(arms2x4(on).unitPrice).toBe(5);
    expect(arms2x4(off).unitPrice).toBe(0);
    near(on.summary.benchesWithBackAndArms - off.summary.benchesWithBackAndArms, 15 * 5);
    near(on.summary.cafeTables, 160);
    near(off.summary.cafeTables, 0);
  });

  it('wholeUnits: packages, deliveries, brackets and cold frames are whole', () => {
    const { on, off } = both({ ...park, shortSideFt: 21, plantingSquares: 6, gravelEdgeFt: 24, coldFrameSquares: 3 }, 'wholeUnits');
    const q = (e: ReturnType<typeof estimate>, cat: string, item: string) => e.lines.find((l) => l.category === cat && l.item === item)!.qty;
    expect(q(on, 'layout', 'Stakes')).toBe(3); // 50 x 21 = 1,050 sq ft / 20 = 52.5 stakes = 2.1 packages
    expect(q(off, 'layout', 'Stakes')).toBeCloseTo(2.1, 6);
    expect(q(on, 'soil', 'Delivery')).toBe(1);
    expect(q(off, 'soil', 'Delivery')).toBeCloseTo(3 / 18, 6);
    expect(q(on, 'gravelEdge', 'L-brackets')).toBe(5);
    expect(q(off, 'gravelEdge', 'L-brackets')).toBeCloseTo(4.8, 6);
    expect(q(on, 'offTheShelf', '2x8 cold frames')).toBe(2);
    expect(q(off, 'offTheShelf', '2x8 cold frames')).toBe(1.5);
    for (const l of on.lines) if (l.unit !== '' && l.category !== 'contingency') expect(Number.isInteger(l.qty), `${l.item} ${l.qty}`).toBe(true);
  });

  it('priceNeeded: unpriced items are asked for and left out until priced', () => {
    const i = { ...park, benchesWithBack: 1, stageSquares: 5, cisterns4x8: 1 };
    const e = estimate(i);
    expect(e.priceNeeded.map((p) => p.id)).toEqual(['lumber:4x4x6', 'lumber:2x10x8', 'lumber:2x6x8', 'lumber:2x8x8', 'stage-other', 'cistern-4x8']);
    const missing = e.lines.filter((l) => l.needsPrice);
    expect(missing.length).toBe(6);
    expect(missing.every((l) => !l.inTotal && l.total === 0)).toBe(true);
    const off = estimate(i, { fixes: without('priceNeeded') });
    expect(off.priceNeeded).toEqual([]);
    near(off.total, e.total); // they were $0 in the sheet too
    // fill in two prices: they join the total (x 1.35 for tool rental and contingency)
    const priced = estimate(i, { unitPrices: { 'lumber:4x4x6': 12, 'cistern-4x8': 400 } });
    near(priced.total - e.total, (12 + 400) * 1.35);
    near(priced.corrections!.pricesAdded, (12 + 400) * 1.35);
    expect(priced.priceNeeded.find((p) => p.id === 'lumber:4x4x6')!.price).toBe(12);
    expect(priced.lines.find((l) => l.priceId === 'lumber:4x4x6')!.userPrice).toBe(true);
    // a stage size with no cut list is no longer a silent $0
    expect(e.lines.find((l) => l.priceId === 'stage-other')!.item).toBe('Stage, 5 squares');
  });

  it('orderList: built from the estimate’s lines, so it matches the total costs', () => {
    const i = { ...park, gabionTables: 1, benchesWithBackAndArms: 1, stageSquares: 3, solarLights: 20, plantingSquares: 4, outerEdgeFt: 20, outerEdgeOnHardscapeFt: 20 };
    const { on, off } = both(i, 'orderList');
    near(on.orderList.total, on.summary.totalCosts);
    expect(Math.abs(off.orderList.total - off.summary.totalCosts)).toBeGreaterThan(1);
    const row = (e: ReturnType<typeof estimate>, item: string) => e.orderList.rows.find((r) => r.item === item);
    // staples: the sheet's list read the delivery row (1 trip); 1,000 sq ft x 0.2 / 100 = 2 boxes
    expect(row(off, '3.5" staples')!.qty).toBe(1);
    expect(row(on, '3.5" staples')!.qty).toBe(2);
    // gabion-table side panels: the sheet's list read the mesh count (1); 4 per table
    expect(row(off, '22"x24"')!.qty).toBe(1);
    expect(row(on, 'Side panels 22"x24"')!.qty).toBe(4);
    // lag screws: never found by the sheet's list; 6 per bench with armrests
    expect(row(off, '1/4" x 1 1/2" galvanized lag screws')!.qty).toBe(0);
    expect(row(on, '1/4" x 1 1/2" lag screws')!.qty).toBe(6);
    // corner braces, plants and erosion control are in the total; no unlabelled $175
    expect(row(on, 'Corner braces')!.inTotal).toBe(true);
    expect(row(on, 'Perennials')!.total).toBe(160);
    expect(row(on, 'Erosion control')!.total).toBe(100);
    expect(on.orderList.extras.some((x) => x.amount === 175)).toBe(false);
    // solar lights at the estimate's price: 2 packs of 16 x $40
    expect(row(on, 'Solar lights')!.total).toBe(80);
    // all 2x4x8s on one row
    expect(on.orderList.rows.filter((r) => r.item === '2x4x8').length).toBe(1);
    expect(row(on, '2x4x8')!.qty).toBe(
      on.lines.filter((l) => l.material === 'lumber:2x4x8').reduce((a, l) => a + l.qty, 0),
    );
  });

  it('sheet mode is untouched by all of this', () => {
    const e = estimate(fixtures['sheet-defaults']!.inputs, { mode: 'sheet' });
    near(e.total, 6482.8);
    expect(e.corrections).toBeUndefined();
    expect(e.priceNeeded).toEqual([]);
  });

  it('warns only about what is still not right, not about fixed quirks', () => {
    const e = estimate({ ...emptyInputs, woodToppedGabions: 2, porchSwings: 1, naturePlaySquares: 2, gabionTables: 1, cisterns4x4: 1, coldFrameSquares: 3 });
    expect(e.warnings).toEqual([]);
    expect(estimate({ ...emptyInputs, raisedBedWoodEdgeFt: 10 }).warnings.join(' ')).toMatch(/raised-bed/);
  });
});
