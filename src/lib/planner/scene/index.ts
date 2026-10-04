// The planner's Three.js scene. Imperative; the Preact app feeds it state and listens
// for picks and drags. Loaded lazily (dynamic import) so three.js only downloads on
// pages that show a planner.
//
// World axes: x = east, y = up, z = south (local feet (e, n) -> (e, up, -n)).

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { LayoutItem, ParkLayout, ThemeId } from '../../types';
import type { LocalSite } from '../localsite';
import type { Vec2 } from '../geo';
import { siteToLocal } from '../rect';
import { sunPosition } from '../sun';
import { classify, type GridSpec } from '../sunhours';
import { COLORS, W, buildAerial, buildBuildings, cellTexture, cityTreeSpecs, disposeTree, quad, ribbon, TreeInstances } from './builders';
import { ParkMeshes, type ParkMapping } from './park';
import { ExistingMeshes, type ExistingRender } from './existing';

export type ViewMode = '3d' | 'plan';
export type PickKind = 'item' | 'existing';

export interface SceneCallbacks {
  onSelect(sel: { kind: PickKind; id: string } | null): void;
  /** a drag finished: new position in the item's own frame (park feet for items, local feet for existing) */
  onDragEnd(kind: PickKind, id: string, p: Vec2): void;
  /** convert a ground point (local feet) to the item's frame and snap it */
  dragTransform(kind: PickKind, id: string, groundLocal: Vec2, grab: Vec2): { p: Vec2; preview: Vec2 } | null;
  /** may this kind be dragged right now? */
  canDrag(kind: PickKind): boolean;
  /** the camera moved: which way north points on screen (degrees clockwise from up) */
  onCamera?(northDeg: number): void;
}

export interface ParkState {
  layout: ParkLayout;
  map: ParkMapping;
  themes: { frame: ThemeId; front: ThemeId; back: ThemeId };
  overhang: { mask: Uint8Array; nx: number; ny: number; items: string[] } | null;
  grid: boolean;
  /** park-local -> local feet of the park's x0,y0 corner and axis directions (for plan view orientation) */
  axes: { origin: Vec2; x: Vec2; y: Vec2 };
}

const isCoarse = () => typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;

export class PlannerScene {
  readonly renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private persp: THREE.PerspectiveCamera;
  private ortho: THREE.OrthographicCamera;
  private camera: THREE.Camera;
  private controls: OrbitControls;
  private view: ViewMode = '3d';
  private sun = new THREE.DirectionalLight(0xffffff, 3.6);
  private hemi = new THREE.HemisphereLight(0xe3f1fb, 0xa39782, 0.95);
  private site: LocalSite | null = null;
  private siteGroup = new THREE.Group();
  private cityTrees = new TreeInstances(256);
  private park = new ParkMeshes();
  private existing = new ExistingMeshes();
  private heat = new THREE.Group();
  private planVeil: THREE.Mesh;
  private aerial: { mesh: THREE.Mesh; dispose: () => void } | null = null;
  private dirty = true;
  private raf = 0;
  private visible = true;
  private ro: ResizeObserver;
  private io: IntersectionObserver;
  private parkState: ParkState | null = null;
  private items: LayoutItem[] = [];
  private selected: string | null = null;
  private existingItems: ExistingRender[] = [];
  private existingMarkers = true;
  private drag: {
    kind: PickKind;
    id: string;
    pointerId: number;
    start: [number, number];
    grab: Vec2;
    moved: boolean;
    last: Vec2 | null;
  } | null = null;
  private raycaster = new THREE.Raycaster();
  private ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private mobile = isCoarse();
  private disposed = false;
  lost = false;

