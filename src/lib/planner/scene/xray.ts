// See-through neighbours (fix round 2026-10-04, novice-phone F3).
//
// Wherever a neighbouring building stands between the camera and the lot, the part of it
// that hides the lot is drawn as a faint ghost, so the lot stays in view from any angle
// and a "look around" drag never fills the screen with a blank wall.
//
// How: the lot is a box (its oriented rectangle plus a small margin, from just under the
// ground to about the height of a small tree). In the building shader, a fragment hides the lot
// when the ray from the camera through it goes on to enter that box. The solid buildings
// skip those fragments; a second, transparent copy of the buildings draws only them.
// Shadows are untouched (the shadow pass uses its own depth material), so the sun maths
// and the drawn shadows still see every wall.

import * as THREE from 'three';
import type { Vec2 } from '../geo';

export interface XrayBox {
  /** centre, local feet (x east, y north) */
  center: Vec2;
  /** unit vector along the box's length, local feet */
  u: Vec2;
  /** half-length, half-width, feet */
  half: Vec2;
  /** bottom and top, feet above the datum */
  y: Vec2;
}

const GLSL_HEAD = /* glsl */ `
uniform vec2 uXrC;
uniform vec2 uXrU;
uniform vec2 uXrH;
uniform vec2 uXrY;
uniform float uXrOn;
varying vec3 vXrW;
bool xrHides() {
  if (uXrOn < 0.5) return false;
  vec3 ro = cameraPosition;
  vec3 rd = vXrW - ro;
  float dist = length(rd);
  if (dist < 1e-3) return false;
  rd /= dist;
  vec2 vv = vec2(-uXrU.y, uXrU.x);
  vec2 o2 = ro.xz - uXrC;
  vec3 o = vec3(dot(o2, uXrU), ro.y, dot(o2, vv));
  vec3 d = vec3(dot(rd.xz, uXrU), rd.y, dot(rd.xz, vv));
  d = mix(d, vec3(1e-6), vec3(lessThan(abs(d), vec3(1e-6))));
  vec3 inv = 1.0 / d;
  vec3 t0 = (vec3(-uXrH.x, uXrY.x, -uXrH.y) - o) * inv;
  vec3 t1 = (vec3(uXrH.x, uXrY.y, uXrH.y) - o) * inv;
  vec3 a = min(t0, t1);
  vec3 b = max(t0, t1);
  float tn = max(max(a.x, a.y), a.z);
  float tf = min(min(b.x, b.y), b.z);
  return tf > max(tn, 0.0) && dist < tn - 0.3;
}
`;

export type XrayMode = 'solid' | 'ghost' | 'line';

/** One lot box shared by every material it patches. */
export class Xray {
  readonly uniforms = {
    uXrC: { value: new THREE.Vector2() },
    uXrU: { value: new THREE.Vector2(1, 0) },
    uXrH: { value: new THREE.Vector2() },
    uXrY: { value: new THREE.Vector2() },
    uXrOn: { value: 0 },
  };
  private box: XrayBox | null = null;
  private on = true;

  /** the lot's box (null = nothing to keep in view) */
  setBox(box: XrayBox | null) {
    this.box = box;
    if (box) {
      // local (east, north) -> world (x, z) = (east, -north)
      this.uniforms.uXrC.value.set(box.center[0], -box.center[1]);
      this.uniforms.uXrU.value.set(box.u[0], -box.u[1]).normalize();
      this.uniforms.uXrH.value.set(box.half[0], box.half[1]);
      this.uniforms.uXrY.value.set(box.y[0], box.y[1]);
    }
    this.sync();
  }

  /** on in the 3D view; the plan view looks straight down and never needs it */
  setEnabled(on: boolean) {
    this.on = on;
    this.sync();
  }

  get active(): boolean {
    return this.uniforms.uXrOn.value > 0.5;
  }

  private sync() {
    this.uniforms.uXrOn.value = this.on && this.box ? 1 : 0;
  }

