// The park-piece data model: what scripts/extract_pieces.py writes to
// src/data/pieces/<size>-<lotKind>.json. Owner: pieces workstream.
//
// All coordinates are park-local feet at the set's NOMINAL size (DESIGN.md §5):
// x along the length (FRONT at low x, entrance edge x0), y along the width,
// y up — standing on x0 looking toward +x, the y1 edge is on your left.

import type { LotKind, Material, SizeId, ThemeId } from '../types';

export type PieceKind = 'frame' | 'front' | 'back';
export type Edge = 'x0' | 'x1' | 'y0' | 'y1';
/** [x0, y0, x1, y1] in feet */
export type Rect = [number, number, number, number];

export const PIECE_KINDS: PieceKind[] = ['frame', 'front', 'back'];

/** A park element drawn on a piece. */
export interface PieceItem {
  /** key into src/data/elements.ts */
  element: string;
  /** centre, feet */
  x: number;
  y: number;
  /** footprint along x and y before rotation, feet */
  w: number;
  h: number;
  rotationDeg: number;
  /** trees: drawn canopy diameter */
  canopyFt?: number;
  /** tables: chairs drawn around it */
  seats?: number;
  /** raised beds */
  shape?: 'round' | 'rect';
  /** stools drawn at the end of a bench */
  atBench?: boolean;
  /** the element was drawn across a piece boundary and has been joined */
  joined?: boolean;
}

export interface Piece {
  /** the area the piece covers (a frame is a ring of rectangles) */
  extent: Rect[];
  /** materials as non-overlapping rectangles on a half-foot grid */
  surfaces: Partial<Record<Material, Rect[]>>;
  items: PieceItem[];
  /** where it is printed: 1-based PDF page and the tile's box in PDF points */
  source: { page: number; bboxPt: Rect }[];
}

export interface PieceSet {
  /** "<size>-<lotKind>" */
  id: string;
  size: SizeId;
  lotKind: LotKind;
  nominal: { lengthFt: number; widthFt: number };
  /** the size's range from the workbook (long edge, short edge) */
  range: { longFt: [number, number]; shortFt: [number, number] };
  streetEdges: Edge[];
  entranceEdge: 'x0';
  /** share of each outer 1-ft band drawn as gabion wall (how the street edges were found) */
  edgeGabionShare: Record<Edge, number>;
  seams: {
    /** LENGTH seam: the cut between front and back; extra length goes in here */
    length: { x: number; maxFt: number; stretch: 'front' };
    /** WIDTH seam: along the length, between the interior and the frame strip */
    width: { y: number; maxFt: number; stretch: 'above' | 'below' };
  };
  source: {
    file: string;
    /** the download column on Dream p.11 the file sits under */
    linkColumn: LotKind;
    cover: string;
    /** the art is printed mirrored (front on the right); the data is not */
    printedMirrored: boolean;
    themePages: Record<ThemeId, number[]>;
    seamPages: number[];
    scale: string;
    derivedFrom?: string;
    duplicates?: string[];
  };
  /** known problems in the source for this set */
  issues: string[];
  /** themes whose pages print identical art in the source (e.g. [['nature','sanctuary']]) */
  sharedArt?: [string, string][];
  themes: Record<ThemeId, Record<PieceKind, Piece>>;
}

export const SET_IDS: string[] = (['A', 'B', 'C', 'D', 'E'] as SizeId[]).flatMap((s) =>
  (['interior', 'corner-left', 'corner-right'] as LotKind[]).map((k) => `${s}-${k}`),
);

export function setId(size: SizeId, lotKind: LotKind): string {
  return `${size}-${lotKind}`;
}

export function rectArea(r: Rect): number {
  return Math.max(0, r[2] - r[0]) * Math.max(0, r[3] - r[1]);
}
