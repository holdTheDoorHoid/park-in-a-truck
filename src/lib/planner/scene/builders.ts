// Mesh builders for the planner scene. Local feet (x = east, y = north) map to
// Three.js world as (x, up, -y) — see W().

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { aerialTileUrl } from '../../mapstyle';
import { lngLatToTile, tileToLngLat, type LocalFrame, type Vec2 } from '../geo';
import type { Prism } from '../sunhours';
import type { LocalTree } from '../localsite';
import type { GroundFn } from '../ground';
import { skirtGeometry, terrainGeometry } from './terrain';

export const W = (e: number, n: number, up = 0) => new THREE.Vector3(e, up, -n);

export const COLORS = {
  sky: 0xeaf3f7,
  ground: 0xe6e3dc,
  building: 0xf1eee8,
  buildingEdge: 0x8f8f8f,
  parcel: 0x00a8e8,
  trunk: 0x6b5340,
  crown: 0x4c9a55,
  crownCity: 0x5f9e63,
  select: 0x00a8e8,
  overhang: 0xd0342c,
};

// ---- buildings --------------------------------------------------------------

export function buildBuildings(prisms: Prism[]): THREE.Group {
  const group = new THREE.Group();
  group.name = 'buildings';
  const geos: THREE.BufferGeometry[] = [];
  for (const b of prisms) {
    if (b.ring.length < 3) continue;
    const shape = new THREE.Shape(b.ring.map(([x, y]) => new THREE.Vector2(x, y)));
    const g = new THREE.ExtrudeGeometry(shape, { depth: b.heightFt, bevelEnabled: false, curveSegments: 1 });
    g.rotateX(-Math.PI / 2); // (x, y, z) -> (x, z, -y): extrusion goes up, y -> -z (north)
    // terrain: stands on the ground under it (Prism.baseFt; roof at baseFt + heightFt)
    if (b.baseFt) g.translate(0, b.baseFt, 0);
    geos.push(g.index ? g.toNonIndexed() : g);
  }
  if (!geos.length) return group;
  const merged = mergeGeometries(geos, false)!;
  geos.forEach((g) => g.dispose());
  merged.computeVertexNormals();
  const mesh = new THREE.Mesh(merged, new THREE.MeshLambertMaterial({ color: COLORS.building }));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(merged, 30),
    new THREE.LineBasicMaterial({ color: COLORS.buildingEdge, transparent: true, opacity: 0.45 }),
  );
  group.add(edges);
  return group;
}

// ---- trees (instanced trunk + low-poly crown) ------------------------------------

const trunkGeo = new THREE.CylinderGeometry(0.5, 0.6, 1, 6).translate(0, 0.5, 0);
const crownGeo = new THREE.IcosahedronGeometry(1, 1);

export interface TreeSpec {
  x: number;
  y: number;
  heightFt: number;
  crownR: number;
  color?: number;
  /** ground under the trunk, ft above the lot's datum (terrain; default 0) */
  baseFt?: number;
}

export class TreeInstances {
  readonly group = new THREE.Group();
  private trunks: THREE.InstancedMesh;
  private crowns: THREE.InstancedMesh;
  ids: string[] = [];

