// Vacant land for the lot-finder map: the City's vacant-land list
// (ArcGIS Vacant_Indicators_Land — parcels the City flags as vacant land from
// several signals; `land_rank` is the share of signals that agree).
//
// Requests are snapped to a fixed grid of small tiles (~1,700 × 1,600 ft) so
// panning re-uses cached answers and no single request is large.

import type { LngLat } from '../types';
import { queryGeo } from './arcgis';
import { LAYERS } from './endpoints';
import { distanceFt, largestOuterRing, makeProjector, signedArea } from './geo';
import { landBankStatusesIn } from './landbank';
import { classifyOwner, isPublic, landBankHandles } from './owner';
import { normaliseZoning } from './plain';
import type { AddressSuggestion, BBox, LandBankStatus, VacantLotCollection, VacantLotFeature, VacantLotProps } from './types';

const TILE_LNG = 0.006;
const TILE_LAT = 0.0045;
/** At most this many tiles per view (nearest the centre first); more → "zoom in". */
export const MAX_TILES = 20;
/** An area this big is a crawl, not a neighbourhood: refuse outright. */
const REFUSE_TILES = 80;

interface VacantAttrs {
  objectid: number;
  address: string | null;
  owner1: string | null;
  owner2: string | null;
  opa_id: string | null;
  bldg_desc: string | null;
  zoningbasedistrict: string | null;
  land_rank: number | null;
  Shape__Area: number | null;
}

/** Tiles (as bboxes) covering a bbox. */
export function tilesFor(b: BBox): BBox[] {
  const out: BBox[] = [];
  const x0 = Math.floor(b[0] / TILE_LNG);
  const x1 = Math.floor(b[2] / TILE_LNG);
  const y0 = Math.floor(b[1] / TILE_LAT);
  const y1 = Math.floor(b[3] / TILE_LAT);
  for (let x = x0; x <= x1; x++)
    for (let y = y0; y <= y1; y++)
      out.push([x * TILE_LNG, y * TILE_LAT, (x + 1) * TILE_LNG, (y + 1) * TILE_LAT].map((v) => Math.round(v * 1e6) / 1e6) as BBox);
  return out;
}

/**
 * Map colour group for a vacant lot. `lb` is the Land Bank's inventory for the area
 * (undefined when it couldn't be loaded).
 */
export function mapClassOf(p: Pick<VacantLotProps, 'opa' | 'ownerType' | 'isPublic'>, agencyLabel: string, lb?: Map<string, LandBankStatus>): VacantLotProps['mapClass'] {
  const status = p.opa ? lb?.get(p.opa) : undefined;
  if (status) return status.tone === 'available' ? 'lb-available' : 'lb-other';
  if (!p.isPublic) return 'private';
  if (!landBankHandles(p.ownerType, agencyLabel)) return 'agency';
  return lb ? 'lb-other' : 'public';
}

export function vacantFeature(f: { id?: number | string; geometry: unknown; properties: VacantAttrs }, lb?: Map<string, LandBankStatus>): VacantLotFeature | null {
  const ring = largestOuterRing(f.geometry as never);
  if (ring.length < 3) return null;
  const p = f.properties;
  const owner = [p.owner1, p.owner2].filter(Boolean).join(' ');
  const cls = classifyOwner([p.owner1, p.owner2]);
  const opa = p.opa_id || null;
  const pub = isPublic(cls.type);
  const pr = makeProjector(ring[0]!);
  return {
    type: 'Feature',
    id: p.opa_id ?? f.id ?? p.objectid,
    geometry: { type: 'Polygon', coordinates: [[...ring, ring[0]!]] },
    properties: {
      opa,
      address: p.address ?? '',
      owner,
      ownerType: cls.type,
      isPublic: pub,
      landBank: opa && lb ? lb.get(opa) ?? null : undefined,
      mapClass: mapClassOf({ opa, ownerType: cls.type, isPublic: pub }, cls.label, lb),
      areaSqFt: Math.round(Math.abs(signedArea(ring.map(pr.toXY)))),
      zoning: normaliseZoning(p.zoningbasedistrict),
      buildingDesc: p.bldg_desc,
      vacancyScore: p.land_rank ?? null,
    },
  };
}

