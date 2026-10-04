// Furniture priced from Park in a Truck's own build guides (the owner's decision
// of 2026-10-04, DESIGN.md §2): each piece's order comes from its guide's
// materials and hardware lists (src/data/guides/<slug>.json), priced with the
// cost spreadsheet's prices (prices.ts). Anything the spreadsheet has no price
// for is "price needed" — never a made-up price.
//
// Lumber is checked against the guide's own cut list, counted honestly
// (boards.ts: 1/8" per saw cut, so each 93" or 86" piece takes a whole 8'
// board). Where the cut list needs more boards than the materials list says,
// the estimate orders what the cut list needs and the line says why. Where a
// guide's steps use a different number of a part than its cut list (found
// while building the 3D models; src/data/guides/models/<slug>.json
// countOverrides), the steps' number is used.
//
// Only the lists are imported (named JSON imports), so the step text and the
// 3D models stay out of the estimator's bundle.

import { boardsForCopies, extraBoards, KERF } from './boards';
import { LUMBER, PRICES, UNPRICED_LUMBER_LINKS, type Price } from './prices';
import { EN, bare, price, type CostKey, type CostT } from './text';
import type { GuideCutListItem, GuideMaterial } from '../../data/guides';

import { cutList as benchBackCut, hardware as benchBackHw, materials as benchBackMat, title as benchBackTitle } from '../../data/guides/bench-back.json';
import { cutList as bench4Cut, hardware as bench4Hw, materials as bench4Mat, title as bench4Title } from '../../data/guides/bench-4.json';
import { cutList as stoolCut, hardware as stoolHw, materials as stoolMat, title as stoolTitle } from '../../data/guides/stool.json';
import { cutList as table2Cut, hardware as table2Hw, materials as table2Mat, title as table2Title } from '../../data/guides/table-2.json';
import { cutList as table4Cut, hardware as table4Hw, materials as table4Mat, title as table4Title } from '../../data/guides/table-4.json';
import { cutList as table6Cut, hardware as table6Hw, materials as table6Mat, title as table6Title } from '../../data/guides/table-6.json';
import { cutList as planter18Cut, hardware as planter18Hw, materials as planter18Mat, title as planter18Title } from '../../data/guides/planter-18.json';
import { cutList as planter24Cut, hardware as planter24Hw, materials as planter24Mat, title as planter24Title } from '../../data/guides/planter-24.json';
import { cutList as gabion4Cut, hardware as gabion4Hw, materials as gabion4Mat, title as gabion4Title } from '../../data/guides/gabion-bench.json';
import { cutList as gabion8Cut, hardware as gabion8Hw, materials as gabion8Mat, title as gabion8Title } from '../../data/guides/gabion-bench-8.json';
import { cutList as shadeCut, hardware as shadeHw, materials as shadeMat, title as shadeTitle } from '../../data/guides/shade.json';
import { cutList as stageCut, hardware as stageHw, materials as stageMat, title as stageTitle } from '../../data/guides/stage.json';
import { cutList as workbenchCut, hardware as workbenchHw, materials as workbenchMat, title as workbenchTitle } from '../../data/guides/workbench.json';

export type GuideSlug =
  | 'bench-back'
  | 'bench-4'
  | 'stool'
  | 'table-2'
  | 'table-4'
  | 'table-6'
  | 'planter-18'
  | 'planter-24'
  | 'gabion-bench'
  | 'gabion-bench-8'
  | 'shade'
  | 'stage'
  | 'workbench';

export interface GuideSpec {
  slug: GuideSlug;
  /** The guide's title ("Bench + Back"), in English (the guides overlay translates it) */
  title: string;
  /** One piece, as the estimate names it (English; `pieceName` gives it in other languages) */
  name: string;
  /** One piece in a sentence ("bench"), for "16 per stage (32 for 2)" (English) */
  one: string;
  /** The cost catalog's keys for `name` and `one` */
  keys: { name: CostKey; one: CostKey };
  materials: GuideMaterial[];
  hardware: GuideMaterial[];
  cutList: GuideCutListItem[];
  /** Cut-list parts for the box size the planner draws (planter guides cover two boxes) */
  scope?: (part: string) => boolean;
  /**
   * Parts the guide's steps use a different number of than its cut list says
   * (the 3D models' countOverrides; a test keeps them in step). `drawings`: the
   * guide's drawings use that number too.
   */
  stepCounts?: Record<string, { count: number; drawings?: true }>;
  /** Gabion benches: the basket's inside volume, cubic feet (from the guide's mesh panels) */
  basketCuFt?: number;
}