  constructor(capacity: number, crownMaterial?: THREE.Material) {
    this.trunks = new THREE.InstancedMesh(trunkGeo, new THREE.MeshLambertMaterial({ color: COLORS.trunk }), Math.max(1, capacity));
    this.crowns = new THREE.InstancedMesh(
      crownGeo,
      crownMaterial ?? new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }),
      Math.max(1, capacity),
    );
    for (const m of [this.trunks, this.crowns]) {
      m.castShadow = true;
      m.receiveShadow = true;
      m.count = 0;
      m.frustumCulled = false;
      this.group.add(m);
    }
  }

  get pickMesh() {
    return this.crowns;
  }

  set(trees: (TreeSpec & { id?: string })[]) {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const c = new THREE.Color();
    const n = Math.min(trees.length, this.crowns.instanceMatrix.count);
    this.ids = [];
    for (let i = 0; i < n; i++) {
      const t = trees[i]!;
      const r = Math.max(0.6, t.crownR);
      const cz = Math.max(r * 0.8 + 1.5, t.heightFt - r * 0.9);
      const trunkH = Math.max(1.2, cz - r * 0.4);
      const tw = Math.max(0.35, Math.min(1.6, r * 0.08));
      const z0 = t.baseFt ?? 0; // terrain: the trunk stands on the ground
      m.compose(W(t.x, t.y, z0), q, new THREE.Vector3(tw, trunkH, tw));
      this.trunks.setMatrixAt(i, m);
      m.compose(W(t.x, t.y, z0 + cz), q, new THREE.Vector3(r, r * 0.85, r));
      this.crowns.setMatrixAt(i, m);
      this.crowns.setColorAt(i, c.set(t.color ?? COLORS.crown));
      this.ids.push(t.id ?? '');
    }
    this.trunks.count = n;
    this.crowns.count = n;
    this.trunks.instanceMatrix.needsUpdate = true;
    this.crowns.instanceMatrix.needsUpdate = true;
    if (this.crowns.instanceColor) this.crowns.instanceColor.needsUpdate = true;
    for (const m of [this.trunks, this.crowns]) {
      m.computeBoundingSphere();
      m.computeBoundingBox();
    }
  }

  dispose() {
    this.trunks.dispose();
    this.crowns.dispose();
  }
}

export function cityTreeSpecs(trees: LocalTree[]): TreeSpec[] {
  return trees.filter((t) => !t.onLot).map((t) => ({ x: t.x, y: t.y, heightFt: t.heightFt, crownR: t.crownR, color: COLORS.crownCity, ...(t.baseFt ? { baseFt: t.baseFt } : {}) }));
}

// ---- aerial ground (City 3-inch imagery stitched onto one canvas) -----------------

export interface AerialGround {
  mesh: THREE.Mesh;
  /** lowest ground along the edge of the photo (the plain ground beyond sits here) */
  edgeMin: number;
  /** the photo, or plain ground (the ground keeps its shape either way) */
  setPhoto(on: boolean): void;
  /** plan view: a light veil over the photo so the park pieces read clearly */
  setVeil(on: boolean): void;
  dispose: () => void;
}

export function buildAerial(
  lf: LocalFrame,
  extentFt: number,
  zoom: number,
  onUpdate: () => void,
  /** terrain: the ground surface follows it (absent = flat) */
  ground?: GroundFn,
): AerialGround {
  const sw = lf.toLngLat([-extentFt, -extentFt]);
  const ne = lf.toLngLat([extentFt, extentFt]);
  const [tx0f, ty0f] = lngLatToTile(sw[0], ne[1], zoom);
  const [tx1f, ty1f] = lngLatToTile(ne[0], sw[1], zoom);
  const tx0 = Math.floor(tx0f);
  const ty0 = Math.floor(ty0f);
  const tx1 = Math.floor(tx1f);
  const ty1 = Math.floor(ty1f);
  const nx = tx1 - tx0 + 1;
  const ny = ty1 - ty0 + 1;
  const canvas = document.createElement('canvas');
  canvas.width = nx * 256;
  canvas.height = ny * 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#dcd9d2';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const west = tileToLngLat(tx0, ty0, zoom);
  const east = tileToLngLat(tx1 + 1, ty1 + 1, zoom);
  const [x0, y1] = lf.toLocal([west[0], west[1]]);
  const [x1, y0] = lf.toLocal([east[0], east[1]]);
  let geo: THREE.BufferGeometry;
  let edgeMin = 0;
  let skirt: THREE.Mesh | null = null;
  // a little brighter than the photo so cast shadows read clearly against it
  const mat = new THREE.MeshLambertMaterial({ map: tex, color: new THREE.Color(1.35, 1.35, 1.35) });
  const plain = new THREE.MeshLambertMaterial({ color: COLORS.ground });
  if (ground) {
    // terrain: a grid lifted onto the ground, about one vertex per lidar cell
    const t = terrainGeometry(x0, x1, y0, y1, ground);
    geo = t.geo;
    edgeMin = t.edgeMin;
    skirt = new THREE.Mesh(skirtGeometry(x0, x1, y0, y1, ground, edgeMin - 0.12), plain);
    skirt.receiveShadow = true;
  } else {
    geo = new THREE.PlaneGeometry(x1 - x0, y1 - y0);
    geo.rotateX(-Math.PI / 2);
    geo.translate((x0 + x1) / 2, 0, -(y0 + y1) / 2);
  }
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.name = 'aerial';
  if (skirt) mesh.add(skirt);
  const veilMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.2, depthWrite: false });
  const veil = new THREE.Mesh(geo, veilMat);
  veil.position.y = 0.04;
  veil.renderOrder = 1;
  veil.visible = false;
  mesh.add(veil);
  let photo = true;
  let veilOn = false;
  let alive = true;
  let pending = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const flushTex = () => {
    timer = undefined;
    tex.needsUpdate = true;
    onUpdate();
  };
  for (let ty = ty0; ty <= ty1; ty++) {
    for (let tx = tx0; tx <= tx1; tx++) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.decoding = 'async';
      pending++;
      img.onload = () => {
        if (!alive) return;
        ctx.drawImage(img, (tx - tx0) * 256, (ty - ty0) * 256);
        if (!timer) timer = setTimeout(flushTex, 120);
      };
      img.onerror = () => {
        pending--;
      };
      img.src = aerialTileUrl(zoom, tx, ty);
    }
  }
  return {
    mesh,
    edgeMin,
    setPhoto(on) {
      photo = on;
      mesh.material = on ? mat : plain;
      veil.visible = photo && veilOn;
    },
    setVeil(on) {
      veilOn = on;
      veil.visible = photo && veilOn;
    },
    dispose: () => {
      alive = false;
      clearTimeout(timer);
      geo.dispose();
      skirt?.geometry.dispose();
      mat.dispose();
      plain.dispose();
      veilMat.dispose();
      tex.dispose();
    },
  };
}

