// The park layout as low-poly, instanced meshes: surfaces as flat shapes, items as a
// handful of InstancedMeshes (boxes, cylinders, blobs, trees) so a whole park is a few
// draw calls.

import * as THREE from 'three';
import type { LayoutItem, LayoutSurface, Material, ParkLayout, ThemeId } from '../../types';
import { THEMES } from '../../../data/themes';
import { catalogEntry } from '../catalog';
import type { Vec2 } from '../geo';
import { COLORS, TreeInstances, W, quad, cellTexture, ribbon, disposeTree } from './builders';

export interface ParkMapping {
  toLocal: (p: Vec2) => Vec2;
  dirToLocal: (d: Vec2) => Vec2;
}

const mix = (a: string, b: string, t: number) => '#' + new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString();

const SURFACE: Record<Material, string> = {
  planting: '#86c77a',
  gravel: '#e9e4da',
  'wood-deck': '#c79a6b',
  paver: '#cfcac1',
  mulch: '#c9b393',
  'nature-play': '#d8bd8c',
  lawn: '#97d16f',
  gabion: '#9a9a9a',
  edge: '#6d6d6d',
  'existing-pavement': '#a9a7a0',
  other: '#dddddd',
};

export function surfaceColor(s: LayoutSurface): string {
  const t = s.theme ? THEMES[s.theme] : undefined;
  if (s.material === 'gravel' && t) return mix(t.front, '#ffffff', 0.6);
  if (s.material === 'mulch' && t) return mix(t.back, '#ffffff', 0.45);
  return SURFACE[s.material] ?? SURFACE.other;
}

const unitBox = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
const unitCyl = new THREE.CylinderGeometry(0.5, 0.5, 1, 12).translate(0, 0.5, 0);
const unitBlob = new THREE.IcosahedronGeometry(1, 1);

interface Part {
  ox: number;
  oy: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
  color: string;
}

class Instances {
  mesh: THREE.InstancedMesh;
  ids: string[] = [];
  private n = 0;
  private m = new THREE.Matrix4();
  private c = new THREE.Color();
  constructor(
    private geo: THREE.BufferGeometry,
    private mat: THREE.Material,
    private cap = 64,
  ) {
    this.mesh = this.make(cap);
  }
  private make(cap: number) {
    const m = new THREE.InstancedMesh(this.geo, this.mat, cap);
    m.castShadow = true;
    m.receiveShadow = true;
    m.count = 0;
    m.frustumCulled = false;
    return m;
  }
  begin() {
    this.n = 0;
    this.ids = [];
  }
  push(id: string, pos: THREE.Vector3, yaw: number, scale: THREE.Vector3, color: string) {
    if (this.n >= this.cap) {
      const parent = this.mesh.parent;
      const old = this.mesh;
      this.cap *= 2;
      this.mesh = this.make(this.cap);
      for (let i = 0; i < this.n; i++) {
        old.getMatrixAt(i, this.m);
        this.mesh.setMatrixAt(i, this.m);
        old.getColorAt(i, this.c);
        this.mesh.setColorAt(i, this.c);
      }
      parent?.remove(old);
      parent?.add(this.mesh);
      old.dispose();
    }
    this.m.compose(pos, new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw), scale);
    this.mesh.setMatrixAt(this.n, this.m);
    this.mesh.setColorAt(this.n, this.c.set(color));
    this.ids.push(id);
    this.n++;
  }
  end() {
    this.mesh.count = this.n;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    // raycasting uses the bounds; recompute them for the new instances
    this.mesh.computeBoundingSphere();
    this.mesh.computeBoundingBox();
  }
  dispose() {
    this.mesh.dispose();
  }
}

