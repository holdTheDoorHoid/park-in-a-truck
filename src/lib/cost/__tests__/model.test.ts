// The faithful port (mode 'sheet') against PiaT's own spreadsheet. Each fixture
// holds one set of answers and every value LibreOffice computed for them in the
// ORIGINAL file (scripts/analyze_cost_model.py). estimate(…, { mode: 'sheet' })
// must match each summary cell, each quantity-tab line and each order-list row
// within one cent. The corrected model is tested in corrected.test.ts.

import { describe, expect, it } from 'vitest';
import {
  CATEGORIES,
  INPUT_CELLS,
  INPUT_KEYS,
  SITE_INPUTS,
  SUMMARY_CELLS,
  defaultInputs,
  emptyInputs,
  estimate,
  normaliseInputs,
  roundUp,
  type CostInputs,
} from '../model';

interface Fixture {
  name: string;
  description: string;
  inputs: CostInputs;
  cells: Record<string, string | null>;
  insertHere: Record<string, number | string>;
  qpi: Record<string, number>;
  orderList: ({ row: number } & Partial<Record<'A' | 'C' | 'D' | 'E' | 'F' | 'G' | 'I' | 'L' | 'M' | 'N' | 'O', number | string | boolean>>)[];
  orderListTotals: { P18: number; P23: number; O71: number };
}

const fixtures = Object.values(import.meta.glob<Fixture>('./fixtures/*.json', { eager: true, import: 'default' }));
const CENT = 0.01;

/** Numeric value of a fixture cell (blank = 0, like the spreadsheet). */
const num = (v: unknown) => (typeof v === 'number' ? v : 0);
const near = (actual: number, expected: number, label: string) =>
  expect(Math.abs(actual - expected), `${label}: got ${actual}, sheet has ${expected}`).toBeLessThan(CENT);

describe('fixtures', () => {
  it('cover at least five input sets, including the sheet defaults', () => {
    expect(fixtures.length).toBeGreaterThanOrEqual(5);
    expect(fixtures.map((f) => f.name)).toContain('sheet-defaults');
  });
  it('the sheet-defaults fixture uses defaultInputs', () => {
    const f = fixtures.find((x) => x.name === 'sheet-defaults')!;
    expect(normaliseInputs(f.inputs)).toEqual(defaultInputs);
  });
});

for (const f of fixtures) {
  describe(`${f.name} — ${f.description}`, () => {
    const e = estimate(f.inputs, { mode: 'sheet' });

    it('writes the same answer cells as the model', () => {
      // the site-added questions (furniture with a build guide) have no cell in the spreadsheet
      const sheetCells = Object.fromEntries(Object.entries(INPUT_CELLS).filter(([k]) => !SITE_INPUTS.includes(k as keyof CostInputs)));
      expect(f.cells).toEqual(sheetCells);
      expect(Object.keys(f.inputs).sort()).toEqual(INPUT_KEYS.filter((k) => !SITE_INPUTS.includes(k)).sort());
      for (const k of SITE_INPUTS) expect(INPUT_CELLS[k]).toBeNull();
    });

    it('matches every INSERT HERE summary cell', () => {
      for (const [key, cell] of Object.entries(SUMMARY_CELLS)) {
        const actual = e.summary[key as keyof typeof SUMMARY_CELLS];
        if (actual === null) {
          expect(f.insertHere[cell], key).toBe('#REF!');
          continue;
        }
        near(actual, num(f.insertHere[cell]), `${key} (${cell})`);
      }
      near(e.total, num(f.insertHere.F146), 'FINAL COST');
    });

    it('category subtotals add up to the sheet’s subtotals and the final cost', () => {
      const ih = (c: string) => num(f.insertHere[c]);
      const s = e.subtotals;
      near(s.layout, ih('F14'), 'layout');
      near(s.soil, ih('F15'), 'soil');
      near(s.gravel, ih('F16'), 'gravel');
      near(s.playArea, ih('F17'), 'play area');
      near(s.gravelEdge, ih('F22'), 'gravel edge');
      near(s.outerEdge, ih('F27'), 'outer edge');
      near(s.planting, ih('F34'), 'planting');
      near(s.gabions, ih('F42'), 'gabions');
      near(s.doubleCounted, ih('F17') + ih('F46'), 'double counted');
      near(s.furnishings, ih('F80'), 'furnishings');
      near(s.additional, ih('F97'), 'additional');
      near(s.offTheShelf, ih('F121'), 'off the shelf');
      near(s.optional, ih('F136'), 'optional');
      near(s.contingency, ih('F143') + ih('F144') + ih('F145'), 'contingency');
      const base = CATEGORIES.filter((c) => c.part === 'base').reduce((a, c) => a + s[c.id], 0);
      near(base, ih('F48'), 'base design total');
      near(Object.values(s).reduce((a, b) => a + b, 0), e.total, 'sum of subtotals');
      near(e.lines.filter((l) => l.inTotal).reduce((a, l) => a + l.total, 0), e.total, 'sum of lines');
    });

    it('matches every quantity-tab line it reproduces', () => {
      const cell = (ref: string) => (ref.startsWith('IH!') ? num(f.insertHere[ref.slice(3)]) : num(f.qpi[ref]));
      let checked = 0;
      for (const l of e.lines) {
        const label = `${l.category}/${l.group ?? ''}/${l.item}`;
        if (l.cells?.qty) near(l.qty, cell(l.cells.qty), `${label} qty ${l.cells.qty}`);
        if (l.cells?.price) near(l.unitPrice, cell(l.cells.price), `${label} price ${l.cells.price}`);
        if (l.cells?.total) near(l.total, cell(l.cells.total), `${label} total ${l.cells.total}`);
        if (l.cells) checked++;
      }
      expect(checked).toBeGreaterThan(0);
    });

    it('matches every ORDER LIST row and its totals', () => {
      const rows = new Map(e.orderList.rows.map((r) => [r.row, r]));
      expect([...rows.keys()].sort((a, b) => a - b)).toEqual(f.orderList.map((r) => r.row));
      for (const x of f.orderList) {
        const r = rows.get(x.row)!;
        const label = `ORDER LIST row ${x.row} (${x.C})`;
        near(r.qty, num(x.D), `${label} qty`);
        if (x.row >= 60) {
          // Copied one column over from the quantity tab: M = unit price, N = row total.
          near(r.unitPrice ?? 0, num(x.M), `${label} unit price (M)`);
          near(r.total ?? 0, num(x.N), `${label} total (N)`);
        } else {
          expect(r.unitPrice === null, `${label}: has a unit price`).toBe(x.N === undefined);
          expect(r.total === null, `${label}: has a total`).toBe(x.O === undefined);
          near(r.unitPrice ?? 0, num(x.N), `${label} unit price`);
          near(r.total ?? 0, num(x.O), `${label} total`);
        }
      }
      near(e.orderList.subtotalLayoutSoilGravel!, f.orderListTotals.P18, 'P18');
      near(e.orderList.subtotalWithGabionsAndPlants!, f.orderListTotals.P23, 'P23');
      near(e.orderList.total, f.orderListTotals.O71, 'O71');
    });
  });
}

