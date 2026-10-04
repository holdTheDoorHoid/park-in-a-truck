import { describe, expect, it } from 'vitest';
import { makeFrame, area, bearingOf, unitFromBearing, lngLatToTile, tileToLngLat, type Vec2 } from '../geo';
import { minAreaRect, computeSiteFrame, siteToLocal, localToSite, streetKey } from '../rect';
import { makePlacement, parkToSite, siteToPark, parkToLocal, localToPark, computeOverhang, placementSummary } from '../placement';
import { buildLocalSite } from '../localsite';
import dover from '../fixtures/dover.json';
import greenway from '../fixtures/greenway.json';
import type { SiteContext } from '../site';

const rot = (p: Vec2, deg: number, c: Vec2 = [0, 0]): Vec2 => {
  const r = (deg * Math.PI) / 180;
  const x = p[0] - c[0];
  const y = p[1] - c[1];
  return [c[0] + x * Math.cos(r) - y * Math.sin(r), c[1] + x * Math.sin(r) + y * Math.cos(r)];
};

describe('feet <-> lng/lat', () => {
  it('round-trips exactly around a Philadelphia lot', () => {
    const f = makeFrame([-75.1825, 39.9767]);
    for (const p of [[0, 0], [123.4, -56.7], [-300, 300], [0.01, 999]] as Vec2[]) {
      const back = f.toLocal(f.toLngLat(p));
      expect(back[0]).toBeCloseTo(p[0], 6);
      expect(back[1]).toBeCloseTo(p[1], 6);
    }
  });
  it('has the right scale (about 364,000 ft per degree of latitude, 279,000 per degree of longitude at 40° N)', () => {
    const f = makeFrame([-75.16, 39.95]);
    expect(f.ftPerDegLat).toBeGreaterThan(363000);
    expect(f.ftPerDegLat).toBeLessThan(365000);
    expect(f.ftPerDegLng).toBeGreaterThan(278000);
    expect(f.ftPerDegLng).toBeLessThan(281000);
  });
  it('measures the Dover St parcel at its recorded 700 sq ft', () => {
    const f = makeFrame(dover.lot.polygon[0] as Vec2);
    const ring = (dover.lot.polygon as Vec2[]).slice(0, -1).map(f.toLocal);
    expect(area(ring)).toBeGreaterThan(680);
    expect(area(ring)).toBeLessThan(720);
  });
  it('converts bearings both ways', () => {
    for (const b of [0, 45, 90, 179, 270, 359]) expect(bearingOf(unitFromBearing(b))).toBeCloseTo(b, 9);
  });
  it('maps tiles both ways', () => {
    const [x, y] = lngLatToTile(-75.1825, 39.9767, 20);
    const [lng, lat] = tileToLngLat(x, y, 20);
    expect(lng).toBeCloseTo(-75.1825, 9);
    expect(lat).toBeCloseTo(39.9767, 9);
  });
});

describe('oriented minimum-area rectangle', () => {
  it('recovers a rotated 50 x 14 lot', () => {
    for (const deg of [0, 17, 33.3, 90, 128, -61]) {
      const pts = ([[0, 0], [50, 0], [50, 14], [0, 14]] as Vec2[]).map((p) => rot(p, deg, [25, 7]));
      const r = minAreaRect(pts);
      expect(r.lengthFt).toBeCloseTo(50, 6);
      expect(r.widthFt).toBeCloseTo(14, 6);
      expect(r.center[0]).toBeCloseTo(25, 6);
      expect(r.center[1]).toBeCloseTo(7, 6);
      // long axis parallel to the rotated x axis (either direction)
      const ux = Math.cos((deg * Math.PI) / 180);
      const uy = Math.sin((deg * Math.PI) / 180);
      expect(Math.abs(r.u[0] * ux + r.u[1] * uy)).toBeCloseTo(1, 6);
    }
  });
  it('fits an irregular (trapezoid) lot with the long side flush to an edge', () => {
    const pts: Vec2[] = [[0, 0], [90, 0], [90, 35], [10, 35]];
    const r = minAreaRect(pts);
    expect(r.lengthFt).toBeCloseTo(90, 6);
    expect(r.widthFt).toBeCloseTo(35, 6);
  });
  it('builds a site frame whose corners round-trip', () => {
    const parcel: Vec2[] = ([[0, 0], [60, 0], [60, 20], [0, 20]] as Vec2[]).map((p) => rot(p, 30));
    const f = computeSiteFrame({ parcel });
    for (const p of [[0, 0], [60, 20], [12.5, 3]] as Vec2[]) {
      const back = localToSite(f, siteToLocal(f, p));
      expect(back[0]).toBeCloseTo(p[0], 9);
      expect(back[1]).toBeCloseTo(p[1], 9);
    }
    // +y is to the LEFT of +x
    expect(f.u[0] * f.v[1] - f.u[1] * f.v[0]).toBeCloseTo(1, 9);
  });
  it('normalises street names', () => {
    expect(streetKey('1322 N DOVER ST')).toBe('DOVER');
    expect(streetKey('S 60TH ST')).toBe('60TH');
    expect(streetKey('GREENWAY AVE')).toBe('GREENWAY');
  });
});

