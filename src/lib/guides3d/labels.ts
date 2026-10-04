// Names for parts in the viewer's tooltips and labels: "B-3 · 2x4 × 18.5″".

import { STOCK, type ModelPart } from './schema';

export interface CutLike {
  part: string;
  stock: string;
  lengthIn: number;
  notes?: string;
}

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

export function partLabel(p: ModelPart, cutList: CutLike[] = []): { name: string; detail: string; note?: string } {
  const cut = p.ref ? cutList.find((c) => c.part === p.ref) : undefined;
  const name = p.ref ?? KIND_NAMES[p.kind] ?? 'Part';
  if (cut) {
    const isLumber = /^\s*\d+\s*[x×]\s*\d+\s*$/i.test(cut.stock);
    const detail = isLumber ? `${cut.stock} × ${inches(cut.lengthIn)}` : `${cut.stock}, ${inches(cut.lengthIn)}`;
    return { name, detail, note: cut.notes };
  }
  if (p.kind === 'lumber') {
    const st = stockFor(p);
    if (st) return { name, detail: `${st.stock} × ${inches(st.length)}` };
  }
  const dims = p.shape === 'cylinder' ? `${inches(p.size[0])} ⌀ × ${inches(p.size[1])}` : p.size.map((v) => parseFloat(v.toFixed(2))).join(' × ') + '″';
  return { name, detail: p.ref ? `${KIND_NAMES[p.kind] ?? 'Part'}, ${dims}` : dims };
}

export function partTooltip(p: ModelPart, cutList: CutLike[] = []): string {
  const l = partLabel(p, cutList);
  return `${l.name} · ${l.detail}`;
}