const m = (x: unknown) => x as GuideMaterial[];
/** A piece's name and its word in a sentence, from the cost catalog (stored in English). */
const piece = (name: CostKey, one: CostKey) => ({ name: EN(name), one: EN(one), keys: { name, one } });

/** A piece's name in the reader's language ("Bench with back"). */
export function pieceName(slug: GuideSlug, t: CostT = EN): string {
  return t(GUIDES[slug].keys.name);
}
const c = (x: unknown) => x as GuideCutListItem[];

export const GUIDES: Record<GuideSlug, GuideSpec> = {
  'bench-back': { slug: 'bench-back', title: benchBackTitle, ...piece('piece.benchBack', 'guide.one.bench'), materials: m(benchBackMat), hardware: m(benchBackHw), cutList: c(benchBackCut) },
  'bench-4': { slug: 'bench-4', title: bench4Title, ...piece('piece.bench4', 'guide.one.bench'), materials: m(bench4Mat), hardware: m(bench4Hw), cutList: c(bench4Cut) },
  stool: { slug: 'stool', title: stoolTitle, ...piece('piece.stool', 'guide.one.stool'), materials: m(stoolMat), hardware: m(stoolHw), cutList: c(stoolCut) },
  'table-2': {
    slug: 'table-2',
    title: table2Title,
    ...piece('piece.table2', 'guide.one.table'),
    materials: m(table2Mat),
    hardware: m(table2Hw),
    cutList: c(table2Cut),
    stepCounts: { 'T-2': { count: 9, drawings: true } },
  },
  'table-4': { slug: 'table-4', title: table4Title, ...piece('piece.table4', 'guide.one.table'), materials: m(table4Mat), hardware: m(table4Hw), cutList: c(table4Cut) },
  'table-6': { slug: 'table-6', title: table6Title, ...piece('piece.table6', 'guide.one.table'), materials: m(table6Mat), hardware: m(table6Hw), cutList: c(table6Cut) },
  'planter-18': {
    slug: 'planter-18',
    title: planter18Title,
    ...piece('piece.planter18', 'guide.one.planter'),
    materials: m(planter18Mat),
    hardware: m(planter18Hw),
    cutList: c(planter18Cut),
    scope: (part) => part.includes('18"x18"'),
  },
  'planter-24': {
    slug: 'planter-24',
    title: planter24Title,
    ...piece('piece.planter24', 'guide.one.planter'),
    materials: m(planter24Mat),
    hardware: m(planter24Hw),
    cutList: c(planter24Cut),
    scope: (part) => part.includes('24"x24"'),
  },
  'gabion-bench': {
    slug: 'gabion-bench',
    title: gabion4Title,
    ...piece('piece.gabionBench', 'guide.one.bench'),
    materials: m(gabion4Mat),
    hardware: m(gabion4Hw),
    cutList: c(gabion4Cut),
    basketCuFt: (48 * 18 * 18) / 1728,
  },
  'gabion-bench-8': {
    slug: 'gabion-bench-8',
    title: gabion8Title,
    ...piece('piece.gabionBench8', 'guide.one.bench'),
    materials: m(gabion8Mat),
    hardware: m(gabion8Hw),
    cutList: c(gabion8Cut),
    stepCounts: { 'GB-2': { count: 5 } },
    basketCuFt: (96 * 18 * 18) / 1728,
  },
  shade: {
    slug: 'shade',
    title: shadeTitle,
    ...piece('piece.shade', 'guide.one.structure'),
    materials: m(shadeMat),
    hardware: m(shadeHw),
    cutList: c(shadeCut),
    stepCounts: { 'SS-1': { count: 32 } },
  },
  stage: { slug: 'stage', title: stageTitle, ...piece('piece.stage', 'guide.one.stage'), materials: m(stageMat), hardware: m(stageHw), cutList: c(stageCut) },
  workbench: { slug: 'workbench', title: workbenchTitle, ...piece('piece.workbench', 'guide.one.workbench'), materials: m(workbenchMat), hardware: m(workbenchHw), cutList: c(workbenchCut) },
};

/** One line of a guide's order, before the estimate prices it. */
export interface GuideLine {
  item: string;
  qty: number;
  unit: string;
  /** The spreadsheet's price for it, or null: price needed */
  price: Price | null;
  /** Order-list merge key */
  material: string;
  /** "Price needed" id (when price is null) */
  priceId?: string;
  link?: string;
  notes?: string;
}

