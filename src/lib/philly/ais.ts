// AIS — the City's address service (https://api.phila.gov/ais/v1/search/<q>).
// Answers addresses ("1322 N Dover St", "1322 dover"), intersections
// ("S 60th St & Greenway Ave") and 9-digit OPA account numbers. 404 = no match.
// CORS: `access-control-allow-origin: *` (checked 2026-10-04), no key needed.

import type { LngLat } from '../types';
import { aisUrl } from './endpoints';
import { getJSON, isNotFound } from './http';

export interface AisProps {
  street_address: string;
  street_full?: string;
  street_name?: string;
  opa_account_num?: string;
  opa_owners?: string[];
  opa_address?: string;
  pwd_parcel_id?: string;
  dor_parcel_id?: string;
  zip_code?: string;
  zoning?: string;
  zoning_rco?: string;
  council_district_2024?: string;
  historic_site?: string;
  historic_district?: string;
  planning_district?: string;
  philly_rising_area?: string;
  [k: string]: unknown;
}

export interface AisFeature {
  ais_feature_type: 'address' | 'intersection' | string;
  match_type: string;
  properties: AisProps;
  geometry: { geocode_type?: string; type: 'Point'; coordinates: [number, number] };
}

export interface AisResult {
  search_type: 'address' | 'intersection' | 'opa_account' | string;
  normalized: string;
  total_size: number;
  features: AisFeature[];
}

/** AIS search. Resolves null when AIS has no match (404). */
export async function aisSearch(q: string, opts: { signal?: AbortSignal; limit?: number } = {}): Promise<AisResult | null> {
  const r = await getJSON<AisResult>(aisUrl(q, opts.limit ?? 8), { signal: opts.signal, allow404: true });
  if (isNotFound(r)) return null;
  return r;
}

export function aisPoint(f: AisFeature): LngLat | null {
  const c = f.geometry?.coordinates;
  return c && Number.isFinite(c[0]) && Number.isFinite(c[1]) ? [c[0], c[1]] : null;
}

/**
 * The best address feature: an exact match with an OPA account, ignoring unit
 * children ("1500 MARKET ST F") when the base address is there.
 */
export function bestAddress(r: AisResult): AisFeature | null {
  const addr = r.features.filter((f) => f.ais_feature_type === 'address');
  if (!addr.length) return null;
  const rank = (f: AisFeature) =>
    (f.properties.opa_account_num ? 0 : 4) +
    (f.match_type === 'exact' || f.match_type === 'exact_key' ? 0 : f.match_type.includes('unit') ? 3 : 1);
  return addr.slice().sort((a, b) => rank(a) - rank(b))[0]!;
}
