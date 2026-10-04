import { describe, expect, it } from 'vitest';
import type { DesignTally } from '../../types';
import { ALL_FIELDS } from '../fields';
import { INPUT_KEYS, defaultInputs, estimate } from '../model';
import { readSaved, resolveInputs, withOverride, withUnitPrice } from '../state';
import { estimateCsv } from '../csv';

const tally: DesignTally = {
  lengthFt: 64,
  widthFt: 20,
  plantingSquares: { sun: 6, shade: 2 },
  naturePlaySquares: 0,
  shrubs: { sun: 2, shade: 1 },
  smallTrees: 1,
  largeTrees: 0,
  items: { 'bench-back': 1 },
  themes: ['sanctuary'],
};

describe('estimator questions', () => {
  it('ask every input exactly once', () => {
    expect(ALL_FIELDS.map((f) => f.key).sort()).toEqual([...INPUT_KEYS].sort());
  });
});

describe('resolveInputs', () => {
  it('starts from the spreadsheet example when there is no design', () => {
    const r = resolveInputs(readSaved(undefined), null);
    expect(r.values).toEqual(defaultInputs);
    expect(r.source.longTables).toBe('example');
    expect(r.base).toBe('example');
  });

  it('uses the lot size without a design, and zero when asked to', () => {
    const r = resolveInputs({ v: 1, overrides: {}, base: 'zero' }, null, { lengthFt: 50, widthFt: 16 });
    expect(r.values.longSideFt).toBe(50);
    expect(r.source.longSideFt).toBe('lot');
    expect(r.values.longTables).toBe(0);
    expect(r.source.longTables).toBe('blank');
  });

  it('fills from the design, and the person’s numbers win until reset', () => {
    let saved = readSaved(undefined);
    let r = resolveInputs(saved, tally);
    expect(r.hasDesign).toBe(true);
    expect(r.values).toMatchObject({ longSideFt: 64, shortSideFt: 20, plantingSquares: 8, shrubs: 3, benchesWithBack: 1, longTables: 0 });
    expect(r.source.plantingSquares).toBe('design');
    expect(r.source.trashCans).toBe('blank'); // design present: manual questions start at zero, not the example
    expect(r.source.keyholeGardensLarge).toBe('design'); // the design has none: 0, from the design

    saved = withOverride(saved, 'plantingSquares', 12);
    r = resolveInputs(saved, tally);
    expect(r.values.plantingSquares).toBe(12);
    expect(r.source.plantingSquares).toBe('you');
    expect(r.fallback.plantingSquares).toBe(8);
    expect(r.fallbackSource.plantingSquares).toBe('design');

    saved = withOverride(saved, 'plantingSquares', undefined);
    expect(resolveInputs(saved, tally).values.plantingSquares).toBe(8);
  });

  it('ignores junk in saved data', () => {
    const s = readSaved({ v: 1, overrides: { stools: 'many', shrubs: 4, nonsense: 3 }, base: 'weird', unitPrices: { 'lumber:4x4x6': 12, bad: -1, worse: 'x' } });
    expect(s.overrides).toEqual({ shrubs: 4 });
    expect(s.base).toBeUndefined();
    expect(s.unitPrices).toEqual({ 'lumber:4x4x6': 12 });
  });

  it('saves and clears prices for "price needed" items', () => {
    let s = withUnitPrice(readSaved(undefined), 'cistern-4x4', 250);
    expect(s.unitPrices).toEqual({ 'cistern-4x4': 250 });
    s = withUnitPrice(s, 'cistern-4x4', undefined);
    expect(s.unitPrices).toEqual({});
  });
});

describe('estimateCsv', () => {
  it('writes the corrected estimate, the order list and the corrections, quoting inch marks', () => {
    const csv = estimateCsv(estimate(defaultInputs), 'Dover St, "the lot"', new Date('2026-10-04T12:00:00Z'));
    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv).toContain('"Dover St, ""the lot"""');
    expect(csv).toContain('2026-10-04');
    expect(csv).toContain('Estimated final cost,,,,6884.46');
    expect(csv).toContain('"3/8"" red tipple, 2"" deep"');
    expect(csv).toContain('Order list total,,,,5099.60');
    expect(csv).toContain('The spreadsheet’s final cost for these answers,6482.80');
    expect(csv).toContain('Tool rental counted once,-648.28');
  });

  it('marks items that need a price', () => {
    // an 8' gabion bench: its 96" basket, hog rings and cable staples have no price in the spreadsheet
    const csv = estimateCsv(estimate({ ...defaultInputs, gabionBenches8: 1 }));
    expect(csv).toContain('"3/4"" hog rings",50,ea.,price needed');
    expect(csv).toMatch(/3 items need a price/);
  });

  it('still writes the spreadsheet version', () => {
    const csv = estimateCsv(estimate(defaultInputs, { mode: 'sheet' }));
    expect(csv).toContain('Estimated final cost,,,,6482.80');
    expect(csv).toContain('Order list total,,,,3717.60');
  });
});
