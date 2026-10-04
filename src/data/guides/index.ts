// Structured build guides, ported from Park in a Truck's thirteen furniture
// assembly PDFs (Ikea-style: cover, "before you begin", lumber + hardware +
// tools, a cut list, then numbered steps). Owner: guides workstream.
//
// Source: ~/Desktop/park-in-a-truck/source/{pdfs,linked}/*.pdf, extracted with
// scripts/extract_guides.py (images) and read by hand for the numbers/wording
// below (pymupdf `get_text("blocks", sort=True)`). Quantities, sizes and cut
// lengths are exactly what the PDF says; nothing invented. The `gabion-wall`
// element in elements.ts has no guide here — see the note in the final report
// of the guides workstream: both the "GABION WALL" and "SHADE CANOPY" links on
// Dream workbook p19 point to the same wrong file (a 12" gabion basket
// how-to), not a wall or canopy guide.
//
// The 3D planner (planner workstream) builds procedural models from
// `dimensionsIn` and `cutList`, so keep both precise and in inches.

export type GuideCategory = 'seating' | 'tables' | 'planters' | 'structures';

export const CATEGORY_LABELS: Record<GuideCategory, string> = {
  seating: 'Seating',
  tables: 'Tables & work surfaces',
  planters: 'Planters',
  structures: 'Structures',
};

/** Materials/hardware line item. `qty` is always a count (of `size`, when given). */
export interface GuideMaterial {
  item: string;
  qty: number;
  size?: string;
  notes?: string;
  link?: string;
}

export interface GuideCutListItem {
  /** The PDF's part label, e.g. "BB-1" */
  part: string;
  qty: number;
  /** Nominal stock, e.g. "2x4" */
  stock: string;
  lengthIn: number;
  notes?: string;
}

export interface GuideStep {
  n: number;
  title?: string;
  /** PiaT's instruction text for this step, lightly cleaned (typos fixed, numbering made sequential). */
  text: string;
  /** Paths under public/img/guides/<slug>/ */
  images: string[];
  /** Alt text for each image, same length/order as `images`. */
  imageAlts: string[];
  tips?: string[];
}

export interface GuideLink {
  label: string;
  url: string;
}

export interface Guide {
  slug: string;
  title: string;
  /** Id into src/data/elements.ts */
  element: string;
  summary: string;
  category: GuideCategory;
  /** Overall assembled dimensions, inches, from the cover drawing's dimension lines
   * (or, where the cover has none, derived from the explicit per-part cut lengths —
   * noted in `summary` when that's the case). */
  dimensionsIn: { length: number; width: number; height: number };
  time?: string;
  people?: string;
  skill?: string;
  cost?: string;
  materials: GuideMaterial[];
  hardware: GuideMaterial[];
  cutList: GuideCutListItem[];
  tools: string[];
  steps: GuideStep[];
  finishing?: string;
  safety?: string[];
  links: GuideLink[];
  /** public/downloads/guides/<slug>.pdf */
  pdf: string;
  /** Which source document + pages this was read from, for credit/verification. */
  sourcePages: string;
}

import benchBack from './bench-back.json';
import bench4 from './bench-4.json';
import stool from './stool.json';
import table2 from './table-2.json';
import table4 from './table-4.json';
import table6 from './table-6.json';
import planter18 from './planter-18.json';
import planter24 from './planter-24.json';
import gabionBench from './gabion-bench.json';
import gabionBench8 from './gabion-bench-8.json';
import shade from './shade.json';
import stage from './stage.json';
import workbench from './workbench.json';

// Order here is the order guides appear within a category on /build/.
const ALL: Guide[] = [
  benchBack,
  bench4,
  stool,
  gabionBench,
  gabionBench8,
  table2,
  table4,
  table6,
  workbench,
  planter18,
  planter24,
  shade,
  stage,
] as Guide[];

export function getGuides(): Guide[] {
  return ALL;
}

export function getGuide(slug: string): Guide | undefined {
  return ALL.find((g) => g.slug === slug);
}

export function getGuidesByCategory(): { category: GuideCategory; guides: Guide[] }[] {
  const order: GuideCategory[] = ['seating', 'tables', 'planters', 'structures'];
  return order
    .map((category) => ({ category, guides: ALL.filter((g) => g.category === category) }))
    .filter((c) => c.guides.length > 0);
}
