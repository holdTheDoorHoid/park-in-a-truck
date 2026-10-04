// Mesh builders for the planner scene. Local feet (x = east, y = north) map to
// Three.js world as (x, up, -y) — see W().

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { aerialTileUrl } from '../../mapstyle';
import { lngLatToTile, tileToLngLat, type LocalFrame, type Vec2 } from '../geo';
import { BARE_CROWN_BLOCKING, CROWN_BLOCKING, type Prism } from '../sunhours';
import type { LocalTree } from '../localsite';
import type { GroundFn } from '../ground';
import { skirtGeometry, terrainGeometry } from './terrain';
import { crownCenterFt, treeLook } from '../treemodel';
import type { Xray } from './xray';

export const W = (e: number, n: number, up = 0) => new THREE.Vector3(e, up, -n);

export const COLORS = {
  sky: 0xeaf3f7,
  ground: 0xe6e3dc,
  building: 0xf1eee8,
  buildingEdge: 0x8f8f8f,
  /** taller buildings farther away (far shade) */
  farBuilding: 0xe3e7ec,
  farFootprint: 0xbcb7ab,
  parcel: 0x00a8e8,
  trunk: 0x6b5340,
  crown: 0x4c9a55,
  crownCity: 0x5f9e63,
  select: 0x00a8e8,
  overhang: 0xd0342c,
};

// ---- buildings --------------------------------------------------------------

/** Footprints extruded to their heights, merged (walls reach down to `floorFt` when that is lower than the base). */
function extrudePrisms(prisms: Prism[], floorFt?: number): THREE.BufferGeometry | null {
  const geos: THREE.BufferGeometry[] = [];
  for (const b of prisms) {
    if (b.ring.length < 3) continue;
    const base = b.baseFt ?? 0;
    const bottom = floorFt !== undefined ? Math.min(base, floorFt) : base;
    const shape = new THREE.Shape(b.ring.map(([x, y]) => new THREE.Vector2(x, y)));
    const g = new THREE.ExtrudeGeometry(shape, { depth: base + b.heightFt - bottom, bevelEnabled: false, curveSegments: 1 });
    g.rotateX(-Math.PI / 2); // (x, y, z) -> (x, z, -y): extrusion goes up, y -> -z (north)
    // terrain: stands on the ground under it (Prism.baseFt; roof at baseFt + heightFt)
    if (bottom) g.translate(0, bottom, 0);
    geos.push(g.index ? g.toNonIndexed() : g);
  }
  if (!geos.length) return null;
  const merged = mergeGeometries(geos, false)!;
  geos.forEach((g) => g.dispose());
  merged.computeVertexNormals();
  return merged;
}

/**
 * Neighbouring buildings as one mesh. With `xray`, whatever hides the lot from the camera
 * is drawn as a faint ghost instead (scene/xray.ts); shadows still come from every wall.
 */
export function buildBuildings(prisms: Prism[], xray?: Xray): THREE.Group {
  const group = new THREE.Group();
  group.name = 'buildings';
  const merged = extrudePrisms(prisms);
  if (!merged) return group;
  const solid = new THREE.MeshLambertMaterial({ color: COLORS.building });
  const mesh = new THREE.Mesh(merged, xray ? xray.patch(solid, 'solid') : solid);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  const lineMat = new THREE.LineBasicMaterial({ color: COLORS.buildingEdge, transparent: true, opacity: 0.45 });
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(merged, 30), xray ? xray.patch(lineMat, 'line') : lineMat);
  group.add(edges);
  if (xray) {
    // the see-through part: the same walls, faint, drawn after everything solid
    const ghost = new THREE.Mesh(
      merged,
      xray.patch(new THREE.MeshLambertMaterial({ color: COLORS.building, transparent: true, opacity: 0.2, depthWrite: false }), 'ghost'),
    );
    ghost.renderOrder = 10;
    ghost.name = 'buildings-ghost';
    group.add(ghost);
  }
  return group;
}

/**
 * Taller buildings farther away whose shadow can reach the lot (LocalSite.farBuildings):
 * plainer and a little cooler than the neighbours, mostly off the aerial photo, standing on
 * the plain ground (walls reach down to `floorFt`, its level, so none float). They cast
 * shadows; they don't need to receive any. With `xray`, one that hides the lot is drawn
 * see-through like the neighbours.
 */
