// End-to-end lookups replayed from fixtures recorded from the real City APIs.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { lookupLot } from '../lookup';
import { searchAddresses } from '../search';
import { siteFactsFromLot, mergeSiteFacts, lotGeometry } from '../choose';
import { PhillyError } from '../types';
import { useFixtures } from './fixtures';
import type { LotRecord } from '../../types';

let fx: ReturnType<typeof useFixtures>;
beforeAll(() => {
  fx = useFixtures();
});
afterAll(() => fx.restore());

const lots: Record<string, LotRecord> = {};
async function lot(q: string) {
  return (lots[q] ??= await lookupLot(q));
}

describe('lookupLot — 1322 N Dover St (City-owned, mid-block)', () => {
  it('owner, category, zoning, size from City records', async () => {
    const r = await lot('1322 N Dover St');
    expect(r.address).toBe('1322 N DOVER ST');
    expect(r.opa).toBe('292140710');
    expect(r.owners).toEqual(['CITY OF PHILA']);
    expect(r.ownerType).toBe('city');
    expect(r.category).toBe('VACANT LAND');
    expect(r.zoning).toBe('RSA-5');
    expect(r.areaSqFt).toBe(700);
    expect(r.councilDistrict).toBe('5');
    expect(r.rcos?.map((x) => x.name)).toContain('Brewerytown Sharswood Community Civic Association');
    expect(r.floodZone).toBe('X');
    expect(r.polygon.length).toBeGreaterThanOrEqual(4);
    expect(r.pwdParcelId).toBe(272148);
  });
  it('is not on the City vacant-land list (OPA still calls it vacant land)', async () => {
    expect((await lot('1322 N Dover St')).vacantLand).toBe(false);
  });
  it('mid-block facing N Dover St, size A', async () => {
    const r = await lot('1322 N Dover St');
    const g = lotGeometry(r)!;
    expect(r.lotType).toBe('mid-block');
    expect(g.streetEdges).toEqual(['x0']);
    expect(g.streets[0]).toMatchObject({ side: 'x0', name: 'N DOVER ST' });
    expect(g.lotKind).toBe('interior');
    expect(g.size).toMatchObject({ id: 'A', exact: true });
    // N Dover St runs north–south and the even side is west of it: +x points roughly west.
    expect(g.rect.bearingDeg).toBeGreaterThan(260);
    expect(g.rect.bearingDeg).toBeLessThan(290);
  });
  it('lists the pages a person can check', async () => {
    const r = await lot('1322 N Dover St');
    const urls = r.sources.map((s) => s.url);
    expect(urls).toContain('https://atlas.phila.gov/1322%20N%20DOVER%20ST/property');
    expect(urls).toContain('https://property.phila.gov/?p=292140710');
  });
});

// Rectangular lots: the oriented rectangle should match OPA frontage × depth.
describe.each([
  ['1322 N Dover St', 14, 50, 1],
  ['1300 N Dover St', 15, 50, 1],
  ['2061 S 60th St', 22, 69, 1.1],
  ['1334 N Marston St', 12, 100, 1],
  ['1643 1/2 N Marshall St', 8, 70, 1],
  // the parcel outline is 101.9 ft deep where OPA records 100
  ['2031-35 S 60th St', 45, 100, 2],
])('%s: geometry vs OPA frontage × depth', (q, front, depth, tol) => {
  it(`short ≈ ${front} ft, long ≈ ${depth} ft (±${tol})`, async () => {
    const r = await lot(q);
    const g = lotGeometry(r)!;
    expect(r.frontageFt).toBe(front);
    expect(r.depthFt).toBe(depth);
    expect(Math.abs(g.widthFt - front)).toBeLessThanOrEqual(tol);
    expect(Math.abs(g.lengthFt - depth)).toBeLessThanOrEqual(tol);
    expect(g.rectangularity).toBeGreaterThan(0.95);
    expect(g.irregular).toBe(false);
    // the measured polygon sides add up to the rectangle's perimeter
    const perim = g.edges.reduce((s, e) => s + e.lengthFt, 0);
    expect(Math.abs(perim - 2 * (g.lengthFt + g.widthFt))).toBeLessThan(2);
  });
});

