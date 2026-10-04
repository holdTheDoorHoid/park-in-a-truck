import { describe, expect, it } from 'vitest';
import { assemble } from '../assemble';
import { getPieceSet } from '../../../data/pieces/all';

describe('added items', () => {
  const set = getPieceSet('A', 'interior')!;
  const themes = { frame: 'nature', front: 'nature', back: 'nature' } as const;
  it('a copy keeps the footprint it was copied with', () => {
    const l = assemble(set, themes, undefined, undefined, {
      added: [{ id: 'added-1', element: 'gabion-bench', x: 10, y: 6, rotationDeg: 0, w: 3.2, h: 1.1 }],
      removed: [],
      moved: {},
    });
    expect(l.items.find((i) => i.id === 'added-1')).toMatchObject({ w: 3.2, h: 1.1 });
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
