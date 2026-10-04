// Existing conditions on the lot (Assess): trees already there, downspouts, wet areas,
// hydrants, poles, overhead wires, old pavement. Few objects, so plain meshes.

import * as THREE from 'three';
import { existingMeta } from '../catalog';
import type { Vec2 } from '../geo';
import { COLORS, TreeInstances, W, disposeTree, ribbon } from './builders';

export interface ExistingRender {
  id: string;
  element: string;
  /** local feet */
  x: number;
  y: number;
  rotationDeg: number;
  radiusFt?: number;
  lengthFt?: number;
  widthFt?: number;
  keep?: boolean;
  heightFt?: number;
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

  constructor() {
    this.group.name = 'existing';
    this.ghost.group.traverse((o) => {
      (o as THREE.Mesh).castShadow = false;
    });
    this.group.add(this.parts, this.trees.group, this.ghost.group);
  }

  pickables(): { object: THREE.Object3D; idOf: (instanceId?: number) => string | undefined }[] {
    const out: { object: THREE.Object3D; idOf: (i?: number) => string | undefined }[] = [
      { object: this.trees.pickMesh, idOf: (i) => (i == null ? undefined : this.trees.ids[i]) },
      { object: this.ghost.pickMesh, idOf: (i) => (i == null ? undefined : this.ghost.ids[i]) },
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
    for (const it of items) {
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
          const spec = { id: it.id, x: it.x, y: it.y, heightFt: it.heightFt ?? Math.max(15, r * 2.4), crownR: r * 0.85, color: sel ? 0x2fb3e6 : 0x2e8a45 };
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
          const r = it.radiusFt ?? 5;
          const g = new THREE.CircleGeometry(r, 36).rotateX(-Math.PI / 2);
          const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: meta.color, transparent: true, opacity: sel ? 0.55 : 0.38, depthWrite: false }));
          m.position.copy(W(it.x, it.y, 0.32));
          m.renderOrder = 2;
          add(m);
          const ring = ribbon(circle(r).map(([a, b]) => [a + it.x, b + it.y] as Vec2), 0.25, 0.34, sel ? COLORS.select : 0x1d5f8f);
          add(ring);
          break;
        }
        case 'downspout': {
          const m = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 12, 8).translate(0, 6, 0), lambert(sel ? COLORS.select : meta.color));
          m.position.copy(W(it.x, it.y, 0));
          m.castShadow = true;
          add(m);
          const splash = new THREE.Mesh(new THREE.CircleGeometry(1.4, 20).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: meta.color, transparent: true, opacity: 0.45 }));
          splash.position.copy(W(it.x, it.y, 0.33));
          add(splash);
          break;
        }
        case 'hydrant': {
          const m = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 2.6, 10).translate(0, 1.3, 0), lambert(sel ? COLORS.select : meta.color));
          m.position.copy(W(it.x, it.y, 0));
          m.castShadow = true;
          add(m);
          break;
        }
        case 'utility-pole': {
          const m = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 30, 8).translate(0, 15, 0), lambert(sel ? COLORS.select : meta.color));
          m.position.copy(W(it.x, it.y, 0));
          m.castShadow = true;
          add(m);
          const arm = new THREE.Mesh(new THREE.BoxGeometry(6, 0.4, 0.4), lambert(meta.color));
          arm.position.copy(W(it.x, it.y, 27));
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
            const g = new THREE.BufferGeometry().setFromPoints([W(it.x - dx + ox, it.y - dy + oy, h), W(it.x + dx + ox, it.y + dy + oy, h)]);
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
          hit.position.copy(W(it.x, it.y, 1));
          hit.rotation.y = r;
          add(hit);
          break;
        }
        case 'old-pavement': {
          const L = it.lengthFt ?? 10;
          const Wd = it.widthFt ?? 8;
          const m = new THREE.Mesh(new THREE.BoxGeometry(L, 0.3, Wd).translate(0, 0.15, 0), lambert(sel ? 0x8fd3ef : meta.color));
          m.position.copy(W(it.x, it.y, 0.02));
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
