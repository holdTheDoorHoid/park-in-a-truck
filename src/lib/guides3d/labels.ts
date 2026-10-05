// Names for parts in the viewer's tooltips and labels: "B-3 · 2x4 × 18.5″".

import { STOCK, type ModelPart } from './schema';

export interface CutLike {
  part: string;
  stock: string;
  lengthIn: number;
  notes?: string;
}

/** English names of the part kinds (the page's words come from the guides catalog, `g3d.kind.*`). */
const KIND_NAMES: Record<string, string> = {
  lumber: 'Board',
  sheet: 'Sheet',
  mesh: 'Wire mesh',
  'stone-fill': 'Stone fill',
  bracket: 'Bracket',
  fastener: 'Fastener',
  fabric: 'Fabric',
  other: 'Part',
};
/** A part kind's name: "Board", "Wire mesh"… */
export type KindName = (kind: string) => string;
const englishKind: KindName = (kind) => KIND_NAMES[kind] ?? KIND_NAMES.other!;

/** How the page says part names and sizes (src/components/guides/partNames.ts); English by default. */
export interface PartWords {
  /** a part kind's name: "Board", "Wire mesh"… */
  kind: KindName;
  /** a part's label in the page's language ("BB-1" stays "BB-1") */
  ref: (ref: string) => string;
  /** what a part is and its size side by side, with the language's comma: "Wire mesh, 18 × 12″" */
  pair: (what: string, size: string) => string;
}
const ENGLISH: PartWords = { kind: englishKind, ref: (r) => r, pair: (what, size) => `${what}, ${size}` };
export const partWords = (words: Partial<PartWords> = {}): PartWords => ({ ...ENGLISH, ...words });

/** 18.5 -> "18.5″", 96 -> "96″" (inches, trimmed). */
export function inches(n: number): string {
  return `${parseFloat(n.toFixed(2))}″`;
}

/** Nominal stock for an actual cross-section ("2x4" for 1.5 × 3.5), if it is one. */
function stockFor(p: ModelPart): { stock: string; length: number } | null {
  const s = [...p.size].sort((a, b) => a - b);
  for (const [k, [t, w]] of Object.entries(STOCK)) if (Math.abs(s[0]! - t) < 0.13 && Math.abs(s[1]! - w) < 0.13) return { stock: k, length: s[2]! };
  return null;
}

export function partLabel(p: ModelPart, cutList: CutLike[] = [], words: Partial<PartWords> = {}): { name: string; detail: string; note?: string } {
  const w = partWords(words);
  const cut = p.ref ? cutList.find((c) => c.part === p.ref) : undefined;
  const name = p.ref ? w.ref(p.ref) : w.kind(p.kind);
  if (cut) {
    const isLumber = /^\s*\d+\s*[x×]\s*\d+\s*$/i.test(cut.stock);
    const detail = isLumber ? `${cut.stock} × ${inches(cut.lengthIn)}` : w.pair(cut.stock, inches(cut.lengthIn));
    return { name, detail, note: cut.notes };
  }
  if (p.kind === 'lumber') {
    const st = stockFor(p);
    if (st) return { name, detail: `${st.stock} × ${inches(st.length)}` };
  }
  const dims = p.shape === 'cylinder' ? `${inches(p.size[0])} ⌀ × ${inches(p.size[1])}` : p.size.map((v) => parseFloat(v.toFixed(2))).join(' × ') + '″';
  return { name, detail: p.ref ? w.pair(w.kind(p.kind), dims) : dims };
}

export function partTooltip(p: ModelPart, cutList: CutLike[] = [], words: Partial<PartWords> = {}): string {
  const l = partLabel(p, cutList, words);
  return `${l.name} · ${l.detail}`;
}
