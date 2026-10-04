// SEAM: the park design model. Everything the planner needs from the pieces
// workstream goes through this file.
//
// To switch to the real park pieces, change the import below to
//   import { assemble, loadSet, tally } from '../pieces';
// (src/lib/pieces/ exports the same three functions). `nominalOf` reads the set's
// nominal size; adjust it if the real PieceSet names it differently.

import { assemble, loadSet, tally, type PieceSet, type SunAt } from './placeholder-layout';
import type { DesignState, DesignTally, LotKind, ParkLayout, SizeId } from '../types';

export type { PieceSet, SunAt };

export const USING_PLACEHOLDER_PIECES = true;

const sets = new Map<string, Promise<PieceSet>>();

export function getPieceSet(size: SizeId, lotKind: LotKind): Promise<PieceSet> {
  const key = `${size}-${lotKind}`;
  if (!sets.has(key)) sets.set(key, loadSet(size, lotKind));
  return sets.get(key)!;
}

export function nominalOf(set: PieceSet): { lengthFt: number; widthFt: number } {
  return set.nominal;
}

export function buildLayout(set: PieceSet, d: Pick<DesignState, 'frame' | 'front' | 'back' | 'lengthFt' | 'widthFt' | 'added' | 'removed' | 'moved'>): ParkLayout {
  return assemble(set, { frame: d.frame, front: d.front, back: d.back }, d.lengthFt, d.widthFt, {
    added: d.added,
    removed: d.removed,
    moved: d.moved,
  });
}

export function tallyLayout(layout: ParkLayout, sunAt?: SunAt): DesignTally {
  return tally(layout, sunAt);
}
