// The park layout as low-poly, instanced meshes: surfaces as flat shapes, items as a
// handful of InstancedMeshes (boxes, cylinders, blobs, trees) so a whole park is a few
// draw calls.
//
// 3D view (furniture agent, 2026-10-04): items are drawn as the real thing — PiaT's
// build-guide models repeated in modules, gabion baskets, simple shapes for the rest —
// see ../furniture/. The plain blocks stay underneath, invisible, as what the mouse
// picks. Plan view keeps the blocks (the flat paper-pieces look). Items stand on the
// lowest ground under them and surfaces follow groundOf(site).

import * as THREE from 'three';
import type { LayoutItem, LayoutSurface, Material, ParkLayout, ThemeId } from '../../types';
import { THEMES } from '../../../data/themes';
import { ELEMENTS } from '../../../data/elements';
import { catalogEntry, type CatalogEntry } from '../catalog';
import type { Vec2 } from '../geo';
import { FLAT_GROUND, type GroundFn } from '../ground';
import { TreeInstances, W, quad, cellTexture, ribbon, disposeTree } from './builders';
import type { Footprint } from './overlays';
import { furnitureRule, moduleOf, stageSquareModule, type ModelRule } from '../furniture/rules';
import { bandAsWall, chooseFit, flatOver, lowestGround, wallBaskets } from '../furniture/fit';
import { WOOD, proceduralParts } from '../furniture/procedural';
import { FurnitureLayer, itemMatrix, material } from '../furniture/layer';
import { dropProtos, modelNow, modelProto, whenLoaded } from '../furniture/protos';
import { FrameWatch, initialQuality, lower, pinnedQuality } from '../furniture/quality';
import type { Quality } from '../furniture/modelparts';
import { drapedLines, drapedQuad, drapedRibbon, drapedShape, needsDrape } from '../furniture/drape';
import { gabionTexture, stoneBoxGeometry } from '../furniture/stone';
import { plantedCrownR } from '../treemodel';

export interface ParkMapping {
  toLocal: (p: Vec2) => Vec2;
  dirToLocal: (d: Vec2) => Vec2;
  /** local feet -> park feet (the inverse of toLocal) */
  toPark: (p: Vec2) => Vec2;
}

/** An item's footprint on the ground in local feet (for the selection and drag overlays). */
export function itemFootprint(it: LayoutItem, map: ParkMapping): Footprint {
  const e = catalogEntry(it.element);
  const r = (it.rotationDeg * Math.PI) / 180;
  const round = e.shape === 'tree-small' || e.shape === 'tree-large' || e.shape === 'shrub' || e.shape === 'barrel' || it.variant === 'round';
  return {
    c: map.toLocal([it.x, it.y]),
    xd: map.dirToLocal([Math.cos(r), Math.sin(r)]),
    yd: map.dirToLocal([-Math.sin(r), Math.cos(r)]),
    hw: (it.w || e.w) / 2,
    hh: (it.h || e.h) / 2,
    round,
  };
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
    private shadows = true,
  ) {
    this.mesh = this.make(cap);
  }
  private make(cap: number) {
    const m = new THREE.InstancedMesh(this.geo, this.mat, cap);
    m.castShadow = this.shadows;
    m.receiveShadow = this.shadows;
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
  hover?: string | null;
  overhang?: Set<string>;
  dragging?: { id: string; x: number; y: number; rotationDeg: number; over?: boolean } | null;
}

/** invisible stand-ins: what the mouse picks when an item is drawn as real furniture */
const pickOnly = new THREE.MeshBasicMaterial({ visible: false });

type Family = { boxes: Instances; cyls: Instances; blobs: Instances };

interface LayoutArgs {
  layout: ParkLayout;
  map: ParkMapping;
  opts: {
    themes: { frame: ThemeId; front: ThemeId; back: ThemeId };
    overhangMask?: { mask: Uint8Array; nx: number; ny: number } | null;
    grid: boolean;
    /** ground heights (local feet → feet above the lot's datum); flat when absent */
    ground?: GroundFn;
  };
}

