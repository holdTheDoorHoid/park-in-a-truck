// SEAM: City data for the planner. Everything the planner needs from the City goes
// through this file. Demo lots use captured fixtures; every other lot uses the
// philly-data client (src/lib/philly/), which caches and rate-limits politely.

import type { LngLat, LotRecord } from '../types';
import {
  FAR_SHADE_MAX_FT,
  FAR_SHADE_MIN_SUN_DEG,
  farQueryMinHeight,
  fetchSurroundings as phillySurroundings,
  fetchTallBuildings,
  selectFarShade,
} from '../philly';
import { fetchTerrain, type TerrainData } from './terrain';
import { decodeGrid, type EncodedGrid } from './terrain/grid';

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
  /**
   * Taller buildings beyond SURROUNDINGS_RADIUS_FT (up to FAR_SHADE_MAX_FT) whose shadow can
   * reach the lot when the sun is at least FAR_SHADE_MIN_SUN_DEG up (philly selectFarShade).
   * They count for the sun only. Absent = not looked up (older fixtures) or the lookup failed.
   */
  farBuildings?: SiteBuilding[];
}

/** The lot plus what's around it, as the planner needs it. */
export interface SiteContext extends Surroundings {
  lot: LotRecord;
  source: 'fixture' | 'city' | 'none';
  /** set when something could not be loaded (shown to the person) */
  note?: string;
  /** ground heights (terrain); absent = flat. Loaded separately — see loadTerrain() */
  terrain?: TerrainData | null;
}

export const SURROUNDINGS_RADIUS_FT = 260;
export { FAR_SHADE_MAX_FT, FAR_SHADE_MIN_SUN_DEG };

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

export function fixtureFor(lot: LotRecord): DemoSlug | null {
  const id = lot.pwdParcelId;
  if (id === 272148 || /^1322 N DOVER ST/i.test(lot.address)) return 'dover';
  if (id === 183108 || /^2061 S 60TH ST/i.test(lot.address)) return 'greenway';
  return null;
}

// ---- the lot's surroundings ------------------------------------------------------

const cache = new Map<string, Promise<Surroundings>>();

/**
 * Neighbouring buildings (with City heights), trees, parcels and streets around a lot, plus
 * the taller buildings farther out whose shadow can reach it (one more request, run
 * alongside; if only that one fails, `farBuildings` is absent and the next load tries again).
 */
export async function fetchSurroundings(lot: LotRecord, radiusFt = SURROUNDINGS_RADIUS_FT): Promise<Surroundings> {
  const key = `${lot.pwdParcelId ?? lot.address}@${radiusFt}`;
  if (!cache.has(key)) {
    const far = fetchTallBuildings(lot, { minHeightFt: farQueryMinHeight(lot, radiusFt), maxFt: FAR_SHADE_MAX_FT }).catch(() => null);
    const p = Promise.all([phillySurroundings(lot, radiusFt), far]).then(([s, f]): Surroundings => {
      if (!f) cache.delete(key);
      return {
        buildings: s.buildings,
        trees: s.trees,
        streets: s.streets,
        // the lot's own parcel is not a neighbour (entrance detection looks at neighbours)
        parcels: s.parcels.filter((x) => (lot.opa ? x.opa !== lot.opa : true) && x.address !== lot.address),
        ...(f ? { farBuildings: selectFarShade(lot, s.buildings, f.buildings) } : {}),
      };
    });
    p.catch(() => cache.delete(key));
    cache.set(key, p);
  }
  return cache.get(key)!;
}

/** Said when the far buildings could not be loaded (the rest of the lot still works). */
export const FAR_SHADE_FAILED_NOTE =
  "Couldn't load the taller buildings farther from your lot, so the sun maps leave out their shade in low morning, evening and winter sun. Reload to try again.";

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
    return { lot, ...s, source: 'city', ...(s.farBuildings ? {} : { note: FAR_SHADE_FAILED_NOTE }) };
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

// ---- ground heights (terrain) -------------------------------------------------------

interface TerrainFixture {
  slug: string;
  capturedAt: string;
  grid: EncodedGrid;
  steepSlope: boolean | null;
}

async function terrainFixture(slug: DemoSlug): Promise<TerrainData> {
  const mod = slug === 'dover' ? await import('./fixtures/dover.elevation.json') : await import('./fixtures/greenway.elevation.json');
  const f = (mod.default ?? mod) as unknown as TerrainFixture;
  return { grid: decodeGrid(f.grid), steepSlope: f.steepSlope };
}

/**
 * Ground heights for a lot: demo lots from fixtures (offline), others from USGS 3DEP (one
 * request, slow the first time — the planner shows the lot flat until it arrives).
 */
export function loadTerrain(lot: LotRecord | null, demo: DemoSlug | null): Promise<TerrainData> | null {
  const slug = demo ?? (lot ? fixtureFor(lot) : null);
  if (slug) return terrainFixture(slug);
  if (!lot?.polygon || lot.polygon.length < 3) return null;
  return fetchTerrain(lot);
}