function partsFor(it: LayoutItem): Part[] {
  const e = catalogEntry(it.element);
  const w = it.w || e.w;
  const h = it.h || e.h;
  const H = it.heightFt ?? e.heightFt;
  const col = e.color;
  switch (e.shape) {
    case 'bench': {
      if (it.element.startsWith('gabion')) {
        return [
          { ox: 0, oy: 0, z: 0, sx: w, sy: h, sz: H - 0.2, color: '#9a9b9c' },
          { ox: 0, oy: 0, z: H - 0.2, sx: w + 0.1, sy: h + 0.1, sz: 0.2, color: '#b98a5a' },
        ];
      }
      if (it.element === 'outdoor-classroom') {
        return [
          { ox: 0, oy: -h / 2 + 0.75, z: 0, sx: w, sy: 1.5, sz: 1.5, color: col },
          { ox: -w / 2 + 0.75, oy: 0.75, z: 0, sx: 1.5, sy: h - 1.5, sz: 1.5, color: col },
          { ox: w / 2 - 0.75, oy: 0.75, z: 0, sx: 1.5, sy: h - 1.5, sz: 1.5, color: col },
        ];
      }
      const seatZ = Math.min(H, 1.5) - 0.2;
      const parts: Part[] = [
        { ox: -w / 2 + 0.2, oy: 0, z: 0, sx: 0.3, sy: h * 0.9, sz: seatZ, color: col },
        { ox: w / 2 - 0.2, oy: 0, z: 0, sx: 0.3, sy: h * 0.9, sz: seatZ, color: col },
        { ox: 0, oy: 0, z: seatZ, sx: w, sy: h, sz: 0.2, color: col },
      ];
      if (H > 2) parts.push({ ox: 0, oy: -h / 2 + 0.12, z: seatZ, sx: w, sy: 0.24, sz: H - seatZ, color: col });
      return parts;
    }
    case 'table':
      return [
        { ox: -w / 2 + 0.2, oy: 0, z: 0, sx: 0.25, sy: h * 0.85, sz: H - 0.15, color: col },
        { ox: w / 2 - 0.2, oy: 0, z: 0, sx: 0.25, sy: h * 0.85, sz: H - 0.15, color: col },
        { ox: 0, oy: 0, z: H - 0.15, sx: w, sy: h, sz: 0.15, color: col },
      ];
    case 'canopy':
      return [
        ...[
          [-1, -1],
          [1, -1],
          [1, 1],
          [-1, 1],
        ].map(([a, b]) => ({ ox: (a! * (w - 0.4)) / 2, oy: (b! * (h - 0.4)) / 2, z: 0, sx: 0.3, sy: 0.3, sz: H, color: '#7a6a58' })),
        { ox: 0, oy: 0, z: H, sx: w, sy: h, sz: 0.2, color: col },
      ];
    case 'square':
      return [{ ox: 0, oy: 0, z: 0, sx: w - 0.2, sy: h - 0.2, sz: H, color: col }];
    case 'flat':
      return [{ ox: 0, oy: 0, z: 0, sx: w - 0.2, sy: h - 0.2, sz: H, color: col }];
    default:
      return [{ ox: 0, oy: 0, z: 0, sx: w, sy: h, sz: H, color: col }];
  }
}

export interface ParkHighlight {
  selected?: string | null;
  overhang?: Set<string>;
  dragging?: { id: string; x: number; y: number; rotationDeg: number } | null;
}

