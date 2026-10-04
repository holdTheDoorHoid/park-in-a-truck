// Sun-study layers in the 3D scene (shadows workstream, 2026-10-04): the sun-hours map
// laid over the ground (following its slope when the ground's heights are known) and the
// marker for the spot whose year is charted.

import * as THREE from 'three';
import type { Vec2 } from '../geo';
import type { GroundFn } from '../ground';
import { classify, type GridSpec } from '../sunhours';
import { W, cellTexture, quad } from './builders';

const LIFT = 0.62;

export const HEAT_COLORS = { sun: 'rgba(255,176,0,0.78)', part: 'rgba(126,196,230,0.8)', shade: 'rgba(36,64,128,0.82)' } as const;

/** The sun-hours map: one coloured square per grid cell, just above the ground. */
export function heatMesh(spec: GridSpec, hours: Float32Array, ground: GroundFn | null): THREE.Mesh {
  const tex = cellTexture(spec.nx, spec.ny, (i, j) => {
    const h = hours[j * spec.nx + i]!;
    return Number.isNaN(h) ? null : HEAT_COLORS[classify(h)];
  });
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide });
  const corner = (a: number, b: number): Vec2 => [
    spec.origin[0] + a * spec.cellFt * spec.ux[0] + b * spec.cellFt * spec.uy[0],
    spec.origin[1] + a * spec.cellFt * spec.ux[1] + b * spec.cellFt * spec.uy[1],
  ];
  let mesh: THREE.Mesh;
  if (!ground) {
    mesh = quad([corner(0, 0), corner(spec.nx, 0), corner(spec.nx, spec.ny), corner(0, spec.ny)], LIFT, mat);
  } else {
    // a sheet that follows the ground, one vertex per cell corner (at most 160 per side)
    const sx = Math.min(spec.nx, 160);
    const sy = Math.min(spec.ny, 160);
    const pos: number[] = [];
    const uv: number[] = [];
    for (let b = 0; b <= sy; b++) {
      for (let a = 0; a <= sx; a++) {
        const [x, y] = corner((a / sx) * spec.nx, (b / sy) * spec.ny);
        pos.push(x, ground(x, y) + LIFT, -y);
        uv.push(a / sx, b / sy);
      }
    }
    const idx: number[] = [];
    for (let b = 0; b < sy; b++) {
      for (let a = 0; a < sx; a++) {
        const k = b * (sx + 1) + a;
        idx.push(k, k + 1, k + sx + 2, k, k + sx + 2, k + sx + 1);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    mesh = new THREE.Mesh(g, mat);
  }
  mesh.renderOrder = 5;
  mesh.name = 'sun-hours';
  return mesh;
}

/** A pin on the spot whose sun through the year is charted. */
export function spotMarker(p: Vec2, ground: GroundFn): THREE.Group {
  const g = new THREE.Group();
  g.name = 'sun-spot';
  const z = ground(p[0], p[1]);
  const ink = new THREE.MeshBasicMaterial({ color: 0x111111 });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.8, 1.25, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x00709c, side: THREE.DoubleSide, depthWrite: false }));
  ring.position.copy(W(p[0], p[1], z + 0.7));
  ring.renderOrder = 6;
  const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 4.5, 6).translate(0, 2.25, 0), ink);
  pin.position.copy(W(p[0], p[1], z));
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 8), new THREE.MeshBasicMaterial({ color: 0x00a8e8 }));
  head.position.copy(W(p[0], p[1], z + 4.6));
  g.add(ring, pin, head);
  return g;
}
