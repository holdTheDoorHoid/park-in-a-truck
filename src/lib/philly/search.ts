// Address type-ahead.
//
// 1. AIS first: it understands full and fuzzy addresses ("1322 dover"),
//    intersections ("S 60th St & Greenway Ave", "60th and Greenway") and OPA
//    account numbers ("292140710").
// 2. AIS needs a complete street name, so while someone is still typing
//    ("1322 N Dov") we fall back to a prefix search of the City's property list
//    (Carto opa_properties_public.location).

import type { LngLat } from '../types';
import { aisPoint, aisSearch } from './ais';
import { cartoUrl, sqlString } from './endpoints';
import { getJSON } from './http';
import type { AddressSuggestion } from './types';

/** Make what people type look like OPA's `location` column ("1322 N DOVER ST"). */
export function normaliseAddress(q: string): string {
  let s = ` ${q.toUpperCase().replace(/[.,#]/g, ' ').replace(/\s+/g, ' ').trim()} `;
  const words: [RegExp, string][] = [
    [/ NORTH /g, ' N '],
    [/ SOUTH /g, ' S '],
    [/ EAST /g, ' E '],
    [/ WEST /g, ' W '],
    [/ STREET /g, ' ST '],
    [/ AVENUE /g, ' AVE '],
    [/ AV /g, ' AVE '],
    [/ ROAD /g, ' RD '],
    [/ BOULEVARD /g, ' BLVD '],
    [/ PLACE /g, ' PL '],
    [/ LANE /g, ' LN '],
    [/ DRIVE /g, ' DR '],
    [/ TERRACE /g, ' TER '],
    [/ PHILADELPHIA( PA)?( \d{5})? $/g, ' '],
    [/ PA \d{5} $/g, ' '],
  ];
  for (const [re, to] of words) s = s.replace(re, to);
  return s.trim();
}

/** "60th and Greenway" → "60th & Greenway" so AIS reads it as an intersection. */
function intersectionForm(q: string): string {
  return q.replace(/\s+(and|at|&|\/)\s+/i, ' & ');
}

export interface SearchOpts {
  signal?: AbortSignal;
  limit?: number;
}

/**
 * Suggestions for what someone has typed so far. Never throws for "no match"
 * (returns []); throws PhillyError('city-down') only when both services fail.
 */
export async function searchAddresses(q: string, opts: SearchOpts = {}): Promise<AddressSuggestion[]> {
  const raw = q.trim();
  const limit = opts.limit ?? 8;
  if (raw.length < 3) return [];
  const isOpa = /^\d{9}$/.test(raw.replace(/\s/g, ''));
  const looksIntersection = /\s(&|and|at)\s/i.test(raw) && !/^\d+\s/.test(raw);
  const query = isOpa ? raw.replace(/\s/g, '') : looksIntersection ? intersectionForm(raw) : raw;

  let aisFailed: unknown = null;
  let out: AddressSuggestion[] = [];
  try {
    const r = await aisSearch(query, { signal: opts.signal, limit });
    if (r) {
      const seen = new Set<string>();
      for (const f of r.features) {
        const p = f.properties;
        if (f.ais_feature_type === 'intersection') {
          const label = r.normalized || query.toUpperCase();
          if (seen.has(label)) continue;
          seen.add(label);
          out.push({ label, kind: 'intersection', lngLat: aisPoint(f), source: 'ais' });
          continue;
        }
        if (f.ais_feature_type !== 'address') continue;
        if (f.match_type?.includes('unit')) continue;
        const label = p.street_address;
        if (!label || seen.has(label)) continue;
        seen.add(label);
        out.push({
          label,
          kind: 'address',
          opa: p.opa_account_num || null,
          lngLat: aisPoint(f),
          owner: p.opa_owners?.[0] ?? null,
          source: 'ais',
        });
      }
    }
  } catch (e) {
    if ((e as { code?: string })?.code === 'aborted') throw e;
    aisFailed = e;
  }

  // Still typing the street name? Look for addresses that start with what's typed.
  if (out.length < 2 && !isOpa && !looksIntersection && /^\d+[A-Z]?(-\d+)?\s+\S/i.test(normaliseAddress(raw))) {
    try {
      const prefix = await prefixSearch(normaliseAddress(raw), limit, opts.signal);
      const have = new Set(out.map((s) => s.label));
      out = out.concat(prefix.filter((s) => !have.has(s.label)));
    } catch (e) {
      if ((e as { code?: string })?.code === 'aborted') throw e;
      if (aisFailed) throw aisFailed;
    }
  } else if (aisFailed) {
    throw aisFailed;
  }
  return out.slice(0, limit);
}

/** OPA addresses beginning with `prefix` (already normalised). */
export async function prefixSearch(prefix: string, limit = 8, signal?: AbortSignal): Promise<AddressSuggestion[]> {
  // Only letters, digits, spaces, '/', '-' reach the SQL, and LIKE wildcards are stripped.
  const safe = prefix.replace(/[^A-Z0-9 /-]/g, '').trim();
  if (safe.length < 3) return [];
  const sql = `SELECT parcel_number, location, owner_1, ST_X(the_geom) AS lng, ST_Y(the_geom) AS lat
    FROM opa_properties_public WHERE location LIKE ${sqlString(safe + '%')}
    ORDER BY location LIMIT ${Math.min(20, limit)}`;
  const r = await getJSON<{ rows: { parcel_number: string; location: string; owner_1: string | null; lng: number | null; lat: number | null }[] }>(
    cartoUrl(sql),
    { signal },
  );
  return (r.rows ?? []).map((row) => ({
    label: row.location,
    kind: 'address' as const,
    opa: row.parcel_number,
    lngLat: row.lng != null && row.lat != null ? ([row.lng, row.lat] as LngLat) : null,
    owner: row.owner_1,
    source: 'opa' as const,
  }));
}