/**
 * Vacant-land parcels in a bounding box, coloured by owner type on the map.
 * `truncated` is true when the area is too big to show everything.
 */
export async function fetchVacantLots(bbox: BBox, opts: { signal?: AbortSignal } = {}): Promise<VacantLotCollection> {
  let tiles = tilesFor(bbox);
  if (tiles.length > REFUSE_TILES) return { type: 'FeatureCollection', features: [], truncated: true };
  let dropped = false;
  if (tiles.length > MAX_TILES) {
    // a big screen at street level: load the middle of the view first
    const cx = (bbox[0] + bbox[2]) / 2;
    const cy = (bbox[1] + bbox[3]) / 2;
    const d = (t: BBox) => Math.hypot((t[0] + t[2]) / 2 - cx, ((t[1] + t[3]) / 2 - cy) * 1.3);
    tiles = tiles.sort((a, b) => d(a) - d(b)).slice(0, MAX_TILES);
    dropped = true;
  }
  const vacantP = Promise.all(
    tiles.map((t) =>
      queryGeo<VacantAttrs>(
        LAYERS.vacantLand,
        {
          envelope: t,
          outFields: ['objectid', 'address', 'owner1', 'owner2', 'opa_id', 'bldg_desc', 'zoningbasedistrict', 'land_rank'],
          precision: 6,
          resultRecordCount: 1000,
        },
        opts,
      ),
    ),
  );
  // The Land Bank's statuses for the same tiles, alongside (small, attributes only).
  // If they fail the map still works; public lots then show as plain "public".
  const lbP = Promise.all(tiles.map((t) => landBankStatusesIn(t, opts)))
    .then((maps) => new Map(maps.flatMap((m) => [...m])))
    .catch(() => undefined);
  const [results, lb] = await Promise.all([vacantP, lbP]);
  const seen = new Set<string | number>();
  const features: VacantLotFeature[] = [];
  let truncated = dropped;
  for (const r of results) {
    truncated ||= r.truncated;
    for (const f of r.features) {
      const v = vacantFeature(f as never, lb);
      if (!v || seen.has(v.id!)) continue;
      seen.add(v.id!);
      features.push(v);
    }
  }
  return { type: 'FeatureCollection', features, truncated, landBankLoaded: Boolean(lb) };
}

/** Vacant lots nearest a point (for "which lot near this corner?"). */
export async function vacantLotsNear(lngLat: LngLat, radiusFt = 300, limit = 8, opts: { signal?: AbortSignal } = {}): Promise<AddressSuggestion[]> {
  const { features } = await queryGeo<VacantAttrs>(
    LAYERS.vacantLand,
    {
      point: lngLat,
      distanceFt: radiusFt,
      outFields: ['objectid', 'address', 'owner1', 'owner2', 'opa_id', 'bldg_desc', 'zoningbasedistrict', 'land_rank'],
      precision: 6,
      resultRecordCount: 200,
    },
    opts,
  );
  return features
    .map((f) => vacantFeature(f as never))
    .filter((f): f is VacantLotFeature => Boolean(f))
    .map((f) => {
      const ring = f.geometry.coordinates[0]!;
      const c: LngLat = [ring.reduce((s, p) => s + p[0], 0) / ring.length, ring.reduce((s, p) => s + p[1], 0) / ring.length];
      return { f, c, d: distanceFt(lngLat, c) };
    })
    .sort((a, b) => a.d - b.d)
    .slice(0, limit)
    .map(({ f, c }) => ({
      label: f.properties.address,
      kind: 'address' as const,
      opa: f.properties.opa,
      lngLat: c,
      owner: f.properties.owner,
      source: 'opa' as const,
    }));
}
