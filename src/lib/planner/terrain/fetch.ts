// Ground heights for a lot from the U.S. Geological Survey's 3D Elevation Program (3DEP).
//
// One request per lot: `exportImage` on the 3DEP ImageServer returns a small raw raster
// (format=bip, 32-bit floats, then a 1-bit validity mask we ignore) over a square around
// the lot — about 190 × 190 cells of 1 m (≈140 KB) covering the whole 3D scene. Verified
// 2026-10-04: CORS `*`, no key, 1 m lidar everywhere in Philadelphia (Delaware Valley lidar,
// flown 2015, NAVD88 metres). The service is slow to answer a new area (5–15 s); answers are
// cached by its CDN and the browser (`max-age=43200`) and here for the session, and the
// planner never waits for it — the lot shows flat first and the ground fills in.
//
// Plus one tiny City query: is the lot inside the zoning map's Steep Slope Protection Area?

import type { LngLat, LotRecord } from '../../types';
import { metresPerDegree } from '../geo';
import { getJSON } from '../../philly/http';
import { ARCGIS } from '../../philly/endpoints';
import { PHILLY_LIDAR, fillGaps, type ElevationGrid } from './grid';

export const ELEVATION_SERVICE = 'https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer';

/** Half the side of the square fetched around the lot, feet (the 3D scene is at most ±300 ft). */
export const ELEVATION_HALF_FT = 310;
/** Grid cell, metres: the lidar's own resolution. */
export const ELEVATION_CELL_M = 1;

const NO_DATA = -9999;

export interface ElevationRequest {
  url: string;
  west: number;
  south: number;
  east: number;
  north: number;
  nx: number;
  ny: number;
}

const r6 = (v: number) => Math.round(v * 1e6) / 1e6;

/** The middle of a lot (vertex average), rounded so the same lot always asks for the same URL. */
export function lotCenter(lot: Pick<LotRecord, 'polygon' | 'lng' | 'lat'>): LngLat {
  const poly = lot.polygon ?? [];
  const ring = poly.length > 3 && poly[0]![0] === poly[poly.length - 1]![0] && poly[0]![1] === poly[poly.length - 1]![1] ? poly.slice(0, -1) : poly;
  if (ring.length >= 3) return [r6(ring.reduce((s, p) => s + p[0], 0) / ring.length), r6(ring.reduce((s, p) => s + p[1], 0) / ring.length)];
  return [r6(lot.lng), r6(lot.lat)];
}

/** The exportImage URL for a square of ±halfFt around `center`, at `cellM` metres. */
export function elevationRequest(center: LngLat, halfFt = ELEVATION_HALF_FT, cellM = ELEVATION_CELL_M): ElevationRequest {
  const m = metresPerDegree(center[1]);
  const halfM = halfFt * 0.3048;
  const dLng = halfM / m.lng;
  const dLat = halfM / m.lat;
  const west = r6(center[0] - dLng);
  const east = r6(center[0] + dLng);
  const south = r6(center[1] - dLat);
  const north = r6(center[1] + dLat);
  const n = Math.max(2, Math.round((2 * halfM) / cellM));
  const p: [string, string][] = [
    ['bbox', `${west},${south},${east},${north}`],
    ['bboxSR', '4326'],
    ['imageSR', '4326'],
    ['size', `${n},${n}`],
    // keep exactly this box (the service would otherwise stretch it to square degrees)
    ['adjustAspectRatio', 'false'],
    ['format', 'bip'],
    ['pixelType', 'F32'],
    ['noData', String(NO_DATA)],
    ['interpolation', 'RSP_BilinearInterpolation'],
    ['f', 'image'],
  ];
  return { url: `${ELEVATION_SERVICE}/exportImage?${p.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')}`, west, south, east, north, nx: n, ny: n };
}

/** Read the raw answer: nx·ny little-endian float32 (row 0 = north), optionally followed by a bit mask. */
export function parseElevation(req: ElevationRequest, buf: ArrayBuffer): ElevationGrid {
  const n = req.nx * req.ny;
  if (buf.byteLength < n * 4) throw new Error(`elevation: expected ${n * 4} bytes, got ${buf.byteLength}`);
  const dv = new DataView(buf);
  const z = new Float32Array(n);
  let good = 0;
  for (let k = 0; k < n; k++) {
    const v = dv.getFloat32(k * 4, true);
    // no data, or nonsense for Philadelphia (sea level to ~450 ft)
    if (!Number.isFinite(v) || v <= NO_DATA + 1 || v < -50 || v > 1000) z[k] = NaN;
    else {
      z[k] = v;
      good++;
    }
  }
  if (good < n * 0.5) throw new Error('elevation: mostly no data');
  const g: ElevationGrid = { west: req.west, south: req.south, east: req.east, north: req.north, nx: req.nx, ny: req.ny, z, source: PHILLY_LIDAR };
  fillGaps(g);
  return g;
}

type Fetcher = (url: string, init?: { signal?: AbortSignal }) => Promise<{ ok: boolean; status: number; arrayBuffer(): Promise<ArrayBuffer> }>;
let fetcher: Fetcher | null = null;
/** Tests: replace fetch (null restores it). */
export function setElevationFetch(f: Fetcher | null) {
  fetcher = f;
  cache.clear();
}

const cache = new Map<string, Promise<ElevationGrid>>();

/** Ground heights around a lot (cached for the session). Rejects after `timeoutMs` or on any error. */
export function fetchElevation(center: LngLat, timeoutMs = 40_000): Promise<ElevationGrid> {
  const req = elevationRequest(center);
  const hit = cache.get(req.url);
  if (hit) return hit;
  const p = (async () => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const f = fetcher ?? (globalThis.fetch as unknown as Fetcher);
      const res = await f(req.url, { signal: ctrl.signal });
      if (!res.ok) throw new Error(`elevation: HTTP ${res.status}`);
      return parseElevation(req, await res.arrayBuffer());
    } finally {
      clearTimeout(timer);
    }
  })();
  cache.set(req.url, p);
  p.catch(() => cache.delete(req.url));
  return p;
}

// ---- City zoning: Steep Slope Protection Area ------------------------------------

export const STEEP_SLOPE_LAYER = 'Zoning_SteepSlopeProtectArea_r';

/** Does the lot touch the zoning map's Steep Slope Protection Area (Zoning Code §14-704(2))? */
export async function fetchSteepSlope(polygon: LngLat[]): Promise<boolean> {
  const ring = polygon.map(([x, y]) => [r6(x), r6(y)]);
  if (ring.length && (ring[0]![0] !== ring[ring.length - 1]![0] || ring[0]![1] !== ring[ring.length - 1]![1])) ring.push(ring[0]!);
  const geometry = JSON.stringify({ rings: [ring], spatialReference: { wkid: 4326 } });
  const p: [string, string][] = [
    ['where', '1=1'],
    ['geometry', geometry],
    ['geometryType', 'esriGeometryPolygon'],
    ['inSR', '4326'],
    ['spatialRel', 'esriSpatialRelIntersects'],
    ['returnCountOnly', 'true'],
    ['f', 'json'],
  ];
  const url = `${ARCGIS}/${STEEP_SLOPE_LAYER}/FeatureServer/0/query?${p.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')}`;
  const r = await getJSON<{ count?: number }>(url, { timeoutMs: 15_000 });
  return (r.count ?? 0) > 0;
}
