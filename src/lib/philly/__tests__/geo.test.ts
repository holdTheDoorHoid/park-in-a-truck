import { describe, expect, it } from 'vitest';
import { distanceFt, makeProjector, minAreaRect, simplifyRing, signedArea, type XY } from '../geo';
import { analyseLot } from '../lotshape';
import type { LngLat } from '../../types';

/** A rectangle w × l feet, rotated `deg` clockwise from north, at a Philadelphia origin, as lng/lat. */
function rectLngLat(w: number, l: number, deg: number, origin: LngLat = [-75.18, 39.97]): LngLat[] {
  const pr = makeProjector(origin);
  const t = (deg * Math.PI) / 180;
  const ux: XY = [Math.sin(t), Math.cos(t)]; // along the length
  const vx: XY = [Math.cos(t), -Math.sin(t)];
  const pts: XY[] = [
    [0, 0],
    [ux[0] * l, ux[1] * l],
    [ux[0] * l + vx[0] * w, ux[1] * l + vx[1] * w],
    [vx[0] * w, vx[1] * w],
  ];
  return pts.map(pr.toLngLat);
}

describe('projection', () => {
  it('measures a known distance (1 minute of latitude ≈ 6,076 ft)', () => {
    expect(distanceFt([-75.18, 39.97], [-75.18, 39.97 + 1 / 60])).toBeCloseTo(6072, -1);
  });
  it('round-trips', () => {
    const pr = makeProjector([-75.18, 39.97]);
    const p: LngLat = [-75.1812, 39.9711];
    const back = pr.toLngLat(pr.toXY(p));
    expect(back[0]).toBeCloseTo(p[0], 10);
    expect(back[1]).toBeCloseTo(p[1], 10);
  });
});

describe('minAreaRect', () => {
  it.each([0, 17, 45, 90, 123.4, 279])('recovers a 14 × 50 ft rectangle rotated %s°', (deg) => {
    const pr = makeProjector([-75.18, 39.97]);
    const r = minAreaRect(rectLngLat(14, 50, deg).map(pr.toXY));
    expect(r.length).toBeCloseTo(50, 3);
    expect(r.width).toBeCloseTo(14, 3);
  });
  it('encloses a skewed quadrilateral', () => {
    const r = minAreaRect([[0, 0], [100, 0], [104, 30], [3, 28]]);
    expect(r.area).toBeGreaterThanOrEqual(Math.abs(signedArea([[0, 0], [100, 0], [104, 30], [3, 28]])) - 1e-6);
    expect(r.length).toBeGreaterThan(r.width);
  });
});

describe('simplifyRing', () => {
  it('drops collinear and duplicate vertices', () => {
    const ring: XY[] = [[0, 0], [25, 0.1], [50, 0], [50, 0], [50, 14], [0, 14]];
    expect(simplifyRing(ring)).toHaveLength(4);
  });
});

describe('analyseLot on synthetic lots', () => {
  it('a rectangle with no streets known: lengths only, lot type unknown', () => {
    const g = analyseLot({ polygon: rectLngLat(20, 80, 30), streets: [] })!;
    expect(g.lengthFt).toBeCloseTo(80, 0);
    expect(g.widthFt).toBeCloseTo(20, 0);
    expect(g.areaSqFt).toBeCloseTo(1600, -1);
    expect(g.lotType).toBe('unknown');
    expect(g.size.id).toBe('B');
    expect(g.edges.map((e) => Math.round(e.lengthFt)).sort((a, b) => a - b)).toEqual([20, 20, 80, 80]);
  });
});
