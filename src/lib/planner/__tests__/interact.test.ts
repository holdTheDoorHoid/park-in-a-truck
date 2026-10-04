import { describe, expect, it } from 'vitest';
import {
  DragGesture,
  addPlacement,
  angleBetween,
  dropPlacement,
  duplicatePlacement,
  isTurnable,
  normDeg,
  snapAngle,
  snapItem,
  turnFromDrag,
} from '../interact';
import { duplicateItem, moveItem, newDesign } from '../design';
import { createPlannerStore, type PlannerStore } from '../store';
import { computeOverhang, itemSticksOut, makePlacement } from '../placement';
import { buildLocalSite } from '../localsite';
import { duplicateSelected } from '../../../components/planner/keyboard';
import dover from '../fixtures/dover.json';
import type { SiteContext } from '../site';

const doverSite = buildLocalSite({ lot: (dover as any).lot, ...(dover as any).surroundings, source: 'fixture' } as SiteContext);

describe('turning with the handle', () => {
  it('snaps to 15° steps and keeps angles in 0–360', () => {
    expect(snapAngle(7)).toBe(0);
    expect(snapAngle(8)).toBe(15);
    expect(snapAngle(-10)).toBe(345);
    expect(snapAngle(359)).toBe(0);
    expect(snapAngle(404)).toBe(45);
    expect(normDeg(-90)).toBe(270);
  });
  it('turns freely (whole degrees) with Shift', () => {
    expect(snapAngle(37.4, 15, true)).toBe(37);
    expect(snapAngle(-0.4, 15, true)).toBe(0);
  });
  it('measures the swing around the centre, the short way round', () => {
    expect(angleBetween([0, 0], [1, 0], [0, 1])).toBeCloseTo(90);
    expect(angleBetween([0, 0], [0, 1], [1, 0])).toBeCloseTo(-90);
    // from 170° to -170° is +20°, not -340°
    const a: [number, number] = [Math.cos((170 * Math.PI) / 180), Math.sin((170 * Math.PI) / 180)];
    const b: [number, number] = [Math.cos((-170 * Math.PI) / 180), Math.sin((-170 * Math.PI) / 180)];
    expect(angleBetween([0, 0], a, b)).toBeCloseTo(20);
  });
  it('adds the swing to where the item started, wherever it was grabbed', () => {
    // a quarter turn counter-clockwise around (10, 5), grabbed 3 ft east of it
    expect(turnFromDrag(0, [10, 5], [13, 5], [10, 8])).toBe(90);
    expect(turnFromDrag(350, [10, 5], [13, 5], [12.8, 6.03])).toBe(15); // 350 + ~20 -> 10 -> snaps to 15
    expect(turnFromDrag(350, [10, 5], [13, 5], [12.8, 6.03], true)).toBe(10);
    // grabbing off the knob doesn't make it jump: no swing, no turn
    expect(turnFromDrag(30, [0, 0], [2, 2], [4, 4])).toBe(30);
  });
  it('offers a handle only where turning shows', () => {
    expect(isTurnable('item', 'bench-back', 'bench')).toBe(true);
    expect(isTurnable('item', 'small-tree', 'tree-small')).toBe(false);
    expect(isTurnable('item', 'shrub', 'shrub')).toBe(false);
    expect(isTurnable('existing', 'old-pavement')).toBe(true);
    expect(isTurnable('existing', 'utility-line')).toBe(true);
    expect(isTurnable('existing', 'existing-tree')).toBe(false);
    expect(isTurnable('existing', 'hydrant')).toBe(false);
  });
});

describe('snapping a dragged item', () => {
  const bench = { w: 4, h: 2, rotationDeg: 0 };
  it('puts its edges on the 1-ft or 4-ft grid', () => {
    expect(snapItem(bench, [10.4, 5.3], 1, 50, 14)).toEqual([10, 5]);
    expect(snapItem(bench, [11.1, 5.3], 4, 50, 14)).toEqual([10, 5]);
    // turned a quarter: its width now runs along x
    expect(snapItem({ ...bench, rotationDeg: 90 }, [10.4, 5.3], 1, 50, 14)).toEqual([10, 5]);
  });
  it('moves freely (to a tenth of a foot) with snapping off', () => {
    expect(snapItem(bench, [10.437, 5.361], 0, 50, 14)).toEqual([10.4, 5.4]);
  });
  it('never lets it wander off past the park edge', () => {
    expect(snapItem(bench, [-30, 40], 1, 50, 14)).toEqual([-2, 15]);
  });
});

