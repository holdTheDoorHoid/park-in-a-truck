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
import { pt, type PlannerKey } from './words';

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

/** `label` is the address (never translated); `blurb` says what kind of lot it is (planner catalog). */
export const DEMO_LOTS = {
  dover: { label: '1322 N Dover St', blurb: 'demo.doverBlurb' },
  greenway: { label: '2061 S 60th St', blurb: 'demo.greenwayBlurb' },
} as const satisfies Record<string, { label: string; blurb: PlannerKey }>;
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
const farCache = new Map<string, Promise<SiteBuilding[] | null>>();

/**
 * How long the far query may take. The City's building layer can be slow over 1,500 ft
 * (20–26 s for one lot on 2026-10-04, past the 20 s every other lookup gets).
 */
export const FAR_QUERY_TIMEOUT_MS = 60_000;
/**
 * How long the planner waits for the far buildings once the lot's own surroundings are in.
 * After that the lot shows without them, and they are added when they arrive.
 */
export const FAR_WAIT_AFTER_NEAR_MS = 3_000;

const surroundingsKey = (lot: LotRecord, radiusFt: number) => `${lot.pwdParcelId ?? lot.address}@${radiusFt}`;

/** Neighbouring buildings (with City heights), trees, parcels and streets around a lot. */
export async function fetchSurroundings(lot: LotRecord, radiusFt = SURROUNDINGS_RADIUS_FT): Promise<Surroundings> {
  const key = surroundingsKey(lot, radiusFt);
  if (!cache.has(key)) {
    const p = phillySurroundings(lot, radiusFt).then(
      (s): Surroundings => ({
        buildings: s.buildings,
        trees: s.trees,
        streets: s.streets,
        // the lot's own parcel is not a neighbour (entrance detection looks at neighbours)
        parcels: s.parcels.filter((x) => (lot.opa ? x.opa !== lot.opa : true) && x.address !== lot.address),
      }),
    );
    p.catch(() => cache.delete(key));
    cache.set(key, p);
  }
  return cache.get(key)!;
}

/**
 * The taller buildings farther out whose shadow can reach the lot (one more request, started
 * alongside the near ones, with a longer time limit). null when it failed: the next load tries again.
 */
export function fetchFarShade(lot: LotRecord, radiusFt = SURROUNDINGS_RADIUS_FT): Promise<SiteBuilding[] | null> {
  const key = surroundingsKey(lot, radiusFt);
  if (!farCache.has(key)) {
    const tall = fetchTallBuildings(lot, { minHeightFt: farQueryMinHeight(lot, radiusFt), maxFt: FAR_SHADE_MAX_FT }, { timeoutMs: FAR_QUERY_TIMEOUT_MS });
    const p = Promise.all([fetchSurroundings(lot, radiusFt), tall])
      .then(([s, f]) => selectFarShade(lot, s.buildings, f.buildings))
      .catch(() => {
        farCache.delete(key);
        return null;
      });
    farCache.set(key, p);
  }
  return farCache.get(key)!;
}

/** Said when the far buildings could not be loaded (the rest of the lot still works). */
export const farShadeFailedNote = (): string => pt()('note.farFailed');

const PENDING = Symbol('pending');

/**
 * The lot and what's around it. The far buildings come with it when they arrive in time;
 * otherwise the lot comes without them and `onLateFar` gets the context again once they are
 * in (or with the note, if they could not be loaded).
 */
export async function loadSiteContext(lot: LotRecord, onLateFar?: (ctx: SiteContext) => void): Promise<SiteContext> {
  const demo = fixtureFor(lot);
  if (demo) {
    const f = await fixture(demo);
    // the person's own record wins (it may be newer); fill the outline if it has none
    return { ...f.surroundings, lot: lot.polygon?.length >= 3 ? lot : { ...lot, polygon: f.lot.polygon }, source: 'fixture' };
  }
  if (!lot.polygon || lot.polygon.length < 3) {
    return { lot, buildings: [], trees: [], parcels: [], streets: [], source: 'none', note: pt()('note.noOutline') };
  }
  try {
    const far = fetchFarShade(lot);
    const s = await fetchSurroundings(lot);
    const ctx: SiteContext = { lot, ...s, source: 'city' };
    const withFar = (f: SiteBuilding[] | null): SiteContext => (f ? { ...ctx, farBuildings: f } : { ...ctx, note: farShadeFailedNote() });
    const f = await Promise.race([far, new Promise<typeof PENDING>((r) => setTimeout(() => r(PENDING), FAR_WAIT_AFTER_NEAR_MS))]);
    if (f !== PENDING) return withFar(f);
    void far.then((late) => onLateFar?.(withFar(late)));
    return ctx;
  } catch {
    return {
      lot,
      buildings: [],
      trees: [],
      parcels: [],
      streets: [],
      source: 'none',
      note: pt()('note.cityFailed'),
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
