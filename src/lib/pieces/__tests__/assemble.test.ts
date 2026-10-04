import { describe, expect, it } from 'vitest';
import { PIECE_SETS, getPieceSet } from '../../../data/pieces/all';
import { THEME_ORDER } from '../../../data/themes';
import { assemble, itemId, type PieceThemes } from '../assemble';
import { rasterise } from '../tally';
import { PIECE_KINDS } from '../model';
import type { LayoutSurface, ParkLayout } from '../../types';

const same = (t: (typeof THEME_ORDER)[number]): PieceThemes => ({ frame: t, front: t, back: t });

function area(s: LayoutSurface) {
  const xs = s.polygon.map((p) => p[0]);
  const ys = s.polygon.map((p) => p[1]);
  return (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys));
}
const totalArea = (l: ParkLayout) => l.surfaces.reduce((a, s) => a + area(s), 0);
const byMaterial = (l: ParkLayout) => {
  const out: Record<string, number> = {};
  for (const s of l.surfaces) out[s.material] = (out[s.material] ?? 0) + area(s);
  return out;
};
function gaps(l: ParkLayout) {
  const r = rasterise(l);
  return r.mat.filter((m) => m === null).length;
}

describe('assemble at nominal size', () => {
  for (const s of Object.values(PIECE_SETS)) {
    it(`${s.id}: reproduces the extracted pieces exactly`, () => {
      for (const th of THEME_ORDER) {
        const l = assemble(s, same(th));
        expect(l.lengthFt).toBe(s.nominal.lengthFt);
        expect(l.widthFt).toBe(s.nominal.widthFt);
        expect(l.streetEdges).toEqual(s.streetEdges);
        const items = PIECE_KINDS.flatMap((k) => s.themes[th][k].items.map((it, n) => ({ ...it, id: itemId(k, th, n + 1) })));
        expect(l.items).toHaveLength(items.length);
        const got = new Map(l.items.map((it) => [it.id, it]));
        for (const it of items) {
          const g = got.get(it.id)!;
          expect(g.element).toBe(it.element);
          expect(g.x).toBeCloseTo(it.x, 6);
          expect(g.y).toBeCloseTo(it.y, 6);
          expect(g.w).toBe(it.w);
          expect(g.h).toBe(it.h);
        }
        const rects = PIECE_KINDS.reduce((n, k) => n + Object.values(s.themes[th][k].surfaces).reduce((a, r) => a + r!.length, 0), 0);
        expect(l.surfaces).toHaveLength(rects);
        expect(totalArea(l)).toBeCloseTo(s.nominal.lengthFt * s.nominal.widthFt, 3);
        expect(l.clipped).toEqual([]);
      }
    });
  }
});

describe('mix and match', () => {
  it('fits any frame / front / back combination (every set, every combination)', () => {
    for (const s of Object.values(PIECE_SETS)) {
      for (const frame of THEME_ORDER)
        for (const front of THEME_ORDER)
          for (const back of THEME_ORDER) {
            const l = assemble(s, { frame, front, back });
            expect(totalArea(l)).toBeCloseTo(s.nominal.lengthFt * s.nominal.widthFt, 3);
            expect(l.pieces!.map((p) => p.theme)).toEqual([frame, front, back]);
          }
    }
  });
  it('keeps each piece’s theme on its surfaces and items', () => {
    const s = getPieceSet('D', 'corner-right');
    const l = assemble(s, { frame: 'event', front: 'nature', back: 'edible' });
    for (const it of l.items) expect(it.theme).toBe({ frame: 'event', front: 'nature', back: 'edible' }[it.source as 'frame']);
    expect(new Set(l.surfaces.map((x) => x.theme))).toEqual(new Set(['event', 'nature', 'edible']));
  });
});

