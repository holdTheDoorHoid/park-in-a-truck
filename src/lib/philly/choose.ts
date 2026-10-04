// Choosing a lot: save it as the project's lot and write the lot facts the
// planner, pieces and Assess summary read (project.extra.site — SiteFacts in
// src/lib/types.ts). Keys written by other workstreams (sunClass, treesKept)
// are kept.

import { addCandidate, getExtra, setExtra, setLot } from '../project';
import { fitSize } from '../sizing';
import type { LotRecord, SiteFacts } from '../types';
import type { LotExtra, LotGeometry } from './types';

/** The geometry facts stored on a LotRecord by lookupLot(). */
export function lotGeometry(lot: LotRecord | null | undefined) {
  return ((lot?.extra ?? {}) as LotExtra).geometry ?? null;
}

/**
 * The park size for a lot's measured rectangle, worked out now rather than read from
 * the saved record: lots saved before 2026-10-04 carry a "closest fit" that could be
 * bigger than the lot (sizing.ts).
 */
export function sizeOf(g: Pick<LotGeometry, 'lengthFt' | 'widthFt'>): LotGeometry['size'] {
  const f = fitSize(g.lengthFt, g.widthFt);
  return { id: f.size, exact: f.exact, tooSmall: f.tooSmall, tooBig: f.tooBig };
}

/** The lot fields of SiteFacts for a looked-up lot (pure; no saving). */
export function siteFactsFromLot(lot: LotRecord): SiteFacts {
  const g = lotGeometry(lot);
  if (g) {
    const size = sizeOf(g);
    return {
      sizeId: size.id,
      sizeExact: size.exact,
      tooSmall: size.tooSmall,
      tooBig: size.tooBig,
      lengthFt: g.lengthFt,
      widthFt: g.widthFt,
      rect: { center: g.rect.center, bearingDeg: g.rect.bearingDeg },
      streetEdges: g.streetEdges,
      lotKind: g.lotKind,
    };
  }
  // No outline: fall back to the frontage × depth on the property record.
  if (lot.frontageFt && lot.depthFt) {
    const fit = fitSize(lot.frontageFt, lot.depthFt);
    return {
      sizeId: fit.size,
      sizeExact: fit.exact,
      tooSmall: fit.tooSmall,
      tooBig: fit.tooBig,
      lengthFt: Math.max(lot.frontageFt, lot.depthFt),
      widthFt: Math.min(lot.frontageFt, lot.depthFt),
      lotKind: 'interior',
    };
  }
  return {};
}

const LOT_KEYS: (keyof SiteFacts)[] = ['sizeId', 'sizeExact', 'tooSmall', 'tooBig', 'lengthFt', 'widthFt', 'rect', 'streetEdges', 'lotKind'];

/** Merge new lot facts into existing SiteFacts, replacing only the keys this workstream owns. */
export function mergeSiteFacts(prev: SiteFacts | undefined, next: SiteFacts): SiteFacts {
  const out: SiteFacts = { ...(prev ?? {}) };
  for (const k of LOT_KEYS) delete (out as Record<string, unknown>)[k];
  return { ...out, ...next };
}

/** "Use this as my park lot": save the lot, keep it in the candidates list, write extra.site. */
export function chooseLot(lot: LotRecord) {
  setLot(lot);
  addCandidate(lot);
  setExtra('site', mergeSiteFacts(getExtra<SiteFacts>('site'), siteFactsFromLot(lot)));
}

/** Forget the chosen lot (keeps it in the candidates list). */
export function clearLot() {
  setLot(null);
  setExtra('site', mergeSiteFacts(getExtra<SiteFacts>('site'), {}));
}
