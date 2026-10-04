// Existing conditions on the lot (Assess): trees already there, downspouts, wet areas,
// hydrants, poles, overhead wires, old pavement. Few objects, so plain meshes.

import * as THREE from 'three';
import { existingMeta } from '../catalog';
import type { Vec2 } from '../geo';
import { FLAT_GROUND, type GroundFn } from '../ground';
import { wetAreaPolygon } from '../interact';
import { COLORS, TreeInstances, W, disposeTree } from './builders';
import { ON_GROUND, drapedFillGeometry, drapedRibbon } from './terrain';
import type { Footprint } from './overlays';

export interface ExistingRender {
  id: string;
  element: string;
  /** local feet */
  x: number;
  y: number;
  /** on screen: counter-clockwise from east */
  rotationDeg: number;
  /** as saved: relative to the lot's long side (what turning changes) */
  ownRotationDeg?: number;
  radiusFt?: number;
  lengthFt?: number;
  widthFt?: number;
  keep?: boolean;
  heightFt?: number;
  /** a wet area's drawn outline: corners in feet east/north of (x, y); absent = a circle of radiusFt */
  outline?: [number, number][];
}

/** The ground a thing covers, for the selection and drag overlays. */
export function existingFootprint(it: ExistingRender): Footprint {
  const r = (it.rotationDeg * Math.PI) / 180;
  const xd: Vec2 = [Math.cos(r), Math.sin(r)];
  const yd: Vec2 = [-Math.sin(r), Math.cos(r)];
  const c: Vec2 = [it.x, it.y];
  switch (it.element) {
    case 'existing-tree':
      return { c, xd, yd, hw: it.radiusFt ?? 8, hh: it.radiusFt ?? 8, round: true };
    case 'wet-area':
      if (it.outline && it.outline.length >= 3) {
        const poly = wetAreaPolygon(it, c);
        const xs = poly.map((p) => p[0] - c[0]);
        const ys = poly.map((p) => p[1] - c[1]);
        return { c, xd: [1, 0], yd: [0, 1], hw: Math.max(...xs.map(Math.abs)), hh: Math.max(...ys.map(Math.abs)), round: false, poly };
      }
      return { c, xd, yd, hw: it.radiusFt ?? 5, hh: it.radiusFt ?? 5, round: true };
    case 'old-pavement':
      return { c, xd, yd, hw: (it.lengthFt ?? 10) / 2, hh: (it.widthFt ?? 8) / 2, round: false };
    case 'utility-line':
      return { c, xd, yd, hw: (it.lengthFt ?? 30) / 2, hh: 0.8, round: false };
    case 'utility-pole':
      return { c, xd, yd, hw: 3, hh: 0.6, round: false };
    default:
      return { c, xd, yd, hw: 1.2, hh: 1.2, round: true };
  }
}

function circle(r: number, seg = 40): Vec2[] {
  return Array.from({ length: seg }, (_, i) => [r * Math.cos((i / seg) * Math.PI * 2), r * Math.sin((i / seg) * Math.PI * 2)] as Vec2);
}

export class ExistingMeshes {
  readonly group = new THREE.Group();
  private parts = new THREE.Group();
  private trees = new TreeInstances(48);
  private ghost = new TreeInstances(
    24,
    new THREE.MeshBasicMaterial({ color: 0xd0342c, transparent: true, opacity: 0.25, depthWrite: false, wireframe: true }),
  );

  /** terrain: markers lie on the ground, things stand on it */
  private ground: GroundFn = FLAT_GROUND;

  setGround(g: GroundFn) {
    this.ground = g;
  }

  constructor() {
    this.group.name = 'existing';
    this.ghost.group.traverse((o) => {
      (o as THREE.Mesh).castShadow = false;
    });
    this.group.add(this.parts, this.trees.group, this.ghost.group);
  }

  pickables(): { object: THREE.Object3D; idOf: (instanceId?: number) => string | undefined; soft?: boolean }[] {
    const out: { object: THREE.Object3D; idOf: (i?: number) => string | undefined; soft?: boolean }[] = [
      { object: this.trees.pickMesh, idOf: (i) => (i == null ? undefined : this.trees.ids[i]), soft: true },
      { object: this.ghost.pickMesh, idOf: (i) => (i == null ? undefined : this.ghost.ids[i]), soft: true },
    ];
    this.parts.traverse((o) => {
      if (o.userData.pickId) out.push({ object: o, idOf: () => o.userData.pickId });
    });
    return out;
  }

