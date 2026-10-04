// Furniture from the build guides (guides.ts, the guideMaterials correction) and
// honest board counts (boards.ts). Expected values are worked by hand from each
// guide's materials list and cut list (src/data/guides/<slug>.json).

import { describe, expect, it } from 'vitest';
import { boardsFor, boardsForCopies, extraBoards } from '../boards';
import { GUIDES, guideLines, type GuideSlug } from '../guides';
import { PERENNIALS_PER_SQUARE } from '../corrections';
import { emptyInputs, estimate, type CostInputs, type Estimate } from '../model';
import { PLANTS_PER_SQUARE } from '../../../data/plants';

const models = import.meta.glob<{ countOverrides?: Record<string, { count: number }> }>('../../../data/guides/models/*.json', { eager: true, import: 'default' });
const guidesJson = import.meta.glob<{ slug: string; materials: { item: string }[]; hardware: { item: string }[] }>('../../../data/guides/*.json', {
  eager: true,
  import: 'default',
});

const line = (slug: GuideSlug, n: number, item: string) => guideLines(slug, n).find((l) => l.item === item);
const qty = (slug: GuideSlug, n: number, item: string) => line(slug, n, item)?.qty;

describe('boards, counted with 1/8" per saw cut', () => {
  it('two 48" pieces need two 8\' boards; 47 7/8" pairs fit on one', () => {
    expect(boardsFor([48, 48], 96)).toBe(2);
    expect(boardsFor([47.875, 48], 96)).toBe(1);
    expect(boardsFor([96, 96], 96)).toBe(2); // full-length pieces need no cut
  });
  it('the stage: each 93" and 86" piece takes its own board, 25 in all', () => {
    // ST-2 11 x 93", ST-3 12 x 86", ST-4 8 x 14.75" (6 a board -> 2 boards), ST-5 12 x 7.75" from the ST-3 offcuts
    const pieces = [...Array(11).fill(93), ...Array(12).fill(86), ...Array(8).fill(14.75), ...Array(12).fill(7.75)];
    expect(boardsFor(pieces, 96)).toBe(25);
  });
  it('several pieces share offcuts: 4 benches with back need 30 boards, not 4 x 8', () => {
    const bb = GUIDES['bench-back'].cutList.flatMap((c) => Array(c.qty).fill(c.lengthIn) as number[]);
    expect(boardsForCopies(bb, 96, 1)).toBe(8);
    expect(boardsForCopies(bb, 96, 4)).toBe(30); // = the guide's 7.5 a bench
  });
  it('mixed lengths: the workbench’s 2x4 list (3 x 8\', 2 x 10\', 1 x 12\') is one 8\' board short', () => {
    const wb = [...Array(12).fill(20), ...Array(6).fill(41), 44, 48, 48];
    expect(extraBoards(wb, { 96: 3, 120: 2, 144: 1 })).toEqual({ 96: 1, 120: 0, 144: 0 });
    expect(extraBoards([34, 34, 34, 34], { 96: 2 })).toEqual({ 96: 0 });
  });
});

