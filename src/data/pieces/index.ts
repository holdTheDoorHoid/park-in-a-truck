/// <reference types="vite/client" />
// Park-piece sets extracted from PiaT's printable pieces (scripts/extract_pieces.py).
// One JSON per size × lot kind. Loaded lazily so a page only downloads the set
// it needs (each is ~40–60 KB). Server code and tests can use ./all.ts instead.

import type { LotKind, SizeId } from '../../lib/types';
import type { PieceSet } from '../../lib/pieces/model';

export type { PieceSet } from '../../lib/pieces/model';
export { SET_IDS, setId } from '../../lib/pieces/model';

const loaders = import.meta.glob<PieceSet>('./*.json', { import: 'default' });

const cache = new Map<string, Promise<PieceSet>>();

/** Load the piece set for a size and lot kind. */
export function loadPieceSet(size: SizeId, lotKind: LotKind): Promise<PieceSet> {
  const id = `${size}-${lotKind}`;
  const hit = cache.get(id);
  if (hit) return hit;
  const load = loaders[`./${id}.json`];
  if (!load) return Promise.reject(new Error(`No park-piece set ${id}`));
  const p = load();
  cache.set(id, p);
  return p;
}
