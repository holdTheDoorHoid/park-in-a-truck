import { describe, expect, it } from 'vitest';
import { getPieceSet, PIECE_SETS } from '../../../data/pieces/all';
import { assemble } from '../assemble';
import { tally } from '../tally';

const event = { frame: 'event', front: 'event', back: 'event' } as const;

describe('tally — the Dream workbook worked example', () => {
  // "Count your pieces" numbers the green squares of a size-D corner lot in the
  // Event theme (the street-right set: streets along the entrance edge and the
  // y0 side) — 42 of them.
  const l = assemble(getPieceSet('D', 'corner-right'), event);
  const t = tally(l);

  it('counts the 42 green squares the workbook numbers', () => {
    expect(t.plantingSquares.sun + t.plantingSquares.shade).toBe(42);
  });
  it('reads the size and themes', () => {
    expect(t.lengthFt).toBe(88);
    expect(t.widthFt).toBe(32);
    expect(t.themes).toEqual(['event']);
  });
  it('counts the Event furniture', () => {
    expect(t.items.stage).toBe(4); // 16' x 4' stage = four 4' squares
    expect(t.items.shed).toBe(1);
    expect(t.items['cafe-table']).toBe(32);
    expect(t.smallTrees).toBeGreaterThan(3);
    expect(t.largeTrees).toBe(0);
    expect(t.naturePlaySquares).toBe(0);
  });
  it('splits squares and shrubs by sun, counting part sun as shade', () => {
    const half = (x: number) => (x < 44 ? 'sun' : 'part');
    const s = tally(l, (x) => half(x));
    expect(s.plantingSquares.sun + s.plantingSquares.shade).toBe(42);
    expect(s.plantingSquares.shade).toBeGreaterThan(0);
    expect(s.plantingSquares.sun).toBeGreaterThan(0);
  });
  it('measures gabion wall along the two street edges and the edging', () => {
    expect(t.gabionWallFt).toBeGreaterThan(60);
    expect(t.outerEdgeFt!.softscape).toBeGreaterThan(0);
    expect(t.gravelEdgeFt!.softscape).toBeGreaterThan(0);
  });
});

describe('tally — seams', () => {
  it('a longer park has more green squares (the frame strips stretch)', () => {
    const s = getPieceSet('D', 'corner-right');
    const a = tally(assemble(s, event));
    const b = tally(assemble(s, event, 96, 32));
    expect(b.plantingSquares.sun).toBeGreaterThan(a.plantingSquares.sun);
  });
  it('every set and theme yields a sensible tally', () => {
    for (const s of Object.values(PIECE_SETS)) {
      for (const th of ['edible', 'sanctuary', 'nature', 'event'] as const) {
        const t = tally(assemble(s, { frame: th, front: th, back: th }));
        expect(t.plantingSquares.sun).toBeGreaterThan(0);
        // every Nature park has a nature-play area, except A-interior (too narrow)
        // and the B corner sets (their Nature pages print the Sanctuary art)
        const noPlay = s.id === 'A-interior' || (s.size === 'B' && s.lotKind !== 'interior');
        if (th === 'nature' && !noPlay) expect(t.naturePlaySquares).toBeGreaterThan(0);
      }
    }
  });
});
