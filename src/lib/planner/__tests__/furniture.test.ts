import { describe, expect, it } from 'vitest';
import { bandAsWall, chooseFit, fitAxis, fitModules, flatOver, ft, lowestGround, wallBaskets, type ModuleSpec } from '../furniture/fit';
import { PROCEDURAL, furnitureRule, moduleOf, stageSquareModule, type ModelRule } from '../furniture/rules';
import { partGroup, partsAt, partsBounds, planterFill, stageSquareParts } from '../furniture/modelparts';
import { proceduralParts, partsExtent, seeded } from '../furniture/procedural';
import { FrameWatch, initialQuality, lower, pinnedQuality } from '../furniture/quality';
import { subdivide } from '../furniture/drape';
import { ELEMENTS } from '../../../data/elements';
import { PIECE_SETS } from '../../../data/pieces/all';
import { assemble } from '../../pieces/assemble';
import type { GuideModel } from '../../guides3d/schema';
import type { Vec2 } from '../geo';

const models = import.meta.glob<GuideModel>('../../../data/guides/models/*.json', { eager: true, import: 'default' });
const model = (slug: string) => models[`../../../data/guides/models/${slug}.json`]!;

const NO_EDITS = { added: [], removed: [], moved: {} };

const bench: ModuleSpec = { lengthFt: 4, depthFt: 1.5, heightFt: 1.6, repeatX: true, repeatY: false };

describe('inches to feet and true size', () => {
  it('converts the guide models (inches) to feet', () => {
    expect(ft(48)).toBe(4);
    expect(ft(18)).toBe(1.5);
  });
  it('takes a module from the size the parts actually build', () => {
    const gb = moduleOf(model('gabion-bench'), { repeatX: true, repeatY: false });
    expect(gb.lengthFt).toBeCloseTo(4);
    expect(gb.depthFt).toBeCloseTo(1.5);
    expect(gb.heightFt).toBeCloseTo(19.5 / 12);
    const shade = moduleOf(model('shade'), { repeatX: true, repeatY: true });
    expect(shade.lengthFt).toBeCloseTo(8);
    expect(shade.depthFt).toBeCloseTo(8.25);
  });
});

describe('module tiling', () => {
  it('repeats a 4-ft module along a longer item instead of stretching it', () => {
    expect(fitAxis(8, 4, true)).toEqual({ n: 2 });
    expect(fitAxis(12, 4, true)).toEqual({ n: 3 });
    const f = fitModules(12, 1.5, bench)!;
    expect(f.nx).toBe(3);
    expect(f.centres.map((c) => c[0])).toEqual([-4, 0, 4]);
    expect(f.lengthFt).toBe(12);
  });
  it('draws modules at their true size, centred, whatever the drawn footprint', () => {
    // a 4' gabion bench drawn 4 x 1.8 (stretched with the lot) is still 4 x 1.5
    const f = fitModules(4, 1.8, bench)!;
    expect(f.lengthFt).toBe(4);
    expect(f.depthFt).toBe(1.5);
    expect(f.centres).toEqual([[0, 0]]);
    // slightly long or short drawings: one true-size module, centred
    expect(fitModules(4.1, 1.5, bench)!.lengthFt).toBe(4);
    expect(fitModules(3.75, 1.5, bench)!.lengthFt).toBe(4);
    for (const len of [3.5, 3.9, 4, 5.1, 7.7, 8.4, 11.6, 16.2, 23.9]) {
      const r = fitModules(len, 1.5, bench);
      if (r) expect(r.lengthFt % 4).toBe(0);
    }
  });
  it('keeps the block when no whole number of modules sits sensibly', () => {
    // a 2.25-ft "bench with back" drawing is not a 4-ft bench
    expect(fitAxis(2.25, 4, true)).toBeNull();
    // too deep for a bench
    expect(fitModules(4, 4, bench)).toBeNull();
    // a one-off piece does not repeat
    expect(fitAxis(8, 4, false)).toBeNull();
    expect(fitAxis(0, 4, true)).toBeNull();
  });
  it('lets free-standing canopies cover less of a big drawn area', () => {
    const canopy: ModuleSpec = { lengthFt: 8, depthFt: 8.25, heightFt: 8.1, repeatX: true, repeatY: true, under: 0.5 };
    const f = fitModules(16, 12, canopy)!;
    expect([f.nx, f.ny]).toEqual([2, 1]);
    const g = fitModules(17, 24, canopy)!;
    expect([g.nx, g.ny]).toEqual([2, 3]);
    // a canopy drawn smaller than a module is still one true 8' x 8' module
    const one = fitModules(8, 4, { ...canopy, over: 0.55 })!;
    expect([one.nx, one.ny, one.lengthFt, one.depthFt]).toEqual([1, 1, 8, 8.25]);
    expect(fitModules(6, 5.5, { ...canopy, over: 0.55 })!.lengthFt).toBe(8);
    // without that allowance it would keep its block
    expect(fitModules(8, 4, canopy)).toBeNull();
  });
  it('picks the whole stage when it fits, else 4-ft squares', () => {
    const stage = model('stage');
    const cands = [
      { name: 'whole', spec: moduleOf(stage, { repeatX: false, repeatY: false }) },
      { name: 'square', spec: stageSquareModule(stage, 4) },
    ];
    expect(chooseFit(12, 8, cands)!.candidate.name).toBe('whole');
    const sq = chooseFit(4, 4, cands)!;
    expect(sq.candidate.name).toBe('square');
    expect(sq.fit.centres).toEqual([[0, 0]]);
    const row = chooseFit(16, 4, cands)!;
    expect(row.candidate.name).toBe('square');
    expect(row.fit.nx).toBe(4);
  });
});

