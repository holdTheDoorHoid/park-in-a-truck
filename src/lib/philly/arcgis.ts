// Thin helpers over the City's ArcGIS Online feature layers.
// CORS: `access-control-allow-origin: *` (checked 2026-10-04), no key needed.

import { arcgisUrl, type ArcQuery, type LayerName } from './endpoints';
import { getJSON } from './http';
import { EN, type PhillyKey } from './words';

export interface GeoFeature<P = Record<string, unknown>> {
  type: 'Feature';
  id?: number | string;
  geometry: { type: string; coordinates: unknown } | null;
  properties: P;
}

interface GeoCollection<P> {
  type: 'FeatureCollection';
  features: GeoFeature<P>[];
  properties?: { exceededTransferLimit?: boolean };
  exceededTransferLimit?: boolean;
}

interface JsonCollection<P> {
  features: { attributes: P }[];
  exceededTransferLimit?: boolean;
}

/** Features with geometry (GeoJSON, WGS84). */
export async function queryGeo<P = Record<string, unknown>>(
  layer: LayerName,
  q: ArcQuery,
  opts: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<{ features: GeoFeature<P>[]; truncated: boolean }> {
  const r = await getJSON<GeoCollection<P>>(arcgisUrl(layer, { ...q, returnGeometry: true, format: 'geojson' }), opts);
  return {
    features: r.features ?? [],
    truncated: Boolean(r.exceededTransferLimit || r.properties?.exceededTransferLimit),
  };
}

/** Attributes only (no geometry). */
export async function queryAttrs<P = Record<string, unknown>>(
  layer: LayerName,
  q: ArcQuery,
  opts: { signal?: AbortSignal } = {},
): Promise<P[]> {
  const r = await getJSON<JsonCollection<P>>(arcgisUrl(layer, { ...q, returnGeometry: false, format: 'json' }), opts);
  return (r.features ?? []).map((f) => f.attributes);
}

/**
 * Run a lookup, but turn a failure into a warning instead of failing the whole page.
 * `warning`: a "warn.*" message of the philly catalog. Warnings are saved with the lot, so they
 * are English (warningText() in saved.ts shows them translated).
 */
export async function soft<T>(p: Promise<T>, fallback: T, warnings: string[], warning: PhillyKey & `warn.${string}`): Promise<T> {
  try {
    return await p;
  } catch (e) {
    if ((e as { code?: string })?.code === 'aborted') throw e;
    warnings.push(EN(warning));
    return fallback;
  }
}
