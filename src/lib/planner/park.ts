// SEAM: the park design model. Everything the planner needs from the pieces
// workstream goes through this file: PiaT's own printed park pieces, extracted to
// data (src/data/pieces/*.json), assembled with seams (src/lib/pieces/assemble.ts)
// and counted the way the Dream workbook counts them (src/lib/pieces/tally.ts).

import { assemble } from '../pieces/assemble';
import { tally } from '../pieces/tally';
import { loadPieceSet as loadSet, type PieceSet } from '../../data/pieces';
import type { DesignState, DesignTally, LotKind, ParkLayout, SizeId, SunClass } from '../types';

type SunAt = (x: number, y: number) => SunClass;

export type { PieceSet, SunAt };

export const USING_PLACEHOLDER_PIECES = false;

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
