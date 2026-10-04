// Park surfaces laid on the ground (planting squares, gravel, paths, seams, piece
// outlines, the grid): flat shapes cut into small triangles whose corners follow
// groundOf(site). On flat ground the planner keeps its old flat shapes.

import * as THREE from 'three';
import { FLAT_GROUND, type GroundFn } from '../ground';
import type { Vec2 } from '../geo';

/** Does this ground need draping? (no ground, or the flat stand-in, does not) */
export const needsDrape = (g: GroundFn | null | undefined): g is GroundFn => Boolean(g) && g !== FLAT_GROUND;

/** Split triangles until no edge is longer than `maxEdge` feet (longest edge first). */
export function subdivide(tris: [Vec2, Vec2, Vec2][], maxEdge: number, limit = 200000): [Vec2, Vec2, Vec2][] {
  const out: [Vec2, Vec2, Vec2][] = [];
  const stack = tris.slice();
  const d2 = (a: Vec2, b: Vec2) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
  const m2 = maxEdge * maxEdge;
  while (stack.length) {
    const t = stack.pop()!;
    const e = [d2(t[0], t[1]), d2(t[1], t[2]), d2(t[2], t[0])];
    const k = e.indexOf(Math.max(...e));
    if (e[k]! <= m2 || out.length + stack.length > limit) {
      out.push(t);
      continue;
    }
    const a = t[k]!;
    const b = t[(k + 1) % 3]!;
    const c = t[(k + 2) % 3]!;
    const mid: Vec2 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    stack.push([a, mid, c], [mid, b, c]);
  }
  return out;
}

/** A filled polygon (local feet) on the ground, `up` feet above it. */
export function drapedShape(pts: Vec2[], ground: GroundFn, up: number, maxEdge = 2): THREE.BufferGeometry {
  const contour = pts.map(([x, y]) => new THREE.Vector2(x, y));
  if (THREE.ShapeUtils.isClockWise(contour)) contour.reverse();
  const faces = THREE.ShapeUtils.triangulateShape(contour, []);
  const tris = subdivide(
    faces.map((f) => f.map((i) => [contour[i]!.x, contour[i]!.y] as Vec2) as [Vec2, Vec2, Vec2]),
    maxEdge,
  );
  const pos = new Float32Array(tris.length * 9);
  let o = 0;
  for (const t of tris)
    for (const [x, y] of t) {
      pos[o++] = x;
      pos[o++] = ground(x, y) + up;
      pos[o++] = -y;
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

/** Points every `step` feet along a segment (both ends included). */
function along(a: Vec2, b: Vec2, step: number): Vec2[] {
  const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
  return Array.from({ length: n + 1 }, (_, i) => [a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n] as Vec2);
}

/** A flat ribbon `width` feet wide along a ring, following the ground (like builders.ribbon). */
export function drapedRibbon(ring: Vec2[], width: number, up: number, ground: GroundFn, color: number, closed = true, step = 2): THREE.Mesh {
  const pos: number[] = [];
  const n = ring.length;
  const count = closed ? n : n - 1;
  const hw = width / 2;
  for (let i = 0; i < count; i++) {
    const a = ring[i]!;
    const b = ring[(i + 1) % n]!;
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const L = Math.hypot(dx, dy) || 1;
    const ux = dx / L;
    const uy = dy / L;
    const nx = -uy * hw;
    const ny = ux * hw;
    // extend each segment by hw so corners meet
    const pts = along([a[0] - ux * hw, a[1] - uy * hw], [b[0] + ux * hw, b[1] + uy * hw], step);
    for (let k = 0; k + 1 < pts.length; k++) {
      const p = pts[k]!;
      const q = pts[k + 1]!;
      const quad: Vec2[] = [
        [p[0] + nx, p[1] + ny],
        [p[0] - nx, p[1] - ny],
        [q[0] - nx, q[1] - ny],
        [q[0] + nx, q[1] + ny],
      ];
      for (const j of [0, 1, 2, 0, 2, 3]) {
        const [x, y] = quad[j]!;
        pos.push(x, ground(x, y) + up, -y);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  return new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
}

/** A textured quad (uv (0,0)…(1,1) on four local corners) cut into a grid that follows the ground. */
export function drapedQuad(corners: [Vec2, Vec2, Vec2, Vec2], up: number, ground: GroundFn, material: THREE.Material, step = 2): THREE.Mesh {
  const [c0, c1, , c3] = corners;
  const nx = Math.max(1, Math.ceil(Math.hypot(c1[0] - c0[0], c1[1] - c0[1]) / step));
  const ny = Math.max(1, Math.ceil(Math.hypot(c3[0] - c0[0], c3[1] - c0[1]) / step));
  const at = (u: number, v: number): Vec2 => {
    // bilinear between the four corners
    const [p0, p1, p2, p3] = corners;
    const x = (1 - u) * (1 - v) * p0[0] + u * (1 - v) * p1[0] + u * v * p2[0] + (1 - u) * v * p3[0];
    const y = (1 - u) * (1 - v) * p0[1] + u * (1 - v) * p1[1] + u * v * p2[1] + (1 - u) * v * p3[1];
    return [x, y];
  };
  const pos: number[] = [];
  const uv: number[] = [];
  for (let j = 0; j <= ny; j++)
    for (let i = 0; i <= nx; i++) {
      const [x, y] = at(i / nx, j / ny);
      pos.push(x, ground(x, y) + up, -y);
      uv.push(i / nx, j / ny);
    }
  const idx: number[] = [];
  for (let j = 0; j < ny; j++)
    for (let i = 0; i < nx; i++) {
      const a = j * (nx + 1) + i;
      idx.push(a, a + 1, a + nx + 2, a, a + nx + 2, a + nx + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return new THREE.Mesh(g, material);
}

/** Line segments (pairs of local points) following the ground, `up` feet above it. */
export function drapedLines(pairs: [Vec2, Vec2][], up: number, ground: GroundFn, step = 2): THREE.BufferGeometry {
  const pos: number[] = [];
  for (const [a, b] of pairs) {
    const pts = along(a, b, step);
    for (let k = 0; k + 1 < pts.length; k++) {
      const p = pts[k]!;
      const q = pts[k + 1]!;
      pos.push(p[0], ground(p[0], p[1]) + up, -p[1], q[0], ground(q[0], q[1]) + up, -q[1]);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  return g;
}
