// "I only know my street": a street name with no house number ("N Uber St")
// takes the vacant-land map to that street. AIS needs a house number, so this
// asks the City's street centerlines (ArcGIS Street_Centerline: stname,
// l_hundred / r_hundred = the hundred block) and offers the street's blocks.

import type { LngLat } from '../types';
import { queryAttrs, queryGeo } from './arcgis';
import { LAYERS, sqlString } from './endpoints';
import { normaliseAddress } from './search';
import type { BBox } from './types';
import type { Locale } from '../../i18n/locales.ts';
import { words } from './words';

export interface StreetBlock {
  /** 2200 for the 2200 block */
  hundred: number;
  /** "2200 block" (English; blockLabel() gives it in the reader's language) */
  label: string;
  bbox: BBox;
}

export interface StreetMatch {
  /** As the City writes it, e.g. "N UBER ST" */
  name: string;
  /** Its blocks in address order (empty when only the name is known yet) */
  blocks: StreetBlock[];
}

const DIRS = new Set(['N', 'S', 'E', 'W']);
const TYPES = new Set(['ST', 'AVE', 'RD', 'BLVD', 'PL', 'LN', 'DR', 'TER', 'CT', 'WAY', 'PKWY', 'ALY', 'CIR', 'SQ', 'WALK', 'PIKE', 'HWY', 'ROW']);

/**
 * True for a street name with no house number: "N Uber St", "uber street", "Uber".
 * False for addresses ("2233 N Uber St"), corners ("60th & Greenway") and OPA numbers.
 */
export function looksLikeStreetOnly(q: string): boolean {
  const t = q.trim();
  if (t.length < 3) return false;
  if (/^\d/.test(t)) return false; // a house number (or an OPA account)
  if (/\s(&|and|at)\s|\//i.test(t)) return false; // a corner
  return /[a-z]{2,}/i.test(t);
}

/** "N UBER ST" → "UBER"; "NORTH 22ND STREET" → "22ND" (the part to search for). */
export function streetCore(normalised: string): string {
  const words = normalised.split(' ').filter(Boolean);
  if (words.length > 1 && DIRS.has(words[0]!)) words.shift();
  if (words.length > 1 && TYPES.has(words[words.length - 1]!)) words.pop();
  return words.join(' ');
}

function blocksOf(features: { geometry: { type: string; coordinates: unknown } | null; properties: { l_hundred: number | null; r_hundred: number | null } }[]): StreetBlock[] {
  const by = new Map<number, BBox>();
  for (const f of features) {
    const g = f.geometry;
    if (!g) continue;
    const lines = g.type === 'LineString' ? [g.coordinates as number[][]] : g.type === 'MultiLineString' ? (g.coordinates as number[][][]) : [];
    const h = f.properties.l_hundred || f.properties.r_hundred || 0;
    const b = by.get(h) ?? [Infinity, Infinity, -Infinity, -Infinity];
    for (const l of lines)
      for (const c of l) {
        b[0] = Math.min(b[0], c[0]!);
        b[1] = Math.min(b[1], c[1]!);
        b[2] = Math.max(b[2], c[0]!);
        b[3] = Math.max(b[3], c[1]!);
      }
    if (Number.isFinite(b[0])) by.set(h, b);
  }
  return [...by.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([hundred, bbox]) => ({ hundred, label: blockLabel(hundred, 'en'), bbox }));
}

/** "2200 block" / "First block (under 100)" in the reader's language. */
export function blockLabel(hundred: number, locale?: Locale | string): string {
  const t = words(locale);
  // a house number, not a quantity: no "2,200"
  return hundred === 0 ? t('street.firstBlock') : t('street.block', { hundred: String(hundred) });
}

/** Every block of one street, by its City name ("N UBER ST"). */
export async function streetBlocks(name: string, opts: { signal?: AbortSignal } = {}): Promise<StreetBlock[]> {
  const safe = name.toUpperCase().replace(/[^A-Z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
  if (!safe) return [];
  const { features } = await queryGeo<{ l_hundred: number | null; r_hundred: number | null }>(
    LAYERS.streets,
    { where: `stname=${sqlString(safe)}`, outFields: ['l_hundred', 'r_hundred'], precision: 6, resultRecordCount: 1000 },
    opts,
  );
  return blocksOf(features as never);
}

/**
 * Streets matching what someone typed. One exact match comes with its blocks;
 * otherwise up to 8 similar street names (no blocks yet) to choose from.
 */
export async function findStreet(q: string, opts: { signal?: AbortSignal } = {}): Promise<StreetMatch[]> {
  const norm = normaliseAddress(q).replace(/[^A-Z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
  if (norm.length < 2) return [];
  const exact = await streetBlocks(norm, opts);
  if (exact.length) return [{ name: norm, blocks: exact }];
  const core = streetCore(norm);
  if (core.length < 2) return [];
  const like = (p: string) => `stname LIKE ${sqlString(p)}`;
  const rows = await queryAttrs<{ stname: string | null }>(
    LAYERS.streets,
    { where: `(${like(`${core} %`)} OR ${like(`% ${core} %`)} OR ${like(`% ${core}`)} OR stname=${sqlString(core)})`, outFields: ['stname'], resultRecordCount: 400 },
    opts,
  );
  const names = [...new Set(rows.map((r) => (r.stname ?? '').trim()).filter(Boolean))].sort().slice(0, 8);
  if (names.length === 1) return [{ name: names[0]!, blocks: await streetBlocks(names[0]!, opts) }];
  return names.map((name) => ({ name, blocks: [] }));
}

/** Middle of a bbox. */
export const bboxCenter = (b: BBox): LngLat => [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2];
