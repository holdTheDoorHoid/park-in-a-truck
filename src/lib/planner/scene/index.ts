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
import { phillyDate, sunPosition } from '../sun';
import type { GridSpec } from '../sunhours';
import { COLORS, W, buildAerial, buildBuildings, cityTreeSpecs, disposeTree, TreeInstances, type AerialGround } from './builders';
import { autumnTint, leafFraction } from '../treemodel';
import { heatMesh, spotMarker } from './sunlayers';
import { ParkMeshes, itemFootprint, type ParkMapping } from './park';
import { ExistingMeshes, existingFootprint, type ExistingRender } from './existing';
import { Overlays, type Footprint } from './overlays';
import { catalogEntry } from '../catalog';
import { CLOSE_PX, DragGesture, isTurnable, turnFromDrag, type Pose } from '../interact';
import { groundOf } from '../ground';
import { SlopeOverlay, drapedRibbon, rayGround } from './terrain';
import { OutlineTool } from './outline';

export type ViewMode = '3d' | 'plan';
export type PickKind = 'item' | 'existing';
export interface Picked {
  kind: PickKind;
  id: string;
}

/** What the person is doing with the mouse right now (for the on-screen hint). */
export interface GestureInfo {
  mode: 'move' | 'turn';
  /** it would hang off the lot where it is now */
  over: boolean;
  /** turning: the angle it would be left at (its own frame, degrees) */
  deg?: number;
}

type PointerAt = { clientX: number; clientY: number; shiftKey?: boolean; altKey?: boolean; pointerType?: string };

export interface SceneCallbacks {
  onSelect(sel: Picked | null): void;
  /** may this kind be picked up and moved? */
  canDrag(kind: PickKind): boolean;
  /**
   * Where a dragged thing goes: the ground point under the pointer (local feet) less the
   * grab offset, in the thing's own frame (park feet for items, local feet for existing),
   * snapped to the grid unless `free` (Alt held).
   */
  dragTransform(kind: PickKind, id: string, groundLocal: Vec2, grab: Vec2, free: boolean): Vec2 | null;
  /** would this park item hang off the lot at this pose? (drawn red) */
  sticksOut?(id: string, pose: Pose): boolean;
  /** a move finished: new position in the thing's own frame. One call = one undo step. */
  onDragEnd(kind: PickKind, id: string, p: Vec2): void;
  /** a turn with the handle finished: new rotation in the thing's own frame */
  onTurnEnd?(kind: PickKind, id: string, deg: number): void;
  /** right-click or long-press on a thing */
  onMenu?(sel: Picked, at: { clientX: number; clientY: number }): void;
  /** a move or turn started, changed, or ended (null) */
  onGesture?(g: GestureInfo | null): void;
  /** the camera moved: which way north points on screen (degrees clockwise from up) */
  onCamera?(northDeg: number): void;
  /** terrain: drawing a wet area's outline — the number of points so far (null = drawing ended) */
  onDraw?(points: number | null): void;
  /** terrain: an outline was finished (local feet, at least 3 points) */
  onDrawDone?(points: Vec2[]): void;
  /** terrain: corners of an outlined wet area were moved (offsets in feet east/north of its centre) */
  onOutlineEdit?(id: string, outline: [number, number][]): void;
  /** a click or tap on empty ground (no drag): the ground point, local feet (sun step: chart that spot) */
  onGroundClick?(p: Vec2): void;
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

/** id of the palette item shown while it is dragged over the view (never picked) */
export const GHOST_ID = '__palette-drop';

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
  /** the spot whose sun through the year is charted (shadows workstream) */
  private spot = new THREE.Group();
  private aerial: AerialGround | null = null;
  /** plain ground beyond the aerial photo */
  private outer: THREE.Mesh;
  /** terrain: contour lines, drain arrows, high/low points */
  private slope = new SlopeOverlay();
  private slopeOn = false;
  /** terrain: drawing a wet area's outline, and moving its corners */
  private outline = new OutlineTool();
  private drawDown: { x: number; y: number; id: number; touch: boolean } | null = null;
  private photoOn = true;
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
  private overlays = new Overlays();
  private gesture: {
    g: DragGesture;
    kind: PickKind;
    id: string;
    pointerId: number;
    /** move: where on the thing it was grabbed (local feet from its centre) */
    grab: Vec2;
    /** turn: the thing's centre and the grab point, in its own frame */
    center: Vec2;
    grabFrame: Vec2;
    last: PointerAt;
    longPress?: ReturnType<typeof setTimeout>;
  } | null = null;
  private hover: Picked | null = null;
  private hoverAt: PointerAt | null = null;
  private cursor = '';
  /** a palette item being dragged over the view */
  private ghost: { item: LayoutItem; over: boolean } | null = null;
  private rightDown: { x: number; y: number } | null = null;
  private touches = new Set<number>();
  /** a second finger cancelled a drag: leave the camera alone until all fingers lift */
  private holdControls = false;
  private tmp = { m: new THREE.Matrix4(), p: new THREE.Vector3(), q: new THREE.Quaternion(), s: new THREE.Vector3() };
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
    this.outer = outer;

