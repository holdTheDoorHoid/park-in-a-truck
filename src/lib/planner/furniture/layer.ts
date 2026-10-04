// Drawing furniture cheaply: every copy of a shape shares one geometry and one material
// through an InstancedMesh, so a park full of benches is a handful of draw calls. Shapes
// are built once and cached; a layer is refilled (matrices and colours only) whenever
// the items change.
//
// Frames: the item frame is feet, x along the item, y across it, z up (see
// procedural.ts). Three.js-local is (x, up, -y); an item's world matrix is
// translate(base on the ground) · turn about the vertical.

import * as THREE from 'three';
import type { Prim, PrimPart } from './procedural';
import { gabionTexture, stoneBoxGeometry } from './stone';

// ---- shared geometries (three.js axes, unit size, origin at the base centre) -------

function wedgeGeometry(): THREE.BufferGeometry {
  // a gable: triangle across the item (three z), running along x
  const a = [-0.5, 0, 0.5];
  const b = [-0.5, 0, -0.5];
  const t = [-0.5, 1, 0];
  const A = [0.5, 0, 0.5];
  const B = [0.5, 0, -0.5];
  const T = [0.5, 1, 0];
  const tris = [a, t, b, A, B, T, a, A, T, a, T, t, b, t, T, b, T, B, a, b, B, a, B, A];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(tris.flat(), 3));
  g.computeVertexNormals();
  return g;
}

let prims: Record<Prim, THREE.BufferGeometry> | null = null;
export function primGeometry(p: Prim): THREE.BufferGeometry {
  prims ??= {
    box: new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0),
    cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 14).translate(0, 0.5, 0),
    cone: new THREE.CylinderGeometry(0, 0.5, 1, 14).translate(0, 0.5, 0),
    ball: new THREE.IcosahedronGeometry(0.5, 1).translate(0, 0.5, 0),
    wedge: wedgeGeometry(),
    pyramid: new THREE.CylinderGeometry(0, Math.SQRT1_2, 1, 4).rotateY(Math.PI / 4).translate(0, 0.5, 0),
  };
  return prims[p];
}

// ---- shared materials (instance colour carries each copy's colour) -------------------

const mats = new Map<string, THREE.Material>();
export function material(kind: 'plain' | 'leaf' | 'glass' | 'stone' | 'stone-plain' | 'model'): THREE.Material {
  let m = mats.get(kind);
  if (m) return m;
  switch (kind) {
    case 'leaf':
      m = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true });
      break;
    case 'glass':
      m = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide });
      break;
    case 'stone': {
      const t = gabionTexture();
      m = new THREE.MeshLambertMaterial({ color: 0xffffff, ...(t ? { map: t } : {}) });
      break;
    }
    case 'stone-plain':
      m = new THREE.MeshLambertMaterial({ color: 0x9a9792 });
      break;
    case 'model':
      m = new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: true });
      break;
    default:
      m = new THREE.MeshLambertMaterial({ color: 0xffffff });
  }
  mats.set(kind, m);
  return m;
}

// ---- the item frame --------------------------------------------------------------

/** item frame (x, y, up) → three.js-local (x, up, -y) */
const B = new THREE.Matrix4().makeBasis(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 1, 0));
const Binv = B.clone().transpose();
const _e = new THREE.Euler();
const _q = new THREE.Quaternion();
const _v = new THREE.Vector3();
const _s = new THREE.Vector3();
const _m = new THREE.Matrix4();

/** A primitive part's matrix in three.js-local item coordinates. */
export function partMatrix(p: PrimPart, out = new THREE.Matrix4()): THREE.Matrix4 {
  // in the item frame: translate(at) · rotate(x, then y, then up) · scale(size)
  _e.set(p.rot?.[0] ?? 0, p.rot?.[1] ?? 0, p.rot?.[2] ?? 0, 'ZYX');
  _q.setFromEuler(_e);
  out.compose(_v.set(p.at[0], p.at[1], p.at[2]), _q, _s.set(p.size[0], p.size[1], p.size[2]));
  // the unit geometry is in three.js axes: take it to the item frame and back
  return out.premultiply(B).multiply(Binv);
}

/** World matrix of an item's frame: on the ground at `base` feet, turned by `yaw` (radians, from east). */
export function itemMatrix(e: number, n: number, base: number, yaw: number, out = new THREE.Matrix4()): THREE.Matrix4 {
  _q.setFromAxisAngle(_v.set(0, 1, 0), yaw);
  return out.compose(_s.set(e, base, -n), _q, _v.set(1, 1, 1));
}

// ---- batches -----------------------------------------------------------------------