  set(items: ExistingRender[], opts: { showMarkers: boolean; selected?: string | null }) {
    disposeTree(this.parts);
    this.parts.clear();
    const trees: Parameters<TreeInstances['set']>[0] = [];
    const ghosts: Parameters<TreeInstances['set']>[0] = [];
    const lambert = (c: string | number, extra: THREE.MeshLambertMaterialParameters = {}) => new THREE.MeshLambertMaterial({ color: c, ...extra });
    const gr = this.ground;
    const ribbon = (pts: Vec2[], width: number, up: number, color: number, closed = true) => drapedRibbon(pts, width, up, color, gr, closed);
    for (const it of items) {
      const z0 = gr(it.x, it.y);
      const meta = existingMeta(it.element);
      const sel = opts.selected === it.id;
      const add = (o: THREE.Object3D) => {
        o.userData.pickId = it.id;
        this.parts.add(o);
        return o;
      };
      switch (it.element) {
        case 'existing-tree': {
          const r = it.radiusFt ?? 8;
          const spec = { id: it.id, x: it.x, y: it.y, heightFt: it.heightFt ?? Math.max(15, r * 2.4), crownR: r * 0.85, color: sel ? 0x2fb3e6 : 0x2e8a45, baseFt: z0 };
          if (it.keep === false) {
            if (opts.showMarkers) ghosts.push(spec);
          } else trees.push(spec);
          if (opts.showMarkers) {
            const ring = ribbon(circle(r).map(([a, b]) => [a + it.x, b + it.y] as Vec2), 0.3, 0.35, it.keep === false ? COLORS.overhang : sel ? COLORS.select : 0x1f6e3a);
            ring.userData.pickId = it.id;
            this.parts.add(ring);
          }
          break;
        }
        case 'wet-area': {
          // a drawn outline, or a circle (older saves)
          const poly = wetAreaPolygon(it, [it.x, it.y], 36);
          const m = new THREE.Mesh(
            drapedFillGeometry(poly, 0.32, gr),
            new THREE.MeshBasicMaterial({ color: meta.color, transparent: true, opacity: sel ? 0.55 : 0.38, depthWrite: false, side: THREE.DoubleSide, ...ON_GROUND }),
          );
          m.renderOrder = 2;
          add(m);
          const ring = ribbon(poly, 0.25, 0.34, sel ? COLORS.select : 0x1d5f8f);
          add(ring);
          break;
        }
        case 'downspout': {
          const m = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 12, 8).translate(0, 6, 0), lambert(sel ? COLORS.select : meta.color));
          m.position.copy(W(it.x, it.y, z0));
          m.castShadow = true;
          add(m);
          const splash = new THREE.Mesh(
            drapedFillGeometry(circle(1.4, 20).map(([a, b]) => [a + it.x, b + it.y] as Vec2), 0.33, gr),
            new THREE.MeshBasicMaterial({ color: meta.color, transparent: true, opacity: 0.45, side: THREE.DoubleSide, ...ON_GROUND }),
          );
          add(splash);
          break;
        }
        case 'hydrant': {
          const m = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 2.6, 10).translate(0, 1.3, 0), lambert(sel ? COLORS.select : meta.color));
          m.position.copy(W(it.x, it.y, z0));
          m.castShadow = true;
          add(m);
          break;
        }
        case 'utility-pole': {
          const m = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 30, 8).translate(0, 15, 0), lambert(sel ? COLORS.select : meta.color));
          m.position.copy(W(it.x, it.y, z0));
          m.castShadow = true;
          add(m);
          const arm = new THREE.Mesh(new THREE.BoxGeometry(6, 0.4, 0.4), lambert(meta.color));
          arm.position.copy(W(it.x, it.y, z0 + 27));
          arm.rotation.y = (it.rotationDeg * Math.PI) / 180;
          add(arm);
          break;
        }
        case 'utility-line': {
          const L = it.lengthFt ?? 30;
          const r = (it.rotationDeg * Math.PI) / 180;
          const dx = (Math.cos(r) * L) / 2;
          const dy = (Math.sin(r) * L) / 2;
          for (const [h, off] of [
            [24, 0],
            [25.5, 0.8],
          ] as const) {
            const ox = -Math.sin(r) * off;
            const oy = Math.cos(r) * off;
            const g = new THREE.BufferGeometry().setFromPoints([
              W(it.x - dx + ox, it.y - dy + oy, gr(it.x - dx, it.y - dy) + h),
              W(it.x + dx + ox, it.y + dy + oy, gr(it.x + dx, it.y + dy) + h),
            ]);
            add(new THREE.Line(g, new THREE.LineBasicMaterial({ color: sel ? COLORS.select : 0x222222 })));
          }
          // where the wires run, drawn on the ground so it reads in plan view
          const rb = ribbon(
            [
              [it.x - dx, it.y - dy],
              [it.x + dx, it.y + dy],
            ],
            0.35,
            0.36,
            sel ? COLORS.select : 0x333333,
            false,
          );
          add(rb);
          // a thick invisible bar so the wires are easy to click
          const hit = new THREE.Mesh(new THREE.BoxGeometry(L, 1.5, 2), new THREE.MeshBasicMaterial({ visible: false }));
          hit.position.copy(W(it.x, it.y, z0 + 1));
          hit.rotation.y = r;
          add(hit);
          break;
        }
        case 'old-pavement': {
          const L = it.lengthFt ?? 10;
          const Wd = it.widthFt ?? 8;
          const m = new THREE.Mesh(new THREE.BoxGeometry(L, 0.3, Wd).translate(0, 0.15, 0), lambert(sel ? 0x8fd3ef : meta.color));
          // on a slope the slab sits level at the ground under its middle (slabs are short)
          m.position.copy(W(it.x, it.y, z0 + 0.02));
          m.rotation.y = (it.rotationDeg * Math.PI) / 180;
          m.receiveShadow = true;
          add(m);
          break;
        }
      }
    }
    this.trees.set(trees);
    this.ghost.set(ghosts);
  }

  dispose() {
    disposeTree(this.parts);
    this.trees.dispose();
    this.ghost.dispose();
  }
}
