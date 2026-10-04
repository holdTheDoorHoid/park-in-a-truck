// The ground in the 3D scene (terrain, 2026-10-04): a grid mesh lifted onto the lot's real
// ground heights (the aerial photo is draped on it), things drawn ON the ground that follow
// it (ribbons, filled outlines), and the slope overlay for the plan view: contour lines,
// arrows pointing downhill, and the lot's high and low points.
//
// Local feet (x east, y north) → world (x, up, −y), as everywhere in the planner (W()).
// With flat ground (no terrain) everything here reduces to what the scene drew before.

import * as THREE from 'three';
import { FLAT_GROUND, type GroundFn } from '../ground';
import type { Vec2 } from '../geo';
import type { LocalSite } from '../localsite';
import { arrowSpacing, contourInterval, contours, drainArrows } from '../terrain/slope';
import { ON_GROUND, drapedShape, ribbonPositions } from '../furniture/drape';
import { oneDecimal, plannerLang, pt } from '../words';

const FLAT: GroundFn = FLAT_GROUND;

// ---- the ground surface ------------------------------------------------------------

/**
 * A grid over [x0, x1] × [y0, y1] (local feet) at about `cellFt` spacing (at most `maxSeg`
 * cells a side), each vertex on the ground; uv (0,0) at (x0, y0), (1,1) at (x1, y1).
 * Also returns the lowest height on it (the skirt and the plain ground beyond sit below that).
 */
export function terrainGeometry(x0: number, x1: number, y0: number, y1: number, ground: GroundFn, cellFt = 3.3, maxSeg = 240) {
  const nx = Math.max(1, Math.min(maxSeg, Math.ceil((x1 - x0) / cellFt)));
  const ny = Math.max(1, Math.min(maxSeg, Math.ceil((y1 - y0) / cellFt)));
  const pos = new Float32Array((nx + 1) * (ny + 1) * 3);
  const uv = new Float32Array((nx + 1) * (ny + 1) * 2);
  let min = Infinity;
  for (let j = 0; j <= ny; j++) {
    const y = y0 + ((y1 - y0) * j) / ny;
    for (let i = 0; i <= nx; i++) {
      const x = x0 + ((x1 - x0) * i) / nx;
      const h = ground(x, y);
      const k = j * (nx + 1) + i;
      pos[k * 3] = x;
      pos[k * 3 + 1] = h;
      pos[k * 3 + 2] = -y;
      uv[k * 2] = i / nx;
      uv[k * 2 + 1] = j / ny;
      min = Math.min(min, h);
    }
  }
  const idx = new Uint32Array(nx * ny * 6);
  let n = 0;
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const a = j * (nx + 1) + i;
      const b = a + 1;
      const c = a + nx + 1;
      const d = c + 1;
      // counter-clockwise seen from above (world y up, z = −north)
      idx.set([a, b, d, a, d, c], n);
      n += 6;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return { geo, min: Number.isFinite(min) ? min : 0, nx, ny };
}

