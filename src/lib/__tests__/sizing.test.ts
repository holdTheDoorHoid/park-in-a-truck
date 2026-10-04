import { describe, expect, it } from 'vitest';
import { fitSize, SIZES } from '../sizing';

describe('fitSize', () => {
  it('matches the Dream workbook example (35 x 90 corner lot is size D)', () => {
    expect(fitSize(35, 90)).toMatchObject({ size: 'D', exact: true });
  });
  it('is order-independent', () => {
    expect(fitSize(90, 35)).toEqual(fitSize(35, 90));
  });
  it('puts a typical 16 x 50 rowhouse lot in A', () => {
    expect(fitSize(16, 50)).toMatchObject({ size: 'A', exact: true });
  });
  it('accepts 14 x 50 as A but flags 10 x 40 as too small (Park Patch territory)', () => {
    expect(fitSize(14, 50)).toMatchObject({ size: 'A', exact: true });
    expect(fitSize(10, 40)).toMatchObject({ size: 'A', exact: false, tooSmall: true });
  });
  it('flags lots bigger than E', () => {
    expect(fitSize(80, 150)).toMatchObject({ size: 'E', tooBig: true });
  });
  it('prefers E for wide lots where D and E overlap', () => {
    expect(fitSize(56, 90).size).toBe('E');
    expect(fitSize(36, 90).size).toBe('D');
  });
  // Usability test 2026-10-04 (veteran S2): seams only ever add feet, so the "closest
  // fit" must never be a set whose printed pieces are bigger than the lot.
  it('never picks a set longer than the lot (40.6 x 61.4 ft is A, not C)', () => {
    expect(fitSize(40.6, 61.4)).toMatchObject({ size: 'A', exact: false, tooSmall: false });
  });
  it('never picks a set wider than the lot (14.7 x 69 ft is A, not B)', () => {
    expect(fitSize(14.7, 69)).toMatchObject({ size: 'A', exact: false, tooSmall: false });
  });
  it('takes the biggest set that still fits when the lot is between ranges', () => {
    expect(fitSize(30, 70)).toMatchObject({ size: 'B', exact: false }); // B is 64 x 16; C needs 76 ft
    expect(fitSize(35, 100)).toMatchObject({ size: 'D', exact: false }); // too long for D's range, too narrow for E
    expect(fitSize(46, 85)).toMatchObject({ size: 'E', exact: true });
  });
  it('the recommended set always fits inside the lot (sweep)', () => {
    for (let short = 12; short <= 70; short += 0.7)
      for (let long = Math.max(short, 44); long <= 140; long += 1.3) {
        const f = fitSize(short, long);
        const s = SIZES.find((x) => x.id === f.size)!;
        expect(long >= s.long[0] && short >= s.short[0], `${short} x ${long} -> ${f.size}`).toBe(true);
      }
  });
});

import { formatAuto } from '../autofill';
describe('treeCount autofill', () => {
  it('maps kept-tree counts to the Assess summary choices', () => {
    expect(formatAuto(0, 'treeCount')).toBe('No trees');
    expect(formatAuto(2, 'treeCount')).toBe('One or two trees');
    expect(formatAuto(5, 'treeCount')).toBe('Several trees');
  });
});

describe('owners autofill (veteran S4)', () => {
  it('keeps one agency name whole and two people apart', () => {
    expect(formatAuto(['REDEVELOPMENT AUTHORITY', 'OF PHILADELPHIA'], 'owners')).toBe('REDEVELOPMENT AUTHORITY OF PHILADELPHIA');
    expect(formatAuto(['HERBERT MITCHELL', 'VICTORIA'], 'owners')).toBe('HERBERT MITCHELL & VICTORIA');
    expect(formatAuto([], 'owners')).toBeNull();
  });
});
