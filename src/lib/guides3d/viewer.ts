// The 3D assembly viewer for the build guides (three.js). Loaded lazily, only
// on guide pages that have a model (src/data/guides/models/<slug>.json).
//
//   buildModelGroup(model)   a THREE.Group of the finished piece, styled like
//                            PiaT's drawings — reusable (e.g. by the planner)
//   AssemblyViewer           the animated viewer: steps, cut pile, exploded
//                            view, orbit/zoom, hover tooltips
//
// The animation itself is planned in timeline.ts (pure, tested); this file only
// draws it. Renders on demand: nothing is drawn unless something changed.

import {
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  CircleGeometry,
  Color,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  EdgesGeometry,
  Euler,
  Float32BufferAttribute,
  Group,
  HemisphereLight,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  PCFShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  Quaternion,
  Raycaster,
  RepeatWrapping,
  Scene,
  ShadowMaterial,
  Spherical,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
  type Material,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { GuideModel, ModelPart, PartKind } from './schema';
import { partBounds } from './validate';
import { layFlat, type Pose, type V3 } from './layout';
import { fitBox, viewDirection, DEFAULT_VIEW } from './framing';
import { partLabel, inches, type CutLike } from './labels';
import {
  prepare,
  targetsFor,
  planTransition,
  previousView,
  trackProgress,
  type GuideStepLike,
  type PreparedModel,
  type Target,
  type Track,
  type View,
} from './timeline';

// ---------------------------------------------------------------------------
// Look: PiaT's drawings are pale boards with crisp dark outlines and cyan accents.

export const CYAN = '#00a8e8';
const CYAN_EDGE = '#00587e';
const HOVER_EDGE = '#00709c';

const LOOK: Record<PartKind, { color: string; edge: string | null; opacity?: number }> = {
  lumber: { color: '#efe2c9', edge: '#26221e' },
  sheet: { color: '#e6d3a8', edge: '#26221e' },
  mesh: { color: '#8e989e', edge: '#3a4247', opacity: 0.06 },
  'stone-fill': { color: '#b3aea6', edge: null },
  bracket: { color: '#5b6168', edge: '#1b1e22' },
  fastener: { color: '#5b6168', edge: '#1b1e22' },
  fabric: { color: '#f1efe9', edge: '#5d5d5d', opacity: 0.92 },
  other: { color: '#d4d4d4', edge: '#2e2e2e' },
};

const deg = Math.PI / 180;

// ---------------------------------------------------------------------------
// Geometry helpers (cached by size: models repeat the same boards a lot)

const geoCache = new Map<string, BufferGeometry>();
function cached<T extends BufferGeometry>(key: string, make: () => T): T {
  let g = geoCache.get(key) as T | undefined;
  if (!g) {
    g = make();
    geoCache.set(key, g);
  }
  return g;
}

function solidGeometry(p: ModelPart): BufferGeometry {
  const [x, y, z] = p.size;
  if (p.shape === 'cylinder') return cached(`cyl:${x}:${y}`, () => new CylinderGeometry(x / 2, x / 2, y, 24));
  if (p.kind === 'stone-fill') return cached(`stone:${x}:${y}:${z}`, () => scaledBoxUV(x, y, z, 14));
  return cached(`box:${x}:${y}:${z}`, () => new BoxGeometry(x, y, z));
}

/** A box whose texture repeats every `tile` inches on every face instead of stretching. */
function scaledBoxUV(x: number, y: number, z: number, tile: number): BufferGeometry {
  const g = new BoxGeometry(x, y, z);
  const uv = g.getAttribute('uv');
  // BoxGeometry faces in order: +x, −x, +y, −y, +z, −z (4 vertices each)
  const faceDims: [number, number][] = [
    [z, y],
    [z, y],
    [x, z],
    [x, z],
    [x, y],
    [x, y],
  ];
  for (let f = 0; f < 6; f++)
    for (let v = 0; v < 4; v++) {
      const k = f * 4 + v;
      uv.setXY(k, (uv.getX(k) * faceDims[f]![0]) / tile, (uv.getY(k) * faceDims[f]![1]) / tile);
    }
  return g;
}

/** Wire-grid lines on the faces of a box (welded-wire mesh), `s` inches apart. */
function wireGridGeometry(size: V3, s: number): BufferGeometry {
  const h = size.map((v) => v / 2);
  const pts: number[] = [];
  for (let a = 0; a < 3; a++) {
    const u = (a + 1) % 3;
    const v = (a + 2) % 3;
    if (size[u]! < s || size[v]! < s) continue; // thin side of a panel
    for (const sign of [-1, 1]) {
      const at = sign * h[a]!;
      const line = (from: number[], to: number[]) => pts.push(...from, ...to);
      for (let t = -h[u]! + s; t < h[u]! - 0.05; t += s) {
        const p0 = [0, 0, 0];
        const p1 = [0, 0, 0];
        p0[a] = p1[a] = at;
        p0[u] = p1[u] = t;
        p0[v] = -h[v]!;
        p1[v] = h[v]!;
        line(p0, p1);
      }
      for (let t = -h[v]! + s; t < h[v]! - 0.05; t += s) {
        const p0 = [0, 0, 0];
        const p1 = [0, 0, 0];
        p0[a] = p1[a] = at;
        p0[v] = p1[v] = t;
        p0[u] = -h[u]!;
        p1[u] = h[u]!;
        line(p0, p1);
      }
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pts, 3));
  return g;
}

/** Seeded pseudo-random numbers (mulberry32) so the rubble looks the same every time. */
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let rubbleTex: CanvasTexture | null = null;
/** Grey rubble drawn like the PDFs: irregular stones with dark outlines. */
function rubbleTexture(): CanvasTexture | null {
  if (rubbleTex) return rubbleTex;
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  if (!g) return null;
  const r = rng(7);
  g.fillStyle = '#6f6a63';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 70; i++) {
    const cx = r() * 256;
    const cy = r() * 256;
    const rad = 14 + r() * 20;
    const n = 6 + Math.floor(r() * 3);
    const shade = 150 + Math.floor(r() * 60);
    const pts: [number, number][] = [];
    for (let k = 0; k < n; k++) {
      const ang = (k / n) * Math.PI * 2 + r() * 0.5;
      const rr = rad * (0.7 + r() * 0.35);
      pts.push([Math.cos(ang) * rr, Math.sin(ang) * rr]);
    }
    // draw wrapped copies so the tile repeats seamlessly
    for (const ox of [-256, 0, 256])
      for (const oy of [-256, 0, 256]) {
        g.beginPath();
        pts.forEach(([px, py], k) => (k === 0 ? g.moveTo(cx + ox + px, cy + oy + py) : g.lineTo(cx + ox + px, cy + oy + py)));
        g.closePath();
        g.fillStyle = `rgb(${shade},${shade - 4},${shade - 10})`;
        g.fill();
        g.lineWidth = 2;
        g.strokeStyle = '#3d3a36';
        g.stroke();
      }
  }
  rubbleTex = new CanvasTexture(c);
  rubbleTex.wrapS = rubbleTex.wrapT = RepeatWrapping;
  rubbleTex.colorSpace = SRGBColorSpace;
  return rubbleTex;
}

