// What the mouse is doing, drawn on the ground: the hover outline, the selection (a cyan
// ring with a light cyan fill, also faintly visible through anything in front of it), the
// footprint where a dragged thing will land (red when it would hang off the lot), and
// the round turn handle on the selected thing.

import * as THREE from 'three';
import type { Vec2 } from '../geo';
import { W, disposeTree, ribbon } from './builders';

/** A thing's footprint on the ground, in local feet. */
export interface Footprint {
  c: Vec2;
  /** the thing's own x and y directions (unit vectors, local feet) */
  xd: Vec2;
  yd: Vec2;
  hw: number;
  hh: number;
  round: boolean;
}

export interface OverlayState {
  hover?: Footprint | null;
  selected?: { f: Footprint; over: boolean; dragging: boolean } | null;
  /** turn handle around the selected thing; the knob sits along its x direction */
  handle?: Footprint | null;
}

const CYAN = 0x00a8e8;
const RED = 0xd0342c;
const HOVER = 0x5cc8f0;

function outline(f: Footprint, pad: number): Vec2[] {
  if (f.round) {
    const r = Math.max(f.hw, f.hh) + pad;
    return Array.from({ length: 48 }, (_, i) => {
      const a = (i / 48) * Math.PI * 2;
      return [f.c[0] + r * Math.cos(a), f.c[1] + r * Math.sin(a)] as Vec2;
    });
  }
  const hw = f.hw + pad;
  const hh = f.hh + pad;
  return ([
    [-hw, -hh],
    [hw, -hh],
    [hw, hh],
    [-hw, hh],
  ] as Vec2[]).map(([a, b]) => [f.c[0] + a * f.xd[0] + b * f.yd[0], f.c[1] + a * f.xd[1] + b * f.yd[1]] as Vec2);
}

function fill(pts: Vec2[], up: number, color: number, opacity: number): THREE.Mesh {
  const g = new THREE.ShapeGeometry(new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y))));
  g.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide }));
  m.position.y = up;
  m.renderOrder = 6;
  return m;
}

/** A ring drawn twice: solid where it can be seen, faint where something stands in front of it. */
function ring(pts: Vec2[], width: number, up: number, color: number, opacity = 1, xray = 0.4): THREE.Object3D[] {
  const solid = ribbon(pts, width, up, color);
  const sm = solid.material as THREE.MeshBasicMaterial;
  sm.transparent = opacity < 1;
  sm.opacity = opacity;
  solid.renderOrder = 7;
  if (!xray) return [solid];
  const ghost = ribbon(pts, width, up, color);
  const gm = ghost.material as THREE.MeshBasicMaterial;
  gm.transparent = true;
  gm.opacity = xray;
  gm.depthTest = false;
  gm.depthWrite = false;
  ghost.renderOrder = 8;
  return [solid, ghost];
}

