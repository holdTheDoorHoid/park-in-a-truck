import { describe, expect, it } from 'vitest';
import { PIECE_SETS } from '../../../data/pieces/all';
import { ELEMENTS } from '../../../data/elements';
import { SET_IDS, PIECE_KINDS, rectArea, type Rect } from '../model';
import { THEME_ORDER } from '../../../data/themes';
import { SIZES } from '../../sizing';

const sets = Object.values(PIECE_SETS);

function inside(r: Rect, L: number, W: number) {
  return r[0] >= -1e-6 && r[1] >= -1e-6 && r[2] <= L + 1e-6 && r[3] <= W + 1e-6 && r[2] > r[0] && r[3] > r[1];
}

describe('park-piece sets (src/data/pieces/*.json)', () => {
  it('has all 15 sets: sizes A–E × interior / corner-left / corner-right', () => {
    expect(Object.keys(PIECE_SETS).sort()).toEqual([...SET_IDS].sort());
  });

  for (const s of sets) {
    describe(s.id, () => {
      const L = s.nominal.lengthFt;
      const W = s.nominal.widthFt;

      it('is the smallest park of its size range (the pieces are printed at the minimum)', () => {
        const range = SIZES.find((r) => r.id === s.size)!;
        expect(L).toBe(range.long[0]);
        expect(W).toBe(range.short[0]);
        expect(s.range.longFt).toEqual(range.long);
        expect(s.range.shortFt).toEqual(range.short);
      });

      it('faces the street on its entrance edge, and on the side street for corner lots', () => {
        expect(s.streetEdges).toContain('x0');
        if (s.lotKind === 'interior') expect(s.streetEdges).toEqual(['x0']);
        if (s.lotKind === 'corner-left') expect(s.streetEdges).toEqual(['x0', 'y1']);
        if (s.lotKind === 'corner-right') expect(s.streetEdges).toEqual(['x0', 'y0']);
      });

      it('places the seams inside the park', () => {
        expect(s.seams.length.x).toBeGreaterThan(0);
        expect(s.seams.length.x).toBeLessThan(L);
        expect(s.seams.length.x % 4).toBe(0);
        expect(s.seams.width.y).toBeGreaterThan(0);
        expect(s.seams.width.y).toBeLessThan(W);
        expect(s.seams.length.maxFt).toBe(s.range.longFt[1] - L);
        expect(s.seams.width.maxFt).toBe(s.range.shortFt[1] - W);
      });

      for (const th of THEME_ORDER) {
        it(`${th}: frame, front and back tile the whole park`, () => {
          const t = s.themes[th];
          let area = 0;
          for (const k of PIECE_KINDS) {
            for (const r of t[k].extent) {
              expect(inside(r, L, W)).toBe(true);
              area += rectArea(r);
            }
          }
          expect(area).toBeCloseTo(L * W, 6);
          // front and back meet at the length seam
          expect(t.front.extent[0]![2]).toBe(s.seams.length.x);
          expect(t.back.extent[0]![0]).toBe(s.seams.length.x);
        });

        it(`${th}: surfaces cover each piece exactly once`, () => {
          const t = s.themes[th];
          for (const k of PIECE_KINDS) {
            const p = t[k];
            const ext = p.extent.reduce((a, r) => a + rectArea(r), 0);
            let area = 0;
            for (const [mat, rects] of Object.entries(p.surfaces)) {
              expect(['planting', 'gravel', 'gabion', 'nature-play', 'wood-deck']).toContain(mat);
              for (const r of rects!) {
                expect(inside(r, L, W)).toBe(true);
                area += rectArea(r);
              }
            }
            expect(area).toBeCloseTo(ext, 3);
          }
          // some planting in every theme
          const planting = PIECE_KINDS.flatMap((k) => t[k].surfaces.planting ?? []).reduce((a, r) => a + rectArea(r), 0);
          expect(planting).toBeGreaterThan(16);
        });

        it(`${th}: every item is a known element inside the park`, () => {
          const t = s.themes[th];
          let n = 0;
          for (const k of PIECE_KINDS) {
            for (const it of t[k].items) {
              n += 1;
              expect(ELEMENTS[it.element], it.element).toBeDefined();
              expect(it.x).toBeGreaterThanOrEqual(-0.5);
              expect(it.x).toBeLessThanOrEqual(L + 0.5);
              expect(it.y).toBeGreaterThanOrEqual(-0.5);
              expect(it.y).toBeLessThanOrEqual(W + 0.5);
              expect(it.w).toBeGreaterThan(0);
              expect(it.h).toBeGreaterThan(0);
              expect([0, 90]).toContain(it.rotationDeg);
            }
          }
          expect(n).toBeGreaterThan(5);
        });
      }

      it('records where it came from', () => {
        expect(s.source.file).toMatch(/^04_Dream_WORKBOOK_p11_[A-E]__/);
        for (const th of THEME_ORDER) for (const k of PIECE_KINDS) expect(s.themes[th][k].source.length).toBeGreaterThan(0);
      });
    });
  }
});