const labelTexCache = new Map<string, { tex: CanvasTexture; aspect: number }>();
/** "B-1" written on the board, like the pencil label PiaT asks you to add when cutting. */
function labelTexture(text: string): { tex: CanvasTexture; aspect: number } | null {
  if (typeof document === 'undefined') return null;
  const hit = labelTexCache.get(text);
  if (hit) return hit;
  const c = document.createElement('canvas');
  const g = c.getContext('2d');
  if (!g) return null;
  const font = '700 56px "Work Sans Variable", "Work Sans", system-ui, sans-serif';
  g.font = font;
  const w = Math.ceil(g.measureText(text).width) + 16;
  c.width = w;
  c.height = 72;
  g.font = font;
  g.fillStyle = '#2f2b27';
  g.textBaseline = 'middle';
  g.fillText(text, 8, 38);
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 4;
  const out = { tex, aspect: w / 72 };
  labelTexCache.set(text, out);
  return out;
}

// ---------------------------------------------------------------------------
// Building parts

export interface PartHandle {
  part: ModelPart;
  /** positioned at the part's pose; children are in the part's local frame */
  node: Group;
  solid: Mesh;
  solidMat: MeshLambertMaterial;
  lines: LineSegments[];
  lineMats: LineBasicMaterial[];
  decal: Mesh | null;
  decalMat: MeshBasicMaterial | null;
  base: { color: Color; edge: Color; opacity: number };
}

export interface BuildOptions {
  /** dark outlines like the PDFs (default true) */
  edges?: boolean;
  /** parts cast shadows (default true) */
  castShadow?: boolean;
  /** one material per part, so each can be animated (the viewer needs this) */
  uniqueMaterials?: boolean;
  /** pencil labels on boards (shown only by the viewer's cut pile) */
  decals?: boolean;
}

const sharedMats = new Map<string, Material>();
function mat<T extends Material>(key: string, unique: boolean, make: () => T): T {
  if (unique) return make();
  let m = sharedMats.get(key) as T | undefined;
  if (!m) {
    m = make();
    sharedMats.set(key, m);
  }
  return m;
}

