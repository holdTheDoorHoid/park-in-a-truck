// Edge lengths the cost estimator needs, measured on the real lot:
// - outerEdgeFt: the park's outer edge that is NOT against a building or a gabion wall,
//   split into hardscape (sidewalk/street side) and softscape (a neighbour's yard).
// - gravelEdgeFt: edging around gravel, split by what the gravel meets: hardscape
//   (sidewalk outside the park) or softscape (planting, mulch, soil). Gravel meeting
//   gravel or paving needs no edging; gravel against a building needs none either.
// The planner measures these because it knows the neighbours; the pieces' own counts
// cannot.

import type { LayoutItem, LayoutSurface, ParkLayout } from '../types';
import { pointInPolygon, signedArea, type Vec2 } from './geo';

export interface EdgeContext {
  /** park-local feet -> local feet */
  toLocal: (p: Vec2) => Vec2;
  buildings: Vec2[][];
  /** every parcel around, including the lot itself */
  parcels: Vec2[][];
}

type Outside = 'building' | 'hard' | 'soft';

const SOFT = new Set(['planting', 'mulch', 'lawn', 'nature-play']);
const HARD = new Set(['gravel', 'paver', 'wood-deck', 'existing-pavement', 'gabion', 'edge']);

function insideItem(p: Vec2, it: LayoutItem): boolean {
  const r = (-it.rotationDeg * Math.PI) / 180;
  const dx = p[0] - it.x;
  const dy = p[1] - it.y;
  const lx = dx * Math.cos(r) - dy * Math.sin(r);
  const ly = dx * Math.sin(r) + dy * Math.cos(r);
  return Math.abs(lx) <= it.w / 2 && Math.abs(ly) <= it.h / 2;
}

export function measureEdges(layout: ParkLayout, ctx: EdgeContext): { outerEdgeFt: { hardscape: number; softscape: number }; gravelEdgeFt: { hardscape: number; softscape: number } } {
  const L = layout.lengthFt;
  const W = layout.widthFt;
  const outside = (parkPt: Vec2): Outside => {
    const q = ctx.toLocal(parkPt);
    if (ctx.buildings.some((b) => pointInPolygon(q, b))) return 'building';
    return ctx.parcels.some((r) => pointInPolygon(q, r)) ? 'soft' : 'hard';
  };
  const gabions = layout.items.filter((i) => i.element === 'gabion-wall');

  // outer edge, 1-ft steps
  const outer = { hardscape: 0, softscape: 0 };
  const walk = (a: Vec2, b: Vec2, n: Vec2, fn: (p: Vec2, step: number) => void) => {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const steps = Math.max(1, Math.round(len));
    const step = len / steps;
    for (let i = 0; i < steps; i++) {
      const t = (i + 0.5) / steps;
      fn([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], step);
    }
    void n;
  };
  const sides: [Vec2, Vec2, Vec2][] = [
    [[0, 0], [0, W], [-1, 0]],
    [[L, 0], [L, W], [1, 0]],
    [[0, 0], [L, 0], [0, -1]],
    [[0, W], [L, W], [0, 1]],
  ];
  for (const [a, b, n] of sides) {
    walk(a, b, n, (p, step) => {
      const inner: Vec2 = [p[0] - n[0] * 0.75, p[1] - n[1] * 0.75];
      if (gabions.some((g) => insideItem(inner, g))) return;
      const o = outside([p[0] + n[0] * 1.5, p[1] + n[1] * 1.5]);
      if (o === 'hard') outer.hardscape += step;
      else if (o === 'soft') outer.softscape += step;
    });
  }

  // gravel edges
  const gravel = { hardscape: 0, softscape: 0 };
  const squares = layout.items.filter((i) => i.element === 'planting-square' || i.element === 'raised-bed');
  const surfaceAt = (p: Vec2, not: LayoutSurface): LayoutSurface | undefined =>
    layout.surfaces.find((s) => s !== not && pointInPolygon(p, s.polygon as Vec2[]));
  for (const s of layout.surfaces) {
    if (s.material !== 'gravel') continue;
    const poly = s.polygon as Vec2[];
    const ccw = signedArea(poly) > 0;
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i]!;
      const b = poly[(i + 1) % poly.length]!;
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (len < 1e-6) continue;
      // outward normal: right of a→b for a CCW ring
      const n: Vec2 = ccw ? [(b[1] - a[1]) / len, -(b[0] - a[0]) / len] : [-(b[1] - a[1]) / len, (b[0] - a[0]) / len];
      walk(a, b, n, (p, step) => {
        const q: Vec2 = [p[0] + n[0] * 0.5, p[1] + n[1] * 0.5];
        if (q[0] < 0 || q[1] < 0 || q[0] > L || q[1] > W) {
          const o = outside([p[0] + n[0] * 1.5, p[1] + n[1] * 1.5]);
          if (o === 'hard') gravel.hardscape += step;
          else if (o === 'soft') gravel.softscape += step;
          return;
        }
        if (squares.some((sq) => insideItem(q, sq))) {
          gravel.softscape += step;
          return;
        }
        const other = surfaceAt(q, s);
        if (other && HARD.has(other.material)) return;
        if (!other || SOFT.has(other.material)) gravel.softscape += step;
      });
    }
  }
  const r = (v: number) => Math.round(v);
  return {
    outerEdgeFt: { hardscape: r(outer.hardscape), softscape: r(outer.softscape) },
    gravelEdgeFt: { hardscape: r(gravel.hardscape), softscape: r(gravel.softscape) },
  };
}