describe('seams', () => {
  const s = getPieceSet('D', 'corner-right');
  const L0 = s.nominal.lengthFt;
  const W0 = s.nominal.widthFt;

  it('the workbook example: a 90 x 35 lot adds 2 ft of length seam and 3 ft of width seam', () => {
    const base = assemble(s, same('event'));
    const l = assemble(s, same('event'), 90, 35);
    expect(l.lengthFt).toBe(90);
    expect(l.widthFt).toBe(35);
    // the strips add exactly the seam area, with no gaps
    expect(totalArea(l) - totalArea(base)).toBeCloseTo(90 * 35 - L0 * W0, 3);
    expect(gaps(l)).toBe(0);
    expect(l.seams).toEqual({ length: { at: s.seams.length.x, deltaFt: 2 }, width: { at: s.seams.width.y, deltaFt: 3 } });
  });

  it('a length seam adds exactly its strip (width x extra length)', () => {
    for (const d of [1, 4, 8]) {
      const a = assemble(s, same('sanctuary'));
      const b = assemble(s, same('sanctuary'), L0 + d, W0);
      expect(totalArea(b) - totalArea(a)).toBeCloseTo(d * W0, 3);
      expect(gaps(b)).toBe(0);
    }
  });

  it('a width seam adds exactly its strip (length x extra width), filled from the interior', () => {
    const a = assemble(s, same('edible'));
    const b = assemble(s, same('edible'), L0, W0 + 6);
    expect(totalArea(b) - totalArea(a)).toBeCloseTo(6 * L0, 3);
    expect(gaps(b)).toBe(0);
    // the interior (gravel) grows, the planting strip along the street stays 3 ft deep
    const ma = byMaterial(a);
    const mb = byMaterial(b);
    expect(mb.gravel! - ma.gravel!).toBeGreaterThan(6 * (L0 - 8) - 1e-6);
  });

  it('keeps item ids and sizes across a stretch, moving items on the far side of a seam', () => {
    const a = assemble(s, same('nature'));
    const b = assemble(s, same('nature'), L0 + 5, W0 + 7);
    expect(b.items.map((i) => i.id)).toEqual(a.items.map((i) => i.id));
    const A = new Map(a.items.map((i) => [i.id, i]));
    for (const it of b.items) {
      const o = A.get(it.id)!;
      expect(it.w).toBe(o.w);
      expect(it.h).toBe(o.h);
      expect(it.x - o.x).toBeCloseTo(o.x >= s.seams.length.x ? 5 : 0, 6);
      expect(it.y - o.y).toBeCloseTo(o.y > s.seams.width.y ? 7 : 0, 6);
    }
  });

  it('the count grid gains the seam strip and stays on 4-ft marks elsewhere', () => {
    const l = assemble(s, same('event'), 90, 35);
    expect(l.countGrid!.xs[0]).toBe(0);
    expect(l.countGrid!.xs.at(-1)).toBe(90);
    expect(l.countGrid!.xs).toContain(52);
    expect(l.countGrid!.xs).toContain(54);
    expect(l.countGrid!.ys).toContain(4);
    expect(l.countGrid!.ys).toContain(7);
  });

  it('a corner-left set stretches toward its street-side strip at the top', () => {
    const left = getPieceSet('D', 'corner-left');
    expect(left.seams.width.y).toBe(left.nominal.widthFt - 4);
    const a = assemble(left, same('event'));
    const b = assemble(left, same('event'), L0, W0 + 4);
    expect(gaps(b)).toBe(0);
    const ys = (l: ParkLayout, el: string) => l.items.filter((i) => i.element === el).map((i) => i.y);
    // the stage and shed sit on the y0 side, away from the seam, and stay put
    expect(ys(b, 'shed')).toEqual(ys(a, 'shed'));
  });

  it('trims a smaller lot where it clips the fewest items, and reports what it clipped', () => {
    const a = assemble(s, same('event'));
    const b = assemble(s, same('event'), L0 - 6, W0 - 2);
    expect(b.lengthFt).toBe(L0 - 6);
    expect(totalArea(b)).toBeCloseTo((L0 - 6) * (W0 - 2), 3);
    expect(gaps(b)).toBe(0);
    const kept = new Set(b.items.map((i) => i.id));
    for (const id of b.clipped!) expect(kept.has(id)).toBe(false);
    expect(b.items.length + b.clipped!.length).toBe(a.items.length);
    for (const it of b.items) {
      expect(it.x).toBeGreaterThanOrEqual(-0.5);
      expect(it.x).toBeLessThanOrEqual(L0 - 6 + 0.5);
    }
  });
});

describe('edits', () => {
  const s = getPieceSet('C', 'interior');
  it('applies removed, moved and added, and they survive re-assembly at another size', () => {
    const base = assemble(s, same('sanctuary'));
    const victim = base.items[0]!.id;
    const mover = base.items[1]!.id;
    const edits = {
      removed: [victim],
      moved: { [mover]: { x: 10, y: 10, rotationDeg: 45 } },
      added: [{ id: 'added-1', element: 'birdbath', x: 20, y: 12, rotationDeg: 0 }],
    };
    for (const [L, W] of [
      [76, 28],
      [80, 33],
    ] as const) {
      const l = assemble(s, same('sanctuary'), L, W, edits);
      expect(l.items.find((i) => i.id === victim)).toBeUndefined();
      expect(l.items.find((i) => i.id === mover)).toMatchObject({ x: 10, y: 10, rotationDeg: 45 });
      expect(l.items.find((i) => i.id === 'added-1')).toMatchObject({ element: 'birdbath', w: 2, h: 2, source: 'added' });
    }
  });
});