const inch = (t: CostT, v: number) => `${bare(t, v)}″`;
const ft = (t: CostT, inches: number) => `${bare(t, inches / 12)}′`;
const NUM: Partial<Record<number, CostKey>> = { 2: 'guide.num.2', 3: 'guide.num.3', 4: 'guide.num.4', 5: 'guide.num.5', 6: 'guide.num.6' };

/** "2x4x8'" or "2x4x8'-0"" → { stock: '2x4', size: '2x4x8', lengthIn: 96 } */
function lumberSize(s: string | undefined): { stock: string; size: string; lengthIn: number } | undefined {
  const mt = /^(\d+)x(\d+)x(\d+)'/.exec(s ?? '');
  if (!mt) return undefined;
  return { stock: `${mt[1]}x${mt[2]}`, size: `${mt[1]}x${mt[2]}x${mt[3]}`, lengthIn: Number(mt[3]) * 12 };
}

/** One copy of the cut list, per stock ("2x4" → lengths in inches), with the steps' counts. */
function pieces(g: GuideSpec, steps: boolean): Record<string, number[]> {
  const out: Record<string, number[]> = {};
  for (const cut of g.cutList) {
    if (g.scope && !g.scope(cut.part)) continue;
    if (!/^\d+x\d+$/.test(cut.stock)) continue; // mesh panels are not lumber
    const n = steps ? (g.stepCounts?.[cut.part]?.count ?? cut.qty) : cut.qty;
    (out[cut.stock] ??= []).push(...Array.from({ length: n }, () => cut.lengthIn));
  }
  return out;
}

/** Why a cut list needs more boards than its list says, in a builder's words. */
function whyShort(t: CostT, lengths: number[], L: number, tightToo: boolean): string {
  const distinct = [...new Set(lengths)].sort((a, b) => b - a);
  // a length that would fit k times without saw cuts, but not with them
  const tight = !tightToo ? undefined : distinct.find((p) => Math.floor(L / p + 1e-9) >= 2 && Math.floor((L + KERF) / (p + KERF) + 1e-9) < Math.floor(L / p + 1e-9));
  if (tight !== undefined) {
    const k = Math.floor(L / tight + 1e-9);
    const word = NUM[k];
    return t('guide.reason.tight', { count: k, number: word ? t(word) : bare(t, k), length: inch(t, tight), board: ft(t, L) });
  }
  const long = distinct.filter((p) => 2 * p + KERF > L);
  if (long.length) return t('guide.reason.long', { lengths: long.map((p) => inch(t, p)).join(t('guide.reason.and')), board: ft(t, L) });
  return t('guide.reason.counted');
}

