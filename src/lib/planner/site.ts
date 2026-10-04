// SEAM: City data for the planner. Everything the planner needs from the philly-data
// workstream (src/lib/philly/) goes through this file.
//
// Today: two demo lots captured from the City's APIs (fixtures/, see capture.py), and a
// small TEMPORARY live fetch for any other lot. When philly-data lands, replace the body
// of `fetchSurroundings` below with
//   import { fetchSurroundings as phillySurroundings } from '../philly';
//   return phillySurroundings(lot, radiusFt);
// and delete the `live*` helpers. Nothing else in the planner talks to the City.

import type { LngLat, LotRecord } from '../types';

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
    const p = liveSurroundings(lot, radiusFt);
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

// ---- TEMPORARY live fetch (until philly-data's fetchSurroundings lands) -----------

const ARC = 'https://services.arcgis.com/fLeGjb7u4uXqeF9q/arcgis/rest/services';
const CARTO = 'https://phl.carto.com/api/v2/sql';

function envelope(lot: LotRecord, r: number): [number, number, number, number] {
  const lng = lot.polygon.reduce((s, p) => s + p[0], 0) / lot.polygon.length;
  const lat = lot.polygon.reduce((s, p) => s + p[1], 0) / lot.polygon.length;
  const dLat = r / 364000;
  const dLng = r / (364000 * Math.cos((lat * Math.PI) / 180));
  return [lng - dLng, lat - dLat, lng + dLng, lat + dLat];
}

async function arcgis(layer: string, env: number[], fields: string): Promise<{ geometry: any; properties: any }[]> {
  const q = new URLSearchParams({
    geometry: env.join(','),
    geometryType: 'esriGeometryEnvelope',
    inSR: '4326',
    spatialRel: 'esriSpatialRelIntersects',
    outFields: fields,
    outSR: '4326',
    f: 'geojson',
    resultRecordCount: '2000',
  });
  const r = await fetch(`${ARC}/${layer}/FeatureServer/0/query?${q}`);
  if (!r.ok) throw new Error(`${layer}: ${r.status}`);
  const j = await r.json();
  return (j.features ?? []).filter((f: any) => f.geometry);
}

function rings(g: any): LngLat[][] {
  if (g.type === 'Polygon') return [g.coordinates[0]];
  if (g.type === 'MultiPolygon') return g.coordinates.map((p: any) => p[0]);
  return [];
}
function lines(g: any): LngLat[][] {
  if (g.type === 'LineString') return [g.coordinates];
  if (g.type === 'MultiLineString') return g.coordinates;
  return [];
}

async function liveSurroundings(lot: LotRecord, radiusFt: number): Promise<Surroundings> {
  const env = envelope(lot, radiusFt);
  const small = envelope(lot, Math.min(radiusFt, 180));
  const [b, t, s, p] = await Promise.all([
    arcgis('LI_BUILDING_FOOTPRINTS', env, 'approx_hgt,max_hgt,base_elevation'),
    arcgis('ppr_tree_inventory_2025', small, 'tree_name,tree_dbh').catch(() => []),
    arcgis('Street_Centerline', small, 'stname').catch(() => []),
    fetch(
      `${CARTO}?q=${encodeURIComponent(
        `SELECT address, ST_AsGeoJSON(the_geom) AS geom FROM pwd_parcels WHERE the_geom && ST_MakeEnvelope(${envelope(lot, 120).join(',')},4326)`,
      )}`,
    )
      .then((r) => (r.ok ? r.json() : { rows: [] }))
      .then((j) => j.rows ?? [])
      .catch(() => []),
  ]);
  return {
    buildings: b.flatMap((f) =>
      rings(f.geometry).map((polygon) => ({
        polygon,
        heightFt: Number(f.properties.approx_hgt || f.properties.max_hgt || 25),
        baseElevationFt: f.properties.base_elevation ?? null,
      })),
    ),
    trees: t.map((f) => {
      const name = String(f.properties.tree_name ?? '').split(' - ');
      return { lngLat: f.geometry.coordinates as LngLat, species: name[1] ?? name[0] ?? null, dbhIn: f.properties.tree_dbh ?? null };
    }),
    streets: s.flatMap((f) => lines(f.geometry).map((line) => ({ line, name: f.properties.stname ?? null }))),
    parcels: (p as { address: string; geom: string }[])
      .flatMap((r) => rings(JSON.parse(r.geom)).map((polygon) => ({ polygon, address: r.address })))
      .filter((x) => x.address !== lot.address),
  };
}