describe('the demo lots', () => {
  const ctx = (f: any): SiteContext => ({ lot: f.lot, ...f.surroundings, source: 'fixture' });
  it('Dover St: interior lot, about 50 x 14, entrance on Dover St (east side), +x heading west', () => {
    const s = buildLocalSite(ctx(dover));
    expect(s.frame.lengthFt).toBeGreaterThan(48);
    expect(s.frame.lengthFt).toBeLessThan(52);
    expect(s.frame.widthFt).toBeGreaterThan(13);
    expect(s.frame.widthFt).toBeLessThan(15);
    expect(s.frame.lotKind).toBe('interior');
    expect(s.frame.streetEdges).toEqual(['x0']);
    expect(s.frame.bearingDeg).toBeGreaterThan(260);
    expect(s.frame.bearingDeg).toBeLessThan(290);
    expect(s.buildings.length).toBeGreaterThan(50);
  });
  it('60th & Greenway: corner lot, entrance on 60th St, Greenway Ave along a long side', () => {
    const s = buildLocalSite(ctx(greenway));
    expect(s.frame.lotKind).not.toBe('interior');
    expect(s.frame.streetEdges).toContain('x0');
    expect(s.frame.lengthFt).toBeGreaterThan(65);
    expect(s.frame.widthFt).toBeGreaterThan(18);
  });
});

describe('placing the park on the lot', () => {
  const frame = { lengthFt: 50.3, widthFt: 14.1 };
  it('puts the entrance on the entrance edge and centres the width', () => {
    const pl = makePlacement(frame, 50, 14);
    expect(parkToSite(pl, [0, 0])).toEqual([0, expect.closeTo(0.05, 9)]);
    expect(parkToSite(pl, [50, 14])[0]).toBeCloseTo(50, 9);
  });
  it('flips left-right and turns, and always inverts', () => {
    for (const turn of [0, 1, 2, 3] as const) {
      for (const flip of [false, true]) {
        const pl = makePlacement(frame, 48, 12, turn, flip, [1, -0.5]);
        for (const p of [[0, 0], [48, 12], [7.5, 3.25]] as Vec2[]) {
          const back = siteToPark(pl, parkToSite(pl, p));
          expect(back[0]).toBeCloseTo(p[0], 9);
          expect(back[1]).toBeCloseTo(p[1], 9);
        }
        const c = parkToSite(pl, [24, 6]);
        // the park centre lands where expected (shift applied)
        if (turn % 2) expect(c).toEqual([expect.closeTo(frame.lengthFt / 2 + 1, 9), expect.closeTo(frame.widthFt / 2 - 0.5, 9)]);
      }
    }
    const flipped = makePlacement(frame, 50, 14, 0, true);
    expect(parkToSite(flipped, [0, 0])[1]).toBeCloseTo(14.05, 9);
    const turned = makePlacement(frame, 50, 14, 2, false);
    expect(parkToSite(turned, [0, 0])[0]).toBeCloseTo(50.3, 9);
  });
  it('maps to lng/lat through the site frame and reports a placement', () => {
    const s = buildLocalSite({ lot: dover.lot as any, ...(dover.surroundings as any), source: 'fixture' });
    const pl = makePlacement(s.frame, 50, 14);
    const p: Vec2 = [10, 4];
    const back = localToPark(pl, s.frame, parkToLocal(pl, s.frame, p));
    expect(back[0]).toBeCloseTo(10, 9);
    expect(back[1]).toBeCloseTo(4, 9);
    const sum = placementSummary(pl, s.frame, s.lf);
    expect(sum.bearingDeg).toBeCloseTo(s.frame.bearingDeg, 1);
  });
  it('finds overhang where a rectangular park meets a slanted lot line', () => {
    // lot: 40 x 20 rectangle with its far end cut on a slant (x1 edge from (40,0) to (30,20))
    const parcel: Vec2[] = [[0, 0], [40, 0], [30, 20], [0, 20]];
    const f = computeSiteFrame({ parcel });
    const pl = makePlacement(f, Math.floor(f.lengthFt), Math.floor(f.widthFt));
    const o = computeOverhang(pl, f, parcel, [
      { id: 'in', x: 5, y: 5, w: 2, h: 2, rotationDeg: 0 },
      { id: 'out', x: pl.parkL - 1, y: pl.parkW - 1, w: 2, h: 2, rotationDeg: 0 },
    ]);
    expect(o.outsideSqFt).toBeGreaterThan(50);
    expect(o.outsideSqFt).toBeLessThan(150);
    expect(o.items).toEqual(['out']);
    const rect = computeOverhang(makePlacement(f, 20, 10), f, parcel);
    expect(rect.outsideSqFt).toBe(0);
  });
});

describe('trimming footprints that poke into the lot', () => {
  it('cuts a neighbour back to the lot line and leaves others alone', async () => {
    const { trimToLot } = await import('../localsite');
    const { area } = await import('../geo');
    const lot: Vec2[] = [[0, 0], [50, 0], [50, 14], [0, 14]];
    const poking: Vec2[] = [[0, -20], [50, -20], [50, 3], [0, 3]]; // 3 ft into the lot
    const t = trimToLot(poking, lot);
    expect(area(t)).toBeCloseTo(50 * 20, 6);
    expect(Math.max(...t.map((p) => p[1]))).toBeCloseTo(0, 9);
    const clear: Vec2[] = [[0, -20], [50, -20], [50, -1], [0, -1]];
    expect(trimToLot(clear, lot)).toBe(clear);
  });
});