export class ParkMeshes {
  readonly group = new THREE.Group();
  private surfaces = new THREE.Group();
  private overlays = new THREE.Group();
  private boxes = new Instances(unitBox, new THREE.MeshLambertMaterial({ color: 0xffffff }), 128);
  private cyls = new Instances(unitCyl, new THREE.MeshLambertMaterial({ color: 0xffffff }), 32);
  private blobs = new Instances(unitBlob, new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }), 256);
  private trees = new TreeInstances(64);
  private selection = new THREE.Group();
  private layout: ParkLayout | null = null;
  private map: ParkMapping | null = null;

  constructor() {
    this.group.name = 'park';
    this.group.add(this.surfaces, this.overlays, this.boxes.mesh, this.cyls.mesh, this.blobs.mesh, this.trees.group, this.selection);
  }

  /** meshes that can be clicked, and how to turn a hit into an item id */
  pickables(): { object: THREE.Object3D; idOf: (instanceId?: number) => string | undefined }[] {
    return [
      { object: this.boxes.mesh, idOf: (i) => (i == null ? undefined : this.boxes.ids[i]) },
      { object: this.cyls.mesh, idOf: (i) => (i == null ? undefined : this.cyls.ids[i]) },
      { object: this.blobs.mesh, idOf: (i) => (i == null ? undefined : this.blobs.ids[i]) },
      { object: this.trees.pickMesh, idOf: (i) => (i == null ? undefined : this.trees.ids[i]) },
    ];
  }

  setLayout(
    layout: ParkLayout,
    map: ParkMapping,
    opts: { themes: { frame: ThemeId; front: ThemeId; back: ThemeId }; overhangMask?: { mask: Uint8Array; nx: number; ny: number } | null; grid: boolean },
  ) {
    this.layout = layout;
    this.map = map;
    for (const g of [this.surfaces, this.overlays]) {
      disposeTree(g);
      g.clear();
    }
    // surfaces
    const L = layout.lengthFt;
    const Wd = layout.widthFt;
    layout.surfaces.forEach((s, i) => {
      const pts = s.polygon.map((p) => map.toLocal(p as Vec2));
      const shape = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
      const g = new THREE.ShapeGeometry(shape);
      g.rotateX(-Math.PI / 2);
      const mesh = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: surfaceColor(s), side: THREE.DoubleSide }));
      mesh.position.y = 0.08 + (i % 3) * 0.004;
      mesh.receiveShadow = true;
      this.surfaces.add(mesh);
    });
    // piece outlines in theme colours (the paper pieces' coloured borders)
    const corners = (x0: number, y0: number, x1: number, y1: number) =>
      ([
        [x0, y0],
        [x1, y0],
        [x1, y1],
        [x0, y1],
      ] as Vec2[]).map(map.toLocal);
    this.overlays.add(ribbon(corners(0.25, 0.25, L - 0.25, Wd - 0.25), 0.5, 0.2, new THREE.Color(THEMES[opts.themes.frame].frame).getHex()));
    for (const piece of ['front', 'back'] as const) {
      const ss = layout.surfaces.filter((s) => s.id.startsWith(piece));
      if (!ss.length) continue;
      const xs = ss.flatMap((s) => s.polygon.map((p) => p[0]));
      const ys = ss.flatMap((s) => s.polygon.map((p) => p[1]));
      this.overlays.add(
        ribbon(
          corners(Math.min(...xs) + 0.15, Math.min(...ys) + 0.15, Math.max(...xs) - 0.15, Math.max(...ys) - 0.15),
          0.3,
          0.21,
          new THREE.Color(THEMES[opts.themes[piece]].frame).getHex(),
        ),
      );
    }
    // 1-ft / 4-ft grid like the workbook's grid paper
    if (opts.grid) {
      const pos: number[] = [];
      const pos4: number[] = [];
      const line = (a: Vec2, b: Vec2, arr: number[]) => {
        const p = map.toLocal(a);
        const q = map.toLocal(b);
        arr.push(p[0], 0.18, -p[1], q[0], 0.18, -q[1]);
      };
      for (let x = 0; x <= L + 1e-6; x++) line([x, 0], [x, Wd], x % 4 === 0 ? pos4 : pos);
      for (let y = 0; y <= Wd + 1e-6; y++) line([0, y], [L, y], y % 4 === 0 ? pos4 : pos);
      const g1 = new THREE.BufferGeometry();
      g1.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      const g4 = new THREE.BufferGeometry();
      g4.setAttribute('position', new THREE.Float32BufferAttribute(pos4, 3));
      this.overlays.add(new THREE.LineSegments(g1, new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.08 })));
      this.overlays.add(new THREE.LineSegments(g4, new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22 })));
    }
    // where the park sticks out past the lot line
    const oh = opts.overhangMask;
    if (oh && oh.mask.some(Boolean)) {
      const tex = cellTexture(oh.nx, oh.ny, (i, j) => (oh.mask[j * oh.nx + i] ? 'rgba(208,52,44,0.55)' : null));
      const q = quad(
        [map.toLocal([0, 0]), map.toLocal([oh.nx, 0]), map.toLocal([oh.nx, oh.ny]), map.toLocal([0, oh.ny])],
        0.3,
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide }),
      );
      q.renderOrder = 3;
      this.overlays.add(q);
    }
  }

  setItems(items: LayoutItem[], hl: ParkHighlight, themes: { frame: ThemeId; front: ThemeId; back: ThemeId }) {
    const map = this.map;
    if (!map) return;
    this.boxes.begin();
    this.cyls.begin();
    this.blobs.begin();
    const trees: { id: string; x: number; y: number; heightFt: number; crownR: number; color: number }[] = [];
    disposeTree(this.selection);
    this.selection.clear();
    const up = new THREE.Vector3();
    for (const it0 of items) {
      const it = hl.dragging && hl.dragging.id === it0.id ? { ...it0, ...hl.dragging } : it0;
      const e = catalogEntry(it.element);
      const r = (it.rotationDeg * Math.PI) / 180;
      const xd = map.dirToLocal([Math.cos(r), Math.sin(r)]);
      const yd = map.dirToLocal([-Math.sin(r), Math.cos(r)]);
      const c = map.toLocal([it.x, it.y]);
      const yaw = Math.atan2(xd[1], xd[0]);
      const sel = hl.selected === it.id;
      const over = hl.overhang?.has(it.id);
      const tint = (col: string) => (sel ? mix(col, '#00a8e8', 0.55) : over ? mix(col, '#d0342c', 0.55) : col);
      const at = (ox: number, oy: number, z: number) => W(c[0] + ox * xd[0] + oy * yd[0], c[1] + ox * xd[1] + oy * yd[1], z);
      const theme = it.theme ?? themes.back;
      switch (e.shape) {
        case 'tree-small':
        case 'tree-large':
          trees.push({ id: it.id, x: c[0], y: c[1], heightFt: it.heightFt ?? e.heightFt, crownR: (it.w || e.w) / 2, color: new THREE.Color(tint(e.color)).getHex() });
          break;
        case 'shrub': {
          const rr = (it.w || e.w) / 2;
          this.blobs.push(it.id, at(0, 0, rr * 0.75), yaw, up.set(rr, rr * 0.8, rr), tint(e.color));
          break;
        }
        case 'barrel':
          this.cyls.push(it.id, at(0, 0, 0), yaw, up.set(Math.min(it.w, it.h), it.heightFt ?? e.heightFt, Math.min(it.w, it.h)), tint(e.color));
          break;
        case 'post':
          this.cyls.push(it.id, at(0, 0, 0), yaw, up.set(0.3, (it.heightFt ?? e.heightFt) - 0.8, 0.3), tint(e.color));
          this.boxes.push(it.id, at(0, 0, (it.heightFt ?? e.heightFt) - 0.8), yaw, up.set(0.8, 0.8, 0.8), tint(mix(THEMES[theme].front, '#ffffff', 0.2)));
          break;
        default: {
          for (const p of partsFor(it)) this.boxes.push(it.id, at(p.ox, p.oy, p.z), yaw, up.set(p.sx, p.sz, p.sy), tint(p.color));
          if (e.shape === 'square') {
            // perennials in the square, in the theme's flower colour
            const flower = mix(THEMES[theme].front, '#ffffff', 0.15);
            for (const [a, b] of [
              [-1, -1],
              [1, -1],
              [1, 1],
              [-1, 1],
            ]) {
              this.blobs.push(it.id, at((a! * it.w) / 4, (b! * it.h) / 4, 0.7), yaw, up.set(0.75, 0.6, 0.75), tint(a === b ? flower : '#5aa55e'));
            }
          }
        }
      }
      if (sel) {
        const hw = (it.w || e.w) / 2 + 0.4;
        const hh = (it.h || e.h) / 2 + 0.4;
        const ring = ([
          [-hw, -hh],
          [hw, -hh],
          [hw, hh],
          [-hw, hh],
        ] as Vec2[]).map(([a, b]) => [c[0] + a * xd[0] + b * yd[0], c[1] + a * xd[1] + b * yd[1]] as Vec2);
        const rb = ribbon(ring, 0.35, 0.5, COLORS.select);
        rb.renderOrder = 4;
        this.selection.add(rb);
      }
    }
    this.boxes.end();
    this.cyls.end();
    this.blobs.end();
    this.trees.set(trees);
  }

  dispose() {
    disposeTree(this.surfaces);
    disposeTree(this.overlays);
    disposeTree(this.selection);
    this.boxes.dispose();
    this.cyls.dispose();
    this.blobs.dispose();
    this.trees.dispose();
  }
}
