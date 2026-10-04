/// <reference types="vite/client" />
// Every park-piece set, bundled eagerly. For build-time pages and tests only —
// client code should use loadPieceSet() from ./index.ts.

import type { LotKind, SizeId } from '../../lib/types';
import type { PieceSet } from '../../lib/pieces/model';

const mods = import.meta.glob<PieceSet>('./*.json', { import: 'default', eager: true });

export const PIECE_SETS: Record<string, PieceSet> = Object.fromEntries(
  Object.values(mods).map((s) => [s.id, s]),
);

export function getPieceSet(size: SizeId, lotKind: LotKind): PieceSet {
  const s = PIECE_SETS[`${size}-${lotKind}`];
  if (!s) throw new Error(`No park-piece set ${size}-${lotKind}`);
  return s;
}
