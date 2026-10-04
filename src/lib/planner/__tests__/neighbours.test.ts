import { describe, expect, it } from 'vitest';
import dover from '../fixtures/dover.json';
import { buildLocalSite } from '../localsite';
import { computeSiteFrame } from '../rect';
import { midBlockWords, sideNeighbours } from '../neighbours';
import type { Vec2 } from '../geo';
import type { SiteContext } from '../site';

describe('who is next door (veteran S6)', () => {
  const parcel: Vec2[] = [[0, 0], [60, 0], [60, 16], [0, 16]];
  const left: Vec2[] = [[2, 16], [58, 16], [58, 36], [2, 36]];
  const right: Vec2[] = [[0, -20], [55, -20], [55, 0], [0, 0]];
  const street: Vec2[] = [[-80, -5], [-30, -5], [-30, 40], [-80, 40]];
  it('says buildings on both sides only when they are there', () => {
    // lots on both sides make the long sides "closed"; the entrance is the open short end
    const f = computeSiteFrame({ parcel, parcels: [left, right], buildings: [] });
    expect(f.lotKind).toBe('interior');
    expect(midBlockWords(sideNeighbours(f, []))).toBe('Mid-block (no buildings right next to it)');
    const both = sideNeighbours(f, [left, right]);
    expect(both).toEqual({ left: true, right: true });
    expect(midBlockWords(both)).toBe('Mid-block (buildings on both sides)');
    const one = sideNeighbours(f, [left, street]);
    expect(one.left !== one.right).toBe(true);
    expect(midBlockWords(one)).toMatch(/a building on your (left|right) as you walk in, none on your (right|left)/);
  });
  it('the Dover demo lot is between rowhouses', () => {
    const s = buildLocalSite({ lot: (dover as any).lot, ...(dover as any).surroundings, source: 'fixture' } as SiteContext);
    expect(sideNeighbours(s.frame, s.buildings.map((b) => b.ring))).toEqual({ left: true, right: true });
  });
});
