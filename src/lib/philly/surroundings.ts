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
// fetchTallBuildings() + selectFarShade() (below) add the taller buildings farther out whose
// shadow can still reach the lot in low sun (one more light query; the planner uses them).
//
// Usage:
//   const s = await fetchSurroundings(project.lot, 250);
//   s.buildings[0].polygon   // [lng,lat][] outer ring
//   s.buildings[0].heightFt  // feet above ground

import type { LngLat, LotRecord } from '../types';
import { queryGeo, soft } from './arcgis';
import { LAYERS } from './endpoints';
import { centroid, distToRing, largestOuterRing, makeProjector, openRing, type XY } from './geo';
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
      'warn.buildings',
    ),
    soft(
      queryGeo<{ address: string | null; brt_id: string | null }>(
        LAYERS.pwdParcels,
        { point: center, distanceFt: r, outFields: ['address', 'brt_id'], resultRecordCount: 1500 },
        opts,
      ),
      empty,
      warnings,
      'warn.parcels',
    ),
    soft(
      queryGeo<{ tree_name: string | null; tree_dbh: number | null }>(
        LAYERS.trees,
        { point: center, distanceFt: r, outFields: ['tree_name', 'tree_dbh'], resultRecordCount: 1000 },
        opts,
      ),
      empty,
      warnings,
      'warn.trees',
    ),
    soft(
      queryGeo<{ stname: string | null; class: number | null }>(
        LAYERS.streets,
        { point: center, distanceFt: r, outFields: ['stname', 'class'], resultRecordCount: 300 },
        opts,
      ),
      empty,
      warnings,
      'warn.streets',
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

// ---- taller buildings farther away (far shade, 2026-10-04) ---------------------------------
//
// fetchSurroundings() takes everything within a few hundred feet. A taller building farther
// out can still shade the lot when the sun is low (winter, early morning, evening), so the
// planner adds ONE light query: buildings tall enough to matter, out to FAR_SHADE_MAX_FT,
// and keeps only those whose shadow can reach the lot (selectFarShade).
//
// "Can reach": a building h ft tall (counting the ground it stands on) shades ground up to
// h / tan(a) away when the sun is a° up. Below about 10° the sun is in the haze near the
// horizon — its direct light is weak, and the rowhouses next to a lot block most of it
// anyway — so 10° is the lowest sun that decides which far buildings count:
// reach ≈ 5.7 × height. Once counted, a building shades the lot at every sun height.

/** The lowest sun (degrees up) that decides whether a far building can shade the lot. */
export const FAR_SHADE_MIN_SUN_DEG = 10;
/** How far out (ft from the lot's centre) taller buildings are looked for. At 10° a 265-ft tower reaches this far. */
export const FAR_SHADE_MAX_FT = 1500;
/** The far query never asks for buildings lower than this (keeps the request light on very big lots). */
export const FAR_SHADE_MIN_QUERY_HEIGHT_FT = 30;

/** Feet of shadow per foot of height with the sun `altDeg` up (≈ 5.67 at 10°). */
export function reachPerFoot(altDeg = FAR_SHADE_MIN_SUN_DEG): number {
  return 1 / Math.tan((altDeg * Math.PI) / 180);
}

/** The lot's outline in feet around the point the surroundings queries are centred on. */
function lotXY(lot: LotLike) {
  const pr = makeProjector(centerOf(lot));
  const ring = openRing(lot.polygon ?? []).map(pr.toXY);
  return { pr, ring };
}

/**
 * The shortest building the far query needs: one the near query (radius `nearFt`) missed
 * starts more than `nearFt` from the lot's centre, so at least `nearFt` minus the lot's own
 * radius from the lot, and must be tall enough to throw a shadow that far.
 */
export function farQueryMinHeight(lot: LotLike, nearFt: number, minSunDeg = FAR_SHADE_MIN_SUN_DEG): number {
  const { ring } = lotXY(lot);
  const rLot = ring.reduce((m, [x, y]) => Math.max(m, Math.hypot(x, y)), 0);
  return Math.max(FAR_SHADE_MIN_QUERY_HEIGHT_FT, Math.floor((nearFt - rLot) / reachPerFoot(minSunDeg)));
}

/**
 * Buildings at least `minHeightFt` tall (City approx_hgt) within `maxFt` of the lot: one
 * request, two attributes, outlines generalised to about 1.5 ft (plenty for shade hundreds
 * of feet away). Throws when the City can't be reached (the caller decides what that means).
 * `timeoutMs`: how long to wait for the City's answer (default: getJSON's).
 */
export async function fetchTallBuildings(
  lot: LotLike,
  q: { minHeightFt: number; maxFt?: number },
  opts: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<{ buildings: SurroundingBuilding[]; truncated: boolean }> {
  const r = await queryGeo<{ approx_hgt: number | null; base_elevation: number | null }>(
    LAYERS.buildings,
    {
      where: `approx_hgt >= ${Math.max(1, Math.round(q.minHeightFt))}`,
      point: centerOf(lot),
      distanceFt: Math.round(q.maxFt ?? FAR_SHADE_MAX_FT),
      outFields: ['approx_hgt', 'base_elevation'],
      precision: 6,
      maxAllowableOffset: 0.000005,
      resultRecordCount: 1500,
    },
    opts,
  );
  const buildings: SurroundingBuilding[] = [];
  for (const f of r.features) {
    const polygon = largestOuterRing(f.geometry as never);
    const h = num(f.properties.approx_hgt);
    if (polygon.length < 3 || !h || h <= 0) continue;
    buildings.push({ polygon, heightFt: h, baseElevationFt: num(f.properties.base_elevation) });
  }
  return { buildings, truncated: r.truncated };
}

/** Shortest distance between two outlines that don't overlap (0 when one is inside the other). */
function ringGap(a: XY[], b: XY[]): number {
  let d = Infinity;
  for (const p of a) d = Math.min(d, distToRing(p, b));
  for (const p of b) d = Math.min(d, distToRing(p, a));
  return d;
}

/**
 * The far buildings whose shadow can reach the lot with the sun at least `minSunDeg` up:
 * gap to the lot ≤ reachPerFoot × height, where height counts the ground the building
 * stands on above the lot's (City base elevations; the lot's ground is taken as the lowest
 * base among the buildings next to it, which errs towards keeping a building). Buildings
 * the near query already has (same outline centre and height) are dropped.
 */
export function selectFarShade(lot: LotLike, near: SurroundingBuilding[], far: SurroundingBuilding[], minSunDeg = FAR_SHADE_MIN_SUN_DEG): SurroundingBuilding[] {
  const { pr, ring: lotRing } = lotXY(lot);
  if (lotRing.length < 3 || !far.length) return [];
  const k = reachPerFoot(minSunDeg);
  const nearXY = near.map((b) => ({ b, ring: openRing(b.polygon).map(pr.toXY) }));

  // the lot's ground: the lowest City base among its neighbours (within 40 ft), else among all
  const bases = (pred: (r: XY[]) => boolean) =>
    nearXY.filter((n) => n.b.baseElevationFt != null && Number.isFinite(n.b.baseElevationFt) && pred(n.ring)).map((n) => n.b.baseElevationFt!);
  const nextDoor = bases((r) => ringGap(r, lotRing) <= 40);
  const any = nextDoor.length ? nextDoor : bases(() => true);
  const groundRef = any.length ? Math.min(...any) : null;

  // outline centres of the near buildings, on a 10-ft hash, to spot the same building twice
  const cell = (x: number, y: number) => `${Math.floor(x / 10)},${Math.floor(y / 10)}`;
  const seen = new Map<string, { c: XY; h: number }[]>();
  for (const n of nearXY) {
    if (n.ring.length < 3) continue;
    const c = centroid(n.ring);
    const key = cell(c[0], c[1]);
    seen.set(key, [...(seen.get(key) ?? []), { c, h: n.b.heightFt }]);
  }
  const duplicate = (c: XY, h: number) => {
    for (let i = -1; i <= 1; i++)
      for (let j = -1; j <= 1; j++)
        for (const s of seen.get(cell(c[0] + i * 10, c[1] + j * 10)) ?? []) if (Math.hypot(s.c[0] - c[0], s.c[1] - c[1]) < 4 && Math.abs(s.h - h) < 1) return true;
    return false;
  };

  const out: SurroundingBuilding[] = [];
  for (const b of far) {
    const ring = openRing(b.polygon).map(pr.toXY);
    if (ring.length < 3 || duplicate(centroid(ring), b.heightFt)) continue;
    const rise = groundRef != null && b.baseElevationFt != null && Number.isFinite(b.baseElevationFt) ? b.baseElevationFt - groundRef : 0;
    const h = b.heightFt + rise;
    if (h > 0 && ringGap(ring, lotRing) <= k * h) out.push(b);
  }
  return out;
}