describe('choosing model, shape or block', () => {
  it('gives every element with a build-guide model its model', () => {
    for (const [id, e] of Object.entries(ELEMENTS)) {
      if (!e.guide) continue;
      const r = furnitureRule(id);
      expect(r.kind, id).toBe('model');
      expect(model((r as ModelRule).slug), id).toBeTruthy();
    }
  });
  it('draws gabion walls as baskets and the other elements as shapes', () => {
    expect(furnitureRule('gabion-wall').kind).toBe('gabion');
    expect(furnitureRule('rain-barrel').kind).toBe('procedural');
    expect(furnitureRule('shrub').kind).toBe('procedural');
    // planted trees share the City trees' drawing
    expect(furnitureRule('large-tree').kind).toBe('block');
    // existing conditions are not furniture
    expect(furnitureRule('existing-tree').kind).toBe('block');
    expect(furnitureRule('nonsense').kind).toBe('block');
  });
  it('fits every guide-built piece of every printed park set as real furniture', () => {
    let fits = 0;
    let total = 0;
    const misses: string[] = [];
    for (const set of Object.values(PIECE_SETS)) {
      for (const th of ['edible', 'sanctuary', 'nature', 'event'] as const) {
        const L = assemble(set, { frame: th, front: th, back: th }, set.nominal.lengthFt, set.nominal.widthFt, NO_EDITS);
        for (const it of L.items) {
          const r = furnitureRule(it.element);
          if (r.kind !== 'model') continue;
          const m = model(r.slug);
          const cands = [{ spec: moduleOf(m, r) }, ...(r.squares ? [{ spec: stageSquareModule(m, r.squares) }] : [])];
          total++;
          if (chooseFit(it.w, it.h, cands)) fits++;
          else misses.push(`${it.element} ${it.w}x${it.h}`);
        }
      }
    }
    expect(total).toBeGreaterThan(200);
    // built furniture now takes its true built size (pieces/builtsize.ts), so every
    // guide-built piece is drawn as the real thing — even a 2-ft "bench with back" drawing
    expect(misses).toEqual([]);
    expect(fits).toBe(total);
  });
});

describe('gabion walls', () => {
  it('lays standard 4-ft baskets with one shorter end basket', () => {
    expect(wallBaskets(32)).toEqual(Array.from({ length: 8 }, (_, i) => [i * 4, 4]));
    const w = wallBaskets(26);
    expect(w.length).toBe(7);
    expect(w[6]).toEqual([24, 2]);
    // a sliver is taken up by the last basket
    const s = wallBaskets(8.3);
    expect(s.length).toBe(2);
    expect(s[1]![1]).toBeCloseTo(4.3);
    expect(wallBaskets(0.6)).toEqual([[0, 0.6]]);
    expect(wallBaskets(0)).toEqual([]);
    for (const len of [3, 9, 13.5, 26, 31.75]) expect(wallBaskets(len).reduce((a, b) => a + b[1], 0)).toBeCloseTo(len);
  });
  it('reads a 1-ft gabion band as a wall along its long side', () => {
    expect(bandAsWall([[0, 16], [1, 16], [1, 48], [0, 48]])).toEqual({ start: [0.5, 16], dir: [0, 1], lengthFt: 32, depthFt: 1 });
    expect(bandAsWall([[13, 0], [39, 0], [39, 1], [13, 1]])).toEqual({ start: [13, 0.5], dir: [1, 0], lengthFt: 26, depthFt: 1 });
    expect(bandAsWall([[0, 0], [4, 0], [4, 4], [0, 4]])).toBeNull();
  });
  it('finds every printed gabion band', () => {
    for (const set of Object.values(PIECE_SETS)) {
      const L = assemble(set, { frame: 'nature', front: 'nature', back: 'nature' }, set.nominal.lengthFt, set.nominal.widthFt, NO_EDITS);
      for (const s of L.surfaces.filter((x) => x.material === 'gabion')) expect(bandAsWall(s.polygon as Vec2[]), s.id).not.toBeNull();
    }
  });
});

