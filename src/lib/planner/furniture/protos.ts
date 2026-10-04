// Build-guide models as planner shapes: each model's boards merged into ONE geometry
// (feet, three.js axes, turned so its back faces the item's -y like the old blocks), plus
// one textured geometry for any gabion stone. Built once per model and detail level,
// shared by every copy in the park. Models load lazily, one small JSON per guide.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { GuideModel, ModelPart } from '../../guides3d/schema';
import { WOOD, seeded } from './procedural';
import { partGroup, partsAt, planterFill, stageSquareParts, type Quality } from './modelparts';
import { stoneBoxGeometry } from './stone';

const loaders = import.meta.glob<GuideModel>('../../../data/guides/models/*.json', { import: 'default' });
const pathOf = (slug: string) => `../../../data/guides/models/${slug}.json`;

const loaded = new Map<string, GuideModel | null>();
const loading = new Map<string, Promise<GuideModel | null>>();

/** Is there a model for this guide? */
export const hasModel = (slug: string) => pathOf(slug) in loaders;

/**
 * The model if it has loaded; `undefined` while it loads (call `whenLoaded` to hear
 * about it); null if there is none or it failed.
 */
export function modelNow(slug: string): GuideModel | null | undefined {
  if (loaded.has(slug)) return loaded.get(slug)!;
  if (!hasModel(slug)) return null;
  void whenLoaded(slug);
  return undefined;
}

export function whenLoaded(slug: string): Promise<GuideModel | null> {
  const hit = loading.get(slug);
  if (hit) return hit;
  const load = loaders[pathOf(slug)];
  const p = (load ? load() : Promise.resolve(null))
    .catch(() => null)
    .then((m) => {
      loaded.set(slug, m ?? null);
      return m ?? null;
    });
  loading.set(slug, p);
  return p;
}

// ---- geometry ---------------------------------------------------------------------

const deg = Math.PI / 180;
const METAL = '#5b6168';
const SOIL = '#6e5139';
const LEAF = '#5aa55e';

export interface ModelProto {
  key: string;
  /** boards and hardware, vertex-coloured */
  solid: THREE.BufferGeometry | null;
  /** gabion stone (textured) */
  stone: THREE.BufferGeometry | null;
}

function partGeometry(p: ModelPart): THREE.BufferGeometry {
  const [x, y, z] = p.size;
  if (p.shape === 'cylinder') return new THREE.CylinderGeometry(x / 2, x / 2, y, 10);
  return new THREE.BoxGeometry(x, y, z);
}

/** inches in the model's frame → feet in the planner's (turned half round: back to -y) */
function place(g: THREE.BufferGeometry, rotation: [number, number, number] | undefined, position: [number, number, number]) {
  if (rotation && rotation.some(Boolean)) g.applyQuaternion(new THREE.Quaternion().setFromEuler(new THREE.Euler(rotation[0] * deg, rotation[1] * deg, rotation[2] * deg, 'XYZ')));
  g.translate(position[0], position[1], position[2]);
  g.scale(1 / 12, 1 / 12, 1 / 12);
  g.rotateY(Math.PI);
  return g;
}

function colored(g: THREE.BufferGeometry, hex: string, f: number): THREE.BufferGeometry {
  const ng = g.index ? g.toNonIndexed() : g;
  if (ng !== g) g.dispose();
  const c = new THREE.Color(hex).multiplyScalar(f);
  const n = ng.getAttribute('position').count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) arr.set([c.r, c.g, c.b], i * 3);
  ng.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return ng;
}

const protos = new Map<string, ModelProto>();

/**
 * The planner shape for a model ('whole', or one 'square' of the stage), at a detail
 * level. Cached: one per model × variant × level.
 */
export function modelProto(model: GuideModel, variant: 'whole' | 'square', quality: Quality, squareFt = 4): ModelProto {
  const key = `${model.slug}:${variant}:${quality}`;
  const hit = protos.get(key);
  if (hit) return hit;
  const parts = partsAt(variant === 'square' ? stageSquareParts(model, squareFt * 12) : model.parts, quality);
  const rnd = seeded(model.slug);
  const solids: THREE.BufferGeometry[] = [];
  const stones: THREE.BufferGeometry[] = [];
  for (const p of parts) {
    const grp = partGroup(p);
    if (grp === 'stone') {
      stones.push(place(stoneBoxGeometry(p.size[0] / 12, p.size[1] / 12, p.size[2] / 12).translate(0, -p.size[1] / 24, 0).scale(12, 12, 12), p.rotation, p.position));
      continue;
    }
    // boards differ a little in tone, so they read as separate boards
    const f = grp === 'wood' ? 0.9 + rnd() * 0.12 : 1;
    const hex = p.color ?? (grp === 'wood' ? WOOD : METAL);
    solids.push(colored(place(partGeometry(p), p.rotation, p.position), hex, f));
  }
  // a planter box in a park has soil and a plant in it
  if (model.slug.startsWith('planter')) {
    const fill = planterFill(model);
    solids.push(colored(place(new THREE.BoxGeometry(...fill.soil.size), undefined, fill.soil.position), SOIL, 1));
    // (an icosahedron is already one triangle per face: flat-shaded leaves)
    const ball = new THREE.IcosahedronGeometry(fill.plant.d / 2, 1).scale(1, 0.75, 1);
    ball.computeVertexNormals();
    solids.push(colored(place(ball, undefined, fill.plant.position), LEAF, 1));
  }
  const merge = (gs: THREE.BufferGeometry[]) => {
    if (!gs.length) return null;
    const ok = gs.map((g) => {
      const ng = g.index ? g.toNonIndexed() : g;
      if (ng !== g) g.dispose();
      return ng;
    });
    const m = mergeGeometries(ok, false);
    ok.forEach((g) => g.dispose());
    m?.computeBoundingSphere();
    return m;
  };
  const proto: ModelProto = { key, solid: merge(solids), stone: merge(stones) };
  protos.set(key, proto);
  return proto;
}

/** Free the shapes built for other detail levels (after the level changed). */
export function dropProtos(keep: Quality) {
  for (const [key, p] of protos) {
    if (key.endsWith(`:${keep}`)) continue;
    p.solid?.dispose();
    p.stone?.dispose();
    protos.delete(key);
  }
}
