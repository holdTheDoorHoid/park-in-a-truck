// A street name with no house number takes the map to that street (usability test
// 2026-10-04, novice-phone F1: "N Uber St" in "Go to an address or corner").
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { findStreet, looksLikeStreetOnly, streetCore } from '../streets';
import { useFixtures } from './fixtures';

describe('looksLikeStreetOnly', () => {
  it('street names without a number', () => {
    for (const q of ['N Uber St', 'uber street', 'Uber', 'North 22nd Street', 'Germantown Ave']) expect(looksLikeStreetOnly(q), q).toBe(true);
  });
  it('not addresses, corners or OPA numbers', () => {
    for (const q of ['2233 N Uber St', '60th & Greenway', 'S 60th St and Greenway Ave', '292140710', 'ab', '  ']) expect(looksLikeStreetOnly(q), q).toBe(false);
  });
  it('core name for a loose search', () => {
    expect(streetCore('N UBER ST')).toBe('UBER');
    expect(streetCore('N 22ND ST')).toBe('22ND');
    expect(streetCore('GERMANTOWN AVE')).toBe('GERMANTOWN');
    expect(streetCore('ST')).toBe('ST');
  });
});

describe('findStreet (fixtures)', () => {
  let fx: ReturnType<typeof useFixtures>;
  beforeAll(() => {
    fx = useFixtures();
  });
  afterAll(() => fx.restore());

  it('"N Uber St" → its blocks in address order', async () => {
    const [m, ...rest] = await findStreet('N Uber St');
    expect(rest).toEqual([]);
    expect(m!.name).toBe('N UBER ST');
    const hundreds = m!.blocks.map((b) => b.hundred);
    expect(hundreds).toContain(2200);
    expect(hundreds).toEqual([...hundreds].sort((a, b) => a - b));
    const b2200 = m!.blocks.find((b) => b.hundred === 2200)!;
    expect(b2200.label).toBe('2200 block');
    // a block is a few hundred feet: well under 0.01° across
    expect(b2200.bbox[2] - b2200.bbox[0]).toBeLessThan(0.01);
    expect(b2200.bbox[3] - b2200.bbox[1]).toBeLessThan(0.01);
  });
  it('"uber street" → both Uber Streets to choose from', async () => {
    const m = await findStreet('uber street');
    expect(m.map((x) => x.name)).toEqual(['N UBER ST', 'S UBER ST']);
    expect(m.every((x) => x.blocks.length === 0)).toBe(true);
  });
  it('a street that does not exist → nothing', async () => {
    expect(await findStreet('Nowhereville Rd')).toEqual([]);
  });
});