export class Batch {
  mesh: THREE.InstancedMesh;
  ids: string[] = [];
  private n = 0;
  private c = new THREE.Color();
  constructor(
    readonly geo: THREE.BufferGeometry,
    readonly mat: THREE.Material,
    private cap: number,
    private shadows: boolean,
    private ownsGeometry: boolean,
  ) {
    this.mesh = this.make(cap);
  }
  private make(cap: number) {
    const m = new THREE.InstancedMesh(this.geo, this.mat, cap);
    m.castShadow = this.shadows;
    m.receiveShadow = true;
    m.count = 0;
    m.frustumCulled = false;
    // the plain blocks underneath are what the mouse picks
    m.raycast = () => {};
    return m;
  }
  setShadows(on: boolean) {
    this.shadows = on;
    this.mesh.castShadow = on;
  }
  begin() {
    this.n = 0;
    this.ids = [];
  }
  push(id: string, m: THREE.Matrix4, color: THREE.Color) {
    if (this.n >= this.cap) {
      const parent = this.mesh.parent;
      const old = this.mesh;
      this.cap *= 2;
      this.mesh = this.make(this.cap);
      for (let i = 0; i < this.n; i++) {
        old.getMatrixAt(i, _m);
        this.mesh.setMatrixAt(i, _m);
        old.getColorAt(i, this.c);
        this.mesh.setColorAt(i, this.c);
      }
      parent?.remove(old);
      parent?.add(this.mesh);
      old.dispose();
    }
    this.mesh.setMatrixAt(this.n, m);
    this.mesh.setColorAt(this.n, color);
    this.ids.push(id);
    this.n++;
  }
  end() {
    this.mesh.count = this.n;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    this.mesh.visible = this.n > 0;
  }
  get count() {
    return this.n;
  }
  dispose() {
    this.mesh.parent?.remove(this.mesh);
    this.mesh.dispose();
    if (this.ownsGeometry) this.geo.dispose();
  }
}

/** A set of batches keyed by shape + material, refilled as a whole. */
export class FurnitureLayer {
  readonly group = new THREE.Group();
  private batches = new Map<string, Batch>();
  private shadows = true;
  private tmp = new THREE.Matrix4();
  private col = new THREE.Color();

  constructor(name: string) {
    this.group.name = name;
  }

  /** furniture casts shadows (off at low detail) */
  setShadows(on: boolean) {
    this.shadows = on;
    for (const b of this.batches.values()) b.setShadows(on);
  }

  batch(key: string, make: () => { geo: THREE.BufferGeometry; mat: THREE.Material; owns: boolean }): Batch {
    let b = this.batches.get(key);
    if (!b) {
      const { geo, mat, owns } = make();
      b = new Batch(geo, mat, 16, this.shadows, owns);
      this.batches.set(key, b);
      this.group.add(b.mesh);
    }
    return b;
  }

  begin() {
    for (const b of this.batches.values()) b.begin();
  }

  end() {
    for (const b of this.batches.values()) b.end();
  }

  /** one primitive part of an item */
  prim(id: string, item: THREE.Matrix4, p: PrimPart, color: string) {
    if (p.mat === 'stone') {
      // a textured box gets a geometry of its own size so the stones keep their scale
      const [x, y, z] = p.size.map((v) => Math.round(v * 20) / 20) as [number, number, number];
      const b = this.batch(`stone:${x}:${y}:${z}`, () => ({ geo: stoneBoxGeometry(x, z, y), mat: material(gabionTexture() ? 'stone' : 'stone-plain'), owns: true }));
      partMatrix({ ...p, size: [1, 1, 1] }, this.tmp).premultiply(item);
      b.push(id, this.tmp, this.col.set(color));
      return;
    }
    const kind = p.mat === 'glass' ? 'glass' : p.prim === 'ball' ? 'leaf' : 'plain';
    const b = this.batch(`${p.prim}:${kind}`, () => ({ geo: primGeometry(p.prim), mat: material(kind), owns: false }));
    partMatrix(p, this.tmp).premultiply(item);
    b.push(id, this.tmp, this.col.set(color));
  }

  /** a shape with its own geometry (a model module, a basket), placed by `m` */
  shape(id: string, key: string, make: () => { geo: THREE.BufferGeometry; mat: THREE.Material; owns: boolean }, m: THREE.Matrix4, color: THREE.Color) {
    this.batch(key, make).push(id, m, color);
  }

  /** draw calls in use (for checks) */
  get drawCalls(): number {
    let n = 0;
    for (const b of this.batches.values()) if (b.count) n++;
    return n;
  }

  dispose() {
    for (const b of this.batches.values()) b.dispose();
    this.batches.clear();
  }
}
