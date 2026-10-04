// SEAM: City data for the planner. Everything the planner needs from the City goes
// through this file. Demo lots use captured fixtures; every other lot uses the
// philly-data client (src/lib/philly/), which caches and rate-limits politely.

import type { LngLat, LotRecord } from '../types';
import { fetchSurroundings as phillySurroundings } from '../philly';

export interface SiteBuilding {
  polygon: LngLat[];
  heightFt: number;
  baseElevationFt?: number | null;
}
export interface SiteTree {
  lngLat: LngLat;
  species?: string | null;
  dbhIn?: number | null;
  heightFt?: number | null;
}
export interface SiteParcel {
  polygon: LngLat[];
  address?: string | null;
}
export interface SiteStreet {
  line: LngLat[];
  name?: string | null;
}
export interface Surroundings {
  buildings: SiteBuilding[];
  trees: SiteTree[];
  parcels: SiteParcel[];
  streets: SiteStreet[];
}

/** The lot plus what's around it, as the planner needs it. */
export interface SiteContext extends Surroundings {
  lot: LotRecord;
  source: 'fixture' | 'city' | 'none';
  /** set when something could not be loaded (shown to the person) */
  note?: string;
}

export const SURROUNDINGS_RADIUS_FT = 260;

// ---- demo lots ---------------------------------------------------------------

export const DEMO_LOTS = {
  dover: { label: '1322 N Dover St', blurb: 'A narrow lot between rowhouses (North Philadelphia)' },
  greenway: { label: '2061 S 60th St', blurb: 'A corner lot at Greenway Ave (Southwest Philadelphia)' },
} as const;
export type DemoSlug = keyof typeof DEMO_LOTS;

interface Fixture {
  slug: string;
  lot: LotRecord;
  surroundings: Surroundings;
}

async function fixture(slug: DemoSlug): Promise<Fixture> {
  const mod = slug === 'dover' ? await import('./fixtures/dover.json') : await import('./fixtures/greenway.json');
  return (mod.default ?? mod) as unknown as Fixture;
}

export async function loadDemo(slug: DemoSlug): Promise<SiteContext> {
  const f = await fixture(slug);
  return { lot: f.lot, ...f.surroundings, source: 'fixture' };
}

function fixtureFor(lot: LotRecord): DemoSlug | null {
  const id = lot.pwdParcelId;
  if (id === 272148 || /^1322 N DOVER ST/i.test(lot.address)) return 'dover';
  if (id === 183108 || /^2061 S 60TH ST/i.test(lot.address)) return 'greenway';
  return null;
}

// ---- the lot's surroundings ------------------------------------------------------

const cache = new Map<string, Promise<Surroundings>>();

/** Neighbouring buildings (with City heights), trees, parcels and streets around a lot. */
export async function fetchSurroundings(lot: LotRecord, radiusFt = SURROUNDINGS_RADIUS_FT): Promise<Surroundings> {
  const key = `${lot.pwdParcelId ?? lot.address}@${radiusFt}`;
  if (!cache.has(key)) {
    const p = phillySurroundings(lot, radiusFt).then((s) => ({
      buildings: s.buildings,
      trees: s.trees,
      streets: s.streets,
      // the lot's own parcel is not a neighbour (entrance detection looks at neighbours)
      parcels: s.parcels.filter((x) => (lot.opa ? x.opa !== lot.opa : true) && x.address !== lot.address),
    }));
    p.catch(() => cache.delete(key));
    cache.set(key, p);
  }
  return cache.get(key)!;
}

export async function loadSiteContext(lot: LotRecord): Promise<SiteContext> {
  const demo = fixtureFor(lot);
  if (demo) {
    const f = await fixture(demo);
    // the person's own record wins (it may be newer); fill the outline if it has none
    return { ...f.surroundings, lot: lot.polygon?.length >= 3 ? lot : { ...lot, polygon: f.lot.polygon }, source: 'fixture' };
  }
  if (!lot.polygon || lot.polygon.length < 3) {
    return { lot, buildings: [], trees: [], parcels: [], streets: [], source: 'none', note: 'This lot has no outline in City records yet, so the planner cannot fit a park to it.' };
  }
  try {
    const s = await fetchSurroundings(lot);
    return { lot, ...s, source: 'city' };
  } catch {
    return {
      lot,
      buildings: [],
      trees: [],
      parcels: [],
      streets: [],
      source: 'none',
      note: 'Could not reach City records for the buildings and trees around your lot. Check your connection and reload.',
    };
  }
}
