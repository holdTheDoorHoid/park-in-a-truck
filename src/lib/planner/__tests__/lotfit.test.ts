import { describe, expect, it } from 'vitest';
import dover from '../fixtures/dover.json';
import { buildLocalSite } from '../localsite';
import { computeSiteFrame } from '../rect';
import { bestSlide, inscribedRect, slideRoom } from '../lotfit';
import { computeOverhang, makePlacement } from '../placement';
import { parkDims } from '../design';
import type { Vec2 } from '../geo';
import type { SiteContext } from '../site';

// a 96 x 17 ft lot whose far end is 1.5 ft out of square (like 91 E Wister St in the test)
const skewed: Vec2[] = [[0, 0], [96, 0], [97.5, 17.3], [1.2, 17.3]];

describe('stretching the park to fit INSIDE the lot (build-lead A6)', () => {
  it('a rectangle lot fits the whole frame', () => {
    const parcel: Vec2[] = [[0, 0], [60, 0], [60, 20], [0, 20]];
    const f = computeSiteFrame({ parcel });
    const a = inscribedRect(f, parcel);
    expect(a.lengthFt).toBeGreaterThanOrEqual(60);
    expect(a.widthFt).toBeGreaterThanOrEqual(20);
  });
  it('on a skewed lot the stretched park sits inside the lot line', () => {
    const f = computeSiteFrame({ parcel: skewed });
    const a = inscribedRect(f, skewed);
    expect(a.lengthFt).toBeLessThan(f.lengthFt);
    const dims = parkDims(true, { lengthFt: 64, widthFt: 16 }, a);
    // the old stretch (to the frame round the lot) hangs over; the new one fits
    const old = makePlacement(f, Math.floor(f.lengthFt + 0.25), Math.floor(f.widthFt + 0.25));
    expect(computeOverhang(old, f, skewed).outsideSqFt).toBeGreaterThan(0);
    const pl = makePlacement(f, dims.lengthFt, dims.widthFt, 0, false, [0, 0], a);
    expect(computeOverhang(pl, f, skewed).outsideSqFt).toBe(0);
    // and it still fills most of the lot
    expect(dims.lengthFt).toBeGreaterThanOrEqual(94);
    expect(dims.widthFt).toBeGreaterThanOrEqual(16);
  });
  it('keeps the demo lot at its full 50 x 14 ft', () => {
    const s = buildLocalSite({ lot: (dover as any).lot, ...(dover as any).surroundings, source: 'fixture' } as SiteContext);
    expect(parkDims(true, { lengthFt: 44, widthFt: 12 }, inscribedRect(s.frame, s.parcel))).toEqual({ lengthFt: 50, widthFt: 14 });
  });
  it('slide buttons: no room to push a fitting park over the line; the best slide reduces any overhang', () => {
    const f = computeSiteFrame({ parcel: skewed });
    const a = inscribedRect(f, skewed);
    const dims = parkDims(true, { lengthFt: 64, widthFt: 16 }, a);
    const at = (L: number, W: number) => (s: Vec2) => computeOverhang(makePlacement(f, L, W, 0, false, s, a), f, skewed).outsideSqFt;
    const room = slideRoom(at(dims.lengthFt, dims.widthFt), [0, 0]);
    expect(room.now).toBe(0);
    expect(Object.values(room.blocked).some(Boolean)).toBe(true);
    // a park slid off to one side comes back to the best fit
    const slid: Vec2 = [3, -2];
    const outside = at(dims.lengthFt, dims.widthFt);
    expect(outside(slid)).toBeGreaterThan(0);
    expect(outside(bestSlide(outside))).toBe(0);
    // a park too big for the lot: nothing blocked, and the best slide is no worse than where it is
    const big = at(100, 18);
    expect(Object.values(slideRoom(big, [0, 0]).blocked).some(Boolean)).toBe(false);
    expect(big(bestSlide(big))).toBeLessThanOrEqual(big([0, 0]));
  });
});