const coarse = () => typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;

function startQuality(): { q: Quality; pinned: boolean } {
  try {
    const pin = typeof location !== 'undefined' ? pinnedQuality(location.search) : null;
    if (pin) return { q: pin, pinned: true };
    const nav = typeof navigator !== 'undefined' ? (navigator as Navigator & { deviceMemory?: number }) : undefined;
    return { q: initialQuality({ coarsePointer: coarse(), memoryGb: nav?.deviceMemory, cores: nav?.hardwareConcurrency }), pinned: false };
  } catch {
    return { q: 'high', pinned: false };
  }
}

export class ParkMeshes {
  readonly group = new THREE.Group();
  private surfaces = new THREE.Group();
  private overlays = new THREE.Group();
  private boxes = new Instances(unitBox, new THREE.MeshLambertMaterial({ color: 0xffffff }), 128);
  private cyls = new Instances(unitCyl, new THREE.MeshLambertMaterial({ color: 0xffffff }), 32);
  private blobs = new Instances(unitBlob, new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }), 256);
  private trees = new TreeInstances(64);
  // the same blocks, never drawn, for items shown as real furniture
  private pick: Family = { boxes: new Instances(unitBox, pickOnly, 128, false), cyls: new Instances(unitCyl, pickOnly, 32, false), blobs: new Instances(unitBlob, pickOnly, 64, false) };
  private furniture = new FurnitureLayer('furniture');
  private walls = new FurnitureLayer('gabion-walls');
  private layout: ParkLayout | null = null;
  private map: ParkMapping | null = null;
  private ground: GroundFn = FLAT_GROUND;
  private mode: '3d' | 'plan' = '3d';
  private quality: Quality;
  private pinned: boolean;
  private watch = new FrameWatch();
  private waiting = new Set<string>();
  private last: LayoutArgs | null = null;
  /** furniture finished loading or changed detail: the scene redraws the items */
  onChange?: () => void;

  constructor() {
    this.group.name = 'park';
    const sq = startQuality();
    this.quality = sq.q;
    this.pinned = sq.pinned;
    this.furniture.setShadows(this.quality === 'high');
    this.walls.setShadows(this.quality === 'high');
    this.group.add(
      this.surfaces,
      this.overlays,
      this.boxes.mesh,
      this.cyls.mesh,
      this.blobs.mesh,
      this.trees.group,
      this.pick.boxes.mesh,
      this.pick.cyls.mesh,
      this.pick.blobs.mesh,
      this.furniture.group,
      this.walls.group,
    );
  }

  /** meshes that can be clicked, and how to turn a hit into an item id */
  pickables(): { object: THREE.Object3D; idOf: (instanceId?: number) => string | undefined; soft?: boolean }[] {
    const of = (x: Instances) => ({ object: x.mesh, idOf: (i?: number) => (i == null ? undefined : x.ids[i]) });
    return [
      of(this.boxes),
      of(this.cyls),
      of(this.blobs),
      of(this.pick.boxes),
      of(this.pick.cyls),
      of(this.pick.blobs),
      // a tree's crown is big and airy: things standing under it can be picked through it
      { object: this.trees.pickMesh, idOf: (i) => (i == null ? undefined : this.trees.ids[i]), soft: true },
    ];
  }

  /** 3D view draws real furniture; plan view keeps the flat paper-pieces look. */
  setMode(mode: '3d' | 'plan') {
    if (mode === this.mode) return;
    this.mode = mode;
    if (this.last) this.setLayout(this.last.layout, this.last.map, this.last.opts);
  }

  /** current detail level of the 3D furniture */
  get detail(): Quality {
    return this.quality;
  }

  /** Change the detail level (`pin` = keep it, no automatic stepping down). */
  setQuality(q: Quality, pin = false) {
    if (pin) this.pinned = true;
    if (q === this.quality) return;
    this.quality = q;
    this.furniture.dispose();
    this.walls.dispose();
    dropProtos(q);
    this.furniture.setShadows(q === 'high');
    this.walls.setShadows(q === 'high');
    if (this.last) this.setLayout(this.last.layout, this.last.map, this.last.opts);
    this.onChange?.();
  }

  /** The scene drew a frame (`continuous` = it drew the previous display frame too). */
  frameDrawn(now: number, continuous: boolean) {
    if (this.pinned || this.mode !== '3d' || this.quality === 'blocks' || !this.group.visible || !this.layout) return;
    if (this.watch.note(now, continuous)) this.setQuality(lower(this.quality));
  }

  /** draw calls the furniture uses (for checks) */
  get furnitureDrawCalls(): number {
    return this.furniture.drawCalls + this.walls.drawCalls;
  }

  private get real(): boolean {
    return this.mode === '3d' && this.quality !== 'blocks';
  }

  setLayout(layout: ParkLayout, map: ParkMapping, opts: LayoutArgs['opts']) {
    this.last = { layout, map, opts };
    this.layout = layout;
    this.map = map;
    for (const g of [this.surfaces, this.overlays]) {
      disposeTree(g);
      g.clear();
    }
    const L = layout.lengthFt;
    const Wd = layout.widthFt;
    // a flat lot (or no ground data) is drawn exactly as before
    const corners4 = ([[0, 0], [L, 0], [L, Wd], [0, Wd]] as Vec2[]).map(map.toLocal);
    this.ground = opts.ground && needsDrape(opts.ground) && !groundFlat(opts.ground, corners4) ? opts.ground : FLAT_GROUND;
    const ground = needsDrape(this.ground) ? this.ground : null;
    // planted trees use the shared tree drawing, which stands them on the ground itself
    this.trees.setGround(ground);
    // surfaces
    layout.surfaces.forEach((s, i) => {
      const pts = s.polygon.map((p) => map.toLocal(p as Vec2));
      const up = 0.08 + (i % 3) * 0.004;
      const mat = new THREE.MeshLambertMaterial({ color: surfaceColor(s), side: THREE.DoubleSide });
      let mesh: THREE.Mesh;
      if (ground) mesh = new THREE.Mesh(drapedShape(pts, ground, up), mat);
      else {
        const shape = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
        const g = new THREE.ShapeGeometry(shape);
        g.rotateX(-Math.PI / 2);
        mesh = new THREE.Mesh(g, mat);
        mesh.position.y = up;
      }
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
    const band = (ring: Vec2[], width: number, up: number, color: number) => (ground ? drapedRibbon(ring, width, up, ground, color) : ribbon(ring, width, up, color));
    this.overlays.add(band(corners(0.25, 0.25, L - 0.25, Wd - 0.25), 0.5, 0.2, new THREE.Color(THEMES[opts.themes.frame].frame).getHex()));
    for (const piece of ['front', 'back'] as const) {
      const ss = layout.surfaces.filter((s) => s.id.startsWith(piece));
      if (!ss.length) continue;
      const xs = ss.flatMap((s) => s.polygon.map((p) => p[0]));
      const ys = ss.flatMap((s) => s.polygon.map((p) => p[1]));
      this.overlays.add(
        band(
          corners(Math.min(...xs) + 0.15, Math.min(...ys) + 0.15, Math.max(...xs) - 0.15, Math.max(...ys) - 0.15),
          0.3,
          0.21,
          new THREE.Color(THEMES[opts.themes[piece]].frame).getHex(),
        ),
      );
    }
    // 1-ft / 4-ft grid like the workbook's grid paper
    if (opts.grid) {
      const pairs: [Vec2, Vec2][] = [];
      const pairs4: [Vec2, Vec2][] = [];
      for (let x = 0; x <= L + 1e-6; x++) (x % 4 === 0 ? pairs4 : pairs).push([map.toLocal([x, 0]), map.toLocal([x, Wd])]);
      for (let y = 0; y <= Wd + 1e-6; y++) (y % 4 === 0 ? pairs4 : pairs).push([map.toLocal([0, y]), map.toLocal([L, y])]);
      const lines = (ps: [Vec2, Vec2][]) => {
        if (ground) return drapedLines(ps, 0.18, ground);
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(ps.flatMap(([p, q]) => [p[0], 0.18, -p[1], q[0], 0.18, -q[1]]), 3));
        return g;
      };
      this.overlays.add(new THREE.LineSegments(lines(pairs), new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.08 })));
      this.overlays.add(new THREE.LineSegments(lines(pairs4), new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22 })));
    }
    // where the park sticks out past the lot line
    const oh = opts.overhangMask;
    if (oh && oh.mask.some(Boolean)) {
      const tex = cellTexture(oh.nx, oh.ny, (i, j) => (oh.mask[j * oh.nx + i] ? 'rgba(208,52,44,0.55)' : null));
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide });
      const cs: [Vec2, Vec2, Vec2, Vec2] = [map.toLocal([0, 0]), map.toLocal([oh.nx, 0]), map.toLocal([oh.nx, oh.ny]), map.toLocal([0, oh.ny])];
      const q = ground ? drapedQuad(cs, 0.3, ground, mat) : quad(cs, 0.3, mat);
      q.renderOrder = 3;
      this.overlays.add(q);
    }
    // plan view: the gabion wall reads as a row of 4-ft baskets, not just a grey strip, and
    // lies over the lot line drawn along the same edge (build-lead A4)
    if (this.mode === 'plan') {
      const joints: [Vec2, Vec2][] = [];
      for (const sf of layout.surfaces) {
        if (sf.material !== 'gabion') continue;
        const wall = bandAsWall(sf.polygon as Vec2[]);
        if (!wall) continue;
        const pts = sf.polygon.map((q) => map.toLocal(q as Vec2));
        const bandMat = new THREE.MeshBasicMaterial({ color: 0x8c8c8c, side: THREE.DoubleSide });
        let band: THREE.Mesh;
        if (ground) band = new THREE.Mesh(drapedShape(pts, ground, 0.6), bandMat);
        else {
          const g = new THREE.ShapeGeometry(new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y))));
          g.rotateX(-Math.PI / 2);
          band = new THREE.Mesh(g, bandMat);
          band.position.y = 0.6;
        }
        this.overlays.add(band);
        const across: Vec2 = [-wall.dir[1] * (wall.depthFt / 2), wall.dir[0] * (wall.depthFt / 2)];
        const at = (t: number): Vec2 => [wall.start[0] + wall.dir[0] * t, wall.start[1] + wall.dir[1] * t];
        const ends = [0, ...wallBaskets(wall.lengthFt).map(([s0, len]) => s0 + len)];
        for (const t of ends) {
          const c = at(t);
          joints.push([map.toLocal([c[0] - across[0], c[1] - across[1]]), map.toLocal([c[0] + across[0], c[1] + across[1]])]);
        }
      }
      if (joints.length) {
        const g = ground
          ? drapedLines(joints, 0.64, ground)
          : new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(joints.flatMap(([p, q]) => [p[0], 0.64, -p[1], q[0], 0.64, -q[1]]), 3));
        this.overlays.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0x3d3d3d, transparent: true, opacity: 0.85 })));
      }
    }
    this.buildWalls(layout, map);
  }

  /** gabion bands along the street edges as one course of 12" x 12" x 48" baskets (3D only) */
  private buildWalls(layout: ParkLayout, map: ParkMapping) {
    this.walls.begin();
    if (this.real) {
      const white = new THREE.Color(1, 1, 1);
      for (const s of layout.surfaces) {
        if (s.material !== 'gabion') continue;
        const wall = bandAsWall(s.polygon as Vec2[]);
        if (!wall) continue;
        const dl = map.dirToLocal(wall.dir);
        const yd: Vec2 = [-dl[1], dl[0]];
        const yaw = Math.atan2(dl[1], dl[0]);
        for (const [s0, len] of wallBaskets(wall.lengthFt)) {
          const mid = s0 + len / 2;
          const c = map.toLocal([wall.start[0] + wall.dir[0] * mid, wall.start[1] + wall.dir[1] * mid]);
          const base = lowestGround(this.ground, c, dl, yd, len / 2, wall.depthFt / 2);
          this.basket(this.walls, c, yaw, base, len, wall.depthFt, 1, white);
        }
      }
    }
    this.walls.end();
  }

  /** one gabion basket (feet), long axis along `yaw` */
  private basket(layer: FurnitureLayer, c: Vec2, yaw: number, base: number, len: number, depth: number, height: number, color: THREE.Color) {
    const r = (v: number) => Math.round(v * 20) / 20;
    const [l, d, h] = [r(len), r(depth), r(height)];
    const textured = this.quality === 'high' && Boolean(gabionTexture());
    // baskets sit 0.4" apart so each reads as its own basket
    layer.shape(`basket:${l}:${d}:${h}:${textured}`, () => ({ geo: stoneBoxGeometry(Math.max(0.2, l - 0.04), h, d), mat: material(textured ? 'stone' : 'stone-plain'), owns: true }), itemMatrix(c[0], c[1], base, yaw), color);
  }

  setItems(items: LayoutItem[], hl: ParkHighlight, themes: { frame: ThemeId; front: ThemeId; back: ThemeId }) {
    const map = this.map;
    if (!map) return;
    const vis: Family = { boxes: this.boxes, cyls: this.cyls, blobs: this.blobs };
    for (const x of [this.boxes, this.cyls, this.blobs, this.pick.boxes, this.pick.cyls, this.pick.blobs]) x.begin();
    this.furniture.begin();
    const trees: { id: string; x: number; y: number; heightFt: number; crownR: number; color: number }[] = [];
    const up = new THREE.Vector3();
    for (const it0 of items) {
      const drag = hl.dragging && hl.dragging.id === it0.id ? hl.dragging : null;
      const it = drag ? { ...it0, x: drag.x, y: drag.y, rotationDeg: drag.rotationDeg } : it0;
      const e = catalogEntry(it.element);
      const r = (it.rotationDeg * Math.PI) / 180;
      const xd = map.dirToLocal([Math.cos(r), Math.sin(r)]);
      const yd = map.dirToLocal([-Math.sin(r), Math.cos(r)]);
      const c = map.toLocal([it.x, it.y]);
      const yaw = Math.atan2(xd[1], xd[0]);
      const sel = hl.selected === it.id;
      const hov = !sel && hl.hover === it.id;
      const over = hl.overhang?.has(it.id);
      const tint = (col: string) =>
        drag?.over
          ? mix(col, '#d0342c', 0.55)
          : sel
            ? mix(col, '#00a8e8', 0.5)
            : over
              ? mix(col, '#d0342c', hov ? 0.4 : 0.55)
              : hov
                ? mix(col, '#00a8e8', 0.25)
                : col;
      const theme = it.theme ?? themes.back;
      const hw = (it.w || e.w) / 2;
      const hh = (it.h || e.h) / 2;
      const plant = e.shape === 'shrub';
      // furniture is built level on the lowest ground under it; plants stand where they grow
      const base = plant ? lowestGround(this.ground, c, xd, yd, Math.min(hw, 0.5), Math.min(hh, 0.5)) : lowestGround(this.ground, c, xd, yd, hw, hh);
      const real = this.drawReal(it, e, c, xd, yd, yaw, base, theme, tint);
      const fam = real ? this.pick : vis;
      const at = (ox: number, oy: number, z: number) => W(c[0] + ox * xd[0] + oy * yd[0], c[1] + ox * xd[1] + oy * yd[1], z + base);
      switch (e.shape) {
        case 'tree-small':
        case 'tree-large':
        {
          // the shared tree drawing (City trees look and shade the same); it finds the ground itself.
          // 3D: a believable tree, not a lollipop — the crown spreads two-thirds of the tree's
          // height and starts a third of the way up (crownCenterFt puts its centre at H − r).
          // Plan view keeps the canopy as drawn on the paper pieces. (Planted trees are not in
          // the sun study, so this changes no sun hours.)
          const H = it.heightFt ?? e.heightFt;
          const crownR = plantedCrownR(H, (it.w || e.w) / 2, this.mode);
          trees.push({ id: it.id, x: c[0], y: c[1], heightFt: H, crownR, color: new THREE.Color(tint(e.color)).getHex() });
          break;
        }
        case 'shrub': {
          // drawn as the real plant (3D), it is picked at the plant's size, not the dot's
          const rr = (real ? Math.max(it.w || e.w, ELEMENTS[it.element]?.footprintFt?.[0] ?? 0) : it.w || e.w) / 2;
          fam.blobs.push(it.id, at(0, 0, rr * 0.75), yaw, up.set(rr, rr * 0.8, rr), tint(e.color));
          break;
        }
        case 'barrel':
          fam.cyls.push(it.id, at(0, 0, 0), yaw, up.set(Math.min(it.w, it.h), it.heightFt ?? e.heightFt, Math.min(it.w, it.h)), tint(e.color));
          break;
        case 'post':
          fam.cyls.push(it.id, at(0, 0, 0), yaw, up.set(0.3, (it.heightFt ?? e.heightFt) - 0.8, 0.3), tint(e.color));
          fam.boxes.push(it.id, at(0, 0, (it.heightFt ?? e.heightFt) - 0.8), yaw, up.set(0.8, 0.8, 0.8), tint(mix(THEMES[theme].front, '#ffffff', 0.2)));
          break;
        default: {
          for (const p of partsFor(it)) fam.boxes.push(it.id, at(p.ox, p.oy, p.z), yaw, up.set(p.sx, p.sz, p.sy), tint(p.color));
          if (e.shape === 'square') {
            // perennials in the square, in the theme's flower colour
            const flower = mix(THEMES[theme].front, '#ffffff', 0.15);
            for (const [a, b] of [
              [-1, -1],
              [1, -1],
              [1, 1],
              [-1, 1],
            ]) {
              fam.blobs.push(it.id, at((a! * it.w) / 4, (b! * it.h) / 4, 0.7), yaw, up.set(0.75, 0.6, 0.75), tint(a === b ? flower : '#5aa55e'));
            }
          }
        }
      }
    }
    for (const x of [this.boxes, this.cyls, this.blobs, this.pick.boxes, this.pick.cyls, this.pick.blobs]) x.end();
    this.furniture.end();
    this.trees.set(trees);
  }

  /**
   * Draw an item as the real thing (3D view). False = it keeps its block: plan view,
   * blocks-only detail, a model still loading, or a footprint no module fits.
   */
  private drawReal(it: LayoutItem, e: CatalogEntry, c: Vec2, xd: Vec2, yd: Vec2, yaw: number, base: number, theme: ThemeId, tint: (col: string) => string): boolean {
    if (this.mode !== '3d') return false;
    const rule = furnitureRule(it.element);
    const plant = e.shape === 'shrub';
    // plants are cheap and never blocks; everything else steps down with the detail level
    if (this.quality === 'blocks' && !plant) return false;
    const w = it.w || e.w;
    const h = it.h || e.h;
    switch (rule.kind) {
      case 'model':
        return this.drawModel(rule, w, h, c, xd, yd, yaw, tint);
      case 'gabion': {
        const H = it.heightFt ?? e.heightFt;
        const col = new THREE.Color(tint('#ffffff'));
        for (const [s0, len] of wallBaskets(w)) {
          const ox = -w / 2 + s0 + len / 2;
          const bc: Vec2 = [c[0] + ox * xd[0], c[1] + ox * xd[1]];
          this.basket(this.furniture, bc, yaw, lowestGround(this.ground, bc, xd, yd, len / 2, h / 2), len, h, H, col);
        }
        return true;
      }
      case 'procedural': {
        const t = THEMES[theme];
        const parts = proceduralParts({ id: it.id, element: it.element, w, h, heightFt: it.heightFt, variant: it.variant }, { front: t.front, seat: t.plan.seat, shed: t.plan.shed, base: e.color });
        if (!parts) return false;
        const m = itemMatrix(c[0], c[1], base, yaw);
        for (const p of parts) this.furniture.prim(m, p, tint(p.color));
        return true;
      }
      default:
        return false;
    }
  }

  private drawModel(rule: ModelRule, w: number, h: number, c: Vec2, xd: Vec2, yd: Vec2, yaw: number, tint: (col: string) => string): boolean {
    const model = modelNow(rule.slug);
    if (model === undefined) {
      // first use: draw the block now, the model when its JSON arrives
      if (!this.waiting.has(rule.slug)) {
        this.waiting.add(rule.slug);
        void whenLoaded(rule.slug).then(() => {
          this.waiting.delete(rule.slug);
          this.onChange?.();
        });
      }
      return false;
    }
    if (!model) return false;
    const cands: { variant: 'whole' | 'square'; spec: ReturnType<typeof moduleOf> }[] = [{ variant: 'whole', spec: moduleOf(model, rule) }];
    if (rule.squares) cands.push({ variant: 'square', spec: stageSquareModule(model, rule.squares) });
    const ch = chooseFit(w, h, cands);
    if (!ch) return false;
    const { fit } = ch;
    const proto = modelProto(model, ch.candidate.variant, this.quality, rule.squares);
    // level on the lowest ground under whatever it covers
    const base = lowestGround(this.ground, c, xd, yd, Math.max(w, fit.lengthFt) / 2, Math.max(h, fit.depthFt) / 2);
    const M = itemMatrix(c[0], c[1], base, yaw);
    // boards are vertex-coloured: the instance colour only carries the tint, as a ratio to plain wood
    const wood = new THREE.Color(WOOD);
    const tw = new THREE.Color(tint(WOOD));
    const ratio = new THREE.Color(tw.r / Math.max(1e-4, wood.r), tw.g / Math.max(1e-4, wood.g), tw.b / Math.max(1e-4, wood.b));
    const stoneCol = new THREE.Color(tint('#ffffff'));
    const textured = this.quality === 'high' && Boolean(gabionTexture());
    const m = new THREE.Matrix4();
    const t = new THREE.Matrix4();
    for (const [cx, cy] of fit.centres) {
      m.copy(M).multiply(t.makeTranslation(cx, 0, -cy));
      if (proto.solid) this.furniture.shape(`${proto.key}:solid`, () => ({ geo: proto.solid!, mat: material('model'), owns: false }), m, ratio);
      if (proto.stone) this.furniture.shape(`${proto.key}:stone`, () => ({ geo: proto.stone!, mat: material(textured ? 'stone' : 'stone-plain'), owns: false }), m, stoneCol);
    }
    return true;
  }

  dispose() {
    disposeTree(this.surfaces);
    disposeTree(this.overlays);
    this.boxes.dispose();
    this.cyls.dispose();
    this.blobs.dispose();
    this.pick.boxes.dispose();
    this.pick.cyls.dispose();
    this.pick.blobs.dispose();
    this.trees.dispose();
    this.furniture.dispose();
    this.walls.dispose();
  }
}

/** Is the ground flat (within 0.02 ft) over the park? Sampled on a 4-ft grid inside its corners. */
function groundFlat(ground: GroundFn, corners: Vec2[]): boolean {
  const [a, b, , d] = corners as [Vec2, Vec2, Vec2, Vec2];
  const nu = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 4));
  const nv = Math.max(1, Math.ceil(Math.hypot(d[0] - a[0], d[1] - a[1]) / 4));
  const pts: Vec2[] = [];
  for (let j = 0; j <= nv; j++)
    for (let i = 0; i <= nu; i++)
      pts.push([a[0] + ((b[0] - a[0]) * i) / nu + ((d[0] - a[0]) * j) / nv, a[1] + ((b[1] - a[1]) * i) / nu + ((d[1] - a[1]) * j) / nv]);
  return flatOver(ground, pts);
}