describe('dropping from the palette', () => {
  const layout = {
    lengthFt: 40,
    widthFt: 14,
    surfaces: [
      { polygon: [[0, 0], [20, 0], [20, 14], [0, 14]] as [number, number][], theme: 'edible' as const },
      { polygon: [[20, 0], [40, 0], [40, 14], [20, 14]] as [number, number][], theme: 'event' as const },
    ],
    items: [] as { x: number; y: number }[],
  };
  it('lands where it was dropped, snapped like a drag, in the theme of the piece under it', () => {
    const p = dropPlacement(layout, 'bench-back', [30.3, 6.2], 1, 'nature');
    expect(p.w).toBe(4);
    expect(p.x).toBe(30);
    // its edge sits on a grid line, within half a foot of where it was let go
    expect(Math.abs(p.y - p.h / 2 - Math.round(p.y - p.h / 2))).toBeLessThan(1e-9);
    expect(Math.abs(p.y - 6.2)).toBeLessThanOrEqual(0.5);
    expect(p.theme).toBe('event');
    expect(dropPlacement(layout, 'bench-back', [5, 6], 1, 'nature').theme).toBe('edible');
  });
  it('falls back to the given theme off the pieces, and stays by the park when dropped in the street', () => {
    const p = dropPlacement(layout, 'table-6', [-50, -50], 1, 'nature');
    expect(p.theme).toBe('nature');
    expect(p.x).toBe(-p.w / 2);
    expect(p.y).toBe(-p.h / 2);
  });
  it('a plain click adds it in the middle, or beside the last one so they do not pile up', () => {
    const first = addPlacement(layout, 'bench-back', 'nature');
    expect([first.x, first.y]).toEqual([20, 7]);
    const second = addPlacement({ ...layout, items: [{ x: 20, y: 7 }] }, 'bench-back', 'nature');
    expect([second.x, second.y]).toEqual([24, 7]);
    const third = addPlacement({ ...layout, items: [{ x: 20, y: 7 }, { x: 24, y: 7 }] }, 'bench-back', 'nature');
    expect([third.x, third.y]).toEqual([16, 7]);
  });
});

describe('duplicating', () => {
  const bench = { element: 'bench-back', x: 10, y: 5, w: 4, h: 1.54, rotationDeg: 0 };
  it('puts the copy right beside it, offset by its own length', () => {
    expect(duplicatePlacement(bench, 40, 14)).toEqual([14, 5]);
  });
  it('follows the item when it is turned', () => {
    const p = duplicatePlacement({ ...bench, rotationDeg: 90 }, 40, 14);
    expect(p[0]).toBeCloseTo(10);
    expect(p[1]).toBeCloseTo(9);
  });
  it('goes to the other side at the end of the park, and never on top of another copy', () => {
    expect(duplicatePlacement({ ...bench, x: 37 }, 40, 14)).toEqual([33, 5]);
    expect(duplicatePlacement(bench, 40, 14, [{ element: 'bench-back', x: 14, y: 5 }])).toEqual([6, 5]);
    // something else standing there doesn't count
    expect(duplicatePlacement(bench, 40, 14, [{ element: 'table-6', x: 14, y: 5 }])).toEqual([14, 5]);
  });
  it('becomes a new added item with the same turn and theme', () => {
    const d = newDesign(doverSite);
    const r = duplicateItem(d, { element: 'gabion-bench', rotationDeg: 45, theme: 'edible' }, 12, 3);
    const copy = r.design.added.find((a) => a.id === r.id)!;
    expect(copy).toMatchObject({ element: 'gabion-bench', x: 12, y: 3, rotationDeg: 45, theme: 'edible' });
    expect(d.added).toHaveLength(0); // the original design is untouched
  });
});

describe('the drag gesture', () => {
  const start = { x: 10, y: 5, rotationDeg: 0 };
  it('treats a press without moving as a click', () => {
    const g = new DragGesture('move', start, [100, 100]);
    expect(g.update([102, 101], { x: 11, y: 5, rotationDeg: 0 })).toBe(false);
    expect(g.moved).toBe(false);
    expect(g.preview).toBeNull();
    expect(g.finish()).toBeNull();
  });
  it('follows the pointer and saves the last pose on release', () => {
    const g = new DragGesture('move', start, [100, 100]);
    expect(g.update([110, 100], { x: 12, y: 5, rotationDeg: 0 })).toBe(true);
    expect(g.update([111, 100], { x: 12, y: 5, rotationDeg: 0 })).toBe(false); // same snapped spot: nothing to redraw
    g.update([130, 100], { x: 14, y: 6, rotationDeg: 0 }, true);
    expect(g.preview).toEqual({ x: 14, y: 6, rotationDeg: 0 });
    expect(g.over).toBe(true);
    expect(g.finish()).toEqual({ x: 14, y: 6, rotationDeg: 0 });
    expect(g.finish()).toBeNull(); // only once
  });
  it('saves nothing when dropped back where it started', () => {
    const g = new DragGesture('move', start, [100, 100]);
    g.update([120, 100], { x: 12, y: 5, rotationDeg: 0 });
    g.update([101, 100], { ...start });
    expect(g.finish()).toBeNull();
  });
  it('Esc puts it back where it started and saves nothing', () => {
    const g = new DragGesture('turn', start, [100, 100]);
    g.update([120, 120], { ...start, rotationDeg: 45 });
    expect(g.preview?.rotationDeg).toBe(45);
    expect(g.cancel()).toEqual(start);
    expect(g.preview).toBeNull();
    expect(g.update([140, 140], { ...start, rotationDeg: 90 })).toBe(false);
    expect(g.finish()).toBeNull();
  });
});