describe('lot types and street edges', () => {
  it('2061 S 60th St (60th & Greenway) is a corner lot, streets on x0 and y0 → corner-right', async () => {
    const r = await lot('2061 S 60th St');
    const g = lotGeometry(r)!;
    expect(r.ownerType).toBe('private');
    expect(r.lotType).toBe('corner');
    expect(g.streets.map((s) => [s.side, s.name])).toEqual([
      ['x0', 'S 60TH ST'],
      ['y0', 'GREENWAY AVE'],
    ]);
    expect(g.lotKind).toBe('corner-right');
    expect(g.size).toMatchObject({ id: 'B', exact: true });
  });
  it('1300 N Dover St (Dover & Thompson) is a corner lot with the side street on y1 → corner-left', async () => {
    const r = await lot('1300 N Dover St');
    const g = lotGeometry(r)!;
    expect(r.ownerType).toBe('pha');
    expect(r.lotType).toBe('corner');
    expect(g.streetEdges).toEqual(['x0', 'y1']);
    expect(g.streets.find((s) => s.side === 'y1')!.name).toBe('W THOMPSON ST');
    expect(g.lotKind).toBe('corner-left');
    // the measuring start point is on the side street corner, and the long side is walked first
    expect(g.edges[0]!.side).toBe('y1');
  });
  it('1334 N Marston St: Land Bank, on the vacant list, a hair under size A (11.7 ft wide)', async () => {
    const r = await lot('1334 N Marston St');
    const g = lotGeometry(r)!;
    expect(r.ownerType).toBe('landbank');
    expect(r.vacantLand).toBe(true);
    expect(r.lotType).toBe('mid-block');
    expect(g.size.tooSmall).toBe(true);
  });
  it('2031-35 S 60th St: private LLC, 45 × 100, size E', async () => {
    const r = await lot('2031-35 S 60th St');
    expect(r.owners).toEqual(['ATAKUM LLC']);
    expect(lotGeometry(r)!.size).toMatchObject({ id: 'E', exact: true });
    expect(r.lotType).toBe('mid-block');
  });
  it('1643 1/2 N Marshall St: a breezeway (8 ft wide) → alley', async () => {
    const r = await lot('1643 1/2 N Marshall St');
    expect(r.opa).toBe('201125701'); // AIS knows the address without its OPA account; found via OPA
    expect(r.lotType).toBe('alley');
    expect(lotGeometry(r)!.widthFt).toBeLessThan(9);
  });
  it('1440R N 4th St: long strip reaching streets at both ends → alley', async () => {
    const r = await lot('1440R N 4th St');
    const g = lotGeometry(r)!;
    expect(r.lotType).toBe('alley');
    expect(g.streetEdges).toEqual(['x0', 'x1']);
    expect(g.streets.map((s) => s.name).sort()).toEqual(['N 4TH ST', 'N LAWRENCE ST']);
  });
  it('1717R-31 N 31st St: an irregular rear lot with no street frontage', async () => {
    const r = await lot('1717R-31 N 31st St');
    const g = lotGeometry(r)!;
    expect(r.ownerType).toBe('redevelopment');
    expect(r.lotType).toBe('unknown');
    expect(g.irregular).toBe(true);
    expect(g.streetEdges).toEqual([]);
  });
});

describe('SiteFacts written on choosing a lot', () => {
  it('carries size, edges, rect, street edges and lot kind', async () => {
    const f = siteFactsFromLot(await lot('2061 S 60th St'));
    expect(f).toMatchObject({ sizeId: 'B', sizeExact: true, tooSmall: false, tooBig: false, streetEdges: ['x0', 'y0'], lotKind: 'corner-right' });
    expect(f.lengthFt).toBeCloseTo(70, 0);
    expect(f.widthFt).toBeCloseTo(21.5, 0);
    expect(f.rect!.center[0]).toBeCloseTo(-75.2288, 3);
  });
  it('merging keeps the planner\'s keys and replaces the lot keys', async () => {
    const prev = { sunClass: 'mostly-sun' as const, treesKept: 2, sizeId: 'E' as const, lotKind: 'interior' as const };
    const merged = mergeSiteFacts(prev, siteFactsFromLot(await lot('1300 N Dover St')));
    expect(merged).toMatchObject({ sunClass: 'mostly-sun', treesKept: 2, sizeId: 'A', lotKind: 'corner-left' });
  });
  it('falls back to OPA frontage × depth without an outline', () => {
    const f = siteFactsFromLot({ frontageFt: 16, depthFt: 50, extra: {} } as unknown as LotRecord);
    expect(f).toMatchObject({ sizeId: 'A', lengthFt: 50, widthFt: 16, lotKind: 'interior' });
  });
});

describe('searchAddresses (type-ahead)', () => {
  it('finds a half-typed street from the property list', async () => {
    const s = await searchAddresses('1322 N Dov');
    expect(s[0]).toMatchObject({ label: '1322 N DOVER ST', opa: '292140710', source: 'opa' });
  });
  it('offers both N and S Dover for "1322 dover"', async () => {
    expect((await searchAddresses('1322 dover')).map((s) => s.label)).toEqual(['1322 N DOVER ST', '1322 S DOVER ST']);
  });
  it('understands intersections, with "&" or "and"', async () => {
    for (const q of ['S 60th St & Greenway Ave', '60th and Greenway']) {
      const [s] = await searchAddresses(q);
      expect(s).toMatchObject({ kind: 'intersection', label: 'GREENWAY AVE & S 60TH ST' });
      expect(s!.lngLat![1]).toBeCloseTo(39.9314, 3);
    }
  });
  it('accepts an OPA account number', async () => {
    expect((await searchAddresses('292140710'))[0]).toMatchObject({ label: '1322 N DOVER ST', kind: 'address' });
  });
  it('returns nothing (not an error) for nonsense and short input', async () => {
    expect(await searchAddresses('asdfqwer')).toEqual([]);
    expect(await searchAddresses('13')).toEqual([]);
  });
});

describe('friendly errors', () => {
  it('an intersection → nearby vacant lots to pick from', async () => {
    const e = await lookupLot('S 60th St & Greenway Ave').catch((x) => x);
    expect(e).toBeInstanceOf(PhillyError);
    expect(e.code).toBe('intersection');
    expect(e.message).toMatch(/street corner/);
    expect(e.suggestions[0]).toMatchObject({ label: '2061 S 60TH ST' });
    expect(e.suggestions.length).toBeGreaterThan(3);
  });
  it('a service that cannot be reached → city-down with a reassuring message', async () => {
    const e = await lookupLot('9999 Nowhere Rd').catch((x) => x);
    expect(e).toBeInstanceOf(PhillyError);
    expect(e.code).toBe('city-down');
    expect(e.message).toMatch(/still saved/);
  });
  it('a bad OPA number → bad-input', async () => {
    const e = await lookupLot({ opa: '12' }).catch((x) => x);
    expect(e.code).toBe('bad-input');
  });
});
