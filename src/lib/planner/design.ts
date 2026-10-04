// DesignState: creating one for a lot, editing it, and keeping it in step with the lot.
// Pure functions (no DOM) so they can be tested; saving goes through ../project.ts.

import type { DesignState, ExistingItem, LotKind, LotRecord, SiteFacts, SizeId, ThemeId } from '../types';
import { fitSize } from '../sizing';
import type { LocalSite } from './localsite';
import { existingMeta } from './catalog';
import { localToPark, type ParkPlacement } from './placement';
import type { SiteFrame } from './rect';

export const DEFAULT_THEME: ThemeId = 'nature';

export function lotRef(lot: LotRecord): string {
  return String(lot.opa ?? lot.pwdParcelId ?? lot.address);
}

const now = () => new Date().toISOString();
let n = 0;
export const newId = (prefix: string) => `${prefix}:${Date.now().toString(36)}${(n++).toString(36)}${Math.random().toString(36).slice(2, 5)}`;

export function autoSize(frame: Pick<SiteFrame, 'lengthFt' | 'widthFt'>, facts?: SiteFacts): SizeId {
  return facts?.sizeId ?? fitSize(frame.lengthFt, frame.widthFt).size;
}

/**
 * Park dimensions: stretched to the lot (the workbook's seams — never smaller than the
 * printed pieces) or the pieces' printed size.
 */
export function parkDims(fitToLot: boolean, nominal: { lengthFt: number; widthFt: number }, frame: Pick<SiteFrame, 'lengthFt' | 'widthFt'>) {
  if (!fitToLot) return { lengthFt: nominal.lengthFt, widthFt: nominal.widthFt };
  return {
    lengthFt: Math.max(nominal.lengthFt, Math.floor(frame.lengthFt + 0.25)),
    widthFt: Math.max(nominal.widthFt, Math.floor(frame.widthFt + 0.25)),
  };
}

/** A fresh design for a lot: size from the lot, one theme for everything, PiaT's template as-is. */
export function newDesign(site: LocalSite, facts?: SiteFacts): DesignState {
  const d: DesignState = {
    v: 1,
    size: autoSize(site.frame, facts),
    lotKind: site.frame.lotKind,
    frame: DEFAULT_THEME,
    front: DEFAULT_THEME,
    back: DEFAULT_THEME,
    lengthFt: Math.floor(site.frame.lengthFt),
    widthFt: Math.floor(site.frame.widthFt),
    added: [],
    removed: [],
    moved: {},
    existing: [],
    updatedAt: now(),
    lotRef: lotRef(site.ctx.lot),
    sizeAuto: true,
    lotKindAuto: true,
    fitToLot: true,
    turn: 0,
    flipped: false,
  };
  return withCityTrees(d, site);
}

/** Fill in fields older saves (or other writers) may lack. Never drops data. */
export function normaliseDesign(d: DesignState): DesignState {
  return {
    ...d,
    added: d.added ?? [],
    removed: d.removed ?? [],
    moved: d.moved ?? {},
    existing: d.existing ?? [],
    sizeAuto: d.sizeAuto ?? false,
    lotKindAuto: d.lotKindAuto ?? false,
    fitToLot: d.fitToLot ?? true,
    turn: d.turn ?? 0,
    flipped: d.flipped ?? d.placement?.flip ?? false,
  };
}

/** Bring a saved design up to date with the lot it's shown on. */
export function adaptToSite(d0: DesignState, site: LocalSite, facts?: SiteFacts): DesignState {
  let d = normaliseDesign(d0);
  const ref = lotRef(site.ctx.lot);
  if (d.lotRef && d.lotRef !== ref) {
    // Same person, different lot: keep their choices, drop what belonged to the old lot.
    d = { ...d, lotRef: ref, placement: undefined, shiftFt: undefined, existing: (d.existing ?? []).filter((e) => !e.lngLat && e.origin !== 'city') };
  }
  if (!d.lotRef) d = { ...d, lotRef: ref };
  if (d.sizeAuto) d = { ...d, size: autoSize(site.frame, facts) };
  if (d.lotKindAuto) d = { ...d, lotKind: site.frame.lotKind };
  return withCityTrees(d, site);
}

/** City trees standing on the lot become existing conditions (kept by default). */
export function withCityTrees(d: DesignState, site: LocalSite): DesignState {
  const have = new Set((d.existing ?? []).map((e) => e.cityKey).filter(Boolean));
  const add: ExistingItem[] = [];
  for (const t of site.trees) {
    if (!t.onLot || have.has(t.key)) continue;
    add.push({
      id: `city:${t.key}`,
      element: 'existing-tree',
      x: 0,
      y: 0,
      rotationDeg: 0,
      lngLat: site.lf.toLngLat([t.x, t.y]),
      radiusFt: Math.round(t.crownR),
      keep: true,
      origin: 'city',
      cityKey: t.key,
      species: t.species ?? null,
      dbhIn: t.dbhIn ?? null,
    });
  }
  return add.length ? { ...d, existing: [...(d.existing ?? []), ...add] } : d;
}