export function buildFarBuildings(prisms: Prism[], floorFt: number, xray?: Xray): THREE.Group {
  const group = new THREE.Group();
  group.name = 'far-buildings';
  const merged = extrudePrisms(prisms, floorFt);
  if (!merged) return group;
  const solid = new THREE.MeshLambertMaterial({ color: COLORS.farBuilding });
  const mesh = new THREE.Mesh(merged, xray ? xray.patch(solid, 'solid') : solid);
  mesh.castShadow = true;
  group.add(mesh);
  const lineMat = new THREE.LineBasicMaterial({ color: COLORS.buildingEdge, transparent: true, opacity: 0.3 });
  group.add(new THREE.LineSegments(new THREE.EdgesGeometry(merged, 30), xray ? xray.patch(lineMat, 'line') : lineMat));
  if (xray) {
    const ghost = new THREE.Mesh(
      merged,
      xray.patch(new THREE.MeshLambertMaterial({ color: COLORS.farBuilding, transparent: true, opacity: 0.2, depthWrite: false }), 'ghost'),
    );
    ghost.renderOrder = 10;
    ghost.name = 'far-buildings-ghost';
    group.add(ghost);
  }
  // a darker patch of ground under each one, so they read as standing on the plain ground
  // (beyond the photo the ground is plain and pale, and a bare wall foot looks afloat)
  const pads: THREE.BufferGeometry[] = [];
  for (const b of prisms) {
    if (b.ring.length < 3) continue;
    const c = b.ring.reduce((a, [x, y]) => [a[0] + x / b.ring.length, a[1] + y / b.ring.length], [0, 0]);
    const m = Math.max(4, b.heightFt * 0.12); // wider under taller ones: they are seen from farther
    const grow = (p: number, q: number) => {
      const dx = p - c[0]!;
      const dy = q - c[1]!;
      const d = Math.hypot(dx, dy) || 1;
      return new THREE.Vector2(p + (dx / d) * m, q + (dy / d) * m);
    };
    const g = new THREE.ShapeGeometry(new THREE.Shape(b.ring.map(([x, y]) => grow(x, y))), 1);
    g.rotateX(-Math.PI / 2);
    g.translate(0, Math.min(b.baseFt ?? 0, floorFt) + 0.15, 0);
    pads.push(g.index ? g.toNonIndexed() : g);
  }
  if (pads.length) {
    const pad = new THREE.Mesh(mergeGeometries(pads, false)!, new THREE.MeshLambertMaterial({ color: COLORS.farFootprint }));
    pads.forEach((g) => g.dispose());
    pad.receiveShadow = true;
    group.add(pad);
  }
  return group;
}

// ---- trees (instanced trunk + low-poly crown + bare limbs) -----------------------------
//
// Shadows workstream (2026-10-04): crowns cast DAPPLED shadows that match the sun study.
// The crown is a sphere (radius crownR, centre crownCenterFt() above the ground, exactly
// where the sun maths puts it). Its shadow is drawn from one shell of the crown with holes
// punched in a world-space pattern of ~1 ft leaf clumps: each clump is kept with probability
// = the share of light the crown blocks (60% in leaf, 30% bare, treemodel.ts), so the
// shadow on the ground lets through the same share of light as the maths counts. The
// visible crown uses the same pattern (so what you see is what blocks): full and green in
// leaf, a thin twiggy haze over bare limbs in winter, cones for needle trees.

const trunkGeo = new THREE.CylinderGeometry(0.5, 0.6, 1, 6).translate(0, 0.5, 0);

/** A slightly lumpy unit sphere so crowns read as trees (each vertex pushed in or out a little). */
function lumpySphere(): THREE.BufferGeometry {
  const g = new THREE.IcosahedronGeometry(1, 2);
  const pos = g.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const n = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
    const f = 0.9 + 0.15 * (n - Math.floor(n));
    pos.setXYZ(i, x * f, y * f, z * f);
  }
  return g;
}
const crownGeo = lumpySphere();

