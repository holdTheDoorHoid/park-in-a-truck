import { describe, expect, it } from 'vitest';
import { PIECE_SETS } from '../../../data/pieces/all';
import { ELEMENTS } from '../../../data/elements';
import { assemble } from '../assemble';
import { tally } from '../tally';
import { FIXED_SIZE, MODULE_FT, builtSize, wholeModules } from '../builtsize';

const THEMES = ['edible', 'sanctuary', 'nature', 'event'] as const;
const close = (a: number, b: number) => Math.abs(a - b) < 1e-9;

describe('built furniture keeps its true built size (build-lead A7)', () => {
  it('reads the true size from elements.ts, turned the way the drawing runs', () => {
    expect(builtSize('gabion-bench', 4, 1.75)).toEqual([4, 1.5]);
    expect(builtSize('gabion-bench', 5, 2)).toEqual([4, 1.5]);
    expect(builtSize('cafe-table', 3.5, 1.75)).toEqual([3.5, 2]);
    expect(builtSize('cafe-table', 3.25, 2.25)).toEqual([3.5, 2]);
    expect(builtSize('stool', 2, 2)).toEqual(ELEMENTS.stool!.footprintFt);
    expect(builtSize('bench-back', 4, 1.5)).toEqual(ELEMENTS['bench-back']!.footprintFt);
    // drawn the other way round: the length runs along the drawing's long side
    expect(builtSize('workbench', 1.75, 3.75)).toEqual([ELEMENTS.workbench!.footprintFt![1], 4]);
  });
  it('counts stages and shade canopies in whole true-size modules', () => {
    expect(builtSize('stage', 3.5, 4)).toEqual([4, 4]);
    expect(builtSize('stage', 12, 8)).toEqual([12, 8]);
    // A2: a canopy is always whole 8' x 8' modules
    expect(builtSize('shade-canopy', 8, 4)).toEqual([8, 8]);
    expect(builtSize('shade-canopy', 17, 16)).toEqual([16, 16]);
    expect(builtSize('shade-canopy', 16, 12)).toEqual([16, 8]);
    expect(builtSize('shade-canopy', 18, 24)).toEqual([16, 24]);
    expect(wholeModules(1, 8)).toBe(1);
    expect(wholeModules(20, 8)).toBe(2);
  });
  it('leaves sized-to-fit things and plants as drawn', () => {
    expect(builtSize('raised-bed', 9.5, 3.5)).toEqual([9.5, 3.5]);
    expect(builtSize('keyhole-garden', 7.75, 7.75)).toEqual([7.75, 7.75]);
    expect(builtSize('communal-table', 12, 5)).toEqual([12, 5]);
    expect(builtSize('small-tree', 3.75, 4)).toEqual([3.75, 4]);
  });
  it('every item of every printed set: built things at true size, at any stretch', () => {
    let fixed = 0;
    for (const s of Object.values(PIECE_SETS)) {
      for (const th of THEMES) {
        for (const [L, W] of [
          [s.nominal.lengthFt, s.nominal.widthFt],
          [s.nominal.lengthFt + 7, s.nominal.widthFt + 3],
        ]) {
          const l = assemble(s, { frame: th, front: th, back: th }, L, W);
          for (const it of l.items) {
            if (FIXED_SIZE.has(it.element)) {
              fixed++;
              const fp = ELEMENTS[it.element]!.footprintFt!;
              expect([Math.max(it.w, it.h), Math.min(it.w, it.h)], `${it.id} ${it.element}`).toEqual([Math.max(...fp), Math.min(...fp)]);
            }
            const m = MODULE_FT[it.element];
            if (m) {
              expect(close(it.w % m, 0) && it.w >= m, `${it.id} ${it.w}`).toBe(true);
              expect(close(it.h % m, 0) && it.h >= m, `${it.id} ${it.h}`).toBe(true);
            }
          }
        }
      }
    }
    expect(fixed).toBeGreaterThan(1000);
  });
  it('the tally sizes canopies and stages from the true modules', () => {
    const s = PIECE_SETS['D-corner-right']!;
    const t = tally(assemble(s, { frame: 'event', front: 'event', back: 'event' }));
    // the Event stage: four 4' squares
    expect(t.items.stage).toBe(4);
    expect(t.itemSizes!.stage).toEqual([
      [4, 4],
      [4, 4],
      [4, 4],
      [4, 4],
    ]);
    for (const [w, h] of t.itemSizes!['shade-canopy'] ?? []) {
      expect(w % 8).toBe(0);
      expect(h % 8).toBe(0);
    }
  });
});