/** Keep each existing item's park-local x/y in step with where the park sits. */
export function syncExistingXY(d: DesignState, site: LocalSite, pl: ParkPlacement): DesignState {
  if (!d.existing?.length) return d;
  let changed = false;
  const existing = d.existing.map((e) => {
    if (!e.lngLat) return e;
    const [x, y] = localToPark(pl, site.frame, site.lf.toLocal(e.lngLat));
    const rx = Math.round(x * 10) / 10;
    const ry = Math.round(y * 10) / 10;
    if (rx === e.x && ry === e.y) return e;
    changed = true;
    return { ...e, x: rx, y: ry };
  });
  return changed ? { ...d, existing } : d;
}

export function treesKept(d: DesignState | null): number {
  return (d?.existing ?? []).filter((e) => e.element === 'existing-tree' && e.keep !== false).length;
}

// ---- edits (each returns a new DesignState) -------------------------------------

const touch = (d: DesignState): DesignState => ({ ...d, updatedAt: now() });

export function moveItem(d: DesignState, id: string, x: number, y: number, rotationDeg: number): DesignState {
  const i = d.added.findIndex((a) => a.id === id);
  if (i >= 0) {
    const added = d.added.slice();
    added[i] = { ...added[i]!, x, y, rotationDeg };
    return touch({ ...d, added });
  }
  return touch({ ...d, moved: { ...d.moved, [id]: { x, y, rotationDeg } } });
}

export function removeItem(d: DesignState, id: string): DesignState {
  if (d.added.some((a) => a.id === id)) return touch({ ...d, added: d.added.filter((a) => a.id !== id) });
  const moved = { ...d.moved };
  delete moved[id];
  return touch({ ...d, removed: d.removed.includes(id) ? d.removed : [...d.removed, id], moved });
}

export function addItem(d: DesignState, element: string, x: number, y: number, theme?: ThemeId): { design: DesignState; id: string } {
  const id = newId('added');
  return { design: touch({ ...d, added: [...d.added, { id, element, x, y, rotationDeg: 0, theme }] }), id };
}

/** A copy of an item (from the template or added), as a new added item with the same turn and theme. */
export function duplicateItem(
  d: DesignState,
  it: { element: string; rotationDeg: number; theme?: ThemeId },
  x: number,
  y: number,
): { design: DesignState; id: string } {
  const id = newId('added');
  const copy = { id, element: it.element, x, y, rotationDeg: it.rotationDeg, ...(it.theme ? { theme: it.theme } : {}) };
  return { design: touch({ ...d, added: [...d.added, copy] }), id };
}

export function resetTemplate(d: DesignState): DesignState {
  return touch({ ...d, added: [], removed: [], moved: {} });
}

export function setThemes(d: DesignState, t: Partial<Pick<DesignState, 'frame' | 'front' | 'back'>>): DesignState {
  return touch({ ...d, ...t });
}

export function setSize(d: DesignState, size: SizeId | 'auto', site: LocalSite, facts?: SiteFacts): DesignState {
  if (size === 'auto') return touch({ ...d, sizeAuto: true, size: autoSize(site.frame, facts) });
  return touch({ ...d, sizeAuto: false, size });
}

export function setLotKind(d: DesignState, k: LotKind | 'auto', site: LocalSite): DesignState {
  if (k === 'auto') return touch({ ...d, lotKindAuto: true, lotKind: site.frame.lotKind });
  return touch({ ...d, lotKindAuto: false, lotKind: k });
}

// existing conditions

export function addExisting(d: DesignState, element: string, lngLat: [number, number]): { design: DesignState; id: string } {
  const meta = existingMeta(element);
  const id = newId('existing');
  const item: ExistingItem = {
    id,
    element,
    x: 0,
    y: 0,
    rotationDeg: 0,
    lngLat,
    keep: element === 'existing-tree' ? true : undefined,
    origin: 'person',
    ...(meta.defaults.radiusFt ? { radiusFt: meta.defaults.radiusFt } : {}),
    ...(meta.defaults.lengthFt ? { lengthFt: meta.defaults.lengthFt } : {}),
    ...(meta.defaults.widthFt ? { widthFt: meta.defaults.widthFt } : {}),
  };
  return { design: touch({ ...d, existing: [...(d.existing ?? []), item] }), id };
}

export function updateExisting(d: DesignState, id: string, patch: Partial<ExistingItem>): DesignState {
  return touch({ ...d, existing: (d.existing ?? []).map((e) => (e.id === id ? { ...e, ...patch } : e)) });
}

/** People-added things can be deleted; City trees can only be marked keep/remove. */
export function deleteExisting(d: DesignState, id: string): DesignState {
  const e = d.existing?.find((x) => x.id === id);
  if (!e) return d;
  if (e.origin === 'city') return updateExisting(d, id, { keep: false });
  return touch({ ...d, existing: (d.existing ?? []).filter((x) => x.id !== id) });
}