/** Bare limbs inside a unit crown (centre 0,0,0; the trunk ends at y = −0.4). */
function limbsGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const up = new THREE.Vector3(0, 1, 0);
  const seg = (a: THREE.Vector3, b: THREE.Vector3, r0: number, r1: number) => {
    const d = b.clone().sub(a);
    const g = new THREE.CylinderGeometry(r1, r0, d.length(), 5, 1, true).translate(0, d.length() / 2, 0);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, d.normalize()));
    g.translate(a.x, a.y, a.z);
    parts.push(g);
  };
  const base = new THREE.Vector3(0, -0.45, 0);
  seg(base, new THREE.Vector3(0.04, 0.8, -0.02), 0.07, 0.015);
  for (let k = 0; k < 5; k++) {
    const az = (k * 72 + 20) * (Math.PI / 180);
    const lift = 0.2 + 0.08 * (k % 3);
    const start = new THREE.Vector3(0, -0.35 + 0.1 * (k % 2), 0);
    const tip = new THREE.Vector3(Math.cos(az) * 0.78, lift + 0.15, Math.sin(az) * 0.78);
    seg(start, tip, 0.05, 0.012);
    // a fork half-way out, reaching up toward the crown's edge
    const mid = start.clone().lerp(tip, 0.5);
    const az2 = az + 0.6;
    seg(mid, new THREE.Vector3(Math.cos(az2) * 0.55, 0.72, Math.sin(az2) * 0.55), 0.03, 0.01);
  }
  const g = mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p)), false)!;
  parts.forEach((p) => p.dispose());
  return g;
}
const limbGeo = limbsGeometry();

export interface TreeSpec {
  x: number;
  y: number;
  heightFt: number;
  crownR: number;
  color?: number;
  /** keeps its leaves in winter (treemodel.ts); default deciduous */
  evergreen?: boolean;
  /** needle tree: drawn as a cone */
  conifer?: boolean;
  /** ground under the trunk, ft above the lot's datum; default: the instances' ground at (x, y) */
  baseFt?: number;
}

interface TreeUniforms {
  /** how far into leaf deciduous trees are (0 bare … 1 full leaf) */
  uLeaf: { value: number };
  /** 0..1 how far the leaves have turned (colour only) */
  uAutumn: { value: number };
  uBlockLeaf: { value: number };
  uBlockBare: { value: number };
}

const TREE_VERT_PARS = /* glsl */ `
attribute vec2 aTree; // x = evergreen, y = needle tree (cone)
uniform float uLeaf;
varying vec3 vTreeW;
varying float vTreeLeaf;
varying float vTreeEver;
`;
const TREE_VERT_MAIN = /* glsl */ `
if (aTree.y > 0.5) {
  // a cone: wide at the bottom of the crown, a point at the top
  float tC = clamp((transformed.y + 1.0) * 0.5, 0.0, 1.0);
  float rhoC = length(transformed.xz);
  if (rhoC > 1e-4) transformed.xz *= 0.95 * (1.0 - tC) / rhoC;
  transformed.y = transformed.y * 1.25 + 0.1;
}
{
  vec4 treeW = vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
  treeW = instanceMatrix * treeW;
  #endif
  vTreeW = (modelMatrix * treeW).xyz;
}
vTreeLeaf = max(aTree.x, uLeaf);
vTreeEver = aTree.x;
`;
const TREE_FRAG_PARS = /* glsl */ `
uniform float uBlockLeaf;
uniform float uBlockBare;
uniform float uAutumn;
varying vec3 vTreeW;
varying float vTreeLeaf;
varying float vTreeEver;
// "hash without sine" (Dave Hoskins): an even spread of values in [0, 1)
float treeHash(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.zyx + 31.32);
  return fract((p.x + p.y) * p.z);
}
// leaf clumps about a foot across, with wavy edges (finer twigs when bare)
float treeDapple(vec3 w, float scale) {
  vec3 p = w * scale;
  p += 0.45 * sin(p.yzx * 1.7 + p.zxy * 0.9);
  return treeHash(floor(p));
}
`;
const TREE_FRAG_DISCARD = /* glsl */ `
if (treeDapple(vTreeW, vTreeLeaf < 0.5 ? 2.2 : 1.1) >= mix(uBlockBare, uBlockLeaf, vTreeLeaf)) discard;
`;
const TREE_FRAG_COLOR = /* glsl */ `
{
  vec3 twig = mix(vec3(0.27, 0.24, 0.22), diffuseColor.rgb, 0.12);
  vec3 turned = mix(diffuseColor.rgb, vec3(0.80, 0.40, 0.10), uAutumn * (1.0 - vTreeEver) * 0.8);
  diffuseColor.rgb = mix(twig, turned, smoothstep(0.05, 0.75, vTreeLeaf));
}
`;

