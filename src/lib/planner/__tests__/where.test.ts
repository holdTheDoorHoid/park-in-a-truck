import { describe, expect, it } from 'vitest';
import { itemWhere, uniqueLabels } from '../where';

describe('where an item is, in words (build-lead A13)', () => {
  const W = 16;
  it('measures from the entrance and the nearer side, from the item’s own edges', () => {
    // a 4 x 1.5 bench along the length, its centre 31 ft in and 1 ft from the y1 (left) side
    expect(itemWhere({ x: 31, y: 14.25, w: 4, h: 1.5, rotationDeg: 0 }, W)).toBe('29 ft from the entrance, 1 ft from the left side');
    expect(itemWhere({ x: 10, y: 3, w: 2, h: 2, rotationDeg: 0 }, W)).toBe('9 ft from the entrance, 2 ft from the right side');
    expect(itemWhere({ x: 10, y: 8, w: 2, h: 2, rotationDeg: 0 }, W)).toBe('9 ft from the entrance, in the middle across');
    expect(itemWhere({ x: 1, y: 15, w: 2, h: 2, rotationDeg: 0 }, W)).toBe('at the entrance, against the left side');
  });
  it('turns with the item, and swaps sides when the park is flipped', () => {
    // turned 90°: the 4-ft length now runs across the park
    expect(itemWhere({ x: 31, y: 13, w: 4, h: 1.5, rotationDeg: 90 }, W)).toBe('30 ft from the entrance, 1 ft from the left side');
    expect(itemWhere({ x: 31, y: 13, w: 4, h: 1.5, rotationDeg: 90 }, W, false)).toBe('30 ft from the entrance, 1 ft from the right side');
  });
  it('numbers entries that would read the same', () => {
    expect(uniqueLabels(['Stool — a', 'Bench — b', 'Stool — a'])).toEqual(['Stool — a (#1)', 'Bench — b', 'Stool — a (#2)']);
  });
});
