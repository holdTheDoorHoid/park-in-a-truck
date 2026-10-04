import { describe, expect, it } from 'vitest';
import { assemble } from '../assemble';
import { getPieceSet } from '../../../data/pieces/all';

describe('added items', () => {
  const set = getPieceSet('A', 'interior')!;
  const themes = { frame: 'nature', front: 'nature', back: 'nature' } as const;
  it('a copy keeps the footprint it was copied with (a raised bed drawn 9.5 x 3.5 stays so)', () => {
    const l = assemble(set, themes, undefined, undefined, {
      added: [{ id: 'added-1', element: 'raised-bed', x: 10, y: 6, rotationDeg: 0, w: 9.5, h: 3.5 }],
      removed: [],
      moved: {},
    });
    expect(l.items.find((i) => i.id === 'added-1')).toMatchObject({ w: 9.5, h: 3.5 });
  });
  it('a copy of built furniture saved at a drawn size comes back at its true size', () => {
    const l = assemble(set, themes, undefined, undefined, {
      added: [
        { id: 'added-1', element: 'gabion-bench', x: 10, y: 6, rotationDeg: 0, w: 3.2, h: 1.1 },
        { id: 'added-2', element: 'shade-canopy', x: 20, y: 6, rotationDeg: 0, w: 16, h: 17 },
      ],
      removed: [],
      moved: {},
    });
    expect(l.items.find((i) => i.id === 'added-1')).toMatchObject({ w: 4, h: 1.5 });
    // a copy of a 16' x 16' canopy is still four 8' x 8' modules
    expect(l.items.find((i) => i.id === 'added-2')).toMatchObject({ w: 16, h: 16 });
  });
  it('a new item without a size uses elements.ts', () => {
    const l = assemble(set, themes, undefined, undefined, {
      added: [{ id: 'added-2', element: 'gabion-bench', x: 10, y: 6, rotationDeg: 0 }],
      removed: [],
      moved: {},
    });
    expect(l.items.find((i) => i.id === 'added-2')?.w).toBe(4);
  });
});
