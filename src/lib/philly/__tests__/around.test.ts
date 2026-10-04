// Surroundings (3D planner), neighbourhood assets (Organize) and the vacant-land map,
// replayed from fixtures recorded around 1322 N Dover St.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { lookupLot } from '../lookup';
import { fetchSurroundings } from '../surroundings';
import { nearbyAssets, ASSET_CATEGORIES, assetFieldId, assetLine } from '../assets';
import { fetchVacantLots, tilesFor } from '../vacant';
import { distanceFt } from '../geo';
import { allFixtures, useFixtures } from './fixtures';
import { setFetch } from '../http';

let fx: ReturnType<typeof useFixtures>;
beforeAll(() => {
  fx = useFixtures();
});
afterAll(() => fx.restore());

describe('fetchSurroundings', () => {
  it('returns buildings with heights, parcels, trees and streets within the radius', async () => {
    const lot = await lookupLot('1322 N Dover St');
    const s = await fetchSurroundings(lot, 250);
    expect(s.warnings).toBeUndefined();
    expect(s.radiusFt).toBe(250);
    expect(s.buildings.length).toBeGreaterThan(50);
    expect(s.parcels.length).toBeGreaterThan(50);
    expect(s.trees.length).toBeGreaterThan(0);
    expect(new Set(s.streets.map((x) => x.name))).toEqual(new Set(['N DOVER ST', 'N 29TH ST', 'N NEWKIRK ST', 'W THOMPSON ST']));
    for (const b of s.buildings) {
      expect(b.polygon.length).toBeGreaterThanOrEqual(3);
      expect(b.heightFt).toBeGreaterThan(0);
    }
    // rowhouses on the block are about two storeys
    const nextDoor = s.buildings.find((b) => b.address === '1320 N DOVER ST')!;
    expect(nextDoor.heightFt).toBeGreaterThan(18);
    expect(nextDoor.heightFt).toBeLessThan(35);
    expect(nextDoor.baseElevationFt).toBeGreaterThan(50);
    // the lot itself is among the parcels
    expect(s.parcels.some((p) => p.opa === '292140710')).toBe(true);
    // everything is near the lot
    for (const t of s.trees) expect(distanceFt(t.lngLat, s.center)).toBeLessThan(260);
    expect(s.trees[0]!.species).toMatch(/[A-Z]/);
  });
});

describe('nearbyAssets', () => {
  it('returns every Organize category, nearest first', async () => {
    const lot = await lookupLot('1322 N Dover St');
    const groups = await nearbyAssets(lot, 1320);
    expect(groups.map((g) => g.id)).toEqual(ASSET_CATEGORIES.map((c) => c.id));
    for (const g of groups) {
      expect(g.error).toBeUndefined();
      const d = g.items.map((i) => i.distanceFt ?? 0);
      expect(d).toEqual([...d].sort((a, b) => a - b));
    }
    const by = Object.fromEntries(groups.map((g) => [g.id, g]));
    expect(by.rcos!.items.map((i) => i.name)).toContain('Brewerytown Sharswood Community Civic Association');
    expect(by.council!.items[0]!.name).toBe('Council District 5 — Councilmember Jeffery Young Jr.');
    // the member's own page, not the Council home page (veteran S14)
    expect(by.council!.items[0]!.url).toBe('https://phlcouncil.com/jefferyyoungjr/');
    expect(by.schools!.items[0]!.name).toBe('Robert Morris School');
    expect(by.gardens!.items[0]!.name).toBe('Brewerytown Garden');
    expect(by.parks!.items.map((i) => i.name)).toContain('Athletic Recreation Center');
    expect(by.libraries!.items[0]!.name).toBe('Cecil B. Moore Library');
    expect(by.hospitals!.items.length).toBeGreaterThan(0); // whole-layer workaround
    expect(by.universities!.items.map((i) => i.name)).toContain('Drexel University');
    // universities are one entry per school, not per building
    const names = by.universities!.items.map((i) => i.name);
    expect(new Set(names).size).toBe(names.length);
    // a multi-part historic district is measured to its nearest part
    const paving = by.historic!.items.find((i) => /Paving/.test(i.name))!;
    expect(paving.distanceFt).toBeLessThan(1320);
  });
  it('a group made of two layers still shows the layer that loaded (veteran S7)', async () => {
    const lot = await lookupLot('1322 N Dover St');
    const all = new Map<string, unknown>();
    for (const f of allFixtures()) for (const [u, r] of Object.entries(f.responses)) all.set(u, r);
    setFetch(async (url: string) => {
      if (url.includes('PPR_Urban_Agriculture_Projects')) throw new Error('offline');
      const r = all.get(url) as { status: number; body: unknown } | undefined;
      if (!r) throw new Error(`no fixture: ${url}`);
      const text = JSON.stringify(r.body);
      return { ok: r.status < 300, status: r.status, json: async () => JSON.parse(text), text: async () => text };
    });
    try {
      const [gardens] = await nearbyAssets(lot, 1320, { only: ['gardens'] });
      expect(gardens!.error).toBeUndefined();
      expect(gardens!.warning).toMatch(/Part of this list/);
      expect(gardens!.items[0]!.name).toBe('Brewerytown Garden');
    } finally {
      fx = useFixtures();
    }
  });
  it('saves as readable lines under organize.assets-<category>', () => {
    expect(assetFieldId('schools')).toBe('organize.assets-schools');
    expect(assetLine({ id: 'x', name: 'Robert Morris School', address: '2600 W Thompson St' })).toBe('Robert Morris School — 2600 W Thompson St');
  });
});

describe('fetchVacantLots', () => {
  it('snaps a bbox to small cached tiles', () => {
    expect(tilesFor([-75.184, 39.9755, -75.181, 39.978])).toHaveLength(2);
  });
  it('returns vacant parcels coloured public/private', async () => {
    const v = await fetchVacantLots([-75.184, 39.9755, -75.181, 39.978]);
    expect(v.truncated).toBe(false);
    expect(v.features.length).toBeGreaterThan(100);
    const marston = v.features.find((f) => f.properties.address === '1334 N MARSTON ST')!;
    expect(marston.properties).toMatchObject({ ownerType: 'landbank', isPublic: true, zoning: 'RSA-5' });
    expect(marston.properties.areaSqFt).toBeGreaterThan(1000);
    expect(v.features.some((f) => !f.properties.isPublic)).toBe(true);
    // ids are unique even where tiles overlap
    expect(new Set(v.features.map((f) => f.id)).size).toBe(v.features.length);
  });
  it('refuses huge areas instead of crawling', async () => {
    const v = await fetchVacantLots([-75.3, 39.85, -75.0, 40.1]);
    expect(v).toMatchObject({ truncated: true, features: [] });
  });
});