  /**
   * Patch a material: 'solid' leaves out what hides the lot, 'ghost' draws only that,
   * 'line' (building edges) fades it.
   */
  patch<M extends THREE.Material>(mat: M, mode: XrayMode): M {
    mat.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, this.uniforms);
      shader.vertexShader = shader.vertexShader
        .replace('void main() {', 'varying vec3 vXrW;\nvoid main() {')
        .replace('#include <project_vertex>', '#include <project_vertex>\n\tvXrW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      const body =
        mode === 'solid'
          ? 'if (xrHides()) discard;'
          : mode === 'ghost'
            ? 'if (!xrHides()) discard;'
            : 'float xrFade = xrHides() ? 0.3 : 1.0;';
      let fs = shader.fragmentShader.replace('void main() {', `${GLSL_HEAD}\nvoid main() {\n\t${body}`);
      if (mode === 'line') fs = fs.replace('#include <color_fragment>', '#include <color_fragment>\n\tdiffuseColor.a *= xrFade;');
      shader.fragmentShader = fs;
    };
    mat.customProgramCacheKey = () => `xray-${mode}`;
    mat.needsUpdate = true;
    return mat;
  }
}

/** The lot's box: its oriented rectangle plus `margin` feet, from under the ground to `above` feet over it. */
export function lotBox(
  frame: { center: Vec2; u: Vec2; lengthFt: number; widthFt: number },
  ground: (x: number, y: number) => number,
  margin = 3,
  above = 14,
): XrayBox {
  const hl = frame.lengthFt / 2;
  const hw = frame.widthFt / 2;
  const v: Vec2 = [-frame.u[1], frame.u[0]];
  let lo = Infinity;
  let hi = -Infinity;
  for (const a of [-1, -0.5, 0, 0.5, 1])
    for (const b of [-1, 0, 1]) {
      const p: Vec2 = [frame.center[0] + a * hl * frame.u[0] + b * hw * v[0], frame.center[1] + a * hl * frame.u[1] + b * hw * v[1]];
      const z = ground(p[0], p[1]);
      if (!Number.isFinite(z)) continue;
      lo = Math.min(lo, z);
      hi = Math.max(hi, z);
    }
  if (!Number.isFinite(lo)) lo = hi = 0;
  return { center: frame.center, u: frame.u, half: [hl + margin, hw + margin], y: [lo - 1, hi + above] };
}

/**
 * Does the straight line from `cam` to `p` (local feet + height) pass through the box
 * before reaching `p`? The same test as the shader, for checks.
 */
export function hidesBox(cam: [number, number, number], p: [number, number, number], box: XrayBox): boolean {
  const rd = [p[0] - cam[0], p[1] - cam[1], p[2] - cam[2]];
  const dist = Math.hypot(rd[0]!, rd[1]!, rd[2]!);
  if (dist < 1e-3) return false;
  const d3 = rd.map((x) => x / dist);
  const u = box.u;
  const v: Vec2 = [-u[1], u[0]];
  const ox = cam[0] - box.center[0];
  const oy = cam[1] - box.center[1];
  const o = [ox * u[0] + oy * u[1], cam[2], ox * v[0] + oy * v[1]];
  const d = [d3[0]! * u[0] + d3[1]! * u[1], d3[2]!, d3[0]! * v[0] + d3[1]! * v[1]].map((x) => (Math.abs(x) < 1e-6 ? 1e-6 : x));
  const lo = [-box.half[0], box.y[0], -box.half[1]];
  const hi = [box.half[0], box.y[1], box.half[1]];
  let tn = -Infinity;
  let tf = Infinity;
  for (let k = 0; k < 3; k++) {
    const t0 = (lo[k]! - o[k]!) / d[k]!;
    const t1 = (hi[k]! - o[k]!) / d[k]!;
    tn = Math.max(tn, Math.min(t0, t1));
    tf = Math.min(tf, Math.max(t0, t1));
  }
  return tf > Math.max(tn, 0) && dist < tn - 0.3;
}
