import { describe, expect, it } from 'vitest';
import { imageSize } from '../imageSize';
import { asBuiltText, friendlyIn } from '../format';
import { getGuides } from '../../../data/guides';

describe('imageSize', () => {
  it('reads the size of every step drawing, so the page does not shift as they load', () => {
    for (const g of getGuides())
      for (const s of g.steps)
        for (const src of s.images) {
          const size = imageSize(src);
          expect(size, src).not.toBeNull();
          expect(size!.width).toBeGreaterThan(50);
          expect(size!.height).toBeGreaterThan(50);
        }
  });
  it('gives null for a missing file', () => {
    expect(imageSize('img/guides/nope.webp')).toBeNull();
  });
});

describe('as-built note', () => {
  it('writes inches the way people say them', () => {
    expect(friendlyIn(19.5)).toBe('19½″');
    expect(friendlyIn(20.83)).toBe('20¾″');
    expect(friendlyIn(99)).toBe('8′-3″');
    expect(friendlyIn(97.5)).toBe('8′-1½″');
    expect(friendlyIn(96)).toBe('8′');
  });
  it('names only the dimensions that differ', () => {
    expect(asBuiltText({ length: 48, width: 18, height: 18 }, { length: 48, width: 18, height: 19.5 })).toBe('about 19½″ tall');
    expect(asBuiltText({ length: 96, width: 96, height: 96 }, { length: 96, width: 99, height: 97.5 })).toBe('about 8′-3″ wide and 8′-1½″ tall');
    expect(asBuiltText({ length: 48, width: 18, height: 18 }, { length: 48.1, width: 18, height: 18 })).toBe('');
  });
});
