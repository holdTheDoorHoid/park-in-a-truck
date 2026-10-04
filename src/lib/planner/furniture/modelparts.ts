// Build-guide model parts as the planner draws them (pure, tested). Reads the same JSON
// as the build-guide viewer (src/data/guides/models/<slug>.json, inches, y up, origin at
// the footprint centre on the ground) without touching the viewer.

import type { GuideModel, ModelPart } from '../../guides3d/schema';

/** How much detail the 3D view draws. */
export type Quality = 'high' | 'low' | 'blocks';

/** Which shared material a part is drawn with in the planner. */
export type PartGroup = 'wood' | 'metal' | 'stone';

/**
 * The planner's material for a part, or null to leave it out: wire-mesh panels (the
 * stone texture carries the wire), the planter liner (hidden inside), screws and hooks
 * (too small to see at park scale).
 */
export function partGroup(p: Pick<ModelPart, 'kind'>): PartGroup | null {
  switch (p.kind) {
    case 'lumber':
    case 'sheet':
      return 'wood';
    case 'bracket':
    case 'other':
      return 'metal';
    case 'stone-fill':
      return 'stone';
    default:
      return null; // mesh, fabric, fastener
  }
}

/** The parts drawn at a quality level: low drops small hardware (under 6" every way). */
export function partsAt(parts: ModelPart[], quality: Quality): ModelPart[] {
  return parts.filter((p) => {
    const g = partGroup(p);
    if (!g) return false;
    // wholly below the ground (anchors)
    if (p.position[1] + Math.max(...p.size) / 2 < 0) return false;
    if (quality !== 'high' && g === 'metal' && Math.max(...p.size) < 6) return false;
    return true;
  });
}

const lumber = (id: string, size: [number, number, number], position: [number, number, number]): ModelPart => ({
  id,
  kind: 'lumber',
  size,
  position,
  step: 0,
});

/**
 * One 4' x 4' square of PiaT's stage, built the way the 12' x 8' stage is (same boards,
 * same deck spacing, same height): deck boards across the top, four courses of face
 * boards on all four sides, a joist down the middle. Squares placed side by side read as
 * one stage. Measurements come from the stage model itself.
 */
export function stageSquareParts(stage: GuideModel, sizeIn = 48): ModelPart[] {
  const deck = stage.parts.filter((p) => p.id.startsWith('deck#')).sort((a, b) => a.position[2] - b.position[2]);
  const face = stage.parts.filter((p) => p.id.startsWith('front-face#'));
  const joist = stage.parts.find((p) => p.id.startsWith('joist#'));
  if (deck.length < 2 || !face.length) return [];
  const [, dT, dW] = deck[0]!.size; // [length, thickness, width]
  const deckY = deck[0]!.position[1];
  const pitch = deck[1]!.position[2] - deck[0]!.position[2];
  const [, fH, fT] = face[0]!.size; // [length, height, thickness]
  const half = sizeIn / 2;
  const parts: ModelPart[] = [];
  const n = Math.max(1, Math.floor((sizeIn - dW) / pitch + 1e-6) + 1);
  const span = (n - 1) * pitch + dW;
  for (let k = 0; k < n; k++) parts.push(lumber(`deck#${k + 1}`, [sizeIn, dT, dW], [0, deckY, -span / 2 + dW / 2 + k * pitch]));
  for (const f of face) {
    const y = f.position[1];
    parts.push(lumber(`front#${y}`, [sizeIn, fH, fT], [0, y, half - fT / 2]));
    parts.push(lumber(`back#${y}`, [sizeIn, fH, fT], [0, y, -half + fT / 2]));
    parts.push(lumber(`left#${y}`, [fT, fH, sizeIn - 2 * fT], [-half + fT / 2, y, 0]));
    parts.push(lumber(`right#${y}`, [fT, fH, sizeIn - 2 * fT], [half - fT / 2, y, 0]));
  }
  if (joist) parts.push(lumber('joist', [joist.size[0], joist.size[1], sizeIn - 2 * fT], [0, joist.position[1], 0]));
  return parts;
}

/** Axis-aligned bounds of parts (inches), ignoring rotations of thin parts. */
export function partsBounds(parts: ModelPart[]): { min: [number, number, number]; max: [number, number, number] } {
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (const p of parts) {
    for (let a = 0; a < 3; a++) {
      const h = p.rotation && p.rotation.some(Boolean) ? Math.max(...p.size) / 2 : p.size[a]! / 2;
      min[a] = Math.min(min[a]!, p.position[a]! - h);
      max[a] = Math.max(max[a]!, p.position[a]! + h);
    }
  }
  return { min, max };
}

/**
 * Soil and a plant in a planter box (the guide stops at the empty box; a planter in a
 * park has something in it). Inches, in the model's frame: [centre, size] boxes.
 */
export function planterFill(model: Pick<GuideModel, 'bounds' | 'asBuilt'>): { soil: { position: [number, number, number]; size: [number, number, number] }; plant: { position: [number, number, number]; d: number } } {
  const b = model.asBuilt ?? model.bounds;
  const wall = 1.6;
  const top = b.height - 2;
  const soil = { position: [0, (top + 1.5) / 2, 0] as [number, number, number], size: [b.length - 2 * wall, top - 1.5, b.width - 2 * wall] as [number, number, number] };
  const d = Math.min(b.length, b.width) * 0.8;
  return { soil, plant: { position: [0, top - d * 0.15, 0], d } };
}
