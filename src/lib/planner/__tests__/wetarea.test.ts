import { describe, expect, it } from 'vitest';
import type { Vec2 } from '../geo';
import {
  CLOSE_PX,
  PolygonDraft,
  insertCorner,
  moveCorner,
  outlineFromPoints,
  padPolygon,
  polygonArea,
  polygonCentroid,
  wetAreaPolygon,
} from '../interact';
import { addExisting, normaliseDesign, updateExisting } from '../design';
import { existingFootprint } from '../scene/existing';
import { existingRenders } from '../../../components/planner/binding';
import { buildLocalSite } from '../localsite';
import type { DesignState } from '../../types';
import dover from '../fixtures/dover.json';

const square: Vec2[] = [
  [0, 0],
  [10, 0],
  [10, 6],
  [0, 6],
];

describe('drawing an outline', () => {
  it('adds points on clicks, ignores the second click of a double-click, closes on the first point', () => {
    const d = new PolygonDraft();
    expect(d.click([0, 0], [100, 100])).toBe('add');
    expect(d.click([10, 0], [200, 100])).toBe('add');
    // a double-click: the second click lands on the last point
    expect(d.click([10.01, 0], [202, 101])).toBe('skip');
    expect(d.canFinish).toBe(false);
    // too few points: clicking the first point adds a point instead of closing
    expect(d.click([0.05, 0.02], [101, 101])).toBe('add');
    d.undo();
    expect(d.click([10, 6], [200, 40])).toBe('add');
    expect(d.canFinish).toBe(true);
    expect(d.click([0.1, 0.1], [100 + CLOSE_PX.mouse - 1, 100])).toBe('close');
    expect(d.points).toHaveLength(3);
  });
  it('closes within a finger-width on touch screens', () => {
    const d = new PolygonDraft();
    d.click([0, 0], [100, 100]);
    d.click([10, 0], [200, 100]);
    d.click([10, 6], [200, 40]);
    expect(d.click([0, 0], [120, 100], CLOSE_PX.mouse)).toBe('add');
    d.undo();
    expect(d.click([0, 0], [120, 100], CLOSE_PX.touch)).toBe('close');
  });
  it('re-measures where the first point is on screen after the camera moves', () => {
    const d = new PolygonDraft();
    d.click([0, 0], [100, 100]);
    d.click([10, 0], [200, 100]);
    d.click([10, 6], [200, 40]);
    d.reproject((p) => [500 + p[0] * 10, 500 - p[1] * 10]);
    expect(d.click([0, 0], [500, 500])).toBe('close');
  });
  it('undo takes back the last point', () => {
    const d = new PolygonDraft();
    d.click([0, 0], [0, 0]);
    d.click([5, 0], [50, 0]);
    d.undo();
    expect(d.points).toEqual([[0, 0]]);
  });
});

describe('outline geometry', () => {
  it('area and centroid', () => {
    expect(polygonArea(square)).toBe(60);
    expect(polygonCentroid(square)).toEqual([5, 3]);
    // clockwise gives the same
    expect(polygonArea([...square].reverse())).toBe(60);
  });
  it('saves corners as feet east/north of the centre, with an equivalent radius', () => {
    const { center, outline, radiusFt } = outlineFromPoints([[100, 50], [110, 50], [110, 56], [100, 56], [100.05, 50.05]]);
    expect(center[0]).toBeCloseTo(105, 1);
    expect(center[1]).toBeCloseTo(53, 1);
    // the near-duplicate closing point is dropped
    expect(outline).toHaveLength(4);
    expect(outline[0]).toEqual([-5, -3]);
    expect(radiusFt).toBeCloseTo(Math.sqrt(60 / Math.PI), 1);
  });
  it('an old circle wet area is still a circle of its radius', () => {
    const poly = wetAreaPolygon({ radiusFt: 4 }, [10, 20], 24);
    expect(poly).toHaveLength(24);
    for (const p of poly) expect(Math.hypot(p[0] - 10, p[1] - 20)).toBeCloseTo(4, 9);
    expect(wetAreaPolygon({}, [0, 0], 8)[0]).toEqual([5, 0]);
  });
  it('a drawn wet area moves with its centre (the outline is relative)', () => {
    const it0 = { outline: [[-5, -3], [5, -3], [5, 3], [-5, 3]] as [number, number][] };
    const a = wetAreaPolygon(it0, [0, 0]);
    const b = wetAreaPolygon(it0, [7, -2]);
    a.forEach((p, i) => {
      expect(b[i]![0] - p[0]).toBe(7);
      expect(b[i]![1] - p[1]).toBe(-2);
    });
  });
  it('moves and inserts corners', () => {
    const o: [number, number][] = [[-5, -3], [5, -3], [5, 3], [-5, 3]];
    const m = moveCorner(o, 1, [12.04, 1], [5, 3]);
    expect(m[1]).toEqual([7, -2]);
    expect(m[0]).toEqual(o[0]);
    const ins = insertCorner(o, 1, [10, 3], [5, 3]);
    expect(ins).toHaveLength(5);
    expect(ins[2]).toEqual([5, 0]);
  });
  it('pads a polygon outward either way round', () => {
    for (const ring of [square, [...square].reverse()]) {
      const p = padPolygon(ring, 1);
      expect(polygonArea(p)).toBeGreaterThan(polygonArea(ring) + 30);
      expect(polygonArea(p)).toBeLessThan(polygonArea(ring) + 40);
    }
  });
});

describe('wet areas in a saved design', () => {
  const site = buildLocalSite({ lot: dover.lot as never, ...(dover.surroundings as never as object), source: 'fixture' } as never);
  const base = (): DesignState => ({
    v: 1,
    size: 'A',
    lotKind: 'interior',
    frame: 'nature',
    front: 'nature',
    back: 'nature',
    lengthFt: 50,
    widthFt: 14,
    added: [],
    removed: [],
    moved: {},
    updatedAt: '2026-10-01T00:00:00Z',
  });
  it('old saves (a circle) load unchanged and still draw as a circle', () => {
    const old = { ...base(), existing: [{ id: 'existing:old', element: 'wet-area', x: 0, y: 0, rotationDeg: 0, lngLat: [-75.18253, 39.97675] as [number, number], radiusFt: 3, origin: 'person' as const }] };
    const d = normaliseDesign(JSON.parse(JSON.stringify(old)));
    expect(d.existing![0]).toEqual(old.existing[0]);
    const [r] = existingRenders(site, d.existing);
    expect(r!.outline).toBeUndefined();
    const f = existingFootprint(r!);
    expect(f.round).toBe(true);
    expect(f.hw).toBe(3);
    expect(f.poly).toBeUndefined();
  });
  it('a drawn outline is saved additively and becomes the footprint', () => {
    let d = base();
    const { outline, radiusFt } = outlineFromPoints(square);
    const r = addExisting(d, 'wet-area', [-75.18253, 39.97675]);
    d = updateExisting(r.design, r.id, { outline, radiusFt });
    const e = d.existing!.find((x) => x.id === r.id)!;
    expect(e.outline).toHaveLength(4);
    expect(e.radiusFt).toBeCloseTo(4.4, 1);
    // still all the old fields
    expect(e.element).toBe('wet-area');
    expect(e.lngLat).toEqual([-75.18253, 39.97675]);
    const [rr] = existingRenders(site, d.existing);
    expect(rr!.outline).toEqual(outline);
    const f = existingFootprint(rr!);
    expect(f.poly).toHaveLength(4);
    expect(f.poly![0]![0]).toBeCloseTo(rr!.x - 5, 6);
    expect(f.round).toBe(false);
  });
});
