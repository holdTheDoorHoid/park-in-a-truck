// Gabion stone: grey rubble behind welded wire, drawn once on a canvas (one foot per
// tile) like the build guides' stone fill, with the wire grid baked in so a basket is a
// single textured box. Low detail swaps the texture for plain grey.

import * as THREE from 'three';
import { seeded } from './procedural';

let tex: THREE.CanvasTexture | null = null;

/** The rubble + wire texture (one tile = one foot), or null without a DOM. */
export function gabionTexture(): THREE.CanvasTexture | null {
  if (tex) return tex;
  if (typeof document === 'undefined') return null;
  const S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  if (!g) return null;
  const r = seeded('gabion');
  g.fillStyle = '#5f5b55';
  g.fillRect(0, 0, S, S);
  for (let i = 0; i < 26; i++) {
    const cx = r() * S;
    const cy = r() * S;
    const rad = 22 + r() * 22;
    const n = 6 + Math.floor(r() * 3);
    const v = 150 + Math.floor(r() * 70);
    const pts: [number, number][] = [];
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + r() * 0.5;
      const rr = rad * (0.7 + r() * 0.35);
      pts.push([Math.cos(a) * rr, Math.sin(a) * rr]);
    }
    // wrapped copies so the tile repeats seamlessly
    for (const ox of [-S, 0, S])
      for (const oy of [-S, 0, S]) {
        g.beginPath();
        pts.forEach(([px, py], k) => (k ? g.lineTo(cx + ox + px, cy + oy + py) : g.moveTo(cx + ox + px, cy + oy + py)));
        g.closePath();
        g.fillStyle = `rgb(${v},${v - 4},${v - 10})`;
        g.fill();
        g.lineWidth = 3;
        g.strokeStyle = '#3d3a36';
        g.stroke();
      }
  }
  // welded wire, 3" squares
  g.strokeStyle = 'rgba(40,46,50,0.75)';
  g.lineWidth = 3;
  for (let k = 0; k < 4; k++) {
    const p = (k * S) / 4 + 1.5;
    g.beginPath();
    g.moveTo(p, 0);
    g.lineTo(p, S);
    g.moveTo(0, p);
    g.lineTo(S, p);
    g.stroke();
  }
  tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** A box (feet) whose texture repeats every foot on every face; base at y = 0. Three.js axes. */
export function stoneBoxGeometry(x: number, y: number, z: number): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(x, y, z).translate(0, y / 2, 0);
  const uv = g.getAttribute('uv');
  // BoxGeometry faces: +x, −x, +y, −y, +z, −z (4 vertices each)
  const dims: [number, number][] = [
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
      uv.setXY(k, uv.getX(k) * dims[f]![0], uv.getY(k) * dims[f]![1]);
    }
  return g;
}