/** The knob: a cyan disc with a white turning arrow, always drawn on top. */
function knobTexture(): THREE.CanvasTexture {
  const S = 128;
  const c = document.createElement('canvas');
  c.width = S;
  c.height = S;
  const g = c.getContext('2d')!;
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.arc(S / 2, S / 2, S / 2 - 2, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#00a8e8';
  g.beginPath();
  g.arc(S / 2, S / 2, S / 2 - 12, 0, Math.PI * 2);
  g.fill();
  // turning arrow
  g.strokeStyle = '#ffffff';
  g.lineWidth = 10;
  g.lineCap = 'round';
  const r = S * 0.24;
  const a0 = -Math.PI * 0.15;
  const a1 = Math.PI * 1.3;
  g.beginPath();
  g.arc(S / 2, S / 2, r, a0, a1);
  g.stroke();
  const ex = S / 2 + r * Math.cos(a1);
  const ey = S / 2 + r * Math.sin(a1);
  g.fillStyle = '#ffffff';
  g.beginPath();
  // arrowhead pointing along the arc
  const t = a1 + Math.PI / 2;
  g.moveTo(ex + Math.cos(t) * 16, ey + Math.sin(t) * 16);
  g.lineTo(ex + Math.cos(a1) * 15, ey + Math.sin(a1) * 15);
  g.lineTo(ex - Math.cos(a1) * 15, ey - Math.sin(a1) * 15);
  g.closePath();
  g.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Screen pixels per foot along a ground direction at a ground point (from the camera). */
export type Measure = (at: Vec2, dir: Vec2) => number;

/**
 * Where the turn knob goes: on a ring clear of the thing's corners whichever way it faces,
 * at least `minPx` screen pixels beyond them, on the side that shows best from the camera
 * (its own +x side unless that is badly foreshortened).
 */
export function handlePlacement(f: Footprint, measure: Measure | null, minPx = 26): { R: number; dir: Vec2 } {
  const r = f.round ? Math.max(f.hw, f.hh) : Math.hypot(f.hw, f.hh);
  if (!measure) return { R: r + 1.4, dir: f.xd };
  const dirs: Vec2[] = [f.xd, f.yd, [-f.yd[0], -f.yd[1]], [-f.xd[0], -f.xd[1]]];
  const k = dirs.map((d) => measure(f.c, d));
  const best = Math.max(...k);
  const i = k[0]! >= best * 0.75 ? 0 : k.indexOf(best);
  const px = Math.max(1e-3, k[i]!);
  return { R: r + Math.min(40, Math.max(1.4, minPx / px)), dir: dirs[i]! };
}

const W2 = (p: Vec2, up: number) => W(p[0], p[1], up);

export class Overlays {
  readonly group = new THREE.Group();
  private parts = new THREE.Group();
  private knob: THREE.Sprite;
  private knobHot = false;
  private state: OverlayState = {};
  /** feet per pixel the parts were last drawn for (null = redraw) */
  private builtFor: number | null = null;
  /** world position of the knob, or null when there is no handle */
  knobAt: THREE.Vector3 | null = null;

  constructor() {
    this.group.name = 'interaction';
    this.knob = new THREE.Sprite(new THREE.SpriteMaterial({ map: knobTexture(), depthTest: false, depthWrite: false, transparent: true }));
    this.knob.renderOrder = 20;
    this.knob.visible = false;
    this.group.add(this.parts, this.knob);
  }

  set(s: OverlayState) {
    this.state = s;
    this.builtFor = null;
    // where the knob is until the next layout() (for hit tests in between)
    this.knobAt = s.handle ? this.knobAtFor(s.handle, this.lastMeasure) : null;
  }

  private lastMeasure: Measure | null = null;
  /** the handle as last drawn */
  private builtHandle: { R: number; dir: Vec2 } | null = null;

  private knobAtFor(f: Footprint, measure: Measure | null) {
    const { R, dir } = handlePlacement(f, measure);
    return W2([f.c[0] + R * dir[0], f.c[1] + R * dir[1]], 0.9);
  }

  /** the thing the turn handle is on (for measuring it on screen) */
  get handle(): Footprint | null {
    return this.state.handle ?? null;
  }

  /** The point whose on-screen scale matters (the selected thing, else the hovered one). */
  focus(): THREE.Vector3 | null {
    const f = this.state.selected?.f ?? this.state.hover;
    return f ? W2(f.c, 0) : null;
  }

  /**
   * Draw for the current camera: `fpp` = feet per screen pixel at the focus point. Lines
   * keep a few pixels' width and the knob one size on screen; redrawn only when the
   * state or the scale changed noticeably.
   */
  layout(fpp: number, measure: Measure | null = null) {
    const st = this.state;
    const hp = st.handle ? handlePlacement(st.handle, measure) : null;
    this.lastMeasure = measure;
    const near = (a: number, b: number) => Math.abs(a - b) <= Math.abs(b) * 0.08;
    const bh = this.builtHandle;
    const sameHandle = !hp || (bh !== null && near(hp.R, bh.R) && hp.dir[0] === bh.dir[0] && hp.dir[1] === bh.dir[1]);
    if (this.builtFor !== null && near(fpp, this.builtFor) && sameHandle) {
      this.scaleKnob(fpp);
      return;
    }
    this.builtFor = fpp;
    this.builtHandle = hp;
    disposeTree(this.parts);
    this.parts.clear();
    const add = (...o: THREE.Object3D[]) => this.parts.add(...o);
    if (st.hover) add(...ring(outline(st.hover, 0.35), Math.max(0.3, 2.5 * fpp), 0.44, HOVER, 0.95, 0.35));
    if (st.selected) {
      const { f, over, dragging } = st.selected;
      const col = over ? RED : CYAN;
      // the footprint: where it stands (or will land, while dragging)
      add(fill(outline(f, 0.15), 0.21, col, dragging ? 0.34 : over ? 0.3 : 0.22));
      add(...ring(outline(f, 0.45), Math.max(dragging ? 0.4 : 0.55, (dragging ? 3 : 3.5) * fpp), 0.46, col, 1, 0.5));
    }
    if (st.handle && hp) {
      const f = st.handle;
      const { R, dir } = hp;
      const circle = Array.from({ length: 72 }, (_, i) => {
        const a = (i / 72) * Math.PI * 2;
        return [f.c[0] + R * Math.cos(a), f.c[1] + R * Math.sin(a)] as Vec2;
      });
      add(...ring(circle, Math.max(0.18, 2 * fpp), 0.5, CYAN, 0.75, 0.3));
      this.knobAt = W2([f.c[0] + R * dir[0], f.c[1] + R * dir[1]], 0.9);
      this.knob.position.copy(this.knobAt);
      this.knob.visible = true;
    } else {
      this.knobAt = null;
      this.knob.visible = false;
    }
    this.scaleKnob(fpp);
  }

  /** the pointer is over the knob (draw it a little bigger) */
  setKnobHot(hot: boolean): boolean {
    if (hot === this.knobHot) return false;
    this.knobHot = hot;
    return true;
  }

  private scaleKnob(fpp: number) {
    if (!this.knobAt) return;
    const px = this.knobHot ? 34 : 28;
    const s = Math.max(0.5, px * fpp);
    this.knob.scale.set(s, s, 1);
  }

  dispose() {
    disposeTree(this.parts);
    (this.knob.material as THREE.SpriteMaterial).map?.dispose();
    this.knob.material.dispose();
  }
}