/** Vertical strips from the grid's edge down to `bottom`, so the ground doesn't end in mid-air. */
export function skirtGeometry(x0: number, x1: number, y0: number, y1: number, ground: GroundFn, bottom: number, cellFt = 6): THREE.BufferGeometry {
  const pos: number[] = [];
  const edge = (a: Vec2, b: Vec2) => {
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const k = Math.max(1, Math.ceil(L / cellFt));
    for (let s = 0; s < k; s++) {
      const p: Vec2 = [a[0] + ((b[0] - a[0]) * s) / k, a[1] + ((b[1] - a[1]) * s) / k];
      const q: Vec2 = [a[0] + ((b[0] - a[0]) * (s + 1)) / k, a[1] + ((b[1] - a[1]) * (s + 1)) / k];
      const hp = ground(p[0], p[1]);
      const hq = ground(q[0], q[1]);
      pos.push(p[0], hp, -p[1], q[0], hq, -q[1], q[0], bottom, -q[1], p[0], hp, -p[1], q[0], bottom, -q[1], p[0], bottom, -p[1]);
    }
  };
  edge([x0, y0], [x1, y0]);
  edge([x1, y0], [x1, y1]);
  edge([x1, y1], [x0, y1]);
  edge([x0, y1], [x0, y0]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

// ---- things drawn on the ground ---------------------------------------------------
// (one implementation for everything that lies on the ground: ../furniture/drape.ts)

/** The ground lightly smoothed (a ±1.5 ft cross): lidar has inch-level bumps that make contours wiggle. */
export function smoothGround(g: GroundFn, r = 1.5): GroundFn {
  return (x, y) => (g(x, y) * 2 + g(x + r, y) + g(x - r, y) + g(x, y + r) + g(x, y - r)) / 6;
}

/** A circle's outline (local feet). */
export function circlePts(c: Vec2, r: number, seg = 36): Vec2[] {
  return Array.from({ length: seg }, (_, i) => [c[0] + r * Math.cos((i / seg) * Math.PI * 2), c[1] + r * Math.sin((i / seg) * Math.PI * 2)] as Vec2);
}

/** Where a ray meets the ground (a few steps of plane intersections; exact on flat ground). */
export function rayGround(origin: THREE.Vector3, dir: THREE.Vector3, ground: GroundFn = FLAT): Vec2 | null {
  if (Math.abs(dir.y) < 1e-6) return null;
  let h = 0;
  let x = 0;
  let z = 0;
  for (let i = 0; i < 8; i++) {
    const t = (h - origin.y) / dir.y;
    if (t < 0) return null;
    x = origin.x + dir.x * t;
    z = origin.z + dir.z * t;
    const nh = ground(x, -z);
    if (Math.abs(nh - h) < 0.01) break;
    // damped for steep views over steep ground
    h = h + (nh - h) * (i < 3 ? 1 : 0.5);
  }
  return [x, -z];
}

// ---- the slope overlay ------------------------------------------------------------

// brown contour lines like a topographic map; blue arrows for water
const CONTOUR = 0x7a4a1c;
const ARROW = 0x00709c;

function labelSprite(text: string, color: string): THREE.Sprite {
  const c = document.createElement('canvas');
  const S = 2;
  const ctx = c.getContext('2d')!;
  // the label reads in the planner's language (a right-to-left label lays out right to left)
  const dir = plannerLang().dir;
  ctx.direction = dir;
  ctx.font = `700 ${15 * S}px "Work Sans Variable", "Work Sans", system-ui, sans-serif`;
  const w = Math.ceil(ctx.measureText(text).width) + 16 * S;
  c.width = w;
  c.height = 26 * S;
  const g = c.getContext('2d')!;
  g.fillStyle = 'rgba(255,255,255,0.94)';
  g.strokeStyle = color;
  g.lineWidth = 2 * S;
  const r = 7 * S;
  g.beginPath();
  g.roundRect(S, S, w - 2 * S, c.height - 2 * S, r);
  g.fill();
  g.stroke();
  g.fillStyle = color;
  g.font = `700 ${15 * S}px "Work Sans Variable", "Work Sans", system-ui, sans-serif`;
  g.textBaseline = 'middle';
  g.direction = dir;
  g.textAlign = 'left';
  g.fillText(text, 8 * S, c.height / 2 + S);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, depthWrite: false, transparent: true }));
  sp.renderOrder = 12;
  sp.userData.px = [c.width / S, c.height / S];
  return sp;
}

/** Contour lines, drain arrows, and the High / Low points of the lot. */
export class SlopeOverlay {
  readonly group = new THREE.Group();
  private labels: THREE.Sprite[] = [];
  private mats: THREE.Material[] = [];
  private plan = false;

  /** plan view: drawn over everything (it is read from above); 3D: hidden behind buildings */
  setView(view: '3d' | 'plan') {
    this.plan = view === 'plan';
    for (const m of this.mats) m.depthTest = !this.plan;
  }
  /** the interval the lines were drawn at, ft (null = none drawn) */
  interval: number | null = null;

  constructor() {
    this.group.name = 'slope';
    this.group.visible = false;
  }