function patchTreeShader(shader: THREE.WebGLProgramParametersWithUniforms, u: TreeUniforms, color: boolean) {
  Object.assign(shader.uniforms, u);
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', `#include <common>\n${TREE_VERT_PARS}`)
    .replace('#include <begin_vertex>', `#include <begin_vertex>\n${TREE_VERT_MAIN}`);
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', `#include <common>\n${TREE_FRAG_PARS}`)
    .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>\n${TREE_FRAG_DISCARD}`);
  if (color) shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>\n${TREE_FRAG_COLOR}`);
}

/** The crown's visible material and the depth material that draws its dappled shadow. */
function crownMaterials(u: TreeUniforms): { visible: THREE.MeshLambertMaterial; depth: THREE.MeshDepthMaterial } {
  const visible = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true, side: THREE.DoubleSide });
  // the shadow comes from one shell of the crown (the side away from the sun), so a ray
  // through the crown meets the leaf pattern once, as in the sun maths
  visible.shadowSide = THREE.BackSide;
  visible.onBeforeCompile = (shader) => patchTreeShader(shader, u, true);
  visible.customProgramCacheKey = () => 'planner-tree-crown';
  const depth = new THREE.MeshDepthMaterial();
  depth.onBeforeCompile = (shader) => patchTreeShader(shader, u, false);
  depth.customProgramCacheKey = () => 'planner-tree-crown-depth';
  return { visible, depth };
}

/** Instanced trees; `group.userData.treeInstances` points back here so the scene can set the season. */
export class TreeInstances {
  readonly group = new THREE.Group();
  private trunks: THREE.InstancedMesh;
  private crowns: THREE.InstancedMesh;
  private limbs: THREE.InstancedMesh | null = null;
  private crownGeo: THREE.BufferGeometry;
  private look: THREE.InstancedBufferAttribute;
  private depth: THREE.MeshDepthMaterial | null = null;
  private readonly u: TreeUniforms = {
    uLeaf: { value: 1 },
    uAutumn: { value: 0 },
    uBlockLeaf: { value: CROWN_BLOCKING },
    uBlockBare: { value: BARE_CROWN_BLOCKING },
  };
  /** ground under the trees (local feet → ft above the lot's datum) */
  private ground: GroundFn | null = null;
  private last: (TreeSpec & { id?: string })[] = [];
  ids: string[] = [];

  constructor(capacity: number, crownMaterial?: THREE.Material) {
    const cap = Math.max(1, capacity);
    this.crownGeo = crownGeo.clone();
    this.look = new THREE.InstancedBufferAttribute(new Float32Array(cap * 2), 2);
    this.crownGeo.setAttribute('aTree', this.look);
    this.trunks = new THREE.InstancedMesh(trunkGeo, new THREE.MeshLambertMaterial({ color: COLORS.trunk }), cap);
    let crownMat = crownMaterial;
    if (!crownMat) {
      const m = crownMaterials(this.u);
      crownMat = m.visible;
      this.depth = m.depth;
    }
    this.crowns = new THREE.InstancedMesh(this.crownGeo, crownMat, cap);
    if (this.depth) this.crowns.customDepthMaterial = this.depth;
    const meshes = [this.trunks, this.crowns];
    if (!crownMaterial) {
      // a custom crown material (the see-through "will be removed" markers) gets no limbs
      this.limbs = new THREE.InstancedMesh(limbGeo, this.trunks.material, cap);
      this.limbs.visible = false;
      meshes.push(this.limbs);
    }
    for (const m of meshes) {
      m.castShadow = true;
      m.receiveShadow = true;
      m.count = 0;
      m.frustumCulled = false;
      this.group.add(m);
    }
    this.group.userData.treeInstances = this;
  }

  get pickMesh() {
    return this.crowns;
  }

  /** The ground the trees stand on (redraws them on it). */
  setGround(g: GroundFn | null) {
    this.ground = g;
    if (this.last.length) this.set(this.last);
  }

  /** The season: how far into leaf deciduous trees are (0..1) and how far the leaves have turned. */
  setSeason(leaf: number, autumn = 0) {
    this.u.uLeaf.value = leaf;
    this.u.uAutumn.value = autumn;
    if (this.limbs) this.limbs.visible = leaf < 0.97 && this.limbs.count > 0;
  }