describe('sticking out past the lot line', () => {
  const pl = makePlacement(doverSite.frame, 50, 14);
  it('agrees with the whole-park overhang check, one item at a time', () => {
    const items = [
      { id: 'in', element: 'bench-back', x: 25, y: 7, w: 4, h: 2, rotationDeg: 0 },
      { id: 'out', element: 'bench-back', x: 25, y: -1.5, w: 4, h: 2, rotationDeg: 0 },
    ];
    const all = computeOverhang(pl, doverSite.frame, doverSite.parcel, items);
    for (const it of items) expect(itemSticksOut(pl, doverSite.frame, doverSite.parcel, it)).toBe(all.items.includes(it.id));
    expect(itemSticksOut(pl, doverSite.frame, doverSite.parcel, items[1]!)).toBe(true);
  });
  it('only counts a tree by its trunk', () => {
    const tree = { element: 'large-tree', x: 25, y: 1.2, w: 14, h: 14, rotationDeg: 0 };
    expect(itemSticksOut(pl, doverSite.frame, doverSite.parcel, tree)).toBe(false);
  });
});

// ---- with the real planner store (the Dover demo lot) ----

async function ready(mode: 'full' | 'sun' = 'full'): Promise<PlannerStore> {
  const st = createPlannerStore(mode, 'dover');
  for (let i = 0; i < 200 && !(st.$status.get() === 'ready' && st.$layout.get()); i++) await new Promise((r) => setTimeout(r, 5));
  expect(st.$layout.get()).toBeTruthy();
  return st;
}

describe('moving things in the planner store', () => {
  it('one drag is one undo step, and a cancelled drag changes nothing', async () => {
    const st = await ready();
    const it = st.$layout.get()!.items.find((x) => x.element.includes('bench'))!;
    const before = st.$design.get();
    // a cancelled drag: the scene never commits
    const g0 = new DragGesture('move', { x: it.x, y: it.y, rotationDeg: it.rotationDeg }, [0, 0]);
    g0.update([50, 0], { x: it.x + 5, y: it.y, rotationDeg: it.rotationDeg });
    g0.cancel();
    expect(g0.finish()).toBeNull();
    expect(st.$design.get()).toBe(before);
    expect(st.$history.get().canUndo).toBe(false);
    // a real drag through many pointer moves commits once
    const g = new DragGesture('move', { x: it.x, y: it.y, rotationDeg: it.rotationDeg }, [0, 0]);
    for (let k = 1; k <= 10; k++) g.update([k * 10, 0], { x: it.x + k, y: it.y, rotationDeg: it.rotationDeg });
    const p = g.finish()!;
    st.commit(moveItem(st.$design.get()!, it.id, p.x, p.y, p.rotationDeg));
    expect(st.$layout.get()!.items.find((x) => x.id === it.id)!.x).toBe(it.x + 10);
    st.undo();
    expect(st.$layout.get()!.items.find((x) => x.id === it.id)!.x).toBe(it.x);
    expect(st.$history.get().canUndo).toBe(false);
    st.destroy();
  });

  it('duplicates the picked item next to it and picks the copy', async () => {
    const st = await ready();
    const layout = st.$layout.get()!;
    const it = layout.items.find((x) => x.element.includes('bench'))!;
    st.$selection.set({ kind: 'item', id: it.id });
    expect(duplicateSelected(st)).toBe(true);
    const sel = st.$selection.get()!;
    expect(sel.id).not.toBe(it.id);
    const copy = st.$layout.get()!.items.find((x) => x.id === sel.id)!;
    expect(copy.element).toBe(it.element);
    expect(copy.rotationDeg).toBe(it.rotationDeg);
    expect(Math.hypot(copy.x - it.x, copy.y - it.y)).toBeGreaterThan(0.5);
    st.undo();
    expect(st.$layout.get()!.items.some((x) => x.id === sel.id)).toBe(false);
    st.destroy();
  });

  it('everything you can see can be moved — except in the sun-only widget', async () => {
    const full = await ready('full');
    expect(full.editable).toBe(true);
    full.destroy();
    const sun = createPlannerStore('sun', 'dover');
    expect(sun.editable).toBe(false);
    sun.destroy();
  });
});