const sheet = (i: Partial<CostInputs>) => estimate(i, { mode: 'sheet' });

describe("estimate(…, { mode: 'sheet' })", () => {
  it('is all zeros for empty inputs', () => {
    const e = sheet(emptyInputs);
    expect(e.total).toBe(0);
    expect(e.lines.filter((l) => l.total !== 0)).toEqual([]);
    expect(e.orderList.total).toBe(175); // the sheet's unlabelled +$175
  });

  it('fills missing or invalid answers with zero', () => {
    const i = normaliseInputs({ longSideFt: 10, shortSideFt: Number.NaN, stools: undefined });
    expect(i.longSideFt).toBe(10);
    expect(i.shortSideFt).toBe(0);
    expect(i.stools).toBe(0);
    expect(sheet({ longSideFt: 27, shortSideFt: 56 }).total).toBeGreaterThan(0);
  });

  it('flags the sheet’s quirks only when they matter', () => {
    expect(sheet(defaultInputs).warnings.join(' ')).toMatch(/gabion tables/i);
    const w = sheet({ ...emptyInputs, woodToppedGabions: 2, porchSwings: 1, stageSquares: 5, cisterns4x4: 1, coldFrameSquares: 3 }).warnings.join('\n');
    expect(w).toMatch(/#REF!/);
    expect(w).toMatch(/hammock count/);
    expect(w).toMatch(/2, 3 or 4 squares/);
    expect(w).toMatch(/Cisterns/);
    expect(w).toMatch(/half a cold frame/);
    expect(sheet(emptyInputs).warnings).toEqual([]);
  });

  it('keeps the gabion tables visible but out of the total, like the sheet', () => {
    const e = sheet({ ...emptyInputs, gabionTables: 4 });
    const lines = e.lines.filter((l) => l.group === 'Wood-topped gabion table');
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.every((l) => !l.inTotal)).toBe(true);
    expect(lines.reduce((a, l) => a + l.total, 0)).toBeCloseTo(585, 2);
    expect(e.total).toBe(0);
  });

  it('names a shop for linked lines', () => {
    const e = sheet(defaultInputs);
    const stakes = e.lines.find((l) => l.item === 'Stakes')!;
    expect(stakes.vendor).toBe('Amazon');
    expect(stakes.link).toMatch(/^https:\/\/www\.amazon\.com\//);
  });
});

describe('roundUp (spreadsheet ROUNDUP(x, 0))', () => {
  it('rounds away from zero and ignores floating-point noise', () => {
    expect(roundUp(0)).toBe(0);
    expect(roundUp(1.0000001)).toBe(2);
    expect(roundUp(8.000000000000002)).toBe(8);
    expect(roundUp(-1.2)).toBe(-2);
    expect(roundUp(Number.NaN)).toBe(0);
  });
});