/** Boards to buy for `n` pieces of one lumber size: the guide's list, or what its cut list needs if that is more. */
function lumberLines(g: GuideSpec, n: number, t: CostT): GuideLine[] {
  const lines: GuideLine[] = [];
  const steps = pieces(g, true);
  const literal = pieces(g, false);
  const listed = g.materials.map((x) => ({ x, s: lumberSize(x.size) })).filter((v): v is { x: GuideMaterial; s: NonNullable<ReturnType<typeof lumberSize>> } => Boolean(v.s));
  const byStock = new Map<string, typeof listed>();
  for (const v of listed) byStock.set(v.s.stock, [...(byStock.get(v.s.stock) ?? []), v]);

  for (const [stock, sizes] of byStock) {
    const cut = steps[stock] ?? [];
    const order = new Map<string, { qty: number; list: number; need: number; L: number }>();
    if (sizes.length === 1) {
      const { x, s } = sizes[0]!;
      const list = Math.ceil(x.qty * n - 1e-9);
      const need = boardsForCopies(cut, s.lengthIn, n);
      order.set(s.size, { qty: Math.max(list, need), list, need, L: s.lengthIn });
    } else {
      // several lengths of one stock (the stage, the workbench): pieces that only fit
      // the longer boards go there; check the rest against the listed boards
      const stock0: Record<number, number> = {};
      for (const { x, s } of sizes) stock0[s.lengthIn] = Math.ceil(x.qty * n - 1e-9);
      const all: number[] = [];
      for (let k = 0; k < n; k++) all.push(...cut);
      let extra = extraBoards(all, stock0);
      if (n > 1) {
        const one = extraBoards(cut, Object.fromEntries(sizes.map(({ x, s }) => [s.lengthIn, Math.ceil(x.qty - 1e-9)])));
        const sum = (r: Record<number, number>) => Object.values(r).reduce((a, b) => a + b, 0);
        if (sum(one) * n < sum(extra)) extra = Object.fromEntries(Object.entries(one).map(([k, v]) => [k, v * n]));
      }
      for (const { s } of sizes) {
        const list = stock0[s.lengthIn]!;
        order.set(s.size, { qty: list + (extra[s.lengthIn] ?? 0), list, need: list + (extra[s.lengthIn] ?? 0), L: s.lengthIn });
      }
    }

    for (const { x, s } of sizes) {
      const o = order.get(s.size)!;
      if (o.qty <= 0) continue;
      const notes: string[] = [];
      if (o.qty > o.list) {
        // with several lengths listed, only the pieces that need this length explain it
        const reason = sizes.length === 1 ? whyShort(t, cut, s.lengthIn, true) : whyShort(t, cut.filter((p) => p <= s.lengthIn), s.lengthIn, false);
        const vars = { list: bare(t, x.qty), need: bare(t, o.qty), reason };
        notes.push(
          n > 1 ? t('guide.note.shortPer', { ...vars, one: t(g.keys.one), total: bare(t, x.qty * n), count: bare(t, n) }) : t('guide.note.short', vars),
        );
      }
      // parts whose count the steps change, when that changes the boards
      if (g.stepCounts && sizes.length === 1) {
        const lit = boardsForCopies(literal[stock] ?? [], s.lengthIn, n);
        if (lit !== o.need)
          for (const [part, sc] of Object.entries(g.stepCounts)) {
            const was = g.cutList.find((cc) => cc.part === part);
            if (!was || was.stock !== stock) continue;
            const covered = o.qty === o.list;
            const key = sc.drawings
              ? covered
                ? 'guide.note.stepsDrawingsCovered'
                : 'guide.note.stepsDrawings'
              : covered
                ? 'guide.note.stepsCovered'
                : 'guide.note.steps';
            notes.push(t(key, { listed: bare(t, was.qty), part, count: bare(t, sc.count), boards: bare(t, o.list) }));
          }
      }
      const price = LUMBER[s.size] ?? null;
      lines.push({
        item: s.size,
        qty: o.qty,
        unit: 'ea.',
        price,
        material: `lumber:${s.size}`,
        priceId: price ? undefined : `lumber:${s.size}`,
        link: price?.link ?? UNPRICED_LUMBER_LINKS[s.size],
        notes: notes.join(' ') || undefined,
      });
    }
  }
  return lines;
}