export function buildPart(p: ModelPart, opts: BuildOptions = {}): PartHandle {
  const unique = !!opts.uniqueMaterials;
  const look = LOOK[p.kind] ?? LOOK.other;
  const color = new Color(p.color ?? look.color);
  const edge = new Color(look.edge ?? '#333333');
  const baseOpacity = look.opacity ?? 1;
  const node = new Group();
  node.name = p.id;
  node.userData.part = p;

  const isStone = p.kind === 'stone-fill';
  const isMesh = p.kind === 'mesh' || p.shape === 'mesh-box';
  const solidMat = mat(`solid:${p.kind}:${color.getHexString()}`, unique, () => {
    const m = new MeshLambertMaterial({
      color,
      transparent: true,
      opacity: baseOpacity,
      side: p.kind === 'fabric' ? DoubleSide : undefined,
      depthWrite: !isMesh,
      // push faces back a little so the outlines on their edges draw cleanly
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });
    if (isStone) {
      const t = rubbleTexture();
      if (t) m.map = t;
    }
    return m;
  });
  const solid = new Mesh(solidGeometry(p), solidMat);
  solid.castShadow = opts.castShadow !== false && !isMesh;
  solid.receiveShadow = !isMesh;
  solid.userData.part = p;
  node.add(solid);

  const lines: LineSegments[] = [];
  const lineMats: LineBasicMaterial[] = [];
  if (opts.edges !== false && look.edge) {
    const lm = mat(`edge:${p.kind}`, unique, () => new LineBasicMaterial({ color: edge, transparent: true }));
    const eg = cached(`edges:${p.shape ?? 'box'}:${p.size.join(':')}`, () => new EdgesGeometry(solid.geometry, 25));
    const e = new LineSegments(eg, lm);
    e.raycast = () => {};
    node.add(e);
    lines.push(e);
    lineMats.push(lm);
  }
  if (isMesh && p.shape !== 'cylinder') {
    const gm = mat(`grid:${p.kind}`, unique, () => new LineBasicMaterial({ color: new Color('#4a5257'), transparent: true, opacity: 0.85 }));
    const gg = cached(`grid:${p.size.join(':')}`, () => wireGridGeometry(p.size, 2));
    const grid = new LineSegments(gg, gm);
    grid.raycast = () => {};
    node.add(grid);
    lines.push(grid);
    lineMats.push(gm);
  }

  let decal: Mesh | null = null;
  let decalMat: MeshBasicMaterial | null = null;
  if (opts.decals && p.ref && p.shape !== 'cylinder' && (p.kind === 'lumber' || p.kind === 'sheet')) {
    const lt = labelTexture(p.ref);
    if (lt) {
      const flat = layFlat(p);
      const [L, T, W] = flat.dims;
      const h = Math.min(W * 0.62, 2.4);
      const w = Math.min(h * lt.aspect, L * 0.8);
      decalMat = new MeshBasicMaterial({ map: lt.tex, transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
      decal = new Mesh(cached(`plane:${w}:${h}`, () => new PlaneGeometry(w, h)), decalMat);
      const ax = (i: number) => new Vector3(i === 0 ? 1 : 0, i === 1 ? 1 : 0, i === 2 ? 1 : 0);
      const x = ax(flat.along);
      const z = ax(flat.up);
      const y = new Vector3().crossVectors(z, x);
      decal.quaternion.setFromRotationMatrix(new Matrix4().makeBasis(x, y, z));
      decal.position.copy(z.clone().multiplyScalar(T / 2 + 0.02)).addScaledVector(x, -L / 2 + w / 2 + Math.min(1.5, L * 0.08));
      decal.visible = false;
      decal.raycast = () => {};
      node.add(decal);
    }
  }

  setPose(node, { position: p.position, rotation: p.rotation ?? [0, 0, 0] });
  return { part: p, node, solid, solidMat, lines, lineMats, decal, decalMat, base: { color, edge, opacity: baseOpacity } };
}

function setPose(o: Group, pose: Pose) {
  o.position.set(...pose.position);
  o.quaternion.setFromEuler(new Euler(pose.rotation[0] * deg, pose.rotation[1] * deg, pose.rotation[2] * deg, 'XYZ'));
}

/**
 * The finished piece as a THREE.Group, in inches, origin at the centre of the
 * footprint on the ground (y up). One child per part (name = part id,
 * userData.part = the ModelPart). Materials are shared between parts of the
 * same kind unless `uniqueMaterials` is set.
 */
export function buildModelGroup(model: GuideModel, opts: BuildOptions = {}): Group {
  const g = new Group();
  g.name = model.slug;
  for (const p of model.parts) g.add(buildPart(p, opts).node);
  return g;
}

// ---------------------------------------------------------------------------
// The animated viewer

interface Display {
  pos: Vector3;
  quat: Quaternion;
  opacity: number;
  glow: number;
  label: number;
}

const cloneDisplay = (d: Display): Display => ({ pos: d.pos.clone(), quat: d.quat.clone(), opacity: d.opacity, glow: d.glow, label: d.label });
const quatOf = (r: V3) => new Quaternion().setFromEuler(new Euler(r[0] * deg, r[1] * deg, r[2] * deg, 'XYZ'));

export interface ViewerInit {
  /** the stage element; the canvas and overlays are added inside it */
  container: HTMLElement;
  model: GuideModel;
  steps: GuideStepLike[];
  cutList?: CutLike[];
  reducedMotion?: boolean;
  /** the first view, shown without animation */
  view?: View;
  /** WebGL failed or the context was lost */
  onError?: (err: unknown) => void;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class AssemblyViewer {
  readonly prepared: PreparedModel;
  readonly canvas: HTMLCanvasElement;
  private readonly container: HTMLElement;
  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(30, 1, 1, 8000);
  private readonly controls: OrbitControls;
  private readonly handles: PartHandle[];
  private readonly display: Display[];
  private readonly cutList: CutLike[];
  private readonly sun: DirectionalLight;
  private readonly labelLayer: HTMLDivElement;
  private readonly pileLabels: { el: HTMLElement; at: Vector3 }[] = [];
  private readonly tip: HTMLDivElement;
  private readonly hint: HTMLDivElement;
  private readonly ro: ResizeObserver;
  private targets: Target[];
  private view: View;
  private exploded = false;
  private reducedMotion: boolean;
  private frame = 0;
  private anim: { start: number; tracks: Track[]; from: Display[]; to: Display[]; resolve: () => void } | null = null;
  private camTween: { start: number; dur: number; from: { t: Vector3; s: Spherical }; to: { t: Vector3; s: Spherical } } | null = null;
  private homeDir: V3;
  private userMoved = false;
  private active = false;
  private hovered = -1;
  private pointer = new Vector2();
  private raycaster = new Raycaster();
  private tipTimer = 0;
  private hintTimer = 0;
  private disposed = false;
  private readonly onError?: (err: unknown) => void;
  private readonly cleanups: (() => void)[] = [];

  constructor(init: ViewerInit) {
    this.container = init.container;
    this.cutList = init.cutList ?? [];
    this.reducedMotion = !!init.reducedMotion;
    this.onError = init.onError;
    this.prepared = prepare(init.model, init.steps, this.cutList.map((c) => c.part));
    const v = init.model.view ?? DEFAULT_VIEW;
    this.homeDir = viewDirection(v.azimuthDeg, v.elevationDeg);

    this.renderer = new WebGLRenderer({ antialias: true, powerPreference: 'low-power' });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFShadowMap;
    this.canvas = this.renderer.domElement;
    this.canvas.className = 'g3d-canvas';
    this.container.appendChild(this.canvas);

    this.labelLayer = document.createElement('div');
    this.labelLayer.className = 'g3d-labels';
    this.labelLayer.setAttribute('aria-hidden', 'true');
    this.container.appendChild(this.labelLayer);
    this.tip = document.createElement('div');
    this.tip.className = 'g3d-tip';
    this.tip.setAttribute('role', 'status');
    this.tip.hidden = true;
    this.container.appendChild(this.tip);
    this.hint = document.createElement('div');
    this.hint.className = 'g3d-hint';
    this.hint.hidden = true;
    this.container.appendChild(this.hint);

    // scene: white paper, soft light from the upper left, a faint floor and shadow
    this.scene.background = new Color('#ffffff');
    this.scene.add(new HemisphereLight(0xffffff, 0xb9b2a6, 1.55));
    this.sun = new DirectionalLight(0xffffff, 2.6);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.radius = 5;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.03;
    this.scene.add(this.sun, this.sun.target);
    this.addFloor();

    // parts
    this.handles = this.prepared.parts.map((p) => buildPart(p, { uniqueMaterials: true, decals: !!this.prepared.pile }));
    for (const h of this.handles) this.scene.add(h.node);
    this.view = init.view ?? { kind: 'complete' };
    this.targets = targetsFor(this.prepared, this.view);
    this.display = this.handles.map((_, i) => this.endDisplay(i, this.targets[i]!, null));
    this.buildPileLabels();

    // camera + controls
    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.09;
    this.controls.enablePan = false;
    this.controls.enableZoom = false;
    this.controls.rotateSpeed = 0.8;
    this.controls.minPolarAngle = 0.08;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.035; // never below the ground
    this.controls.addEventListener('change', () => this.invalidate());
    this.controls.addEventListener('start', () => {
      this.userMoved = true;
      this.camTween = null;
      this.hideHint();
    });
    this.setActive(false);
    this.listen();

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(this.container);
    this.resize();
    this.frameCamera(false, this.homeDir);
    this.applyAll();
    this.invalidate();
  }

  // ---- public API ----------------------------------------------------------

  get currentView(): View {
    return this.view;
  }

  /** Move to a view, animating unless `animate` is false. Resolves when done (or superseded). */
  show(view: View, opts: { animate?: boolean } = {}): Promise<void> {
    const prevPileMode = this.isPileView(this.view);
    const next = targetsFor(this.prepared, view);
    const plan = planTransition(this.prepared, this.targets, next, { reducedMotion: this.reducedMotion });
    this.view = view;
    this.targets = next;
    this.updatePileLabels();
    if (prevPileMode !== this.isPileView(view)) this.frameCamera(opts.animate !== false && !this.reducedMotion);
    if (opts.animate === false) {
      this.finishAnim();
      for (let i = 0; i < this.handles.length; i++) this.display[i] = this.endDisplay(i, next[i]!, null);
      this.applyAll();
      this.invalidate();
      return Promise.resolve();
    }
    return this.run(plan.tracks);
  }

  /** Replay the current view's step from the state just before it. */
  replay(): Promise<void> {
    const before = previousView(this.prepared, this.view);
    const view = this.view;
    this.finishAnim();
    const prevT = targetsFor(this.prepared, before);
    for (let i = 0; i < this.handles.length; i++) this.display[i] = this.endDisplay(i, prevT[i]!, null);
    this.targets = prevT;
    this.applyAll();
    return this.show(view);
  }

  /** Exploded view on/off: placed parts pushed out from the middle. */
  setExploded(on: boolean) {
    if (on === this.exploded) return;
    this.exploded = on;
    const plan = planTransition(this.prepared, this.targets, this.targets, { reducedMotion: this.reducedMotion, reposition: true });
    if (!this.isPileView(this.view)) this.frameCamera(!this.reducedMotion);
    void this.run(plan.tracks);
  }

  get isExploded() {
    return this.exploded;
  }

  /** Back to the starting camera angle and zoom. */
  resetView() {
    this.userMoved = false;
    this.frameCamera(!this.reducedMotion, this.homeDir);
  }

  setReducedMotion(on: boolean) {
    this.reducedMotion = on;
  }

  /** Wait helper for "play all" that a stop can interrupt. */
  hold(ms: number) {
    return sleep(this.reducedMotion ? Math.max(ms, 900) : ms);
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.finishAnim();
    this.ro.disconnect();
    for (const c of this.cleanups) c();
    this.controls.dispose();
    for (const h of this.handles) {
      h.solidMat.dispose();
      h.lineMats.forEach((m) => m.dispose());
      h.decalMat?.dispose();
    }
    this.renderer.dispose();
    this.canvas.remove();
    this.labelLayer.remove();
    this.tip.remove();
    this.hint.remove();
  }

  // ---- animation ------------------------------------------------------------

  private isPileView(v: View) {
    return v.kind === 'step' && v.n === this.prepared.pileStep;
  }

  private placedPose(i: number): { pos: Vector3; quat: Quaternion } {
    const p = this.prepared.parts[i]!;
    const pos = new Vector3(...p.position);
    if (this.exploded) pos.add(new Vector3(...this.prepared.explode[i]!));
    return { pos, quat: quatOf(p.rotation ?? [0, 0, 0]) };
  }

  private pilePose(i: number): { pos: Vector3; quat: Quaternion } | null {
    const pose = this.prepared.pile?.poses[this.prepared.parts[i]!.id];
    return pose ? { pos: new Vector3(...pose.position), quat: quatOf(pose.rotation) } : null;
  }

  /** Where a part ends up for a target. `motion` picks where hidden parts go. */
  private endDisplay(i: number, t: Target, motion: Track['motion'] | null, cur?: Display): Display {
    const glow = t.highlight ? 1 : 0;
    const label = t.placement === 'pile' ? 1 : 0;
    if (t.placement === 'placed') return { ...this.placedPose(i), opacity: 1, glow, label };
    if (t.placement === 'pile') return { ...(this.pilePose(i) ?? this.placedPose(i)), opacity: 1, glow, label };
    // hidden
    if (motion === 'fly-out') {
      const pl = this.placedPose(i);
      return { pos: pl.pos.add(new Vector3(...this.prepared.fly[i]!)), quat: pl.quat, opacity: 0, glow, label: 0 };
    }
    if (cur) return { pos: cur.pos.clone(), quat: cur.quat.clone(), opacity: 0, glow, label: 0 };
    const pl = this.placedPose(i);
    return { pos: pl.pos.add(new Vector3(...this.prepared.fly[i]!)), quat: pl.quat, opacity: 0, glow, label: 0 };
  }

  /** Where an appearing part starts, unless it is still partly visible. */
  private startDisplay(i: number, motion: Track['motion'], cur: Display): Display {
    if (cur.opacity > 0.02) return cloneDisplay(cur);
    if (motion === 'fly-in') {
      const pl = this.placedPose(i);
      return { pos: pl.pos.add(new Vector3(...this.prepared.fly[i]!)), quat: pl.quat, opacity: 0, glow: cur.glow, label: 0 };
    }
    if (motion === 'drop-in') {
      const pp = this.pilePose(i) ?? this.placedPose(i);
      return { pos: pp.pos.add(new Vector3(0, 10, 0)), quat: pp.quat, opacity: 0, glow: 0, label: 0 };
    }
    return cloneDisplay(cur);
  }

  private run(planned: Track[]): Promise<void> {
    this.finishAnim(false);
    // anything an interrupted animation left part-way gets settled too
    const tracks = [...planned];
    const tracked = new Set(planned.map((t) => t.i));
    for (let i = 0; i < this.handles.length; i++) {
      if (tracked.has(i)) continue;
      const cur = this.display[i]!;
      const end = this.endDisplay(i, this.targets[i]!, null, cur);
      const off =
        cur.pos.distanceToSquared(end.pos) > 1e-4 ||
        Math.abs(cur.opacity - end.opacity) > 0.01 ||
        Math.abs(cur.glow - end.glow) > 0.01 ||
        Math.abs(cur.label - end.label) > 0.01 ||
        1 - Math.abs(cur.quat.dot(end.quat)) > 1e-6;
      if (off) tracks.push({ i, motion: end.opacity < cur.opacity ? 'fade-out' : 'shift', delay: 0, duration: this.reducedMotion ? 0 : 400, snapPose: this.reducedMotion });
    }
    if (!tracks.length) {
      this.invalidate();
      return Promise.resolve();
    }
    const from: Display[] = [];
    const to: Display[] = [];
    for (const t of tracks) {
      const cur = this.display[t.i]!;
      from[t.i] = this.startDisplay(t.i, t.motion, cur);
      to[t.i] = this.endDisplay(t.i, this.targets[t.i]!, t.motion, cur);
      if (t.snapPose) {
        const appearing = t.motion !== 'fly-out' && t.motion !== 'fade-out' && t.motion !== 'shift';
        from[t.i]!.pos.copy(to[t.i]!.pos);
        from[t.i]!.quat.copy(to[t.i]!.quat);
        if (appearing) from[t.i]!.opacity = 0;
      }
      // a part waiting for its stagger slot already sits at its start
      this.display[t.i] = cloneDisplay(from[t.i]!);
    }
    return new Promise((resolve) => {
      this.anim = { start: performance.now(), tracks, from, to, resolve };
      this.applyAll();
      this.invalidate();
    });
  }

  /** Jump the running animation to its end (or just drop it) and resolve its promise. */
  private finishAnim(jump = true) {
    const a = this.anim;
    if (!a) return;
    this.anim = null;
    if (jump) for (const t of a.tracks) this.display[t.i] = cloneDisplay(a.to[t.i]!);
    a.resolve();
  }

  private stepAnim(now: number): boolean {
    const a = this.anim;
    if (!a) return false;
    const ms = now - a.start;
    let running = false;
    for (const t of a.tracks) {
      const k = trackProgress(t, ms);
      if (ms < t.delay + t.duration) running = true;
      const f = a.from[t.i]!;
      const e = a.to[t.i]!;
      const d = this.display[t.i]!;
      d.pos.lerpVectors(f.pos, e.pos, k);
      d.quat.slerpQuaternions(f.quat, e.quat, k);
      // fade in early on arrival, late on departure
      const appearing = e.opacity > f.opacity;
      const ko = appearing ? Math.min(1, k * 2.2) : k;
      d.opacity = f.opacity + (e.opacity - f.opacity) * ko;
      const linear = t.duration > 0 ? Math.max(0, Math.min(1, (ms - t.delay) / Math.min(t.duration, 380))) : 1;
      d.glow = f.glow + (e.glow - f.glow) * linear;
      d.label = f.label + (e.label - f.label) * linear;
    }
    this.applyAll();
    if (!running) {
      this.anim = null;
      a.resolve();
    }
    return running;
  }

  private applyAll() {
    const cyan = new Color(CYAN);
    const cyanEdge = new Color(CYAN_EDGE);
    const hover = new Color(HOVER_EDGE);
    for (let i = 0; i < this.handles.length; i++) {
      const h = this.handles[i]!;
      const d = this.display[i]!;
      h.node.position.copy(d.pos);
      h.node.quaternion.copy(d.quat);
      const visible = d.opacity > 0.01;
      h.node.visible = visible;
      if (!visible) continue;
      const hov = i === this.hovered;
      h.solidMat.opacity = h.base.opacity * d.opacity;
      h.solidMat.color.copy(h.base.color).lerp(cyan, d.glow * (h.part.kind === 'stone-fill' ? 0.5 : 0.92));
      h.solidMat.emissive.copy(cyan).multiplyScalar(0.22 * d.glow + (hov ? 0.12 : 0));
      h.solidMat.depthWrite = h.solidMat.opacity > 0.98 && h.part.kind !== 'mesh' && h.part.shape !== 'mesh-box';
      h.solid.castShadow = d.opacity > 0.5 && h.part.kind !== 'mesh' && h.part.shape !== 'mesh-box';
      for (const m of h.lineMats) {
        m.color.copy(hov ? hover : h.base.edge).lerp(cyanEdge, hov ? 0 : d.glow);
        m.opacity = d.opacity * (m === h.lineMats[0] ? 1 : 0.85);
      }
      if (h.decal && h.decalMat) {
        h.decalMat.opacity = d.label * d.opacity;
        h.decal.visible = h.decalMat.opacity > 0.02;
      }
    }
  }

  // ---- camera ----------------------------------------------------------------

  private contentBox(): { min: V3; max: V3 } {
    if (this.isPileView(this.view) && this.prepared.pile) return this.prepared.pile.bounds;
    const min: V3 = [Infinity, Infinity, Infinity];
    const max: V3 = [-Infinity, -Infinity, -Infinity];
    this.prepared.parts.forEach((p, i) => {
      if (p.kind === 'fastener') return;
      const off = this.exploded ? this.prepared.explode[i]! : [0, 0, 0];
      const b = partBounds(p);
      for (let k = 0; k < 3; k++) {
        min[k] = Math.min(min[k]!, b.min[k]! + off[k]!);
        max[k] = Math.max(max[k]!, b.max[k]! + off[k]!);
      }
    });
    if (!Number.isFinite(min[0])) return { min: [-12, 0, -12], max: [12, 12, 12] };
    return { min, max };
  }

  /** Fit the content: keep the reader's angle unless `dir` is given. */
  private frameCamera(animate: boolean, dir?: V3) {
    const box = this.contentBox();
    const cur = new Vector3().subVectors(this.camera.position, this.controls.target);
    const d: V3 = dir ?? (cur.lengthSq() > 1e-6 ? (cur.normalize().toArray() as V3) : this.homeDir);
    const { target, distance } = fitBox(box.min, box.max, d, this.camera.fov, this.camera.aspect || 1, 0.1);
    this.controls.minDistance = distance * 0.35;
    this.controls.maxDistance = distance * 2.6;
    this.fitShadow(box);
    const toT = new Vector3(...target);
    const toS = new Spherical().setFromVector3(new Vector3(...d).multiplyScalar(distance));
    if (!animate || cur.lengthSq() < 1e-6) {
      this.camTween = null;
      this.controls.target.copy(toT);
      this.camera.position.setFromSpherical(toS).add(toT);
      this.camera.lookAt(toT);
      this.controls.update();
      this.invalidate();
      return;
    }
    const fromS = new Spherical().setFromVector3(new Vector3().subVectors(this.camera.position, this.controls.target));
    // turn the short way round
    while (toS.theta - fromS.theta > Math.PI) toS.theta -= 2 * Math.PI;
    while (fromS.theta - toS.theta > Math.PI) toS.theta += 2 * Math.PI;
    this.camTween = { start: performance.now(), dur: 750, from: { t: this.controls.target.clone(), s: fromS }, to: { t: toT, s: toS } };
    this.invalidate();
  }

  private stepCamera(now: number): boolean {
    const c = this.camTween;
    if (!c) return false;
    const x = Math.min(1, (now - c.start) / c.dur);
    const k = x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
    const s = new Spherical(
      c.from.s.radius + (c.to.s.radius - c.from.s.radius) * k,
      c.from.s.phi + (c.to.s.phi - c.from.s.phi) * k,
      c.from.s.theta + (c.to.s.theta - c.from.s.theta) * k,
    );
    this.controls.target.lerpVectors(c.from.t, c.to.t, k);
    this.camera.position.setFromSpherical(s).add(this.controls.target);
    this.camera.lookAt(this.controls.target);
    if (x >= 1) this.camTween = null;
    return x < 1;
  }

  private fitShadow(box: { min: V3; max: V3 }) {
    // one shadow camera covering the model, the exploded model and the pile
    const all = [box];
    const pile = this.prepared.pile?.bounds;
    if (pile) all.push(pile);
    let r = 0;
    const c = new Vector3((box.min[0] + box.max[0]) / 2, 0, (box.min[2] + box.max[2]) / 2);
    for (const b of all) for (const x of [b.min[0], b.max[0]]) for (const z of [b.min[2], b.max[2]]) for (const y of [b.min[1], b.max[1]]) r = Math.max(r, c.distanceTo(new Vector3(x, y, z)));
    r = r * 1.6 + 24; // explode + fly-in room
    const sc = this.sun.shadow.camera;
    sc.left = sc.bottom = -r;
    sc.right = sc.top = r;
    sc.near = 1;
    sc.far = r * 4;
    sc.updateProjectionMatrix();
    this.sun.target.position.copy(c);
    this.sun.position.copy(c).add(new Vector3(-0.55, 1.35, 0.45).normalize().multiplyScalar(r * 2));
    if (this.floor) {
      this.floor.position.set(c.x, 0, c.z);
      // the faint floor disc just reaches past the content
      const reach = Math.max(...all.map((b) => Math.hypot(b.max[0] - b.min[0], b.max[2] - b.min[2]))) * 0.75;
      this.floorDisc?.scale.setScalar(reach / 100);
    }
  }

  private floor: Group | null = null;
  private floorDisc: Mesh | null = null;
  private addFloor() {
    const g = new Group();
    const shadow = new Mesh(new PlaneGeometry(2000, 2000), new ShadowMaterial({ opacity: 0.17 }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.receiveShadow = true;
    shadow.raycast = () => {};
    g.add(shadow);
    // a faint round "floor" so the piece doesn't float on the white page
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const x = c.getContext('2d');
    if (x) {
      const grad = x.createRadialGradient(64, 64, 0, 64, 64, 64);
      grad.addColorStop(0, 'rgba(120,112,100,0.09)');
      grad.addColorStop(0.55, 'rgba(120,112,100,0.045)');
      grad.addColorStop(1, 'rgba(120,112,100,0)');
      x.fillStyle = grad;
      x.fillRect(0, 0, 128, 128);
      const tex = new CanvasTexture(c);
      const disc = new Mesh(new CircleGeometry(100, 48), new MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
      this.floorDisc = disc;
      disc.rotation.x = -Math.PI / 2;
      disc.position.y = -0.05;
      disc.renderOrder = -1;
      disc.raycast = () => {};
      g.add(disc);
    }
    this.floor = g;
    this.scene.add(g);
  }

  // ---- pile labels -----------------------------------------------------------

  private buildPileLabels() {
    const pile = this.prepared.pile;
    if (!pile) return;
    for (const g of pile.groups) {
      const el = document.createElement('span');
      el.className = 'g3d-pile-label';
      const b = document.createElement('b');
      b.textContent = g.ref;
      el.append(b, ` ×${g.count} · ${inches(g.dims[0])}`);
      this.labelLayer.appendChild(el);
      this.pileLabels.push({ el, at: new Vector3(...g.anchor) });
    }
    this.updatePileLabels();
  }

  private updatePileLabels() {
    this.labelLayer.classList.toggle('is-on', this.isPileView(this.view));
  }

  private placeLabels() {
    if (!this.pileLabels.length) return;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    const v = new Vector3();
    for (const l of this.pileLabels) {
      v.copy(l.at).project(this.camera);
      const off = v.z > 1 || Math.abs(v.x) > 1.2 || Math.abs(v.y) > 1.2;
      l.el.style.visibility = off ? 'hidden' : '';
      l.el.style.transform = `translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px) translate(-50%, -100%)`;
    }
  }

  // ---- rendering -------------------------------------------------------------

  invalidate() {
    if (!this.frame && !this.disposed) this.frame = requestAnimationFrame(this.tick);
  }

  private tick = (now: number) => {
    this.frame = 0;
    if (this.disposed) return;
    let again = false;
    if (this.stepCamera(now)) again = true;
    if (this.stepAnim(now)) again = true;
    this.controls.update(); // dispatches 'change' (-> invalidate) while damping
    if (this.canvas.clientWidth > 0 && this.canvas.clientHeight > 0) {
      this.renderer.render(this.scene, this.camera);
      this.placeLabels();
    }
    if (again) this.invalidate();
  };

  private resize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    if (!this.userMoved) this.frameCamera(false);
    this.invalidate();
  }

  // ---- input -----------------------------------------------------------------

  private setActive(on: boolean) {
    this.active = on;
    this.controls.enableZoom = on;
    // until the reader taps the model, vertical swipes over it still scroll the page
    this.canvas.style.touchAction = on ? 'none' : 'pan-y';
    this.container.classList.toggle('is-active', on);
  }

  private on<K extends keyof HTMLElementEventMap>(el: HTMLElement | Window, type: K, fn: (e: HTMLElementEventMap[K]) => void, opts?: AddEventListenerOptions) {
    el.addEventListener(type, fn as EventListener, opts);
    this.cleanups.push(() => el.removeEventListener(type, fn as EventListener, opts));
  }

  private listen() {
    const c = this.container;
    if (!c.hasAttribute('tabindex')) c.tabIndex = 0;
    this.on(c, 'focusin', () => this.setActive(true));
    this.on(c, 'focusout', (e) => {
      if (!c.contains(e.relatedTarget as Node | null)) this.setActive(false);
    });
    let down: { x: number; y: number; t: number } | null = null;
    this.on(this.canvas, 'pointerdown', (e) => {
      down = { x: e.clientX, y: e.clientY, t: performance.now() };
      if (e.pointerType === 'mouse' && document.activeElement !== c) c.focus({ preventScroll: true });
    });
    this.on(this.canvas, 'pointerup', (e) => {
      const d = down;
      down = null;
      if (!d) return;
      const tap = Math.hypot(e.clientX - d.x, e.clientY - d.y) < 8 && performance.now() - d.t < 450;
      if (!tap) return;
      if (e.pointerType !== 'mouse') {
        if (document.activeElement !== c) c.focus({ preventScroll: true });
        this.pick(e.clientX, e.clientY, true);
      }
    });
    this.on(this.canvas, 'pointermove', (e) => {
      if (e.pointerType !== 'mouse' || e.buttons) return;
      this.pick(e.clientX, e.clientY, false);
    });
    this.on(this.canvas, 'pointerleave', () => this.setHover(-1));
    // wheel: zoom only once the model has focus (or with ctrl = trackpad pinch); otherwise scroll the page
    this.on(
      this.canvas,
      'wheel',
      (e) => {
        this.controls.enableZoom = this.active || e.ctrlKey;
        if (!this.controls.enableZoom) this.showHint('Click the model first, then scroll to zoom');
      },
      { capture: true, passive: true },
    );
    this.on(c, 'keydown', (e) => {
      if (e.target !== c) return;
      const k = e.key;
      const turn = Math.PI / 12;
      if (k === 'ArrowLeft') this.controls.rotateLeft(turn);
      else if (k === 'ArrowRight') this.controls.rotateLeft(-turn);
      else if (k === 'ArrowUp') this.controls.rotateUp(turn / 1.5);
      else if (k === 'ArrowDown') this.controls.rotateUp(-turn / 1.5);
      else if (k === '+' || k === '=') this.controls.dollyIn(1.2);
      else if (k === '-' || k === '_') this.controls.dollyOut(1.2);
      else if (k === 'Home' || k === '0') this.resetView();
      else return;
      e.preventDefault();
      this.userMoved = true;
      this.camTween = null;
      this.invalidate();
    });
    this.on(this.canvas, 'webglcontextlost' as keyof HTMLElementEventMap, (e) => {
      e.preventDefault();
      this.onError?.(new Error('WebGL context lost'));
    });
  }

  private pick(clientX: number, clientY: number, sticky: boolean) {
    const r = this.canvas.getBoundingClientRect();
    this.pointer.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const meshes = this.handles.filter((h, i) => h.node.visible && this.display[i]!.opacity > 0.4).map((h) => h.solid);
    const hit = this.raycaster.intersectObjects(meshes, false)[0];
    const i = hit ? this.handles.findIndex((h) => h.solid === hit.object) : -1;
    this.setHover(i, clientX - r.left, clientY - r.top);
    if (sticky && i >= 0) {
      clearTimeout(this.tipTimer);
      this.tipTimer = window.setTimeout(() => this.setHover(-1), 2800);
    }
  }

  private setHover(i: number, x = 0, y = 0) {
    if (i !== this.hovered) {
      this.hovered = i;
      this.applyAll();
      this.invalidate();
    }
    if (i < 0) {
      this.tip.hidden = true;
      this.canvas.style.cursor = '';
      return;
    }
    const l = partLabel(this.handles[i]!.part, this.cutList);
    this.tip.textContent = '';
    const b = document.createElement('b');
    b.textContent = l.name;
    this.tip.append(b, ` · ${l.detail}`);
    if (l.note) {
      const n = document.createElement('span');
      n.className = 'g3d-tip-note';
      n.textContent = l.note;
      this.tip.append(n);
    }
    this.tip.hidden = false;
    this.canvas.style.cursor = 'grab';
    const cw = this.container.clientWidth;
    const tw = this.tip.offsetWidth;
    const left = Math.max(6, Math.min(cw - tw - 6, x + 14));
    const top = Math.max(6, y - this.tip.offsetHeight - 10);
    this.tip.style.transform = `translate(${left}px, ${top}px)`;
  }

  private showHint(text: string) {
    this.hint.textContent = text;
    this.hint.hidden = false;
    clearTimeout(this.hintTimer);
    this.hintTimer = window.setTimeout(() => this.hideHint(), 1600);
  }

  private hideHint() {
    this.hint.hidden = true;
  }
}

export type { View, GuideStepLike };
export { playSequence, stepPartsSummary } from './timeline';
