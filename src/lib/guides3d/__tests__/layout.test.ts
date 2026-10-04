import { describe, expect, it } from 'vitest';
import { cutPileLayout, eulerFromMatrix, explodedOffsets, flyOffset, isPileable, layFlat, partsBounds } from '../layout';
import { overlapDepth, partBounds, rotationMatrix } from '../validate';
import type { GuideModel, ModelPart } from '../schema';
import bench4 from '../../../data/guides/models/bench-4.json';
import bench4Guide from '../../../data/guides/bench-4.json';

const models = import.meta.glob<GuideModel>('../../../data/guides/models/*.json', { eager: true, import: 'default' });
const guides = import.meta.glob<any>('../../../data/guides/*.json', { eager: true, import: 'default' });

const bench = bench4 as GuideModel;
const cutOrder = bench4Guide.cutList.map((c) => c.part);

describe('rotations', () => {
  it('eulerFromMatrix inverts rotationMatrix', () => {
    for (const r of [
      [0, 0, 0],
      [90, 0, 0],
      [0, 90, 0],
      [0, 0, 90],
      [30, -40, 25],
      [-90, 0, 90],
    ] as [number, number, number][]) {
      const back = eulerFromMatrix(rotationMatrix(r));
      const a = rotationMatrix(r);
      const b = rotationMatrix(back);
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) expect(b[i]![j]!).toBeCloseTo(a[i]![j]!, 6);
    }
  });
  it('layFlat puts the longest side along x and the thinnest up', () => {
    const post: ModelPart = { id: 'p', kind: 'lumber', size: [1.5, 15.5, 3.5], position: [0, 0, 0], step: 2 };
    const f = layFlat(post);
    const b = partBounds({ ...post, rotation: f.rotation });
    expect(b.max[0] - b.min[0]).toBeCloseTo(15.5);
    expect(b.max[1] - b.min[1]).toBeCloseTo(1.5);
    expect(b.max[2] - b.min[2]).toBeCloseTo(3.5);
  });
});

/** Every pile pose as a part, for overlap and bounds checks. */
function pileParts(model: GuideModel, order: string[]) {
  const refs = new Set(order);
  const pileable = model.parts.filter((p) => isPileable(p, refs));
  const pile = cutPileLayout(pileable, order);
  return { pile, pileable, placed: pileable.map((p) => ({ ...p, position: pile.poses[p.id]!.position, rotation: pile.poses[p.id]!.rotation })) };
}

describe('cutPileLayout', () => {
  it('lays out every bench-4 board once, in cut-list order', () => {
    const { pile, pileable } = pileParts(bench, cutOrder);
    expect(Object.keys(pile.poses).sort()).toEqual(pileable.map((p) => p.id).sort());
    expect(pile.groups.map((g) => g.ref)).toEqual(['B-1', 'B-2', 'B-3', 'B-4', 'B-5', 'B-6']);
    expect(pile.groups.map((g) => g.count)).toEqual([5, 1, 2, 4, 4, 8]);
  });

  it('lays every board flat on the ground with nothing overlapping', () => {
    const { placed } = pileParts(bench, cutOrder);
    for (const p of placed) {
      const b = partBounds(p);
      expect(b.min[1]).toBeCloseTo(0, 5);
      expect(b.max[1] - b.min[1]).toBeCloseTo(1.5, 5); // a 2x4 lies on its wide face
    }
    for (let i = 0; i < placed.length; i++)
      for (let j = i + 1; j < placed.length; j++) expect(overlapDepth(placed[i]!, placed[j]!), `${placed[i]!.id} / ${placed[j]!.id}`).toBe(0);
  });

  it('keeps groups apart and inside the reported bounds', () => {
    const { pile, placed } = pileParts(bench, cutOrder);
    const rects = pile.groups.map((g) => g.rect);
    for (let i = 0; i < rects.length; i++)
      for (let j = i + 1; j < rects.length; j++) {
        const [a, b] = [rects[i]!, rects[j]!];
        const apart = a[2] <= b[0] || b[2] <= a[0] || a[3] <= b[1] || b[3] <= a[1];
        expect(apart, `${pile.groups[i]!.ref} vs ${pile.groups[j]!.ref}`).toBe(true);
      }
    const all = partsBounds(placed);
    for (let k = 0; k < 3; k++) {
      expect(all.min[k]!).toBeGreaterThanOrEqual(pile.bounds.min[k]! - 1e-6);
      expect(all.max[k]!).toBeLessThanOrEqual(pile.bounds.max[k]! + 1e-6);
    }
    // centred on the origin
    expect(pile.bounds.min[0] + pile.bounds.max[0]).toBeCloseTo(0, 5);
    expect(pile.bounds.min[2] + pile.bounds.max[2]).toBeCloseTo(0, 5);
  });

  it('is roughly the asked-for shape, not one long row', () => {
    const { pile } = pileParts(bench, cutOrder);
    const w = pile.bounds.max[0] - pile.bounds.min[0];
    const d = pile.bounds.max[2] - pile.bounds.min[2];
    expect(w / d).toBeGreaterThan(0.8);
    expect(w / d).toBeLessThan(3);
  });

  it('wraps many short boards into columns and stacks wide sheets', () => {
    const shorts: ModelPart[] = Array.from({ length: 12 }, (_, i) => ({ id: `S#${i}`, ref: 'S', kind: 'lumber', size: [8, 1.5, 3.5], position: [0, 0, 0], step: 2 }));
    const sheets: ModelPart[] = Array.from({ length: 3 }, (_, i) => ({ id: `P#${i}`, ref: 'P', kind: 'sheet', size: [48, 0.75, 24], position: [0, 0, 0], step: 2 }));
    const pile = cutPileLayout([...shorts, ...sheets], ['S', 'P']);
    const s = pile.groups.find((g) => g.ref === 'S')!;
    expect(s.rect[2] - s.rect[0]).toBeGreaterThan(8 * 1.5); // more than one column
    const sheetsPlaced = sheets.map((p) => ({ ...p, ...pile.poses[p.id]! }));
    expect(new Set(sheetsPlaced.map((p) => p.position[1])).size).toBe(3); // stacked
    const placed = [...shorts, ...sheets].map((p) => ({ ...p, ...pile.poses[p.id]! }));
    for (let i = 0; i < placed.length; i++) for (let j = i + 1; j < placed.length; j++) expect(overlapDepth(placed[i]!, placed[j]!)).toBe(0);
  });

  it('leaves hardware, baskets and stone out of the pile', () => {
    const refs = new Set(['M-1']);
    expect(isPileable({ id: 'a', kind: 'fastener', size: [1, 1, 1], position: [0, 0, 0], step: 2 }, refs)).toBe(false);
    expect(isPileable({ id: 'b', kind: 'mesh', shape: 'mesh-box', size: [12, 12, 12], position: [0, 0, 0], step: 2 }, refs)).toBe(false);
    expect(isPileable({ id: 'c', kind: 'stone-fill', size: [12, 12, 12], position: [0, 0, 0], step: 2 }, refs)).toBe(false);
    expect(isPileable({ id: 'd', ref: 'M-1', kind: 'mesh', size: [48, 0.2, 18], position: [0, 0, 0], step: 2 }, refs)).toBe(true);
  });

  // every model the other workstreams add gets the same checks
  for (const [path, model] of Object.entries(models)) {
    it(`${model.slug}: pile has every board, flat on the ground, no overlaps`, () => {
      const guide = Object.values(guides).find((g) => g.slug === model.slug);
      expect(guide, path).toBeTruthy();
      const { pile, pileable, placed } = pileParts(model, guide.cutList.map((c: { part: string }) => c.part));
      expect(Object.keys(pile.poses).length).toBe(pileable.length);
      for (const p of placed) expect(partBounds(p).min[1]).toBeGreaterThanOrEqual(-1e-6);
      for (let i = 0; i < placed.length; i++)
        for (let j = i + 1; j < placed.length; j++) expect(overlapDepth(placed[i]!, placed[j]!), `${placed[i]!.id} / ${placed[j]!.id}`).toBeLessThan(0.01);
    });
  }
});