// ---- flat helpers -------------------------------------------------------------

/** A flat ribbon along a closed ring (for the cyan parcel line), width in feet. */
export function ribbon(ring: Vec2[], width: number, up: number, color: number, closed = true): THREE.Mesh {
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
    const nx = (-dy / L) * hw;
    const ny = (dx / L) * hw;
    // extend each segment by hw so corners meet
    const ex = (dx / L) * hw;
    const ey = (dy / L) * hw;
    const p = [
      [a[0] - ex + nx, a[1] - ey + ny],
      [a[0] - ex - nx, a[1] - ey - ny],
      [b[0] + ex - nx, b[1] + ey - ny],
      [b[0] + ex + nx, b[1] + ey + ny],
    ] as Vec2[];
    for (const k of [0, 1, 2, 0, 2, 3]) pos.push(p[k]![0], up, -p[k]![1]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  return new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
}

/** A textured quad whose (u,v) = (0,0)…(1,1) maps to four local corners (handles mirroring). */
export function quad(corners: [Vec2, Vec2, Vec2, Vec2], up: number, material: THREE.Material): THREE.Mesh {
  // corners: (0,0), (1,0), (1,1), (0,1) in texture space
  const pos = corners.flatMap(([x, y]) => [x, up, -y]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  return new THREE.Mesh(g, material);
}

/** Canvas texture of nx × ny cells, filled by a colour function (null = clear). Texture row 0 = grid row 0. */
export function cellTexture(nx: number, ny: number, fill: (i: number, j: number) => string | null): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = nx;
  c.height = ny;
  const ctx = c.getContext('2d')!;
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const col = fill(i, j);
      if (!col) continue;
      ctx.fillStyle = col;
      // canvas y grows downward; texture v=0 is the bottom row after flipY → draw row j at ny-1-j
      ctx.fillRect(i, ny - 1 - j, 1, 1);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.LinearFilter;
  t.generateMipmaps = false;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function disposeTree(o: THREE.Object3D) {
  o.traverse((c) => {
    const m = c as THREE.Mesh;
    if (m.geometry && m.geometry !== trunkGeo && m.geometry !== crownGeo) m.geometry.dispose();
    const mat = m.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
    else if (mat) {
      (mat as THREE.MeshBasicMaterial).map?.dispose();
      mat.dispose();
    }
  });
}