describe('guide materials', () => {
  it('bench with back x 4: 30 2x4x8s (7.5 a bench), 448 screws, 24 lags, 16 bolts, 8 brackets', () => {
    expect(qty('bench-back', 4, '2x4x8')).toBe(30);
    expect(line('bench-back', 4, '2x4x8')!.notes).toBeUndefined(); // the guide's list is enough
    expect(qty('bench-back', 4, '2.5" wood screws')).toBe(448); // 112 a bench
    expect(qty('bench-back', 4, '1/4" x 1 1/4" lag screws')).toBe(24);
    expect(qty('bench-back', 4, '1/4" x 2 1/2" exterior carriage bolts + nuts + washers')).toBe(16);
    expect(qty('bench-back', 4, 'Backrest brackets')).toBe(8);
    expect(qty('bench-back', 1, '2x4x8')).toBe(8); // 7.5 rounded up for one bench
    // none of the spreadsheet's 4x4, 2x10, 2x6 or 2x8 lumber
    expect(guideLines('bench-back', 4).map((l) => l.item)).not.toEqual(expect.arrayContaining(['4x4x6']));
  });

  it('stage: 25 2x4x8s, with a note saying why the guide’s 16 is short; 34 2x4x12s; 588 screws', () => {
    const l = line('stage', 1, '2x4x8')!;
    expect(l.qty).toBe(25);
    expect(l.notes).toBe('The guide’s list says 16; its cut list needs 25: each 93″ and 86″ piece takes a whole 8′ board.');
    expect(qty('stage', 1, '2x4x12')).toBe(34);
    expect(qty('stage', 1, '2.5" wood screws')).toBe(588);
    expect(qty('stage', 2, '2x4x8')).toBe(49); // two stages share the ST-4 board
    expect(line('stage', 2, '2x4x8')!.notes).toMatch(/^The guide’s list says 16 per stage \(32 for 2\); its cut list needs 49/);
  });

  it('shade: the 47 2x4x8s on its list cover the 32 full-length boards its steps use', () => {
    const l = line('shade', 1, '2x4x8')!;
    expect(l.qty).toBe(47);
    expect(l.notes).toBe('The guide’s cut list says 14 × SS-1, but its steps use 32; the 47 boards on its list cover them.');
    expect(qty('shade', 1, '2.5" wood screws')).toBe(268);
    expect(line('shade', 1, 'L-brackets')!.price!.price).toBe(3.5);
    // no price in the spreadsheet: price needed, never invented
    for (const item of ['1/2" x 2" lag screws', '18" J hooks', 'Concrete deck blocks']) expect(line('shade', 1, item)!.price, item).toBeNull();
  });

  it('4\' gabion bench: 7 boards, not 4.5 (two 48" pieces need two boards); basket at the spreadsheet’s 4\' price', () => {
    const l = line('gabion-bench', 1, '2x4x8')!;
    expect(l.qty).toBe(7);
    expect(l.notes).toMatch(/list says 4.5; its cut list needs 7: two 48″ pieces don’t fit on one 8′ board once ⅛″ is allowed/);
    const basket = guideLines('gabion-bench', 2)[0]!;
    expect(basket.price!.price).toBe(120);
    expect(basket.qty).toBe(2);
    expect(qty('gabion-bench', 2, '1-3" stone fill')).toBe(1); // 2 x 9 cu ft / 27 x 1.4 = 0.93 -> 1 ton
    expect(qty('gabion-bench', 1, '2.5" wood screws')).toBe(36);
  });

  it('8\' gabion bench: 8 boards and 36 screws as its guide says (not two 4\' modules); its 96" basket needs a price', () => {
    expect(qty('gabion-bench-8', 1, '2x4x8')).toBe(8);
    expect(qty('gabion-bench-8', 1, '2.5" wood screws')).toBe(36);
    const basket = guideLines('gabion-bench-8', 1)[0]!;
    expect(basket.price).toBeNull();
    expect(basket.notes).toMatch(/only a 4′ basket \(\$120\)/);
  });

  it('2\' table: the 6 boards on its list are enough for the 9 T-2 its steps use', () => {
    const l = line('table-2', 1, '2x4x8')!;
    expect(l.qty).toBe(6);
    expect(l.notes).toBe('The guide’s cut list says 11 × T-2, but its steps and drawings use 9; the 6 boards on its list cover them.');
  });

  it('6\' table, 24" planter, stool, 4\' bench: the guides’ own lists', () => {
    expect(qty('table-6', 1, '2x4x8')).toBe(10);
    expect(qty('table-6', 1, '2.5" wood screws')).toBe(92);
    expect(qty('planter-24', 2, '2x4x8')).toBe(18);
    expect(qty('planter-24', 2, '2.5" wood screws')).toBe(264);
    expect(line('planter-24', 2, 'Geotextile fabric, 24"x72" pieces')!.qty).toBe(4);
    expect(qty('stool', 3, '2x4x8')).toBe(11); // 3.5 x 3 = 10.5
    expect(qty('stool', 3, '2.5" wood screws')).toBe(264); // 88 a stool
    expect(qty('bench-4', 4, '2x4x8')).toBe(22);
  });

  it('workbench: lumber the spreadsheet has no price for is price needed; short lists say so', () => {
    const ls = guideLines('workbench', 1);
    expect(ls.find((l) => l.item === '2x4x8')!.qty).toBe(4); // 3 listed + 1
    expect(ls.find((l) => l.item === '1x6x8')!.qty).toBe(6); // six 48" shelf boards, one a board
    expect(ls.find((l) => l.item === '2x6x12')!.qty).toBe(2); // three 48" pieces and two cuts are 1/4" over 12'
    for (const size of ['4x4x8', '2x4x10', '2x6x12']) expect(ls.find((l) => l.item === size)!.priceId).toBe(`lumber:${size}`);
    expect(ls.find((l) => l.item === '3" self-driving exterior wood screws')!.price).toBeNull();
  });

  it('the steps’ part counts match the 3D models (countOverrides)', () => {
    for (const [slug, g] of Object.entries(GUIDES)) {
      const model = Object.entries(models).find(([p]) => p.endsWith(`/${slug}.json`))![1];
      const fromModel = Object.fromEntries(Object.entries(model.countOverrides ?? {}).map(([k, v]) => [k, v.count]));
      const ours = Object.fromEntries(Object.entries(g.stepCounts ?? {}).map(([k, v]) => [k, v.count]));
      expect(ours, slug).toEqual(fromModel);
    }
  });

  it('every guide is covered, and every material and hardware item becomes a line', () => {
    const slugs = Object.values(guidesJson).map((g) => g.slug);
    expect(Object.keys(GUIDES).sort()).toEqual(slugs.sort());
    // handled as part of the basket, or as lumber by size
    const folded = /lumber|welded-wire mesh|gabion fill|bracing material/i;
    for (const g of Object.values(GUIDES)) {
      const items = guideLines(g.slug, 1);
      const others = [...g.materials, ...g.hardware].filter((x) => !folded.test(x.item));
      // one line per hardware/other item, plus lumber lines and the basket + fill
      const lumberLines = items.filter((l) => l.material.startsWith('lumber:')).length;
      const basket = g.basketCuFt ? 2 : 0;
      expect(items.length, g.slug).toBe(others.length + lumberLines + basket);
      for (const l of items) expect(l.price !== null || Boolean(l.priceId), `${g.slug} ${l.item}`).toBe(true);
    }
  });

  it('the estimate and the plant picker count perennials the same way', () => {
    expect(PERENNIALS_PER_SQUARE).toBe(PLANTS_PER_SQUARE);
  });
});

