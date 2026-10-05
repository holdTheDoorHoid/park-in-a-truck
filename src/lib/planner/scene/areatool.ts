// Part of the lot (2026-10-04): the cyan rectangle the park goes in, drawn on the ground on the
// Size step, with handles that keep one size on screen — the middle of each side moves that
// side, each corner moves the two sides that meet there, the round middle handle moves the
// whole part — and a light dimming over the rest of the lot. Built like the wet-area outline
// handles (outline.ts); the pure rules (snapping, the 4-ft minimum, staying in the site frame)
// are in ../area.ts. PlannerScene routes a press here only when it lands on a handle, so
// dragging the park's things keeps working on this step.

import * as THREE from 'three';
import type { Vec2 } from '../geo';
import { FLAT_GROUND, type GroundFn } from '../ground';
import { localToSite, siteToLocal, type SiteFrame } from '../rect';
import type { FitArea } from '../lotfit';
import { dragArea, outsidePieces, sameArea, type AreaHandle } from '../area';
import { ON_GROUND, drapedRibbon, drapedShape } from '../furniture/drape';

const CYAN = 0x00a8e8;
/** the dimming over the rest of the lot: light, so the photo still reads */
const DIM = { color: 0x0b2233, opacity: 0.32 };

type Kind = 'corner' | 'side' | 'move';
/** drawn size on screen, px */
const PX: Record<Kind, number> = { corner: 15, side: 13, move: 30 };