  constructor(
    private container: HTMLElement,
    private cb: SceneCallbacks,
  ) {
    const canvas = document.createElement('canvas');
    canvas.className = 'pl-canvas';
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', '3D view of your lot and park design');
    canvas.tabIndex = -1;
    container.appendChild(canvas);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'default' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.mobile ? 1.5 : 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    // The shadow pass is most of the frame cost; redo it only when the sun or the
    // scene changes, not while the camera orbits.
    this.renderer.shadowMap.autoUpdate = false;
    this.scene.background = new THREE.Color(COLORS.sky);
    this.scene.fog = new THREE.Fog(COLORS.sky, 500, 1200);

    this.persp = new THREE.PerspectiveCamera(40, 1, 1, 4000);
    this.ortho = new THREE.OrthographicCamera(-50, 50, 50, -50, 1, 2000);
    this.camera = this.persp;

    this.sun.castShadow = true;
    const sm = this.mobile ? 1024 : 2048;
    this.sun.shadow.mapSize.set(sm, sm);
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.4;
    this.sun.shadow.radius = 3;
    this.scene.add(this.sun, this.sun.target, this.hemi);

    const outer = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: COLORS.ground }));
    outer.position.y = -0.1;
    outer.receiveShadow = true;
    this.scene.add(outer);

    this.planVeil = new THREE.Mesh(
      new THREE.PlaneGeometry(3000, 3000).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.2, depthWrite: false }),
    );
    this.planVeil.position.y = 0.04;
    this.planVeil.visible = false;
    this.planVeil.renderOrder = 1;

    this.scene.add(this.siteGroup, this.cityTrees.group, this.park.group, this.existing.group, this.heat, this.planVeil);

    canvas.addEventListener('pointerdown', this.onPointerDown, { capture: true });
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointercancel', this.onPointerUp);
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.lost = true;
    });
    this.controls = this.makeControls();

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(container);
    this.io = new IntersectionObserver((es) => {
      this.visible = es.some((e) => e.isIntersecting);
      if (this.visible) this.requestRender();
    });
    this.io.observe(container);
    this.resize();
    this.loop();
    if (import.meta.env.DEV) (window as unknown as { __plannerScene?: PlannerScene }).__plannerScene = this;
  }

  /** debugging: the raw Three.js scene */
  get three() {
    return this.scene;
  }

  // ---- camera & controls ----

  private makeControls() {
    this.controls?.dispose();
    const c = new OrbitControls(this.camera, this.renderer.domElement);
    c.addEventListener('change', () => this.requestRender());
    if (this.view === 'plan') {
      c.enableRotate = false;
      c.screenSpacePanning = true;
      c.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
      c.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_PAN };
      c.minZoom = 0.3;
      c.maxZoom = 12;
    } else {
      c.enableDamping = true;
      c.dampingFactor = 0.12;
      c.maxPolarAngle = Math.PI * 0.47;
      c.minDistance = 12;
      c.maxDistance = 700;
      c.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
    }
    return c;
  }

  private lotCenterWorld(): THREE.Vector3 {
    if (!this.site) return new THREE.Vector3();
    const c = siteToLocal(this.site.frame, [this.site.frame.lengthFt / 2, this.site.frame.widthFt / 2]);
    return W(c[0], c[1], 0);
  }

  resetCamera() {
    const site = this.site;
    if (!site) return;
    const f = site.frame;
    const target = this.lotCenterWorld();
    if (this.view === '3d') {
      const span = Math.max(f.lengthFt, f.widthFt * 1.6, 40);
      const dist = span * 1.25 + 45;
      // stand in the street off the entrance, a little to the right, and look down into the lot
      const dirLocal: Vec2 = [-f.u[0] * 0.92 - f.v[0] * 0.38, -f.u[1] * 0.92 - f.v[1] * 0.38];
      // look down more steeply into narrow lots between rowhouses
      const elev = f.widthFt < 26 ? 1.0 : 0.88;
      const h = Math.cos(elev) * dist;
      this.persp.position.copy(target.clone().add(new THREE.Vector3(dirLocal[0] * h, Math.sin(elev) * dist, -dirLocal[1] * h)));
      this.persp.up.set(0, 1, 0);
      this.persp.lookAt(target);
    } else {
      const ax = this.parkState?.axes;
      // screen-right = park +x (length, entrance on the left) like the paper pieces
      const yDir: Vec2 = ax ? [-ax.x[1], ax.x[0]] : f.v;
      this.ortho.position.copy(target.clone().add(new THREE.Vector3(0, 600, 0)));
      this.ortho.up.set(yDir[0], 0, -yDir[1]).normalize();
      this.ortho.lookAt(target);
      this.ortho.zoom = 1;
      this.fitOrtho();
    }
    this.controls = this.makeControls();
    this.controls.target.copy(target);
    this.controls.update();
    this.requestRender();
  }

  private fitOrtho() {
    const el = this.container;
    const aspect = Math.max(0.2, el.clientWidth / Math.max(1, el.clientHeight));
    const f = this.site?.frame;
    const L = Math.max(f?.lengthFt ?? 50, this.parkState?.layout.lengthFt ?? 0) + 14;
    const Wd = Math.max(f?.widthFt ?? 20, this.parkState?.layout.widthFt ?? 0) + 14;
    // park length runs across the screen
    let halfW = L / 2;
    let halfH = Wd / 2;
    if (halfW / halfH > aspect) halfH = halfW / aspect;
    else halfW = halfH * aspect;
    this.ortho.left = -halfW;
    this.ortho.right = halfW;
    this.ortho.top = halfH;
    this.ortho.bottom = -halfH;
    this.ortho.updateProjectionMatrix();
  }

  setView(v: ViewMode) {
    if (v === this.view) return;
    this.view = v;
    this.camera = v === '3d' ? this.persp : this.ortho;
    this.planVeil.visible = v === 'plan' && Boolean(this.aerial?.mesh.visible);
    this.resetCamera();
  }

  zoomBy(f: number) {
    if (this.view === 'plan') {
      this.ortho.zoom = Math.max(0.3, Math.min(12, this.ortho.zoom * f));
      this.ortho.updateProjectionMatrix();
    } else {
      const t = this.controls.target;
      const off = this.persp.position.clone().sub(t).multiplyScalar(1 / f);
      const len = Math.max(12, Math.min(700, off.length()));
      this.persp.position.copy(t.clone().add(off.setLength(len)));
    }
    this.controls.update();
    this.requestRender();
  }

  // ---- content ----

  setSite(site: LocalSite) {
    this.renderer.shadowMap.needsUpdate = true;
    this.site = site;
    disposeTree(this.siteGroup);
    this.siteGroup.clear();
    this.aerial?.dispose();
    this.siteGroup.add(buildBuildings(site.buildings));
    const outline = ribbon(site.parcel, 0.7, 0.45, COLORS.parcel);
    outline.renderOrder = 4;
    this.siteGroup.add(outline);
    this.aerial = buildAerial(site.lf, site.extentFt, this.mobile ? 19 : 20, () => this.requestRender());
    this.siteGroup.add(this.aerial.mesh);
    this.cityTrees.set(cityTreeSpecs(site.trees));
    const ext = Math.max(90, Math.max(site.frame.lengthFt, site.frame.widthFt) / 2 + 70);
    const sc = this.sun.shadow.camera;
    sc.left = -ext;
    sc.right = ext;
    sc.top = ext;
    sc.bottom = -ext;
    sc.near = 1;
    sc.far = 1400;
    sc.updateProjectionMatrix();
    this.scene.fog = new THREE.Fog(COLORS.sky, site.extentFt * 1.6, site.extentFt * 4);
    this.resetCamera();
  }

  setShow(flags: { aerial: boolean; cityTrees: boolean }) {
    this.renderer.shadowMap.needsUpdate = true;
    if (this.aerial) this.aerial.mesh.visible = flags.aerial;
    this.planVeil.visible = this.view === 'plan' && flags.aerial;
    this.cityTrees.group.visible = flags.cityTrees;
    this.requestRender();
  }

  setPark(state: ParkState | null, items: LayoutItem[] = state?.layout.items ?? []) {
    this.renderer.shadowMap.needsUpdate = true;
    const hadAxes = this.parkState?.axes;
    this.parkState = state;
    this.park.group.visible = Boolean(state);
    if (state) {
      this.park.setLayout(state.layout, state.map, { themes: state.themes, overhangMask: state.overhang, grid: state.grid });
      this.items = items;
      this.refreshItems();
      // plan view follows the park's orientation (after flip/turn)
      if (this.view === 'plan' && hadAxes && (hadAxes.x[0] !== state.axes.x[0] || hadAxes.x[1] !== state.axes.x[1])) this.resetCamera();
    }
    this.requestRender();
  }

  private dragPreview: { id: string; x: number; y: number; rotationDeg: number } | null = null;

  private refreshItems() {
    this.renderer.shadowMap.needsUpdate = true;
    const st = this.parkState;
    if (!st) return;
    this.park.setItems(this.items, { selected: this.selected, overhang: new Set(st.overhang?.items ?? []), dragging: this.dragPreview }, st.themes);
  }

  setSelection(id: string | null) {
    this.selected = id;
    this.refreshItems();
    this.refreshExisting();
    this.requestRender();
  }

  setExisting(items: ExistingRender[], showMarkers: boolean) {
    this.existingItems = items;
    this.existingMarkers = showMarkers;
    this.refreshExisting();
    this.requestRender();
  }

  private existingPreview: { id: string; x: number; y: number } | null = null;

  private refreshExisting() {
    this.renderer.shadowMap.needsUpdate = true;
    const items = this.existingPreview
      ? this.existingItems.map((e) => (e.id === this.existingPreview!.id ? { ...e, x: this.existingPreview!.x, y: this.existingPreview!.y } : e))
      : this.existingItems;
    this.existing.set(items, { showMarkers: this.existingMarkers, selected: this.selected });
  }

  setSun(date: Date) {
    this.renderer.shadowMap.needsUpdate = true;
    const site = this.site;
    if (!site) return;
    const p = sunPosition(date, site.lf.origin[1], site.lf.origin[0]);
    const target = this.lotCenterWorld();
    const d = new THREE.Vector3(p.dir[0], p.dir[2], -p.dir[1]);
    this.sun.position.copy(target.clone().add(d.multiplyScalar(600)));
    this.sun.target.position.copy(target);
    this.sun.target.updateMatrixWorld();
    const up = Math.max(0, Math.min(1, p.altitudeDeg / 12));
    this.sun.intensity = 3.6 * up;
    this.sun.visible = p.altitudeDeg > 0;
    const warm = Math.max(0, 1 - p.altitudeDeg / 25);
    this.sun.color.setRGB(1, 1 - 0.18 * warm, 1 - 0.38 * warm);
    this.hemi.intensity = 0.7 + 0.25 * up;
    (this.scene.background as THREE.Color).set(p.altitudeDeg > 0 ? COLORS.sky : 0xc8d2dc);
    this.requestRender();
    return p;
  }

  setHeat(data: { spec: GridSpec; hours: Float32Array } | null, visible: boolean) {
    disposeTree(this.heat);
    this.heat.clear();
    if (!data || !visible) {
      this.requestRender();
      return;
    }
    const { spec, hours } = data;
    const col = (h: number) => {
      if (Number.isNaN(h)) return null;
      const c = classify(h);
      return c === 'sun' ? 'rgba(255,176,0,0.78)' : c === 'part' ? 'rgba(126,196,230,0.8)' : 'rgba(36,64,128,0.82)';
    };
    const tex = cellTexture(spec.nx, spec.ny, (i, j) => col(hours[j * spec.nx + i]!));
    const corner = (a: number, b: number): Vec2 => [
      spec.origin[0] + a * spec.cellFt * spec.ux[0] + b * spec.cellFt * spec.uy[0],
      spec.origin[1] + a * spec.cellFt * spec.ux[1] + b * spec.cellFt * spec.uy[1],
    ];
    const q = quad(
      [corner(0, 0), corner(spec.nx, 0), corner(spec.nx, spec.ny), corner(0, spec.ny)],
      0.62,
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide }),
    );
    q.renderOrder = 5;
    this.heat.add(q);
    this.requestRender();
  }

  // ---- picking & dragging ----

  private ndc(e: PointerEvent): THREE.Vector2 {
    const r = this.renderer.domElement.getBoundingClientRect();
    return new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  }

  private groundPoint(e: PointerEvent): Vec2 | null {
    this.raycaster.setFromCamera(this.ndc(e), this.camera);
    const p = new THREE.Vector3();
    if (!this.raycaster.ray.intersectPlane(this.ground, p)) return null;
    return [p.x, -p.z];
  }

  private pick(e: PointerEvent): { kind: PickKind; id: string } | null {
    this.raycaster.setFromCamera(this.ndc(e), this.camera);
    const cands = [
      ...this.existing.pickables().map((p) => ({ ...p, kind: 'existing' as PickKind })),
      ...(this.park.group.visible ? this.park.pickables().map((p) => ({ ...p, kind: 'item' as PickKind })) : []),
    ].filter((c) => c.object.visible !== false);
    const hits = this.raycaster.intersectObjects(
      cands.map((c) => c.object),
      false,
    );
    for (const h of hits) {
      const c = cands.find((x) => x.object === h.object);
      const id = c?.idOf(h.instanceId);
      if (c && id) return { kind: c.kind, id };
    }
    return null;
  }

  private onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    // focus the canvas so the planner's keyboard shortcuts work after a click
    if (e.pointerType === 'mouse') this.renderer.domElement.focus({ preventScroll: true });
    const hit = this.pick(e);
    if (!hit) {
      this.drag = null;
      this.pendingDeselect = { x: e.clientX, y: e.clientY };
      return;
    }
    this.pendingDeselect = null;
    this.cb.onSelect(hit);
    if (!this.cb.canDrag(hit.kind)) return;
    const g = this.groundPoint(e);
    if (!g) return;
    // grab offset: where on the item we grabbed, so it doesn't jump
    const center = this.centerOf(hit);
    this.drag = { ...hit, pointerId: e.pointerId, start: [e.clientX, e.clientY], grab: center ? [g[0] - center[0], g[1] - center[1]] : [0, 0], moved: false, last: null };
    this.controls.enabled = false;
    e.stopPropagation();
    try {
      this.renderer.domElement.setPointerCapture(e.pointerId);
    } catch {
      /* synthetic or already-gone pointer */
    }
  };

  private pendingDeselect: { x: number; y: number } | null = null;

  private centerOf(hit: { kind: PickKind; id: string }): Vec2 | null {
    if (hit.kind === 'existing') {
      const it = this.existingItems.find((x) => x.id === hit.id);
      return it ? [it.x, it.y] : null;
    }
    const it = this.items.find((x) => x.id === hit.id);
    return it && this.parkState ? this.parkState.map.toLocal([it.x, it.y]) : null;
  }

  private onPointerMove = (e: PointerEvent) => {
    const d = this.drag;
    if (!d || e.pointerId !== d.pointerId) return;
    if (!d.moved && Math.hypot(e.clientX - d.start[0], e.clientY - d.start[1]) < 4) return;
    d.moved = true;
    const g = this.groundPoint(e);
    if (!g) return;
    const r = this.cb.dragTransform(d.kind, d.id, g, d.grab);
    if (!r) return;
    d.last = r.p;
    if (d.kind === 'item') {
      const it = this.items.find((x) => x.id === d.id);
      if (it) this.dragPreview = { id: d.id, x: r.p[0], y: r.p[1], rotationDeg: it.rotationDeg };
      this.refreshItems();
    } else {
      this.existingPreview = { id: d.id, x: r.preview[0], y: r.preview[1] };
      this.refreshExisting();
    }
    this.requestRender();
  };

  private onPointerUp = (e: PointerEvent) => {
    const d = this.drag;
    if (this.pendingDeselect && Math.hypot(e.clientX - this.pendingDeselect.x, e.clientY - this.pendingDeselect.y) < 5) {
      this.cb.onSelect(null);
    }
    this.pendingDeselect = null;
    if (!d || e.pointerId !== d.pointerId) return;
    this.drag = null;
    this.controls.enabled = true;
    try {
      this.renderer.domElement.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    if (d.moved && d.last) this.cb.onDragEnd(d.kind, d.id, d.last);
    this.dragPreview = null;
    this.existingPreview = null;
  };

  // ---- rendering ----

  requestRender(shadows = false) {
    this.dirty = true;
    if (shadows) this.renderer.shadowMap.needsUpdate = true;
  }

  private resize() {
    const el = this.container;
    const w = Math.max(1, el.clientWidth);
    const h = Math.max(1, el.clientHeight);
    this.renderer.setSize(w, h, false);
    this.persp.aspect = w / h;
    this.persp.updateProjectionMatrix();
    if (this.view === 'plan') this.fitOrtho();
    this.requestRender();
  }

  private loop = () => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    if (!this.visible) return;
    if (this.view === '3d' && this.controls.enableDamping && this.controls.update()) this.dirty = true;
    if (this.dirty) {
      this.dirty = false;
      this.renderer.render(this.scene, this.camera);
      const n = this.northDeg();
      if (Math.abs(n - this.lastNorth) > 0.5) {
        this.lastNorth = n;
        this.cb.onCamera?.(n);
      }
    }
  };

  private lastNorth = Infinity;

  /** Which way north points on screen, degrees clockwise from straight up. */
  northDeg(): number {
    const cam = this.camera as THREE.PerspectiveCamera | THREE.OrthographicCamera;
    if (this.view === 'plan') {
      // screen up = camera.up (horizontal); screen right = up turned clockwise
      const up: Vec2 = [cam.up.x, -cam.up.z];
      const right: Vec2 = [up[1], -up[0]];
      return (Math.atan2(right[1], up[1]) * 180) / Math.PI;
    }
    const f = this.controls.target.clone().sub(cam.position);
    const fe = f.x;
    const fn = -f.z;
    return (Math.atan2(-fe, fn) * 180) / Math.PI;
  }

  /** PNG of the current view (or another one), as a data URL. */
  snapshot(view: ViewMode = this.view, size?: { w: number; h: number }): string {
    const prevView = this.view;
    const keep = { pos: this.persp.position.clone(), target: this.controls.target.clone() };
    if (view !== prevView) this.setView(view);
    const o = this.ortho;
    const savedOrtho = { left: o.left, right: o.right, top: o.top, bottom: o.bottom, zoom: o.zoom };
    const savedPos = o.position.clone();
    if (size) {
      this.renderer.setPixelRatio(1);
      this.renderer.setSize(size.w, size.h, false);
      this.persp.aspect = size.w / size.h;
      this.persp.updateProjectionMatrix();
      if (this.view === 'plan') {
        o.position.copy(this.lotCenterWorld().add(new THREE.Vector3(0, 600, 0)));
        o.lookAt(this.lotCenterWorld());
        const aspect = size.w / size.h;
        const f = this.site?.frame;
        const L = Math.max(f?.lengthFt ?? 50, this.parkState?.layout.lengthFt ?? 0) + 10;
        const Wd = Math.max(f?.widthFt ?? 20, this.parkState?.layout.widthFt ?? 0) + 10;
        let hw = L / 2;
        let hh = Wd / 2;
        if (hw / hh > aspect) hh = hw / aspect;
        else hw = hh * aspect;
        Object.assign(this.ortho, { left: -hw, right: hw, top: hh, bottom: -hh, zoom: 1 });
        this.ortho.updateProjectionMatrix();
      }
    }
    this.renderer.render(this.scene, this.camera);
    const url = this.renderer.domElement.toDataURL('image/png');
    if (size) {
      Object.assign(o, savedOrtho);
      o.position.copy(savedPos);
      o.lookAt(this.controls.target);
      o.updateProjectionMatrix();
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.mobile ? 1.5 : 2));
      this.resize();
    }
    if (view !== prevView) {
      this.setView(prevView);
      if (prevView === '3d') {
        // put the person's 3D camera back where it was
        this.persp.position.copy(keep.pos);
        this.controls.target.copy(keep.target);
        this.controls.update();
      }
    }
    this.requestRender();
    return url;
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.io.disconnect();
    this.controls.dispose();
    this.aerial?.dispose();
    disposeTree(this.siteGroup);
    this.park.dispose();
    this.existing.dispose();
    this.cityTrees.dispose();
    disposeTree(this.heat);
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