  set(site: LocalSite | null, visible: boolean) {
    this.clear();
    this.group.visible = visible;
    const raw = site?.ground;
    const t = site?.terrain;
    if (!site || !raw || !t || !visible) return;
    const ground = raw;
    const smooth = smoothGround(raw);
    const mat = (color: number, opacity: number) => {
      const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, depthTest: !this.plan, side: THREE.DoubleSide, ...ON_GROUND });
      this.mats.push(m);
      return m;
    };
    const parcel = site.parcel;
    const area = site.areaSqFt;
    this.interval = contourInterval(t.slope.fallFt);
    if (this.interval) {
      const segs = contours(smooth, parcel, this.interval, area > 10000 ? 2 : 1);
      const thin: number[] = [];
      const thick: number[] = [];
      for (const s of segs) {
        // every whole foot (or every 4th line) drawn heavier, like a topographic map
        const major = this.interval >= 1 ? Math.abs(s.level / this.interval) % 4 < 1e-6 : Math.abs(s.level - Math.round(s.level)) < 1e-6;
        const out = major ? thick : thin;
        out.push(...ribbonPositions([s.a, s.b], major ? 0.45 : 0.24, 0.12, ground, false, 99));
      }
      for (const [arr, op] of [
        [thin, 0.75],
        [thick, 0.95],
      ] as const) {
        if (!arr.length) continue;
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
        const m = new THREE.Mesh(g, mat(CONTOUR, op));
        m.renderOrder = 9;
        this.group.add(m);
      }
    }
    if (!t.slope.flat) {
      const sp = arrowSpacing(site.frame.lengthFt, site.frame.widthFt);
      const arrows = drainArrows(smooth, parcel, site.frame, sp);
      const pos: number[] = [];
      for (const a of arrows) {
        const L = sp * 0.62;
        const [dx, dy] = a.dir;
        const px = -dy;
        const py = dx;
        const base: Vec2 = [a.p[0] - (dx * L) / 2, a.p[1] - (dy * L) / 2];
        const tip: Vec2 = [a.p[0] + (dx * L) / 2, a.p[1] + (dy * L) / 2];
        const neck: Vec2 = [tip[0] - dx * 1.1, tip[1] - dy * 1.1];
        const sw = 0.13;
        const hw = 0.55;
        const shaft: Vec2[] = [
          [base[0] + px * sw, base[1] + py * sw],
          [base[0] - px * sw, base[1] - py * sw],
          [neck[0] - px * sw, neck[1] - py * sw],
          [neck[0] + px * sw, neck[1] + py * sw],
        ];
        const head: Vec2[] = [
          [neck[0] + px * hw, neck[1] + py * hw],
          [neck[0] - px * hw, neck[1] - py * hw],
          tip,
        ];
        for (const q of [shaft[0]!, shaft[1]!, shaft[2]!, shaft[0]!, shaft[2]!, shaft[3]!, ...head]) pos.push(q[0], ground(q[0], q[1]) + 0.16, -q[1]);
      }
      if (pos.length) {
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        const m = new THREE.Mesh(g, mat(ARROW, 0.8));
        m.renderOrder = 10;
        this.group.add(m);
      }
    }
    const fall = t.slope.fallFt;
    const w = pt();
    const lower = Math.abs(fall) < 0.96 ? w('slope.lowInches', { inches: Math.round(Math.abs(fall) * 12) }) : w('slope.lowFeet', { ft: oneDecimal(Math.abs(fall), w), count: Math.round(Math.abs(fall) * 10) / 10 });
    if (fall >= 0.25) {
      const c = site.frame.center;
      for (const [p, text, color] of [
        [t.slope.high.p, w('slope.high'), '#7a4a1c'],
        [t.slope.low.p, lower, '#00709c'],
      ] as const) {
        const s = labelSprite(text, color);
        // the label sits a little inside the lot (points are often on its edge), tied to its spot by a short line
        const d = Math.hypot(c[0] - p[0], c[1] - p[1]) || 1;
        const k = Math.min(0.45 * d, 12) / d;
        const at: Vec2 = [p[0] + (c[0] - p[0]) * k, p[1] + (c[1] - p[1]) * k];
        s.position.set(at[0], ground(at[0], at[1]) + 1.2, -at[1]);
        s.center.set(0.5, 0);
        this.labels.push(s);
        this.group.add(s);
        if (k * d > 1) {
          const lead = new THREE.Mesh(new THREE.BufferGeometry(), mat(new THREE.Color(color).getHex(), 0.9));
          lead.geometry.setAttribute('position', new THREE.Float32BufferAttribute(ribbonPositions([p, at], 0.18, 0.2, ground, false), 3));
          lead.renderOrder = 11;
          this.group.add(lead);
        }
        // a dot exactly on the spot
        const dm = mat(new THREE.Color(color).getHex(), 1);
        const dot = new THREE.Mesh(drapedShape(circlePts(p, 0.55, 20), ground, 0.2), dm);
        dot.renderOrder = 11;
        this.group.add(dot);
      }
    }
  }

  /** keep the labels one size on screen: `fppAt` = feet per screen pixel at a point */
  layout(fppAt: (p: THREE.Vector3) => number) {
    for (const s of this.labels) {
      const [w, h] = s.userData.px as [number, number];
      const fpp = fppAt(s.position);
      s.scale.set(w * fpp, h * fpp, 1);
    }
  }

  private clear() {
    this.interval = null;
    this.labels = [];
    this.mats = [];
    this.group.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      const mat = m.material as THREE.Material & { map?: THREE.Texture };
      mat?.map?.dispose();
      mat?.dispose();
    });
    this.group.clear();
  }

  dispose() {
    this.clear();
  }
}