function handleTexture(kind: Kind): THREE.CanvasTexture {
  const S = 96;
  const c = document.createElement('canvas');
  c.width = S;
  c.height = S;
  const g = c.getContext('2d')!;
  const m = S / 2;
  g.fillStyle = '#ffffff';
  g.strokeStyle = '#00a8e8';
  if (kind === 'side') {
    // a rounded square: "pull this side"
    const r = S * 0.4;
    g.lineWidth = 11;
    g.beginPath();
    g.roundRect(m - r, m - r, 2 * r, 2 * r, S * 0.12);
    g.fill();
    g.stroke();
  } else {
    g.lineWidth = kind === 'move' ? 7 : 11;
    g.beginPath();
    g.arc(m, m, S / 2 - 6, 0, Math.PI * 2);
    g.fill();
    g.stroke();
  }
  if (kind === 'move') {
    // a four-way arrow: "move all of it"
    g.strokeStyle = '#00709c';
    g.fillStyle = '#00709c';
    g.lineWidth = 6;
    const a = S * 0.3;
    const h = S * 0.1;
    g.beginPath();
    g.moveTo(m - a + h, m);
    g.lineTo(m + a - h, m);
    g.moveTo(m, m - a + h);
    g.lineTo(m, m + a - h);
    g.stroke();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const tx = m + dx * a;
      const ty = m + dy * a;
      g.beginPath();
      g.moveTo(tx, ty);
      g.lineTo(tx - dx * h * 1.6 - dy * h * 1.2, ty - dy * h * 1.6 - dx * h * 1.2);
      g.lineTo(tx - dx * h * 1.6 + dy * h * 1.2, ty - dy * h * 1.6 + dx * h * 1.2);
      g.closePath();
      g.fill();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** What the tool draws: the part (site feet) on this lot. */
export interface AreaView {
  frame: SiteFrame;
  parcel: Vec2[];
  area: FitArea;
}

type ToScreen = (p: Vec2) => Vec2 | null;

export class AreaTool {
  readonly group = new THREE.Group();
  private parts = new THREE.Group();
  private handles: THREE.Sprite[] = [];
  private tex: Record<Kind, THREE.CanvasTexture> | null = null;
  private ground: GroundFn = FLAT_GROUND;
  view: AreaView | null = null;
  /** a handle being dragged: where the press started (site feet) and the part as it is now */
  drag: { handle: AreaHandle; start: FitArea; from: Vec2; live: FitArea; pointerId: number; moved: boolean } | null = null;

  constructor() {
    this.group.name = 'area-tool';
    this.group.add(this.parts);
  }

  setGround(g: GroundFn) {
    this.ground = g;
    this.redraw();
  }

  /** Show the part (null = hide). A new part from the store replaces any drag on the old one. */
  set(v: AreaView | null) {
    const same = v && this.view && v.frame === this.view.frame && v.parcel === this.view.parcel && sameArea(v.area, this.view.area);
    if (same) return;
    if (this.drag && (!v || v.frame !== this.view?.frame)) this.drag = null;
    this.view = v;
    this.redraw();
  }

  /** the part as it is right now (while dragging: where the pointer has it) */
  get live(): FitArea | null {
    return this.drag?.live ?? this.view?.area ?? null;
  }

  /** the handles, local feet */
  private handlePoints(): { p: Vec2; kind: Kind; handle: AreaHandle }[] {
    const v = this.view;
    const a = this.live;
    if (!v || !a) return [];
    const x0 = a.x0;
    const x1 = a.x0 + a.lengthFt;
    const y0 = a.y0;
    const y1 = a.y0 + a.widthFt;
    const xm = (x0 + x1) / 2;
    const ym = (y0 + y1) / 2;
    const L = (x: number, y: number) => siteToLocal(v.frame, [x, y]);
    return [
      { p: L(xm, ym), kind: 'move', handle: { kind: 'move' } },
      { p: L(x0, ym), kind: 'side', handle: { kind: 'side', side: 'x0' } },
      { p: L(x1, ym), kind: 'side', handle: { kind: 'side', side: 'x1' } },
      { p: L(xm, y0), kind: 'side', handle: { kind: 'side', side: 'y0' } },
      { p: L(xm, y1), kind: 'side', handle: { kind: 'side', side: 'y1' } },
      { p: L(x0, y0), kind: 'corner', handle: { kind: 'corner', x: 'x0', y: 'y0' } },
      { p: L(x1, y0), kind: 'corner', handle: { kind: 'corner', x: 'x1', y: 'y0' } },
      { p: L(x1, y1), kind: 'corner', handle: { kind: 'corner', x: 'x1', y: 'y1' } },
      { p: L(x0, y1), kind: 'corner', handle: { kind: 'corner', x: 'x0', y: 'y1' } },
    ];
  }

  /**
   * Which handle is under a screen point: the nearest one whose drawn disc (or a finger's
   * `reach`) covers it; corners and sides win over the middle when the part is small on screen.
   */
  handleAt(at: Vec2, toScreen: ToScreen, reach: number): AreaHandle | null {
    let best: { handle: AreaHandle; d: number } | null = null;
    for (const h of this.handlePoints()) {
      const s = toScreen(h.p);
      if (!s) continue;
      const r = Math.max(reach, PX[h.kind] / 2 + 2);
      const dist = Math.hypot(s[0] - at[0], s[1] - at[1]);
      if (dist > r) continue;
      // (how far from its edge: the small handles first when they overlap the middle one)
      const score = dist - (h.kind === 'move' ? 0 : 6);
      if (!best || score < best.d) best = { handle: h.handle, d: score };
    }
    return best?.handle ?? null;
  }

  /** a ground point (local feet) in site feet */
  private toSite(p: Vec2): Vec2 {
    return localToSite(this.view!.frame, p);
  }

  beginDrag(handle: AreaHandle, groundLocal: Vec2, pointerId: number) {
    const v = this.view;
    if (!v) return;
    this.drag = { handle, start: v.area, from: this.toSite(groundLocal), live: v.area, pointerId, moved: false };
    this.redraw();
  }

  /** follow the pointer; true when the part changed */
  dragTo(groundLocal: Vec2): boolean {
    const d = this.drag;
    const v = this.view;
    if (!d || !v) return false;
    const s = this.toSite(groundLocal);
    const next = dragArea(d.start, d.handle, [s[0] - d.from[0], s[1] - d.from[1]], v.frame);
    if (sameArea(next, d.live)) return false;
    d.live = next;
    d.moved = true;
    this.redraw();
    return true;
  }

  /** Let go: the new part (null = nothing changed, or put back with commit=false). */
  endDrag(commit: boolean): FitArea | null {
    const d = this.drag;
    this.drag = null;
    this.redraw();
    return commit && d && d.moved && !sameArea(d.live, d.start) ? d.live : null;
  }

  // ---- drawing ----

  redraw() {
    // (sprite materials don't own the shared handle textures)
    this.parts.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      (m.material as THREE.Material | undefined)?.dispose();
    });
    this.parts.clear();
    this.handles = [];
    const v = this.view;
    const a = this.live;
    if (!v || !a) return;
    const g = this.ground;
    const L = (p: Vec2) => siteToLocal(v.frame, p);
    // the rest of the lot, lightly dimmed (under the park's pieces, over the photo)
    const parcelSite = v.parcel.map((p) => localToSite(v.frame, p));
    const dimMat = new THREE.MeshBasicMaterial({ color: DIM.color, transparent: true, opacity: DIM.opacity, depthWrite: false, side: THREE.DoubleSide, ...ON_GROUND });
    let first = true;
    for (const piece of outsidePieces(parcelSite, a)) {
      const m = new THREE.Mesh(drapedShape(piece.map(L), g, 0.12), first ? dimMat : dimMat.clone());
      first = false;
      m.renderOrder = 5;
      this.parts.add(m);
    }
    if (first) dimMat.dispose();
    // the part's outline, over everything (the park's own edges run along it)
    const x1 = a.x0 + a.lengthFt;
    const y1 = a.y0 + a.widthFt;
    const ring: Vec2[] = [L([a.x0, a.y0]), L([x1, a.y0]), L([x1, y1]), L([a.x0, y1])];
    const line = drapedRibbon(ring, this.drag ? 0.6 : 0.5, 0.4, g, CYAN, true);
    const lm = line.material as THREE.MeshBasicMaterial;
    lm.depthTest = false;
    lm.depthWrite = false;
    line.renderOrder = 19;
    this.parts.add(line);
    this.tex ??= { corner: handleTexture('corner'), side: handleTexture('side'), move: handleTexture('move') };
    for (const h of this.handlePoints()) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.tex[h.kind], depthTest: false, depthWrite: false, transparent: true }));
      s.position.set(h.p[0], g(h.p[0], h.p[1]) + 0.5, -h.p[1]);
      s.renderOrder = h.kind === 'move' ? 22 : 21;
      s.userData.px = PX[h.kind];
      this.handles.push(s);
      this.parts.add(s);
    }
  }

  /** keep handles one size on screen: `fppAt` = feet per screen pixel at a point */
  layout(fppAt: (p: THREE.Vector3) => number) {
    for (const s of this.handles) {
      const px = (s.userData.px as number) * fppAt(s.position);
      s.scale.set(px, px, 1);
    }
  }

  dispose() {
    this.view = null;
    this.drag = null;
    this.redraw();
    if (this.tex) for (const t of Object.values(this.tex)) t.dispose();
    this.tex = null;
  }
}