describe('standing on the ground', () => {
  const slope = (x: number) => 0.05 * x;
  it('puts furniture on the lowest ground under its footprint', () => {
    // 4 x 2 ft bench centred at x = 10, along x: lowest corner is at x = 8
    expect(lowestGround(slope, [10, 0], [1, 0], [0, 1], 2, 1)).toBeCloseTo(0.4);
    // turned 90°: its length runs north, so it only spans x 9..11
    expect(lowestGround(slope, [10, 0], [0, 1], [-1, 0], 2, 1)).toBeCloseTo(0.45);
    // turned 45°: the corner reaches x = 10 - (2 + 1) / √2
    const d = Math.SQRT1_2;
    expect(lowestGround(slope, [10, 0], [d, d], [-d, d], 2, 1)).toBeCloseTo(0.05 * (10 - 3 * d));
  });
  it('finds a dip inside a big footprint, not just at its corners', () => {
    const bowl = (x: number, y: number) => Math.hypot(x, y) < 1 ? -1 : 0;
    expect(lowestGround(bowl, [0, 0], [1, 0], [0, 1], 8, 6)).toBe(-1);
  });
  it('is flat ground for a flat lot', () => {
    expect(lowestGround(() => 0, [3, 4], [1, 0], [0, 1], 2, 2)).toBe(0);
    expect(flatOver(() => 0, [[0, 0], [10, 10]])).toBe(true);
    expect(flatOver(slope, [[0, 0], [10, 10]])).toBe(false);
  });
  it('cuts surfaces into small triangles that can follow the ground', () => {
    const tris = subdivide([[[0, 0], [10, 0], [0, 10]]], 2);
    const area = (t: [Vec2, Vec2, Vec2]) => Math.abs((t[1][0] - t[0][0]) * (t[2][1] - t[0][1]) - (t[2][0] - t[0][0]) * (t[1][1] - t[0][1])) / 2;
    expect(tris.reduce((a, t) => a + area(t), 0)).toBeCloseTo(50);
    for (const t of tris) for (let k = 0; k < 3; k++) expect(Math.hypot(t[k]![0] - t[(k + 1) % 3]![0], t[k]![1] - t[(k + 1) % 3]![1])).toBeLessThanOrEqual(2 + 1e-9);
  });
});

describe('model parts in the planner', () => {
  it('builds a 4-ft stage square like the 12 x 8 stage', () => {
    const parts = stageSquareParts(model('stage'));
    const b = partsBounds(parts);
    expect(b.max[0] - b.min[0]).toBeCloseTo(48);
    expect(b.max[2] - b.min[2]).toBeCloseTo(48, 0);
    expect(b.min[1]).toBeCloseTo(0);
    expect(b.max[1]).toBeCloseTo(16.25);
  });
  it('leaves out wire panels, liners and screws; low detail drops small hardware', () => {
    expect(partGroup({ kind: 'mesh' })).toBeNull();
    expect(partGroup({ kind: 'fabric' })).toBeNull();
    expect(partGroup({ kind: 'stone-fill' })).toBe('stone');
    const shade = model('shade');
    const high = partsAt(shade.parts, 'high');
    const low = partsAt(shade.parts, 'low');
    expect(high.some((p) => p.kind === 'fastener')).toBe(false);
    expect(high.some((p) => p.kind === 'bracket')).toBe(true);
    expect(low.some((p) => p.kind === 'bracket')).toBe(false);
    expect(low.length).toBeGreaterThan(40);
    // the gabion bench keeps its stone, not its wire panels
    const gb = partsAt(model('gabion-bench').parts, 'high');
    expect(gb.filter((p) => p.kind === 'stone-fill').length).toBe(1);
    expect(gb.some((p) => p.kind === 'mesh')).toBe(false);
  });
  it('puts soil and a plant inside the planter boxes', () => {
    for (const slug of ['planter-18', 'planter-24']) {
      const m = model(slug);
      const b = m.asBuilt ?? m.bounds;
      const f = planterFill(m);
      expect(f.soil.size[0]).toBeLessThan(b.length);
      expect(f.soil.size[2]).toBeLessThan(b.width);
      expect(f.soil.position[1] + f.soil.size[1] / 2).toBeLessThan(b.height);
    }
  });
});

