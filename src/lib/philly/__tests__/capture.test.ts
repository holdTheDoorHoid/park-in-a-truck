// Records fixtures from the REAL City APIs. Skipped unless PHILLY_CAPTURE=1:
//   PHILLY_CAPTURE=1 npx vitest run src/lib/philly/__tests__/capture.test.ts
// Each lot is looked up with the real client; every response it receives is saved.

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'vitest';
import { setFetch } from '../http';
import { lookupLot } from '../lookup';
import { searchAddresses } from '../search';
import { fetchSurroundings } from '../surroundings';
import { nearbyAssets } from '../assets';
import { fetchVacantLots } from '../vacant';
import { findStreet } from '../streets';
import { FIXTURE_DIR, type Recorded } from './fixtures';

export const LOTS: { name: string; query: string; why: string }[] = [
  { name: 'dover-1322', query: '1322 N Dover St', why: 'City-owned mid-block vacant lot (14 x 50)' },
  { name: 's60th-2061', query: '2061 S 60th St', why: 'Corner of S 60th St & Greenway Ave (PiaT park area), private owner' },
  { name: 'marston-1334', query: '1334 N Marston St', why: 'Philadelphia Land Bank lot on the vacant list' },
  { name: 's60th-2031', query: '2031-35 S 60th St', why: 'Large privately owned (LLC) vacant lot, 45 x 100' },
  { name: 'dover-1300', query: '1300 N Dover St', why: 'PHA-owned lot at the corner of Dover & Thompson' },
  { name: 'marshall-1643h', query: '1643 1/2 N Marshall St', why: 'Long narrow City-owned breezeway (8 x 70)' },
  { name: 'n31st-1717r', query: '1717R-31 N 31st St', why: 'Redevelopment Authority rear lot; OPA says 8 x 117 but the parcel is an irregular wedge' },
  { name: 'n4th-1440r', query: '1440R N 4th St', why: 'Long narrow City-owned strip (OPA 10 x 237)' },
];

function recorder(store: Record<string, Recorded>) {
  setFetch(async (url: string, init?: { signal?: AbortSignal }) => {
    const res = await fetch(url, { signal: init?.signal });
    const text = await res.text();
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
    store[url] = { status: res.status, body };
    return { ok: res.ok, status: res.status, json: async () => JSON.parse(text), text: async () => text };
  });
}

function save(name: string, query: string, responses: Record<string, Recorded>) {
  writeFileSync(
    join(FIXTURE_DIR, `${name}.json`),
    JSON.stringify({ name, query, capturedAt: new Date().toISOString(), responses }),
  );
}

describe.skipIf(!process.env.PHILLY_CAPTURE)('capture City API fixtures (network)', () => {
  for (const lot of LOTS) {
    it(`lookupLot ${lot.query}`, { timeout: 60_000 }, async () => {
      const store: Record<string, Recorded> = {};
      recorder(store);
      const r = await lookupLot(lot.query);
      console.log(lot.query, '→', r.address, r.ownerType, r.lotType, (r.extra as any)?.geometry?.lengthFt, (r.extra as any)?.geometry?.widthFt);
      save(lot.name, lot.query, store);
    });
  }

  it('search type-ahead', { timeout: 60_000 }, async () => {
    const store: Record<string, Recorded> = {};
    recorder(store);
    for (const q of ['1322 N Dov', '1322 dover', 'S 60th St & Greenway Ave', '60th and Greenway', '292140710', 'asdfqwer'])
      console.log(q, (await searchAddresses(q)).map((s) => s.label));
    save('search', 'type-ahead', store);
  });

  it('street-only search (no house number)', { timeout: 60_000 }, async () => {
    const store: Record<string, Recorded> = {};
    recorder(store);
    for (const q of ['N Uber St', 'uber street', 'Nowhereville Rd']) console.log(q, (await findStreet(q)).map((m) => `${m.name}:${m.blocks.length}`));
    save('streets-uber', 'street names without a house number', store);
  });

  it('intersection lookup', { timeout: 60_000 }, async () => {
    const store: Record<string, Recorded> = {};
    recorder(store);
    try {
      await lookupLot('S 60th St & Greenway Ave');
    } catch (e) {
      console.log((e as Error).message, (e as any).suggestions?.map((s: any) => s.label));
    }
    save('intersection-60th-greenway', 'S 60th St & Greenway Ave', store);
  });

  it('surroundings, assets and vacant map tiles around 1322 N Dover St', { timeout: 120_000 }, async () => {
    const store: Record<string, Recorded> = {};
    recorder(store);
    const lot = await lookupLot('1322 N Dover St');
    const s = await fetchSurroundings(lot, 250);
    console.log('surroundings', s.buildings.length, s.parcels.length, s.trees.length, s.streets.length, s.warnings);
    const a = await nearbyAssets(lot, 1320);
    console.log('assets', a.map((g) => `${g.id}:${g.items.length}${g.error ? ' ERR' : ''}`).join(' '));
    const v = await fetchVacantLots([-75.1840, 39.9755, -75.1810, 39.9780]);
    console.log('vacant', v.features.length, v.truncated);
    save('dover-1322-around', 'surroundings + assets + vacant', store);
  });
});