  set(trees: (TreeSpec & { id?: string })[]) {
    this.last = trees;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const c = new THREE.Color();
    const zero = new THREE.Matrix4().makeScale(0, 0, 0);
    const n = Math.min(trees.length, this.crowns.instanceMatrix.count);
    this.ids = [];
    for (let i = 0; i < n; i++) {
      const t = trees[i]!;
      const base = t.baseFt ?? this.ground?.(t.x, t.y) ?? 0;
      const r = Math.max(0.6, t.crownR);
      const cz = crownCenterFt(t.heightFt, r);
      const trunkH = Math.max(1.2, cz - r * 0.4);
      const tw = Math.max(0.35, Math.min(1.6, r * 0.08));
      m.compose(W(t.x, t.y, base), q, new THREE.Vector3(tw, trunkH, tw));
      this.trunks.setMatrixAt(i, m);
      m.compose(W(t.x, t.y, base + cz), q, new THREE.Vector3(r, r, r));
      this.crowns.setMatrixAt(i, m);
      // limbs only in broadleaf deciduous trees (they show when the leaves are off)
      this.limbs?.setMatrixAt(i, t.evergreen || t.conifer ? zero : m);
      c.set(t.color ?? COLORS.crown);
      if (t.evergreen) c.multiplyScalar(0.72);
      this.crowns.setColorAt(i, c);
      this.look.setXY(i, t.evergreen ? 1 : 0, t.conifer ? 1 : 0);
      this.ids.push(t.id ?? '');
    }
    const meshes = [this.trunks, this.crowns, ...(this.limbs ? [this.limbs] : [])];
    for (const mesh of meshes) {
      mesh.count = n;
      mesh.instanceMatrix.needsUpdate = true;
    }
    this.look.needsUpdate = true;
    if (this.crowns.instanceColor) this.crowns.instanceColor.needsUpdate = true;
    if (this.limbs) this.limbs.visible = this.u.uLeaf.value < 0.97 && n > 0;
    for (const mesh of meshes) {
      mesh.computeBoundingSphere();
      mesh.computeBoundingBox();
    }
  }

  dispose() {
    this.trunks.dispose();
    this.crowns.dispose();
    this.limbs?.dispose();
    this.crownGeo.dispose();
    (this.trunks.material as THREE.Material).dispose();
    if (!this.depth) return;
    (this.crowns.material as THREE.Material).dispose();
    this.depth.dispose();
  }
}

/** City trees around the lot (those standing on it are existing conditions instead). */
export function cityTreeSpecs(trees: LocalTree[]): TreeSpec[] {
  return trees
    .filter((t) => !t.onLot)
    .map((t) => {
      const look = treeLook(t.species);
      return { x: t.x, y: t.y, heightFt: t.heightFt, crownR: t.crownR, color: COLORS.crownCity, ...(look.evergreen ? { evergreen: true } : {}), ...(look.conifer ? { conifer: true } : {}) };
    });
}

// ---- aerial ground (City 3-inch imagery stitched onto one canvas) -----------------

export interface AerialGround {
  mesh: THREE.Mesh;
  /** lowest ground under the photo (the plain ground beyond sits just below it) */
  minFt: number;
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
  let minFt = 0;
  let skirt: THREE.Mesh | null = null;
  // a little brighter than the photo so cast shadows read clearly against it
  const mat = new THREE.MeshLambertMaterial({ map: tex, color: new THREE.Color(1.35, 1.35, 1.35) });
  const plain = new THREE.MeshLambertMaterial({ color: COLORS.ground });
  if (ground) {
    // terrain: a grid lifted onto the ground, about one vertex per lidar cell
    const t = terrainGeometry(x0, x1, y0, y1, ground);
    geo = t.geo;
    minFt = t.min;
    skirt = new THREE.Mesh(skirtGeometry(x0, x1, y0, y1, ground, minFt - 0.5), plain);
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
    minFt,
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
    if (m.geometry && m.geometry !== trunkGeo && m.geometry !== crownGeo && m.geometry !== limbGeo) m.geometry.dispose();
    const mat = m.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
    else if (mat) {
      (mat as THREE.MeshBasicMaterial).map?.dispose();
      mat.dispose();
    }
  });
}