describe('explodedOffsets', () => {
  const offs = explodedOffsets(bench.parts);
  const b = partsBounds(bench.parts);
  const cx = (b.min[0] + b.max[0]) / 2;
  const cz = (b.min[2] + b.max[2]) / 2;

  it('pushes every part away from the middle, never toward it', () => {
    bench.parts.forEach((p, i) => {
      const o = offs[i]!;
      const before = Math.hypot(p.position[0] - cx, p.position[2] - cz);
      const after = Math.hypot(p.position[0] + o[0] - cx, p.position[2] + o[2] - cz);
      expect(after).toBeGreaterThanOrEqual(before - 1e-9);
      expect(o[1]).toBeGreaterThanOrEqual(0);
    });
  });
  it('keeps parts on or above the ground, and parts on the ground stay down', () => {
    bench.parts.forEach((p, i) => {
      const lowest = partBounds(p).min[1] + offs[i]![1];
      expect(lowest).toBeGreaterThanOrEqual(-1e-9);
      if (partBounds(p).min[1] < 1e-6) expect(offs[i]![1]).toBe(0);
    });
  });
  it('lifts the seat above the frames and separates the end-frame layers', () => {
    const top = bench.parts.findIndex((p) => p.ref === 'B-1');
    const rail = bench.parts.findIndex((p) => p.ref === 'B-5' && p.position[1] > 10);
    expect(offs[top]![1]).toBeGreaterThan(offs[rail]![1]);
    const exploded = bench.parts.map((p, i) => ({ ...p, position: p.position.map((v, k) => v + offs[i]![k]!) as [number, number, number] }));
    for (let i = 0; i < exploded.length; i++) for (let j = i + 1; j < exploded.length; j++) expect(overlapDepth(exploded[i]!, exploded[j]!)).toBe(0);
  });
});

describe('flyOffset', () => {
  const model = { bounds: { length: 48, width: 18.5, height: 17 } };
  it('uses the model’s own `from` when given', () => {
    expect(flyOffset({ id: 'a', kind: 'lumber', size: [1, 1, 1], position: [0, 0, 0], step: 2, from: [5, 6, 7] }, model)).toEqual([5, 6, 7]);
  });
  it('drops flat parts in from above', () => {
    const o = flyOffset({ id: 'a', kind: 'lumber', size: [48, 1.5, 3.5], position: [0, 16, 0], step: 5 }, model);
    expect(o[0]).toBe(0);
    expect(o[1]).toBeGreaterThan(10);
    expect(o[2]).toBe(0);
  });
  it('brings upright members in from the side, outward', () => {
    const o = flyOffset({ id: 'a', kind: 'lumber', size: [3.5, 30, 3.5], position: [20, 15, 0], step: 2 }, model);
    expect(o[1]).toBe(0);
    expect(o[0]).toBeGreaterThan(10);
  });
});
