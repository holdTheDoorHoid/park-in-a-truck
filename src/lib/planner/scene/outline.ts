// Drawing a wet area's outline, and moving its corners (terrain, 2026-10-04). The pure
// rules (closing, double-click, saving) are in ../interact.ts; this draws them and does
// the screen-space hit tests. PlannerScene routes pointer events here while drawing, or
// when a press lands on a corner handle of the picked wet area.

import * as THREE from 'three';
import type { Vec2 } from '../geo';
import { FLAT_GROUND, type GroundFn } from '../ground';
import { PolygonDraft, insertCorner, moveCorner } from '../interact';
import { drapedRibbon, drapedShape } from '../furniture/drape';

const BLUE = 0x1d5f8f;
const CYAN = 0x00a8e8;

function handleTexture(kind: 'corner' | 'mid' | 'first'): THREE.CanvasTexture {
  const S = 64;
  const c = document.createElement('canvas');
  c.width = S;
  c.height = S;
  const g = c.getContext('2d')!;
  const r = kind === 'mid' ? S * 0.36 : S / 2 - 3;
  g.fillStyle = kind === 'mid' ? 'rgba(255,255,255,0.92)' : '#ffffff';
  g.beginPath();
  g.arc(S / 2, S / 2, r, 0, Math.PI * 2);
  g.fill();
  g.lineWidth = kind === 'mid' ? 4 : 7;
  g.strokeStyle = kind === 'first' ? '#0b4a6b' : '#00a8e8';
  g.stroke();
  if (kind === 'mid') {
    g.strokeStyle = '#00709c';
    g.lineWidth = 5;
    g.beginPath();
    g.moveTo(S / 2 - 9, S / 2);
    g.lineTo(S / 2 + 9, S / 2);
    g.moveTo(S / 2, S / 2 - 9);
    g.lineTo(S / 2, S / 2 + 9);
    g.stroke();
  }
  if (kind === 'first') {
    g.fillStyle = '#0b4a6b';
    g.beginPath();
    g.arc(S / 2, S / 2, S * 0.17, 0, Math.PI * 2);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export interface OutlineEdit {
  id: string;
  /** where the outline's offsets are measured from (local feet) */
  center: Vec2;
  outline: [number, number][];
}

type ToScreen = (p: Vec2) => Vec2 | null;

export class OutlineTool {
  readonly group = new THREE.Group();
  private parts = new THREE.Group();
  private handles: THREE.Sprite[] = [];
  private tex = { corner: handleTexture('corner'), mid: handleTexture('mid'), first: handleTexture('first') };
  private ground: GroundFn = FLAT_GROUND;
  /** the outline being drawn (null = not drawing) */
  draft: PolygonDraft | null = null;
  /** the mouse, for the line from the last point (null on touch) */
  private hover: Vec2 | null = null;
  /** first point hot: a click there closes the outline */
  closeHot = false;
  /** the picked wet area whose corners can be dragged */
  edit: OutlineEdit | null = null;
  /** a corner being dragged: its index, and the outline while dragging */
  drag: { index: number; outline: [number, number][]; pointerId: number; moved: boolean; start: Vec2 } | null = null;

  constructor() {
    this.group.name = 'outline-tool';
    this.group.add(this.parts);
  }

  setGround(g: GroundFn) {
    this.ground = g;
    this.redraw();
  }

  // ---- drawing ----

  start() {
    this.draft = new PolygonDraft();
    this.hover = null;
    this.closeHot = false;
    this.redraw();
  }

  stop() {
    this.draft = null;
    this.hover = null;
    this.closeHot = false;
    this.redraw();
  }

  setHover(p: Vec2 | null, closeHot: boolean) {
    this.hover = p;
    this.closeHot = closeHot;
    this.redraw();
  }

  // ---- corner editing ----

  setEdit(e: OutlineEdit | null) {
    if (this.drag && (!e || e.id !== this.edit?.id)) this.drag = null;
    this.edit = e;
    this.redraw();
  }

  /** the outline as it is right now (while dragging a corner: the dragged shape) */
  get liveOutline(): [number, number][] | null {
    return this.drag?.outline ?? this.edit?.outline ?? null;
  }

  /** corners and the middles of the sides, local feet (handles) */
  private editPoints(): { p: Vec2; kind: 'corner' | 'mid'; index: number }[] {
    const e = this.edit;
    const o = this.liveOutline;
    if (!e || !o) return [];
    const pts = o.map(([dx, dy]) => [e.center[0] + dx, e.center[1] + dy] as Vec2);
    const out: { p: Vec2; kind: 'corner' | 'mid'; index: number }[] = pts.map((p, index) => ({ p, kind: 'corner' as const, index }));
    // no side handles while dragging (they'd jump around)
    if (!this.drag) {
      pts.forEach((p, index) => {
        const q = pts[(index + 1) % pts.length]!;
        if (Math.hypot(q[0] - p[0], q[1] - p[1]) > 1.5) out.push({ p: [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2], kind: 'mid', index });
      });
    }
    return out;
  }

  /** Which handle is under a screen point (corners win over side middles). */
  handleAt(at: Vec2, toScreen: ToScreen, reach: number): { kind: 'corner' | 'mid'; index: number; p: Vec2 } | null {
    let best: { kind: 'corner' | 'mid'; index: number; p: Vec2; d: number } | null = null;
    for (const h of this.editPoints()) {
      const s = toScreen(h.p);
      if (!s) continue;
      const d = Math.hypot(s[0] - at[0], s[1] - at[1]) - (h.kind === 'corner' ? 3 : 0);
      if (d <= reach && (!best || d < best.d)) best = { ...h, d };
    }
    return best ? { kind: best.kind, index: best.index, p: best.p } : null;
  }

  /** Start dragging a corner (a side middle first becomes a new corner). */
  beginDrag(h: { kind: 'corner' | 'mid'; index: number; p: Vec2 }, pointerId: number) {
    const e = this.edit;
    if (!e) return;
    let outline = e.outline;
    let index = h.index;
    if (h.kind === 'mid') {
      outline = insertCorner(outline, h.index, h.p, e.center);
      index = h.index + 1;
    }
    this.drag = { index, outline, pointerId, moved: h.kind === 'mid', start: h.p };
    this.redraw();
  }

  dragTo(p: Vec2) {
    const e = this.edit;
    const d = this.drag;
    if (!e || !d) return;
    d.outline = moveCorner(d.outline, d.index, p, e.center);
    d.moved = true;
    this.redraw();
  }

  /** Let go: the new outline (null = nothing changed). */
  endDrag(commit: boolean): [number, number][] | null {
    const d = this.drag;
    this.drag = null;
    this.redraw();
    return commit && d && d.moved ? d.outline : null;
  }

  // ---- drawing on screen ----

  redraw() {
    // (sprite materials don't own the shared handle textures)
    this.parts.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      (m.material as THREE.Material | undefined)?.dispose();
    });
    this.parts.clear();
    this.handles = [];
    const g = this.ground;
    const sprite = (p: Vec2, kind: 'corner' | 'mid' | 'first', px: number) => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.tex[kind], depthTest: false, depthWrite: false, transparent: true }));
      s.position.set(p[0], g(p[0], p[1]) + 0.5, -p[1]);
      s.renderOrder = 21;
      s.userData.px = px;
      this.handles.push(s);
      this.parts.add(s);
    };
    const d = this.draft;
    if (d) {
      const pts = d.points;
      if (pts.length >= 3) {
        // the outline being drawn shows over everything (park pieces included) until it is finished
        const fill = new THREE.Mesh(drapedShape(pts, g, 0.3), new THREE.MeshBasicMaterial({ color: 0x3a8fd1, transparent: true, opacity: 0.32, depthWrite: false, depthTest: false, side: THREE.DoubleSide }));
        fill.renderOrder = 18;
        this.parts.add(fill);
      }
      if (pts.length >= 2) this.parts.add(this.line(pts, BLUE, false));
      if (this.hover && pts.length) this.parts.add(this.line([pts[pts.length - 1]!, this.hover], CYAN, false, 0.18));
      pts.forEach((p, i) => sprite(p, i === 0 ? 'first' : 'corner', i === 0 ? (this.closeHot ? 22 : 16) : 12));
      return;
    }
    if (this.edit) {
      for (const h of this.editPoints()) sprite(h.p, h.kind, h.kind === 'corner' ? 14 : 12);
    }
  }

  private line(pts: Vec2[], color: number, closed: boolean, width = 0.25): THREE.Mesh {
    const m = drapedRibbon(pts, width, 0.36, this.ground, color, closed);
    const mat = m.material as THREE.MeshBasicMaterial;
    mat.depthTest = false;
    mat.depthWrite = false;
    m.renderOrder = 19;
    return m;
  }

  /** keep handles one size on screen: `fppAt` = feet per screen pixel at a point */
  layout(fppAt: (p: THREE.Vector3) => number) {
    for (const s of this.handles) {
      const px = (s.userData.px as number) * fppAt(s.position);
      s.scale.set(px, px, 1);
    }
  }

  get active(): boolean {
    return Boolean(this.draft || this.edit);
  }

  dispose() {
    this.draft = null;
    this.edit = null;
    this.redraw();
    for (const t of Object.values(this.tex)) t.dispose();
  }
}
