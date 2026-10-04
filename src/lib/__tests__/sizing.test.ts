import { describe, expect, it } from 'vitest';
import { fitSize } from '../sizing';

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
});

import { formatAuto } from '../autofill';
describe('treeCount autofill', () => {
  it('maps kept-tree counts to the Assess summary choices', () => {
    expect(formatAuto(0, 'treeCount')).toBe('No trees');
    expect(formatAuto(2, 'treeCount')).toBe('One or two trees');
    expect(formatAuto(5, 'treeCount')).toBe('Several trees');
  });
});