// Ray's park from the build-lead usability test: 96 x 17 ft, 32 planting squares, the furniture he drew.
const ray: CostInputs = {
  ...emptyInputs,
  longSideFt: 96,
  shortSideFt: 17,
  plantingSquares: 32,
  shrubs: 21,
  smallTrees: 5,
  largeTrees: 1,
  gabionBaskets: 8,
  gravelEdgeFt: 113,
  outerEdgeFt: 226,
  outerEdgeOnHardscapeFt: 83,
  outerEdgeOnSoftscapeFt: 143,
  woodToppedGabions: 2,
  gabionBenches8: 1,
  benchesWithBack: 4,
  stools: 3,
  stageSquares: 6,
  shadeStructures: 1,
  tables6: 1,
  planters24: 2,
  optCafeTableSets: 9,
};

describe('a whole park, furniture from the guides', () => {
  const e: Estimate = estimate(ray);
  const group = (g: string) => e.lines.filter((l) => l.group === g);
  const sum = (ls: { total: number; inTotal: boolean }[]) => Math.round(ls.filter((l) => l.inTotal).reduce((a, l) => a + l.total, 0) * 100) / 100;

  it('prices the 12\'x8\' stage from its guide (no longer "6 squares, 24\' long", price needed)', () => {
    // 25 x $5 + 34 x $10 + 588 x $0.17
    expect(sum(group("12'x8' stage"))).toBe(125 + 340 + 99.96);
    expect(e.priceNeeded.map((p) => p.id)).not.toContain('stage-other');
    expect(e.lines.some((l) => /24' long/.test(l.group ?? ''))).toBe(false);
  });

  it('works out each piece by hand', () => {
    expect(sum(group('Bench with back × 4'))).toBe(150 + 76.16 + 9.6 + 32 + 240); // 30 boards, 448 screws, 24 lags, 16 bolts, 8 brackets
    expect(sum(group("8'x8' shade structure"))).toBe(235 + 45.56 + 14); // 47 boards, 268 screws, 4 L-brackets
    expect(sum(group("6' table"))).toBe(50 + 15.64); // 10 boards, 92 screws
    expect(sum(group('Stool × 3'))).toBe(55 + 44.88); // 11 boards, 264 screws
    expect(sum(group('24" planter box × 2'))).toBe(90 + 44.88); // 18 boards, 264 screws
    expect(sum(group("4' wood-topped gabion bench × 2"))).toBe(240 + 52.5 + 70 + 12.24); // 2 baskets, 1 t stone, 14 boards, 72 screws
    expect(sum(group("8' wood-topped gabion bench"))).toBe(52.5 + 40 + 6.12); // basket needs a price; 1 t stone, 8 boards, 36 screws
    expect(e.summary.baseFurnishings).toBeCloseTo(507.76 + 564.96 + 294.56 + 65.64 + 99.88 + 134.88 + 374.74 + 98.62, 6);
  });

  it('merges the same item across pieces and keeps different products apart in the order list', () => {
    const rows = e.orderList.rows;
    const r = (item: string) => rows.filter((x) => x.item === item);
    expect(r('2x4x8').length).toBe(1);
    expect(r('2x4x8')[0]!.qty).toBe(e.lines.filter((l) => l.material === 'lumber:2x4x8').reduce((a, l) => a + l.qty, 0));
    expect(r('2.5" wood screws')[0]!.qty).toBe(448 + 588 + 268 + 92 + 264 + 264 + 72 + 36);
    // the spreadsheet's two L-brackets are different products: two rows, each with its own link
    const lb = rows.filter((x) => x.item.startsWith('L-brackets'));
    expect(lb.map((x) => [x.item, x.qty])).toEqual([
      ['L-brackets (2" double-wide corner brace)', 23], // 113 ft / 5
      ['L-brackets (5" corner brace)', 17], // 83 ft of hardscape outer edge / 5
      ['L-brackets (the Shade guide gives no size)', 4],
    ]);
    expect(lb[0]!.link).not.toBe(lb[1]!.link);
    expect(lb[2]!.link).toBeUndefined();
    // the edging screw is a different product from the furniture screw
    expect(r('2 1/2" self-driving screws (washer head)')[0]!.note).toMatch(/different screw/);
    // spreadsheet links to the wrong size are flagged, not replaced
    expect(r('2x4x12')[0]!.flags.join(' ')).toMatch(/link for this is a 2x4x10/);
    expect(r('1x4x12')[0]!.note).toMatch(/no supplier/);
    expect(e.lines.find((l) => l.item === '1x6x12 boards')!.notes).toMatch(/link for this is a 2x6x12/);
    expect(e.orderList.total).toBeCloseTo(e.summary.totalCosts, 6);
  });

  it('notes the mulch depth the Create step asks for, without changing the spreadsheet’s 2"', () => {
    const m = e.lines.find((l) => l.item === 'Mulch, 2"')!;
    expect(m.qty).toBe(4); // 512 sq ft x 0.18 / 27 = 3.4 -> 4 CY
    expect(m.notes).toBe('The Create step (Phase 6: Plant) says to install 4″ of mulch; the spreadsheet buys 2″. 4″ would be 7 CY ($196.00).');
  });

  it('says where the gabion wall is', () => {
    expect(e.lines.find((l) => l.item === "1'x1'x4' 5 gauge baskets")!.notes).toMatch(/grey 1-ft band the park pieces draw along the street edges/);
  });

  it('asks for a price for a stage that is not whole 12\'x8\' stages, and says why', () => {
    const s = estimate({ ...emptyInputs, stageSquares: 9 });
    expect(s.lines.filter((l) => l.guide === 'stage').find((l) => l.item === '2x4x8')!.qty).toBe(25);
    const left = s.lines.find((l) => l.priceId === 'stage-other')!;
    expect(left.item).toBe('Stage, 3 squares');
    expect(left.notes).toMatch(/builds a 12'x8' stage \(6 squares\); it has no materials list for 3 squares/);
    expect(estimate({ ...emptyInputs, stageSquares: 12 }).lines.find((l) => l.guide === 'stage' && l.item === '2x4x12')!.qty).toBe(68);
  });
});