describe('simple shapes for elements without a guide', () => {
  const colors = { front: '#FF44C0', seat: '#C98FB5', shed: '#92276F', base: '#888888' };
  it('draws every listed element, at about its real size', () => {
    for (const id of PROCEDURAL) {
      const e = ELEMENTS[id];
      const [w, h] = e?.footprintFt ?? [4, 4];
      const parts = proceduralParts({ id: 'x', element: id, w, h }, colors);
      expect(parts, id).not.toBeNull();
      expect(parts!.length, id).toBeGreaterThan(0);
      const ext = partsExtent(parts!);
      const H = e?.heightFt ?? 3;
      expect(ext.z[1], id).toBeLessThanOrEqual(Math.max(H, 2) + 2);
      expect(ext.z[1], id).toBeGreaterThan(0);
      // stays roughly on its footprint (chairs may tuck out a little)
      expect(ext.x[1] - ext.x[0], id).toBeLessThanOrEqual(Math.max(w, 2) + 4);
      expect(ext.y[1] - ext.y[0], id).toBeLessThanOrEqual(Math.max(h, 2) + 4);
    }
  });
  it('looks the same every time it is drawn', () => {
    const a = proceduralParts({ id: 'n1', element: 'nature-play', w: 8, h: 8 }, colors);
    const b = proceduralParts({ id: 'n1', element: 'nature-play', w: 8, h: 8 }, colors);
    expect(a).toEqual(b);
    expect(seeded('a')()).toBe(seeded('a')());
  });
  it('sizes beds and sheds to the drawing, products to the real thing', () => {
    const bed = partsExtent(proceduralParts({ id: 'b', element: 'raised-bed', w: 15.5, h: 3.5 }, colors)!);
    expect(bed.x[1] - bed.x[0]).toBeCloseTo(15.5, 0);
    // a café set drawn 3.5 x 1.8, 2 or 2.3 ft is the same true-size table and chairs
    const cafe = [1.8, 2, 2.3].map((h) => partsExtent(proceduralParts({ id: 'c', element: 'cafe-table', w: 3.5, h }, colors)!));
    expect(cafe[0]).toEqual(cafe[1]);
    expect(cafe[2]).toEqual(cafe[1]);
    const barrel = partsExtent(proceduralParts({ id: 'r', element: 'rain-barrel', w: 3, h: 3 }, colors)!);
    expect(barrel.z[1]).toBeCloseTo(3);
    expect(barrel.x[1] - barrel.x[0]).toBeLessThanOrEqual(2.1);
    expect(proceduralParts({ id: 'q', element: 'stool', w: 1, h: 1 }, colors)).toBeNull();
  });
});

describe('detail level', () => {
  it('starts lower on small devices', () => {
    expect(initialQuality({})).toBe('high');
    expect(initialQuality({ cores: 8, memoryGb: 8, coarsePointer: true })).toBe('high');
    expect(initialQuality({ cores: 4, coarsePointer: true })).toBe('low');
    expect(initialQuality({ memoryGb: 2 })).toBe('low');
    expect(lower('high')).toBe('low');
    expect(lower('low')).toBe('blocks');
  });
  it('can be pinned from the address', () => {
    expect(pinnedQuality('?furniture=blocks')).toBe('blocks');
    expect(pinnedQuality('?a=1&furniture=high')).toBe('high');
    expect(pinnedQuality('?furniture=ultra')).toBeNull();
    expect(pinnedQuality('')).toBeNull();
  });
  it('steps down only when continuous frames stay slow', () => {
    const w = new FrameWatch(70, 10);
    let t = 0;
    let fired = false;
    // fast frames: never
    for (let i = 0; i < 50; i++) fired ||= w.note((t += 16), true);
    expect(fired).toBe(false);
    // slow but not continuous (one-off redraws after idle pauses): never
    for (let i = 0; i < 50; i++) fired ||= w.note((t += 500), false);
    expect(fired).toBe(false);
    // slow and continuous: once most of the recent frames are slow
    let at = -1;
    for (let i = 0; i < 20 && at < 0; i++) if (w.note((t += 120), true)) at = i;
    expect(at).toBeGreaterThanOrEqual(4);
    // a fresh watch needs a full window of slow frames
    const v = new FrameWatch(70, 10);
    let first = -1;
    for (let i = 0; i < 30 && first < 0; i++) if (v.note(i * 120, true)) first = i;
    expect(first).toBe(10);
  });
});
