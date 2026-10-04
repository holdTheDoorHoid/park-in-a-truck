// 3D assembly models for the build guides. One JSON per guide:
// src/data/guides/models/<slug>.json. The viewer animates the parts of each
// step into place as the reader scrolls through the guide.
//
// Units: INCHES. Axes (three.js, y up): x = the piece's length, left→right as
// seen from the front; y = up; z = toward the viewer (the front). Origin: the
// centre of the footprint, at ground level (y = 0 is the ground).

export type PartKind = 'lumber' | 'sheet' | 'mesh' | 'stone-fill' | 'bracket' | 'fastener' | 'fabric' | 'other';
export type PartShape = 'box' | 'cylinder' | 'mesh-box';

export interface ModelPart {
  /** unique within the model, e.g. "BB-1#3" */
  id: string;
  /** cut-list part label ("BB-1"), or a materials/hardware item name */
  ref?: string;
  kind: PartKind;
  /** default 'box' */
  shape?: PartShape;
  /**
   * box: [x, y, z] extents before rotation. Lumber uses ACTUAL sizes (a 2x4 is
   * 1.5 x 3.5) with the board's length along one axis.
   * cylinder: [diameter, length, diameter], axis along y before rotation.
   * mesh-box: a wire basket, [x, y, z] outer extents.
   */
  size: [number, number, number];
  /** centre of the part, inches */
  position: [number, number, number];
  /** degrees, Euler order XYZ (three.js default) */
  rotation?: [number, number, number];
  /** guide step number in which this part is added */
  step: number;
  /** where the part flies in from during the animation, as an offset in inches (default: from above) */
  from?: [number, number, number];
  /** colour override (CSS) */
  color?: string;
}

export interface GuideModel {
  slug: string;
  units: 'in';
  /** overall size; must match the guide's dimensionsIn within 1 inch */
  bounds: { length: number; width: number; height: number };
  parts: ModelPart[];
  /** optional camera hint */
  view?: { azimuthDeg: number; elevationDeg: number };
  /** what the modeller had to assume (shown nowhere; for reviewers) */
  notes?: string[];
  /** cut-list part labels this model covers (default: all), e.g. one box size of a planter guide */
  cutListScope?: string[];
  /** part label -> the count the model uses instead of the cut list's, with the reason */
  countOverrides?: Record<string, { count: number; reason: string }>;
  /**
   * The size the parts actually build, when it differs from the guide's stated
   * (nominal) dimensions — e.g. a top board sitting on 18" sides makes a 19.5"
   * bench. The validator checks the model against this instead, and it must stay
   * within 4" of the stated size. Always give the reason.
   */
  asBuilt?: { length: number; width: number; height: number; reason: string };
  /**
   * Which guide step the viewer shows as the "cut pile" (every board laid flat
   * in rows and labelled). Default: detected — step 1 or 2 when its title reads
   * like "Mark, label and cut the lumber" and the model adds no parts in it.
   * Set 0 to never show a cut pile. (Added by the guide3d viewer; optional.)
   */
  cutPileStep?: number;
}

/** Actual cross-sections of nominal lumber, inches [thickness, width]. */
export const STOCK: Record<string, [number, number]> = {
  '1x2': [0.75, 1.5],
  '1x3': [0.75, 2.5],
  '1x4': [0.75, 3.5],
  '1x6': [0.75, 5.5],
  '1x8': [0.75, 7.25],
  '1x10': [0.75, 9.25],
  '1x12': [0.75, 11.25],
  '2x2': [1.5, 1.5],
  '2x3': [1.5, 2.5],
  '2x4': [1.5, 3.5],
  '2x6': [1.5, 5.5],
  '2x8': [1.5, 7.25],
  '2x10': [1.5, 9.25],
  '2x12': [1.5, 11.25],
  '4x4': [3.5, 3.5],
  '4x6': [3.5, 5.5],
  '6x6': [5.5, 5.5],
};

/** Normalise a cut list's stock string ("2x4", "2 x 4", "2x4x8") to a STOCK key. */
export function stockKey(stock: string | undefined): string | null {
  if (!stock) return null;
  const m = /(\d+)\s*[x×]\s*(\d+)/i.exec(stock);
  if (!m) return null;
  const k = `${m[1]}x${m[2]}`;
  return k in STOCK ? k : null;
}
