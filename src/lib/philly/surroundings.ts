// fetchSurroundings(): what's around a lot, for the 3D planner's sun study and
// site model. Four small ArcGIS queries (a circle of `radiusFt` around the lot),
// each allowed to fail on its own:
//
//   LI_BUILDING_FOOTPRINTS   building outlines with City LiDAR heights
//                            (approx_hgt = typical roof height above ground, ft;
//                            max_hgt = highest point; base_elevation = ground, ft)
//   PWD_PARCELS              property outlines + address + OPA account
//   ppr_tree_inventory_2025  street & park trees (species, trunk diameter in)
//   Street_Centerline        street centerlines + names + class
//
// Usage:
//   const s = await fetchSurroundings(project.lot, 250);
//   s.buildings[0].polygon   // [lng,lat][] outer ring
//   s.buildings[0].heightFt  // feet above ground

import type { LngLat, LotRecord } from '../types';
import { queryGeo, soft } from './arcgis';
import { LAYERS } from './endpoints';
import { largestOuterRing } from './geo';
import type { Surroundings, SurroundingBuilding, SurroundingParcel, SurroundingStreet, SurroundingTree } from './types';

/** A typical Philadelphia 2-storey rowhouse, used when the City has no height. */
export const DEFAULT_BUILDING_HEIGHT_FT = 25;

type LotLike = Pick<LotRecord, 'lat' | 'lng'> & Partial<Pick<LotRecord, 'polygon'>>;

function centerOf(lot: LotLike): LngLat {
  const poly = lot.polygon ?? [];
  if (poly.length >= 3) return [poly.reduce((s, p) => s + p[0], 0) / poly.length, poly.reduce((s, p) => s + p[1], 0) / poly.length];
  return [lot.lng, lot.lat];
}

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/**
 * Buildings, parcels, trees and streets within `radiusFt` (default 250 ft) of the lot.
 * Never throws for a single failed layer — that layer comes back empty and is named
 * in `warnings`.
 */
export async function fetchSurroundings(lot: LotLike, radiusFt = 250, opts: { signal?: AbortSignal } = {}): Promise<Surroundings> {
  const center = centerOf(lot);
  const r = Math.max(50, Math.min(600, Math.round(radiusFt)));
  const warnings: string[] = [];
  const empty = { features: [], truncated: false };

  const [b, p, t, s] = await Promise.all([
    soft(
      queryGeo<{ address: string | null; approx_hgt: number | null; max_hgt: number | null; base_elevation: number | null }>(
        LAYERS.buildings,
        { point: center, distanceFt: r, outFields: ['address', 'approx_hgt', 'max_hgt', 'base_elevation'], resultRecordCount: 1500 },
        opts,
      ),
      empty,
      warnings,
      'building outlines and heights',
    ),
    soft(
      queryGeo<{ address: string | null; brt_id: string | null }>(
        LAYERS.pwdParcels,
        { point: center, distanceFt: r, outFields: ['address', 'brt_id'], resultRecordCount: 1500 },
        opts,
      ),
      empty,
      warnings,
      'parcel outlines',
    ),
    soft(
      queryGeo<{ tree_name: string | null; tree_dbh: number | null }>(
        LAYERS.trees,
        { point: center, distanceFt: r, outFields: ['tree_name', 'tree_dbh'], resultRecordCount: 1000 },
        opts,
      ),
      empty,
      warnings,
      'City tree inventory',
    ),
    soft(
      queryGeo<{ stname: string | null; class: number | null }>(
        LAYERS.streets,
        { point: center, distanceFt: r, outFields: ['stname', 'class'], resultRecordCount: 300 },
        opts,
      ),
      empty,
      warnings,
      'street centerlines',
    ),
  ]);

  const buildings: SurroundingBuilding[] = [];
  for (const f of b.features) {
    const polygon = largestOuterRing(f.geometry as never);
    if (polygon.length < 3) continue;
    const approx = num(f.properties.approx_hgt);
    const max = num(f.properties.max_hgt);
    const h = approx && approx > 0 ? approx : max && max > 0 ? max : null;
    buildings.push({
      polygon,
      heightFt: h ?? DEFAULT_BUILDING_HEIGHT_FT,
      ...(h === null ? { heightEstimated: true } : {}),
      maxHeightFt: max,
      baseElevationFt: num(f.properties.base_elevation),
      ...(f.properties.address ? { address: f.properties.address } : {}),
    });
  }

  const parcels: SurroundingParcel[] = [];
  for (const f of p.features) {
    const polygon = largestOuterRing(f.geometry as never);
    if (polygon.length < 3) continue;
    parcels.push({ polygon, address: f.properties.address ?? '', opa: f.properties.brt_id || null });
  }

  const trees: SurroundingTree[] = [];
  for (const f of t.features) {
    const g = f.geometry as { type: string; coordinates: number[] } | null;
    if (!g || g.type !== 'Point') continue;
    const dbh = num(f.properties.tree_dbh);
    trees.push({
      lngLat: [g.coordinates[0]!, g.coordinates[1]!],
      ...(f.properties.tree_name ? { species: f.properties.tree_name } : {}),
      ...(dbh && dbh > 0 ? { dbhIn: dbh } : {}),
    });
  }

  const streets: SurroundingStreet[] = [];
  for (const f of s.features) {
    const g = f.geometry as { type: string; coordinates: number[][] | number[][][] } | null;
    if (!g) continue;
    const lines = g.type === 'LineString' ? [g.coordinates as number[][]] : g.type === 'MultiLineString' ? (g.coordinates as number[][][]) : [];
    for (const l of lines)
      streets.push({
        line: l.map((c) => [c[0]!, c[1]!] as LngLat),
        name: (f.properties.stname ?? '').trim(),
        ...(f.properties.class != null ? { class: f.properties.class } : {}),
      });
  }

  return {
    center,
    radiusFt: r,
    fetchedAt: new Date().toISOString(),
    buildings,
    parcels,
    trees,
    streets,
    ...(warnings.length ? { warnings } : {}),
  };
}