    // (the plan view's light veil over the photo is part of the aerial ground: AerialGround.setVeil)
    this.scene.add(this.siteGroup, this.cityTrees.group, this.park.group, this.existing.group, this.heat, this.spot, this.overlays.group);
    this.scene.add(this.slope.group, this.outline.group);

    canvas.addEventListener('pointerdown', this.onPointerDown, { capture: true });
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointercancel', this.onPointerCancel);
    canvas.addEventListener('pointerleave', this.onPointerLeave);
    canvas.addEventListener('contextmenu', this.onContextMenu);
    canvas.addEventListener('dblclick', this.onDblClick);
    window.addEventListener('keydown', this.onKey, { capture: true });
    window.addEventListener('keyup', this.onKey, { capture: true });
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
    this.cancelDrag();
    this.view = v;
    this.camera = v === '3d' ? this.persp : this.ortho;
    // the plan view's light veil over the photo lies on the ground (terrain)
    this.aerial?.setVeil(v === 'plan');
    this.slope.setView(v);
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
    // the same lot again with its ground heights filled in (terrain loads after the lot): keep the camera
    const sameLot = this.site?.ctx.lot === site.ctx.lot && this.site?.frame.lengthFt === site.frame.lengthFt;
    this.site = site;
    const ground = groundOf(site);
    this.overlays.setGround(ground);
    this.existing.setGround(ground);
    this.outline.setGround(ground);
    disposeTree(this.siteGroup);
    this.siteGroup.clear();
    this.aerial?.dispose();
    this.siteGroup.add(buildBuildings(site.buildings));
    const outline = drapedRibbon(site.parcel, 0.7, 0.45, COLORS.parcel, ground);
    outline.renderOrder = 4;
    this.siteGroup.add(outline);
    this.aerial = buildAerial(site.lf, site.extentFt, this.mobile ? 19 : 20, () => this.requestRender(), site.ground);
    this.aerial.setPhoto(this.photoOn);
    this.aerial.setVeil(this.view === 'plan');
    this.siteGroup.add(this.aerial.mesh);
    this.outer.position.y = this.aerial.edgeMin - 0.1;
    this.slope.set(site, this.slopeOn);
    // trees stand on the ground under their trunks (City trees and trees on the lot)
    const treeGround = site.ground ? ground : null;
    this.cityTrees.setGround(treeGround);
    this.existing.group.traverse((o) => (o.userData.treeInstances as TreeInstances | undefined)?.setGround(treeGround));
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
    if (!sameLot) this.resetCamera();
    else this.requestRender();
  }

  /** terrain: show the slope overlay (contour lines, arrows downhill, high and low points) */
  setSlope(on: boolean) {
    if (on === this.slopeOn) return;
    this.slopeOn = on;
    this.slope.set(this.site, on);
    this.requestRender();
  }

  setShow(flags: { aerial: boolean; cityTrees: boolean }) {
    this.renderer.shadowMap.needsUpdate = true;
    // terrain: with the photo off the ground keeps its shape (plain colour)
    this.photoOn = flags.aerial;
    this.aerial?.setPhoto(flags.aerial);
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

  private dragPreview: { id: string; x: number; y: number; rotationDeg: number; over?: boolean } | null = null;

  /** Redraw the park's items (after a change, a hover, a drag step). `shadows` = positions changed. */
  private refreshItems(shadows = true) {
    if (shadows) this.renderer.shadowMap.needsUpdate = true;
    const st = this.parkState;
    if (!st) return;
    const items = this.ghost ? [...this.items, this.ghost.item] : this.items;
    this.park.setItems(
      items,
      { selected: this.selected, hover: this.hover?.id ?? null, overhang: new Set(st.overhang?.items ?? []), dragging: this.dragPreview },
      st.themes,
    );
    this.refreshOverlay();
  }

  setSelection(id: string | null) {
    this.selected = id;
    this.refreshItems(false);
    this.refreshExisting(false);
    this.requestRender();
  }

  /** terrain: corner handles on the picked wet area when it has a drawn outline */
  private syncOutlineEdit() {
    const id = this.selected;
    const saved = id && !this.outline.draft ? this.existingItems.find((x) => x.id === id) : undefined;
    const now = saved ? this.existingNow().find((x) => x.id === id) : undefined;
    const ok = saved && now && saved.element === 'wet-area' && saved.outline && saved.outline.length >= 3 && this.cb.canDrag('existing');
    if (!ok) {
      if (this.outline.edit) this.outline.setEdit(null);
      return;
    }
    const e = this.outline.edit;
    if (e && e.id === saved.id && e.center[0] === now.x && e.center[1] === now.y && e.outline === saved.outline) return;
    this.outline.setEdit({ id: saved.id, center: [now.x, now.y], outline: saved.outline! });
  }

  // ---- terrain: drawing a wet area's outline ----

  /** Start drawing an outline: taps/clicks on the ground add points (drags still move the camera). */
  startDrawing() {
    if (this.outline.draft) return;
    this.cancelDrag();
    this.setHover(null);
    this.outline.start();
    this.outline.setEdit(null);
    this.setCursor('crosshair');
    this.cb.onDraw?.(0);
    this.requestRender();
  }

  /** Finish the outline (at least 3 points). Returns false when there are too few. */
  finishDrawing(): boolean {
    const d = this.outline.draft;
    if (!d || !d.canFinish) return false;
    const pts = d.points.map((p) => [p[0], p[1]] as Vec2);
    this.outline.stop();
    this.drawDown = null;
    this.setCursor('');
    this.cb.onDrawDone?.(pts);
    this.cb.onDraw?.(null);
    this.requestRender();
    return true;
  }

  cancelDrawing() {
    if (!this.outline.draft) return;
    this.outline.stop();
    this.drawDown = null;
    this.setCursor('');
    this.cb.onDraw?.(null);
    this.syncOutlineEdit();
    this.requestRender();
  }

  undoDrawPoint() {
    const d = this.outline.draft;
    if (!d) return;
    d.undo();
    this.outline.redraw();
    this.cb.onDraw?.(d.points.length);
    this.requestRender();
  }

  get drawing(): boolean {
    return Boolean(this.outline.draft);
  }

  private drawClick(e: PointerAt) {
    const d = this.outline.draft;
    const g = this.groundPoint(e);
    if (!d || !g) return;
    d.reproject(this.toScreen);
    const r = d.click(g, [e.clientX, e.clientY], e.pointerType === 'touch' || this.mobile ? CLOSE_PX.touch : CLOSE_PX.mouse);
    if (r === 'close') {
      this.finishDrawing();
      return;
    }
    this.outline.setHover(e.pointerType === 'touch' ? null : g, false);
    this.cb.onDraw?.(d.points.length);
    this.requestRender();
  }

  private onDblClick = (e: MouseEvent) => {
    if (!this.outline.draft) return;
    e.preventDefault();
    this.finishDrawing();
  };

  /** Let go of a wet area's corner: save the new outline (or put it back). */
  private endCornerDrag(commit: boolean) {
    const d = this.outline.drag;
    if (!d) return;
    const edit = this.outline.edit;
    try {
      this.renderer.domElement.releasePointerCapture(d.pointerId);
    } catch {
      /* already released */
    }
    const res = this.outline.endDrag(commit);
    if (!this.holdControls) this.controls.enabled = true;
    this.setCursor('');
    this.refreshExisting();
    this.cb.onGesture?.(null);
    if (res && edit) this.cb.onOutlineEdit?.(edit.id, res);
  }

  setExisting(items: ExistingRender[], showMarkers: boolean) {
    this.existingItems = items;
    this.existingMarkers = showMarkers;
    this.refreshExisting();
    this.requestRender();
  }

  private existingPreview: { id: string; x: number; y: number; rotationDeg: number } | null = null;

  private refreshExisting(shadows = true) {
    if (shadows) this.renderer.shadowMap.needsUpdate = true;
    this.existing.set(this.existingNow(), { showMarkers: this.existingMarkers, selected: this.selected });
    this.syncOutlineEdit();
    this.refreshOverlay();
  }

  /** existing things with the one being dragged at its preview pose (and a wet area's corner being moved) */
  private existingNow(): ExistingRender[] {
    const pv = this.existingPreview;
    const od = this.outline.drag && this.outline.edit ? { id: this.outline.edit.id, outline: this.outline.drag.outline } : null;
    if (!pv && !od) return this.existingItems;
    return this.existingItems.map((e) => {
      let r = e;
      if (pv && e.id === pv.id) r = { ...r, x: pv.x, y: pv.y, rotationDeg: pv.rotationDeg };
      if (od && e.id === od.id) r = { ...r, outline: od.outline };
      return r;
    });
  }

  /** park items with the one being dragged at its preview pose */
  private itemNow(id: string): LayoutItem | undefined {
    const it = this.items.find((x) => x.id === id);
    const pv = this.dragPreview;
    return it && pv && pv.id === id ? { ...it, x: pv.x, y: pv.y, rotationDeg: pv.rotationDeg } : it;
  }

  private kindOf(id: string): PickKind | null {
    if (this.parkState && this.park.group.visible && this.items.some((x) => x.id === id)) return 'item';
    if (this.existingItems.some((x) => x.id === id)) return 'existing';
    return null;
  }

  private footprintOf(id: string): Footprint | null {
    const kind = this.kindOf(id);
    if (kind === 'item') {
      const it = this.itemNow(id);
      return it && this.parkState ? itemFootprint(it, this.parkState.map) : null;
    }
    if (kind === 'existing') {
      const e = this.existingNow().find((x) => x.id === id);
      return e ? existingFootprint(e) : null;
    }
    return null;
  }

  private turnable(kind: PickKind, id: string): boolean {
    if (kind === 'item') {
      const it = this.items.find((x) => x.id === id);
      return Boolean(it) && it!.variant !== 'round' && isTurnable('item', it!.element, catalogEntry(it!.element).shape);
    }
    const e = this.existingItems.find((x) => x.id === id);
    return Boolean(e) && isTurnable('existing', e!.element);
  }

  /** hover outline, selection ring and fill, landing footprint, turn handle */
  private refreshOverlay() {
    const gs = this.gesture;
    const hover = this.hover && this.hover.id !== this.selected ? this.footprintOf(this.hover.id) : null;
    let selected: { f: Footprint; over: boolean; dragging: boolean } | null = null;
    let handle: Footprint | null = null;
    if (this.ghost && this.parkState) {
      selected = { f: itemFootprint(this.ghost.item, this.parkState.map), over: this.ghost.over, dragging: true };
    } else if (this.selected) {
      const kind = this.kindOf(this.selected);
      const f = this.footprintOf(this.selected);
      if (kind && f) {
        const live = gs && gs.id === this.selected && gs.g.preview ? gs : null;
        const over = live ? live.g.over : kind === 'item' && Boolean(this.parkState?.overhang?.items.includes(this.selected));
        const moving = Boolean(live && live.g.mode === 'move');
        selected = { f, over, dragging: moving };
        if (!moving && this.cb.canDrag(kind) && this.turnable(kind, this.selected)) handle = f;
      }
    }
    this.overlays.set({ hover, selected, handle });
    this.requestRender();
  }

  /** Show a palette item where it would land while it is dragged over the view (null = none). */
  setGhost(item: LayoutItem | null, over = false) {
    if (!item && !this.ghost) return;
    this.ghost = item ? { item, over } : null;
    this.refreshItems(false);
  }

  /** The ground point (local feet) under a screen point, or null when it is not over the view. */
  groundAtClient(clientX: number, clientY: number): Vec2 | null {
    const r = this.renderer.domElement.getBoundingClientRect();
    if (clientX < r.left || clientX > r.right || clientY < r.top || clientY > r.bottom) return null;
    return this.groundPoint({ clientX, clientY });
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
    // the trees' season on that date: bare in winter, in leaf in summer (treemodel.ts)
    const { month, day } = phillyDate(date);
    const leaf = leafFraction(month, day);
    const autumn = autumnTint(month, day);
    this.scene.traverse((o) => (o.userData.treeInstances as TreeInstances | undefined)?.setSeason(leaf, autumn));
    this.requestRender();
    return p;
  }

  /** The sun-hours map over the lot (draped over the ground when its heights are known). */
  setHeat(data: { spec: GridSpec; hours: Float32Array } | null, visible: boolean) {
    disposeTree(this.heat);
    this.heat.clear();
    if (data && visible) this.heat.add(heatMesh(data.spec, data.hours, this.site?.ground ? groundOf(this.site) : null));
    this.requestRender();
  }

  /** The pin on the spot whose sun through the year is charted (null = none). */
  setSpot(p: Vec2 | null) {
    disposeTree(this.spot);
    this.spot.clear();
    if (p && this.site) this.spot.add(spotMarker(p, groundOf(this.site)));
    this.requestRender();
  }

  // ---- picking & dragging ----
  //
  // Press on a thing and drag: it moves (never the camera). Press on empty ground: the
  // camera turns (3D) or slides (plan). The round handle on the selected thing turns it.
  // Esc while dragging puts it back. Right-click or a long press opens the little menu.

  private ndc(e: PointerAt): THREE.Vector2 {
    const r = this.renderer.domElement.getBoundingClientRect();
    return new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  }

  private groundPoint(e: PointerAt): Vec2 | null {
    this.raycaster.setFromCamera(this.ndc(e), this.camera);
    if (this.site?.ground) return rayGround(this.raycaster.ray.origin, this.raycaster.ray.direction, this.site.ground);
    const p = new THREE.Vector3();
    if (!this.raycaster.ray.intersectPlane(this.ground, p)) return null;
    return [p.x, -p.z];
  }

  /** a ground point (local feet) on screen, client pixels (null = behind the camera) */
  private toScreen = (p: Vec2): Vec2 | null => {
    const v = W(p[0], p[1], groundOf(this.site)(p[0], p[1])).project(this.camera);
    if (v.z > 1) return null;
    const r = this.renderer.domElement.getBoundingClientRect();
    return [r.left + ((v.x + 1) / 2) * r.width, r.top + ((1 - v.y) / 2) * r.height];
  };

  private pick(e: PointerAt): Picked | null {
    this.raycaster.setFromCamera(this.ndc(e), this.camera);
    const cands = [
      ...this.existing.pickables().map((p) => ({ ...p, kind: 'existing' as PickKind })),
      ...(this.park.group.visible ? this.park.pickables().map((p) => ({ ...p, kind: 'item' as PickKind })) : []),
    ].filter((c) => c.object.visible !== false);
    const hits = this.raycaster.intersectObjects(
      cands.map((c) => c.object),
      false,
    );
    // Tree crowns are big and airy: a bench standing under one is picked through it.
    let crown: { pick: Picked; x: number; z: number; r: number } | null = null;
    for (const h of hits) {
      const c = cands.find((x) => x.object === h.object);
      const id = c?.idOf(h.instanceId);
      if (!c || !id || id === GHOST_ID) continue;
      if (c.soft && h.instanceId != null) {
        if (!crown) {
          const t = this.tmp;
          (h.object as THREE.InstancedMesh).getMatrixAt(h.instanceId, t.m);
          t.m.decompose(t.p, t.q, t.s);
          crown = { pick: { kind: c.kind, id }, x: t.p.x, z: t.p.z, r: t.s.x };
        }
        continue;
      }
      if (!crown) return { kind: c.kind, id };
      if (Math.hypot(h.point.x - crown.x, h.point.z - crown.z) <= crown.r + 0.5) return { kind: c.kind, id };
      break;
    }
    return crown?.pick ?? null;
  }

  /**
   * Is the pointer on the turn handle's knob? Tested on screen. `strict` = on the drawn
   * knob; otherwise within a finger's reach of it (which only wins when nothing else is
   * under the pointer).
   */
  private onKnob(e: PointerAt): boolean {
    if (!this.overKnob(e)) return false;
    if (this.overKnob(e, true)) return true;
    return !this.pick(e);
  }

  private overKnob(e: PointerAt, strict = false): boolean {
    const k = this.overlays.knobAt;
    if (!k) return false;
    const v = k.clone().project(this.camera);
    if (v.z > 1) return false;
    const r = this.renderer.domElement.getBoundingClientRect();
    const x = r.left + ((v.x + 1) / 2) * r.width;
    const y = r.top + ((1 - v.y) / 2) * r.height;
    const reach = strict ? 14 : e.pointerType === 'touch' || this.mobile ? 26 : 18;
    return Math.hypot(e.clientX - x, e.clientY - y) <= reach;
  }

  private centerOf(hit: Picked): Vec2 | null {
    if (hit.kind === 'existing') {
      const it = this.existingItems.find((x) => x.id === hit.id);
      return it ? [it.x, it.y] : null;
    }
    const it = this.items.find((x) => x.id === hit.id);
    return it && this.parkState ? this.parkState.map.toLocal([it.x, it.y]) : null;
  }

  /** where a thing is now, in its own frame (park feet for items; local feet + saved turn for existing) */
  private poseOf(hit: Picked): Pose | null {
    if (hit.kind === 'existing') {
      const e = this.existingItems.find((x) => x.id === hit.id);
      return e ? { x: e.x, y: e.y, rotationDeg: e.ownRotationDeg ?? 0 } : null;
    }
    const it = this.items.find((x) => x.id === hit.id);
    return it ? { x: it.x, y: it.y, rotationDeg: it.rotationDeg } : null;
  }

  /** a ground point (local feet) in the thing's own frame */
  private toFrame(kind: PickKind, p: Vec2): Vec2 {
    return kind === 'item' && this.parkState ? this.parkState.map.toPark(p) : p;
  }

  /** Stop the camera's glide after a quick orbit, so the ground stays put under a dragged thing. */
  private settleCamera() {
    if (!this.controls.enableDamping) return;
    this.controls.enableDamping = false;
    this.controls.update();
    this.controls.enableDamping = true;
  }

  private setCursor(c: string) {
    if (c === this.cursor) return;
    this.cursor = c;
    this.renderer.domElement.style.cursor = c;
  }

  private setHover(h: Picked | null) {
    if ((h?.id ?? null) === (this.hover?.id ?? null)) return;
    this.hover = h;
    if (this.parkState) this.refreshItems(false);
    else this.refreshOverlay();
  }

  private updateHover(at: PointerAt) {
    if (this.gesture || this.outline.drag) return;
    if (this.outline.draft) {
      // terrain: the line from the last point follows the mouse; the first point lights up when a click would close
      const g = this.groundPoint(at);
      const d = this.outline.draft;
      d.reproject(this.toScreen);
      const first = d.points[0] ? this.toScreen(d.points[0]) : null;
      const hot = d.canFinish && Boolean(first) && Math.hypot(at.clientX - first![0], at.clientY - first![1]) <= CLOSE_PX.mouse;
      this.outline.setHover(g, hot);
      this.setCursor(hot ? 'pointer' : 'crosshair');
      this.requestRender();
      return;
    }
    if (this.outline.edit && this.cb.canDrag('existing') && this.outline.handleAt([at.clientX, at.clientY], this.toScreen, 11)) {
      this.setCursor('grab');
      this.setHover(null);
      return;
    }
    const onKnob = this.onKnob(at);
    let hit: Picked | null = null;
    if (!onKnob) {
      const p = this.pick(at);
      if (p && this.cb.canDrag(p.kind)) hit = p;
    }
    this.setCursor(onKnob || hit ? 'grab' : '');
    if (this.overlays.setKnobHot(onKnob)) this.requestRender();
    this.setHover(hit);
  }

  private startGesture(e: PointerEvent, hit: Picked, mode: 'move' | 'turn'): boolean {
    const g = this.groundPoint(e);
    const pose = this.poseOf(hit);
    const center = this.centerOf(hit);
    if (!g || !pose || !center) return false;
    this.gesture = {
      g: new DragGesture(mode, pose, [e.clientX, e.clientY], e.pointerType === 'touch' ? 8 : 4),
      kind: hit.kind,
      id: hit.id,
      pointerId: e.pointerId,
      grab: [g[0] - center[0], g[1] - center[1]],
      center: this.toFrame(hit.kind, center),
      grabFrame: this.toFrame(hit.kind, g),
      last: { clientX: e.clientX, clientY: e.clientY, shiftKey: e.shiftKey, altKey: e.altKey },
    };
    this.settleCamera();
    this.controls.enabled = false;
    this.setHover(null);
    this.setCursor('grabbing');
    try {
      this.renderer.domElement.setPointerCapture(e.pointerId);
    } catch {
      /* synthetic or already-gone pointer */
    }
    if (e.pointerType === 'touch' && mode === 'move') {
      const gs = this.gesture;
      gs.longPress = setTimeout(() => {
        if (this.gesture !== gs || gs.g.moved) return;
        this.endGesture(false);
        this.cb.onMenu?.(hit, { clientX: gs.last.clientX, clientY: gs.last.clientY });
      }, 550);
    }
    return true;
  }

  private onPointerDown = (e: PointerEvent) => {
    if (e.pointerType === 'touch') this.touches.add(e.pointerId);
    if (this.outline.drag && e.pointerId !== this.outline.drag.pointerId) {
      // a second finger while moving a corner: they want to pinch or pan
      this.endCornerDrag(false);
      this.holdControls = true;
      this.controls.enabled = false;
      return;
    }
    if (this.gesture && e.pointerId !== this.gesture.pointerId) {
      // a second finger: they want to pinch or pan, not move the thing
      this.endGesture(false);
      this.holdControls = true;
      this.controls.enabled = false;
      return;
    }
    if (e.pointerType === 'mouse' && e.button === 2) {
      this.rightDown = { x: e.clientX, y: e.clientY };
      return;
    }
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    // focus the canvas so the planner's keyboard shortcuts work after a click
    if (e.pointerType === 'mouse') this.renderer.domElement.focus({ preventScroll: true });
    // terrain: drawing an outline — a tap adds a point on release; a drag still moves the camera
    if (this.outline.draft) {
      this.drawDown = { x: e.clientX, y: e.clientY, id: e.pointerId, touch: e.pointerType === 'touch' };
      this.pendingDeselect = null;
      return;
    }
    // terrain: a corner (or the middle of a side) of the picked wet area's outline
    if (this.outline.edit && this.cb.canDrag('existing')) {
      const h = this.outline.handleAt([e.clientX, e.clientY], this.toScreen, e.pointerType === 'touch' || this.mobile ? 22 : 11);
      if (h) {
        this.pendingDeselect = null;
        this.settleCamera();
        this.controls.enabled = false;
        this.outline.beginDrag(h, e.pointerId);
        try {
          this.renderer.domElement.setPointerCapture(e.pointerId);
        } catch {
          /* synthetic pointer */
        }
        this.setCursor('grabbing');
        this.cb.onGesture?.({ mode: 'move', over: false });
        this.refreshExisting();
        e.stopPropagation();
        return;
      }
    }
    // the turn handle on the selected thing
    const sk = this.selected ? this.kindOf(this.selected) : null;
    if (sk && this.selected && this.cb.canDrag(sk) && this.onKnob(e)) {
      this.pendingDeselect = null;
      if (this.startGesture(e, { kind: sk, id: this.selected }, 'turn')) e.stopPropagation();
      return;
    }
    const hit = this.pick(e);
    if (!hit) {
      this.pendingDeselect = { x: e.clientX, y: e.clientY };
      return;
    }
    this.pendingDeselect = null;
    this.cb.onSelect(hit);
    if (!this.cb.canDrag(hit.kind)) return;
    if (this.startGesture(e, hit, 'move')) e.stopPropagation();
  };

  private pendingDeselect: { x: number; y: number } | null = null;

  private onPointerMove = (e: PointerEvent) => {
    const od = this.outline.drag;
    if (od && e.pointerId === od.pointerId) {
      const g = this.groundPoint(e);
      if (g) {
        this.outline.dragTo(g);
        this.refreshExisting();
      }
      return;
    }
    const gs = this.gesture;
    if (!gs) {
      if (e.pointerType !== 'touch' && e.buttons === 0) this.hoverAt = { clientX: e.clientX, clientY: e.clientY, pointerType: e.pointerType };
      return;
    }
    if (e.pointerId !== gs.pointerId) return;
    gs.last = { clientX: e.clientX, clientY: e.clientY, shiftKey: e.shiftKey, altKey: e.altKey };
    this.stepGesture();
  };

  /** follow the pointer (or a Shift/Alt change) during a move or turn */
  private stepGesture() {
    const gs = this.gesture;
    if (!gs) return;
    const ev = gs.last;
    const g = this.groundPoint(ev);
    if (!g) return;
    let next: Pose | null = null;
    if (gs.g.mode === 'move') {
      const p = this.cb.dragTransform(gs.kind, gs.id, g, gs.grab, Boolean(ev.altKey));
      if (p) next = { x: p[0], y: p[1], rotationDeg: gs.g.start.rotationDeg };
    } else {
      const deg = turnFromDrag(gs.g.start.rotationDeg, gs.center, gs.grabFrame, this.toFrame(gs.kind, g), Boolean(ev.shiftKey || ev.altKey));
      next = { ...gs.g.start, rotationDeg: deg };
    }
    const over = next && gs.kind === 'item' ? Boolean(this.cb.sticksOut?.(gs.id, next)) : false;
    const changed = gs.g.update([ev.clientX, ev.clientY], next, over);
    if (gs.g.moved && gs.longPress) {
      clearTimeout(gs.longPress);
      gs.longPress = undefined;
    }
    if (changed) this.applyPreview();
  }

  private applyPreview() {
    const gs = this.gesture;
    const pv = gs?.g.preview ?? null;
    this.dragPreview = null;
    this.existingPreview = null;
    if (gs && pv) {
      if (gs.kind === 'item') this.dragPreview = { id: gs.id, ...pv, over: gs.g.over };
      else {
        const e = this.existingItems.find((x) => x.id === gs.id);
        const off = e ? e.rotationDeg - (e.ownRotationDeg ?? 0) : 0;
        this.existingPreview = { id: gs.id, x: pv.x, y: pv.y, rotationDeg: pv.rotationDeg + off };
      }
    }
    if (!gs || gs.kind === 'item') this.refreshItems();
    if (!gs || gs.kind === 'existing') this.refreshExisting();
    this.requestRender();
    this.cb.onGesture?.(gs && pv ? { mode: gs.g.mode, over: gs.g.over, deg: gs.g.mode === 'turn' ? pv.rotationDeg : undefined } : null);
  }

  /** Finish the move or turn: save it (one undo step) or, with commit=false, put it back. */
  private endGesture(commit: boolean) {
    const gs = this.gesture;
    if (!gs) return;
    this.gesture = null;
    clearTimeout(gs.longPress);
    if (!this.holdControls) this.controls.enabled = true;
    try {
      this.renderer.domElement.releasePointerCapture(gs.pointerId);
    } catch {
      /* already released */
    }
    const res = commit ? gs.g.finish() : (gs.g.cancel(), null);
    const hadPreview = Boolean(this.dragPreview || this.existingPreview);
    this.dragPreview = null;
    this.existingPreview = null;
    if (res) {
      if (gs.g.mode === 'move') this.cb.onDragEnd(gs.kind, gs.id, [res.x, res.y]);
      else this.cb.onTurnEnd?.(gs.kind, gs.id, res.rotationDeg);
    }
    if (hadPreview) {
      if (gs.kind === 'item') this.refreshItems();
      else this.refreshExisting();
    } else this.refreshOverlay();
    this.setCursor('');
    this.cb.onGesture?.(null);
    this.requestRender();
  }

  /** Esc, a view switch, a second finger: drop the drag without saving it. */
  cancelDrag() {
    this.endGesture(false);
    this.endCornerDrag(false);
  }

  get dragging(): boolean {
    return Boolean(this.gesture?.g.moved);
  }

  private onPointerUp = (e: PointerEvent) => {
    if (e.pointerType === 'touch') this.touches.delete(e.pointerId);
    if (this.holdControls && this.touches.size === 0) {
      this.holdControls = false;
      if (!this.gesture) this.controls.enabled = true;
    }
    if (e.pointerType === 'mouse' && e.button === 2) {
      // right-click without dragging (a right-drag slides the camera): the little menu
      const rd = this.rightDown;
      this.rightDown = null;
      // (not while drawing an outline)
      if (rd && !this.outline.draft && Math.hypot(e.clientX - rd.x, e.clientY - rd.y) < 5) {
        const hit = this.pick(e);
        if (hit && this.cb.canDrag(hit.kind)) {
          this.cb.onSelect(hit);
          this.cb.onMenu?.(hit, { clientX: e.clientX, clientY: e.clientY });
        }
      }
      return;
    }
    const od = this.outline.drag;
    if (od && e.pointerId === od.pointerId) {
      this.endCornerDrag(true);
      return;
    }
    const dd = this.drawDown;
    if (dd && e.pointerId === dd.id) {
      this.drawDown = null;
      // a tap (not a drag of the camera) adds a point
      if (Math.hypot(e.clientX - dd.x, e.clientY - dd.y) < (dd.touch ? 10 : 5)) this.drawClick(e);
      return;
    }
    if (this.pendingDeselect && Math.hypot(e.clientX - this.pendingDeselect.x, e.clientY - this.pendingDeselect.y) < 5) {
      this.cb.onSelect(null);
      // a plain click on the ground (shadows workstream: the sun step charts that spot)
      const g = this.cb.onGroundClick ? this.groundPoint(e) : null;
      if (g) this.cb.onGroundClick!(g);
    }
    this.pendingDeselect = null;
    const gs = this.gesture;
    if (!gs || e.pointerId !== gs.pointerId) return;
    this.endGesture(true);
    if (e.pointerType !== 'touch') this.updateHover(e);
  };

  private onPointerCancel = (e: PointerEvent) => {
    this.touches.delete(e.pointerId);
    if (this.touches.size === 0 && this.holdControls) {
      this.holdControls = false;
      if (!this.gesture) this.controls.enabled = true;
    }
    this.pendingDeselect = null;
    if (this.drawDown?.id === e.pointerId) this.drawDown = null;
    if (this.outline.drag?.pointerId === e.pointerId) this.endCornerDrag(false);
    if (this.gesture && e.pointerId === this.gesture.pointerId) this.endGesture(false);
  };

  private onPointerLeave = () => {
    this.hoverAt = null;
    if (this.gesture) return;
    this.setCursor('');
    if (this.overlays.setKnobHot(false)) this.requestRender();
    this.setHover(null);
  };

  private onContextMenu = (e: Event) => {
    // the planner's own menu comes up on right-button release instead
    e.preventDefault();
  };

  private onKey = (e: KeyboardEvent) => {
    // terrain: keys while drawing an outline or moving a corner (not while typing in a field)
    if ((this.outline.draft || this.outline.drag) && e.type === 'keydown') {
      const t = e.target as HTMLElement | null;
      const typing = t?.closest?.('input, textarea, select, [contenteditable]') && !(t as HTMLInputElement).type?.match(/checkbox|radio|button/);
      if (!typing) {
        const eat = () => {
          e.preventDefault();
          e.stopPropagation();
        };
        if (this.outline.drag) {
          if (e.key === 'Escape') {
            eat();
            this.endCornerDrag(false);
          }
          return;
        }
        if (e.key === 'Escape') {
          eat();
          this.cancelDrawing();
          return;
        }
        if (e.key === 'Enter') {
          eat();
          this.finishDrawing();
          return;
        }
        if (e.key === 'Backspace' || e.key === 'Delete') {
          eat();
          this.undoDrawPoint();
          return;
        }
      }
    }
    const gs = this.gesture;
    if (!gs) return;
    if (e.type === 'keydown' && e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      this.endGesture(false);
      return;
    }
    if (e.key === 'Shift' || e.key === 'Alt') {
      // let go of snapping (or take it back) without moving the mouse
      if (e.key === 'Alt') e.preventDefault();
      gs.last = { ...gs.last, shiftKey: e.shiftKey, altKey: e.altKey };
      this.stepGesture();
    }
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
    if (this.hoverAt) {
      const at = this.hoverAt;
      this.hoverAt = null;
      this.updateHover(at);
    }
    if (this.view === '3d' && this.controls.enableDamping && this.controls.update()) this.dirty = true;
    if (this.dirty) {
      this.dirty = false;
      const focus = this.overlays.focus();
      this.camera.updateMatrixWorld();
      this.overlays.layout(focus ? this.feetPerPixel(focus) : 0, this.overlays.handle ? this.measure : null);
      // terrain: outline handles and slope labels keep one size on screen
      if (this.site && (this.outline.active || this.slopeOn)) {
        const fppAt = (p: THREE.Vector3) => this.feetPerPixel(p);
        this.outline.layout(fppAt);
        this.slope.layout(fppAt);
      }
      this.renderer.render(this.scene, this.camera);
      const n = this.northDeg();
      if (Math.abs(n - this.lastNorth) > 0.5) {
        this.lastNorth = n;
        this.cb.onCamera?.(n);
      }
    }
  };

  private lastNorth = Infinity;

  /** screen pixels per foot along a ground direction at a ground point */
  private measure = (at: Vec2, dir: Vec2): number => {
    const r = this.renderer.domElement;
    const a = W(at[0], at[1], 0.5).project(this.camera);
    const b = W(at[0] + dir[0], at[1] + dir[1], 0.5).project(this.camera);
    return Math.hypot(((b.x - a.x) / 2) * r.clientWidth, ((b.y - a.y) / 2) * r.clientHeight);
  };

  /** world feet per screen pixel at a point (keeps the turn knob one size on screen) */
  private feetPerPixel(p: THREE.Vector3): number {
    const h = Math.max(1, this.renderer.domElement.clientHeight);
    if (this.view === 'plan') return (this.ortho.top - this.ortho.bottom) / this.ortho.zoom / h;
    const d = this.persp.position.distanceTo(p);
    return (2 * d * Math.tan((this.persp.fov * Math.PI) / 360)) / h;
  }

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
    // pictures and the printed plan show the park, not the mouse handles
    this.overlays.group.visible = false;
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
    this.overlays.group.visible = true;
    this.requestRender();
    return url;
  }

  dispose() {
    this.disposed = true;
    if (this.gesture) clearTimeout(this.gesture.longPress);
    window.removeEventListener('keydown', this.onKey, { capture: true });
    window.removeEventListener('keyup', this.onKey, { capture: true });
    this.renderer.domElement.removeEventListener('dblclick', this.onDblClick);
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.io.disconnect();
    this.controls.dispose();
    this.aerial?.dispose();
    disposeTree(this.siteGroup);
    this.park.dispose();
    this.existing.dispose();
    this.overlays.dispose();
    this.slope.dispose();
    this.outline.dispose();
    this.cityTrees.dispose();
    disposeTree(this.heat);
    disposeTree(this.spot);
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
