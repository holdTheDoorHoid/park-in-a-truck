import { describe, expect, it } from 'vitest';
import { getGuide, getGuides } from '../index';

// The build guides' "Note from this site" corrections (usability testing, 2026-10-04) rest on
// cut-list arithmetic. This checks that arithmetic against the guide data itself, so a note
// can't drift from the numbers it explains.

const KERF = 0.125; // a typical saw blade

/** Boards of `stockLen` needed for these pieces, first-fit decreasing; every cut costs `kerf`
 * except a piece that uses up exactly what's left of a board. */
function boardsNeeded(pieces: number[], stockLen = 96, kerf = KERF): number {
  const left: number[] = [];
  for (const p of [...pieces].sort((a, b) => b - a)) {
    const i = left.findIndex((r) => r === p || r >= p + kerf);
    if (i >= 0) left[i] = left[i] === p ? 0 : left[i]! - p - kerf;
    else left.push(stockLen === p ? 0 : stockLen - p - kerf);
  }
  return left.length;
}

function piecesOf(slug: string, maxLen = 96, onlyParts?: (part: string) => boolean): number[] {
  const g = getGuide(slug)!;
  return g.cutList
    .filter((c) => c.stock === '2x4' && c.lengthIn <= maxLen && (!onlyParts || onlyParts(c.part)))
    .flatMap((c) => Array<number>(c.qty).fill(c.lengthIn));
}

const eightFooters = (slug: string) =>
  getGuide(slug)!.materials.find((m) => m.size?.replace(/'-0"$/, "'") === "2x4x8'")!;

describe('build-guide site notes', () => {
  it('stage: the cut list needs 25 eight-footers, not the 16 in the materials list', () => {
    expect(boardsNeeded(piecesOf('stage'))).toBe(25);
    const m = eightFooters('stage');
    expect(m.qty).toBe(16);
    expect(m.siteNote).toMatch(/about 25, not 16/);
  });

  it("4' gabion bench: 4½ boards only works with no saw cut", () => {
    const pieces = piecesOf('gabion-bench');
    expect(boardsNeeded(pieces, 96, 0)).toBeLessThanOrEqual(4.5);
    expect(boardsNeeded(pieces)).toBe(7); // one 48″ per board, the 15″ pieces from an offcut
    expect(boardsNeeded(pieces, 120)).toBe(4); // 2x4x10s
    expect(eightFooters('gabion-bench').siteNote).toMatch(/7 boards.*4 boards/);
  });

  it("guides whose materials do add up get no lumber note (6' table, 24″ planter)", () => {
    expect(boardsNeeded(piecesOf('table-6'))).toBe(eightFooters('table-6').qty);
    expect(eightFooters('table-6').siteNote).toBeUndefined();
    const box24 = piecesOf('planter-24', 96, (p) => p.includes('24"x24"'));
    expect(boardsNeeded(box24)).toBe(eightFooters('planter-24').qty);
  });

  it('shade: 32 SS-1 (what the steps use) still fit in the 47 boards listed', () => {
    const g = getGuide('shade')!;
    const ss1 = g.cutList.find((c) => c.part === 'SS-1')!;
    expect(ss1.siteNote).toMatch(/steps use 32/);
    const pieces = [...Array<number>(32).fill(96), ...piecesOf('shade').filter((l) => l < 96)];
    expect(boardsNeeded(pieces)).toBeLessThanOrEqual(eightFooters('shade').qty);
  });

  it('24″ planter: P-1 × 33 = 4 in the frames + 12 + 12 + 5, and the note says so', () => {
    const g = getGuide('planter-24')!;
    expect(g.cutList.find((c) => c.part === 'P-1 (24"x24" box)')!.qty).toBe(4 + 12 + 12 + 5);
    expect(g.steps.find((s) => s.n === 3)!.siteNote).toMatch(/4 in the frames \+ 12 here \+ 12 on the sides \+ 5 in the bottom/);
    // six 21″ boards across the 24″ frame leave 1.5″ each side
    expect((24 - 21) / 2).toBe(1.5);
  });

  it("6' table: 7 top boards fill the 26″ top; 2 in step 4 + 5 in step 5", () => {
    const g = getGuide('table-6')!;
    expect(g.cutList.find((c) => c.part === 'T-1')!.qty).toBe(7);
    expect(7 * 3.5 + 6 * 0.25).toBe(g.dimensionsIn.width);
    expect(g.steps.find((s) => s.n === 5)!.siteNote).toMatch(/2 from step 4 plus 5 more/);
    expect(30 * 2 + 12 + 4 + 28).toBe(104);
    expect(g.hardware[0]!.siteNote).toMatch(/104 screws, not 92/);
  });

  it('every site note is short: 1–3 sentences, no more than 450 characters', () => {
    for (const g of getGuides()) {
      const notes = [
        ...g.steps.map((s) => s.siteNote),
        ...g.materials.map((m) => m.siteNote),
        ...g.hardware.map((m) => m.siteNote),
        ...g.cutList.map((c) => c.siteNote),
      ].filter((n): n is string => n !== undefined);
      for (const n of notes) {
        expect(n.trim().length, `${g.slug}: ${n}`).toBeGreaterThan(0);
        expect(n.length, `${g.slug}: ${n}`).toBeLessThanOrEqual(450);
        expect(n.split(/(?<=[.!?])\s+(?=[A-Z0-9"“])/).length, `${g.slug}: ${n}`).toBeLessThanOrEqual(3);
      }
    }
  });
});