const slugId = (s: string) =>
  s
    .toLowerCase()
    .replace(/["″]/g, 'in')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** Hardware and the other materials, matched to the spreadsheet's prices by what they are. */
function otherLine(g: GuideSpec, x: GuideMaterial, n: number, t: CostT): GuideLine | null {
  const item = x.item.toLowerCase();
  const size = x.size ?? '';
  const qty = Math.ceil(x.qty * n - 1e-9);
  const P = PRICES;
  const needed = (label: string, id: string, extra: Partial<GuideLine> = {}): GuideLine => ({
    item: label,
    qty,
    unit: 'ea.',
    price: null,
    material: `guide:${id}`,
    priceId: `guide:${id}`,
    link: x.link,
    ...extra,
  });

  if (item.includes('wood screw') && !item.includes('lag')) {
    if (size === '2.5"') return { item: t('line.woodScrews'), qty, unit: 'ea.', price: P.woodScrew, material: 'wood-screw', link: P.woodScrew.link };
    return needed(t('guide.item.screws', { size }), `screw-${slugId(size)}`, { notes: t('guide.note.screws') });
  }
  if (item.includes('lag')) {
    if (size.startsWith('1/4"'))
      return {
        item: t('guide.item.lagScrews', { size: size.replace(/-/g, ' ') }),
        qty,
        unit: 'ea.',
        price: P.lagScrew,
        material: `lag-screw-${slugId(size)}`,
        notes: t('guide.note.lagSamePrice', { size }),
      };
    return needed(t('guide.item.lagScrews', { size }), `lag-screw-${slugId(size)}`, { notes: t('guide.note.lagNoPrice') });
  }
  if (item.includes('carriage bolt'))
    return { item: t('line.carriageBolts'), qty, unit: 'ea.', price: P.carriageBolt, material: 'carriage-bolt', link: P.carriageBolt.link };
  if (item.includes('backrest bracket')) return { item: t('line.backrestBrackets'), qty, unit: 'ea.', price: P.backrestBracket, material: 'backrest-bracket', link: P.backrestBracket.link };
  if (item.includes('l bracket') || item.includes('l-bracket'))
    return {
      item: t('line.lBrackets'),
      qty,
      unit: 'ea.',
      price: { ...P.lBracket, link: undefined, alt: undefined },
      material: `l-bracket-${g.slug}`,
      notes: t('guide.note.lBrackets'),
    };
  if (item.includes('hog ring')) return needed(t('guide.item.hogRings', { size }), 'hog-rings');
  if (item.includes('cable staple')) return needed(t('guide.item.cableStaples', { size }), 'cable-staples');
  if (item.includes('j hook')) return needed(t('guide.item.jHooks', { size }), 'j-hooks');
  if (item.includes('deck block')) return needed(t('guide.item.deckBlocks'), 'deck-blocks', { notes: t('guide.note.deckBlocks') });
  if (item.includes('geotextile')) {
    // "For the 24"x24" box, cut two 24"x72" pieces."
    const box = g.slug === 'planter-18' ? '18"x18"' : '24"x24"';
    const piece = new RegExp(`${box} box, cut two (\\d+"x\\d+")`).exec(x.notes ?? '')?.[1];
    return needed(piece ? t('guide.item.fabricPieces', { size: piece }) : t('guide.item.fabric'), `fabric-${slugId(piece ?? 'piece')}`, {
      unit: 'piece',
      notes: t('guide.note.fabric'),
    });
  }
  return null; // lumber, mesh, fill and bracing are handled by guideLines()
}

/**
 * What to order for `n` pieces built from one guide, in the guide's order:
 * lumber (checked against the cut list), basket and fill, then hardware.
 */
export function guideLines(slug: GuideSlug, n: number, t: CostT = EN): GuideLine[] {
  if (n <= 0) return [];
  const g = GUIDES[slug];
  const lines: GuideLine[] = [];

  // gabion benches: the welded-wire basket and its stone fill
  const mesh = g.materials.find((x) => /welded-wire mesh/i.test(x.item));
  if (mesh && g.basketCuFt) {
    const len = slug === 'gabion-bench' ? 48 : 96;
    const gauge = /^(\d+) gauge/.exec(mesh.size ?? '')?.[1];
    const basket = (size: string) => (gauge ? t('guide.item.basket', { size, gauge }) : t('guide.item.basketNoGauge', { size }));
    const bracing = g.materials.find((x) => /bracing/i.test(x.item));
    const withBracing = (note: string) => (bracing ? `${note} ${t('guide.note.bracing')}` : note);
    lines.push(
      len === 48
        ? {
            item: basket('18"x18"x48"'),
            qty: n,
            unit: 'EA',
            price: PRICES.gabionBasket2x18x4,
            material: 'gabion-basket-18x18x48',
            link: mesh.link,
            notes: withBracing(t('guide.note.basket4')),
          }
        : {
            item: basket('18"x18"x96"'),
            qty: n,
            unit: 'EA',
            price: null,
            material: 'guide:gabion-basket-18x18x96',
            priceId: 'guide:gabion-basket-18x18x96',
            link: mesh.link,
            notes: withBracing(t('guide.note.basket8', { price: price(t, PRICES.gabionBasket2x18x4.price) })),
          },
    );
    const cuFt = g.basketCuFt * n;
    const tons = Math.ceil(Math.round((cuFt / 27) * 1.4 * 1e9) / 1e9);
    lines.push({
      item: t('line.stoneFill'),
      qty: tons,
      unit: 'TONS',
      price: PRICES.stoneFill,
      material: 'stone-fill',
      link: PRICES.stoneFill.link,
      notes: t('guide.note.fill', { cuft: bare(t, g.basketCuFt) }),
    });
  }

  lines.push(...lumberLines(g, n, t));
  for (const x of [...g.materials, ...g.hardware]) {
    const l = otherLine(g, x, n, t);
    if (l) lines.push(l);
  }
  return lines;
}

/** The stage guide builds one 12' x 8' deck: 6 of the spreadsheet's 4' x 4' squares. */
export const STAGE_GUIDE_SQUARES = 6;

/** Square feet of the shade guide's 8' x 8' structure (elements.ts countAs: area / 64). */
export const SHADE_GUIDE_SQFT = 64;
