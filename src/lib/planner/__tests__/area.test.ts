// Part of the lot (2026-10-04): the park in just part of a lot. area.ts maths, the design edits
// (design.ts setPart / autoSizeFor / adaptToSite) and the store's $lotFit / $fit split.
import { describe, expect, it } from 'vitest';
import dover from '../fixtures/dover.json';
import greenway from '../fixtures/greenway.json';
import { buildLocalSite } from '../localsite';
import { computeSiteFrame, siteToLocal } from '../rect';
import { inscribedRect, type FitArea } from '../lotfit';
import {
  AREA_MIN_FT,
  canSlide,
  clampArea,
  dragArea,
  homeTurn,
  openGround,
  outsidePieces,
  resizeArea,
  roundArea,
  runsAcross,
  slideArea,
  stretchTo,
  turnForArea,
  turnedAgainst,
} from '../area';
import { adaptToSite, autoSizeFor, newDesign, setPart, setSize, setThemes } from '../design';
import { computeOverhang, makePlacement, parkToSite } from '../placement';
import { createPlannerStore, type PlannerStore } from '../store';
import { area as ringArea, type Vec2 } from '../geo';
import type { SiteContext } from '../site';

const ctx = (f: any): SiteContext => ({ lot: f.lot, ...f.surroundings, source: 'fixture' });
const doverSite = buildLocalSite(ctx(dover));
const greenwaySite = buildLocalSite(ctx(greenway));

const frame = { lengthFt: 60.4, widthFt: 30.2 };
const A = (x0: number, y0: number, lengthFt: number, widthFt: number): FitArea => ({ x0, y0, lengthFt, widthFt });

describe('dragging the part (sides, corners, middle)', () => {
  const start = A(10, 5, 20, 12);
  it('a side moves only that side, to whole feet', () => {
    expect(dragArea(start, { kind: 'side', side: 'x1' }, [3.4, 7], frame)).toEqual(A(10, 5, 23, 12));
    expect(dragArea(start, { kind: 'side', side: 'x0' }, [-2.6, 0], frame)).toEqual(A(7, 5, 23, 12));
    expect(dragArea(start, { kind: 'side', side: 'y1' }, [9, 2.2], frame)).toEqual(A(10, 5, 20, 14));
    expect(dragArea(start, { kind: 'side', side: 'y0' }, [0, 1.6], frame)).toEqual(A(10, 7, 20, 10));
  });
  it('a corner moves the two sides that meet there', () => {
    expect(dragArea(start, { kind: 'corner', x: 'x1', y: 'y1' }, [5, 4], frame)).toEqual(A(10, 5, 25, 16));
    expect(dragArea(start, { kind: 'corner', x: 'x0', y: 'y0' }, [-3, -2], frame)).toEqual(A(7, 3, 23, 14));
  });
  it('keeps at least 4 × 4 ft, however far a side is pulled past the other', () => {
    const r = dragArea(start, { kind: 'side', side: 'x1' }, [-40, 0], frame);
    expect(r).toEqual(A(10, 5, AREA_MIN_FT, 12));
    const c = dragArea(start, { kind: 'corner', x: 'x0', y: 'y1' }, [50, -50], frame);
    expect(c.lengthFt).toBe(AREA_MIN_FT);
    expect(c.widthFt).toBe(AREA_MIN_FT);
    expect(c.x0 + c.lengthFt).toBe(30);
    expect(c.y0).toBe(5);
  });
  it('stays inside the site frame (its far edges may be a fraction of a foot)', () => {
    expect(dragArea(start, { kind: 'side', side: 'x1' }, [100, 0], frame)).toEqual(A(10, 5, 50.4, 12));
    expect(dragArea(start, { kind: 'side', side: 'x0' }, [-100, 0], frame)).toEqual(A(0, 5, 30, 12));
    expect(dragArea(start, { kind: 'corner', x: 'x1', y: 'y1' }, [100, 100], frame)).toEqual(A(10, 5, 50.4, 25.2));
  });
  it('the middle moves the whole part, same size, whole feet, inside the frame', () => {
    expect(dragArea(start, { kind: 'move' }, [4.4, -2.7], frame)).toEqual(A(14, 2, 20, 12));
    const far = dragArea(start, { kind: 'move' }, [500, 500], frame);
    expect(far).toEqual(A(40.4, 18.2, 20, 12));
    expect(dragArea(start, { kind: 'move' }, [-500, -500], frame)).toEqual(A(0, 0, 20, 12));
  });
});

describe('the number boxes and slide arrows', () => {
  it('a new length or width keeps the near corner; whole feet; at least 4 ft; inside the frame', () => {
    const a = A(10, 5, 20, 12.3);
    expect(resizeArea(a, { lengthFt: 32.4 }, frame)).toEqual(A(10, 5, 32, 12.3));
    expect(resizeArea(a, { widthFt: 2 }, frame)).toEqual(A(10, 5, 20, 4));
    // too long to fit from where it starts: it moves back toward the entrance
    expect(resizeArea(a, { lengthFt: 58 }, frame)).toEqual(A(2.4, 5, 58, 12.3));
    expect(resizeArea(a, { lengthFt: 500 }, frame)).toEqual(A(0, 5, 60.4, 12.3));
  });
  it('slides a foot at a time and knows when it is against the edge', () => {
    const a = A(0, 5, 20, 12);
    expect(slideArea(a, [1, 0], frame)).toEqual(A(1, 5, 20, 12));
    expect(canSlide(a, [-1, 0], frame)).toBe(false);
    expect(canSlide(a, [0, 1], frame)).toBe(true);
    const top = A(5, 18.2, 20, 12);
    expect(canSlide(top, [0, 1], frame)).toBe(false);
    expect(slideArea(top, [0, -1], frame)).toEqual(A(5, 17.2, 20, 12));
  });
  it('a saved part on a lot that changed is kept inside the frame', () => {
    expect(clampArea(A(50, 25, 20, 12), frame)).toEqual(A(40.4, 18.2, 20, 12));
    const same = A(1, 1, 10, 10);
    expect(clampArea(same, frame)).toBe(same);
  });
});

describe('the default part: the open ground', () => {
  // a 60 × 30 ft lot (site frame = local axes, entrance at x = 0)
  const parcel: Vec2[] = [[0, 0], [60, 0], [60, 30], [0, 30]];
  const f = computeSiteFrame({ parcel });
  it('on a vacant lot it is the whole lot (whole feet)', () => {
    const a = openGround(f, parcel, []);
    expect(a.lengthFt * a.widthFt).toBeCloseTo(60 * 30, 0);
    expect(Number.isInteger(a.x0) && Number.isInteger(a.y0)).toBe(true);
  });
  it('keeps out of a building on the lot: the side yard beside it', () => {
    // a house 20 ft deep along one long side, the whole length of the lot
    const house: Vec2[] = [[0, 0], [60, 0], [60, 20], [0, 20]];
    const a = openGround(f, parcel, [house]);
    expect(Math.round(a.lengthFt * a.widthFt)).toBe(60 * 10);
    // it is the strip beside the house, not under it
    const mid = siteToLocal(f, [a.x0 + a.lengthFt / 2, a.y0 + a.widthFt / 2]);
    expect(mid[1]).toBeGreaterThan(20);
    // the yard runs along the lot: the park keeps running along it
    expect(runsAcross(a)).toBe(false);
  });
  it('picks the bigger open stretch when a building stands in the middle', () => {
    const shed: Vec2[] = [[20, -5], [26, -5], [26, 35], [20, 35]];
    const a = openGround(f, parcel, [shed]);
    // 34 ft of open ground behind it vs 20 ft in front
    expect(Math.round(a.lengthFt)).toBe(34);
    expect(Math.round(a.widthFt)).toBe(30);
  });
  it('a building just touching the lot line (within half a foot) does not count', () => {
    const next: Vec2[] = [[0, 29.7], [60, 29.7], [60, 50], [0, 50]];
    const a = openGround(f, parcel, [next]);
    expect(a.lengthFt * a.widthFt).toBeGreaterThanOrEqual(60 * 29);
  });
  it('inscribedRect without buildings is unchanged', () => {
    const a = inscribedRect(doverSite.frame, doverSite.parcel);
    const b = inscribedRect(doverSite.frame, doverSite.parcel, undefined, []);
    expect(b).toEqual(a);
  });
  it('rounds a fine-grid rectangle to whole feet without pushing past the line', () => {
    expect(roundArea(A(0.25, 0.2, 49.5, 13.9), { lengthFt: 50.2, widthFt: 14.3 })).toEqual(A(0, 0, 50, 14));
    // a side 0.4 ft short of a whole foot rounds IN, not out past the line
    expect(roundArea(A(2.6, 1, 10, 5), frame)).toEqual(A(3, 1, 9, 5));
    expect(roundArea(A(2.3, 1, 10.1, 5), frame)).toEqual(A(2, 1, 10, 5));
  });
  it('keeps a footprint that stands on the lot (left out of the 3D buildings) for the open ground', () => {
    // a building on the back half of the Dover lot
    const ring = (dover as any).lot.polygon as [number, number][];
    const [p0, p1, p2, p3] = ring;
    const mid = (a: number[], b: number[], t: number) => [a[0]! + (b[0]! - a[0]!) * t, a[1]! + (b[1]! - a[1]!) * t];
    // the lot's two long sides: p0→p3 and p1→p2 (the short ones are p0p1 and p2p3) — find which way is long
    const len = (a: number[], b: number[]) => Math.hypot(a[0]! - b[0]!, (a[1]! - b[1]!) * 1.3);
    const longA: [number[], number[]] = len(p0!, p1!) > len(p1!, p2!) ? [p0!, p1!] : [p1!, p2!];
    const longB: [number[], number[]] = len(p0!, p1!) > len(p1!, p2!) ? [p3!, p2!] : [p0!, p3!];
    const house = [mid(longA[0], longA[1], 0.55), mid(longA[0], longA[1], 1.05), mid(longB[0], longB[1], 1.05), mid(longB[0], longB[1], 0.55)];
    const withHouse = { ...(dover as any), surroundings: { ...(dover as any).surroundings, buildings: [...(dover as any).surroundings.buildings, { polygon: [...house, house[0]], heightFt: 30 }] } };
    const site = buildLocalSite(ctx(withHouse));
    expect(site.lotBuildings?.length).toBe(1);
    expect(site.buildings.length).toBe(doverSite.buildings.length);
    const a = openGround(site.frame, site.parcel, site.lotBuildings!);
    // about half the lot (the open half), whole feet
    expect(a.lengthFt).toBeGreaterThan(18);
    expect(a.lengthFt).toBeLessThan(32);
    expect(Math.abs(a.widthFt - site.frame.widthFt)).toBeLessThan(1.5);
  });
});

describe('which way the park runs in the part', () => {
  it('turns a quarter for a part that runs across the lot, toward the side street on a corner lot', () => {
    const across = A(0, 0, 12, 30);
    expect(runsAcross(across)).toBe(true);
    expect(turnForArea(across, 0, 'interior')).toBe(1);
    expect(turnForArea(across, 2, 'corner-right')).toBe(1);
    expect(turnForArea(across, 0, 'corner-left')).toBe(3);
    // already running that way: leave it
    expect(turnForArea(across, 3, 'interior')).toBeNull();
    // a part along the lot with the park turned: back to along
    expect(turnForArea(A(0, 0, 30, 12), 1, 'interior')).toBe(0);
    expect(turnForArea(A(0, 0, 30, 12), 2, 'interior')).toBeNull();
    // about square: either way
    expect(turnForArea(A(0, 0, 20, 20.2), 1, 'interior')).toBeNull();
  });
  it('turn 1 puts the entrance on the y0 side, turn 3 on the y1 side (where corner-right / corner-left side streets are)', () => {
    const f = computeSiteFrame({ parcel: [[0, 0], [60, 0], [60, 30], [0, 30]] });
    const part = A(20, 0, 12, 30);
    // the middle of the park's entrance edge, in site feet
    const at = (turn: 1 | 3) => parkToSite(makePlacement(f, 30, 12, turn, false, [0, 0], part), [0, 6]);
    expect(at(1)[1]).toBeCloseTo(0);
    expect(at(3)[1]).toBeCloseTo(30);
  });
  it('stretches along the part the way the park runs; the whole lot keeps its old behaviour', () => {
    const part = A(0, 0, 12, 30);
    expect(stretchTo({ useArea: true, area: part, turn: 1 }, part)).toEqual({ lengthFt: 30, widthFt: 12 });
    expect(stretchTo({ useArea: true, area: part, turn: 0 }, part)).toEqual({ lengthFt: 12, widthFt: 30 });
    expect(stretchTo({ turn: 1 }, { lengthFt: 50, widthFt: 14 })).toEqual({ lengthFt: 50, widthFt: 14 });
    expect(stretchTo({ useArea: false, area: part, turn: 1 }, { lengthFt: 50, widthFt: 14 })).toEqual({ lengthFt: 50, widthFt: 14 });
  });
  it('knows when the park is turned against its space, and where "Put it back" goes', () => {
    const across = A(0, 0, 12, 30);
    expect(turnedAgainst({ turn: 1 })).toBe(true);
    expect(turnedAgainst({ turn: 0 })).toBe(false);
    expect(turnedAgainst({ useArea: true, area: across, turn: 1 })).toBe(false);
    expect(turnedAgainst({ useArea: true, area: across, turn: 0 })).toBe(true);
    expect(homeTurn({ useArea: true, area: across, lotKind: 'corner-left' })).toBe(3);
    expect(homeTurn({ useArea: true, area: across, lotKind: 'interior' })).toBe(1);
    expect(homeTurn({ useArea: false, area: across, lotKind: 'interior' })).toBe(0);
  });
});

describe('the rest of the lot, dimmed', () => {
  it('the pieces outside the part and the part make up the lot', () => {
    const parcel: Vec2[] = [[0, 0], [60, 0], [61, 30], [1, 30]];
    const part = A(10, 8, 20, 12);
    const pieces = outsidePieces(parcel, part);
    expect(pieces.length).toBe(4);
    const total = pieces.reduce((s, r) => s + ringArea(r), 0);
    expect(total + 20 * 12).toBeCloseTo(ringArea(parcel), 1);
    // a part reaching the lot's ends and one side: just one piece left
    expect(outsidePieces([[0, 0], [60, 0], [60, 30], [0, 30]], A(0, 0, 60, 20)).length).toBe(1);
  });
});

describe('design edits for the part of the lot', () => {
  it('switching to a part: size from the part (not the whole lot), the park turned to run along it, slide dropped', () => {
    const d0 = { ...newDesign(greenwaySite), shiftFt: [3, 1] as [number, number] };
    const facts = { sizeId: 'E' as const };
    // a strip across the lot, 20 ft along it and the lot's whole width
    const across = A(0, 0, 20, Math.floor(greenwaySite.frame.widthFt));
    const d = setPart(d0, { useArea: true, area: across }, greenwaySite, facts);
    expect(d.useArea).toBe(true);
    expect(d.area).toEqual(across);
    expect(d.shiftFt).toEqual([0, 0]);
    expect(d.turn! % 2).toBe(1);
    expect(d.size).toBe(autoSizeFor(d, greenwaySite.frame, facts));
    expect(autoSizeFor({ useArea: false }, greenwaySite.frame, facts)).toBe('E');
    // back to the whole lot: the part is kept, the quarter turn made for it undone
    const w = setPart(d, { useArea: false }, greenwaySite, facts);
    expect(w.useArea).toBe(false);
    expect(w.area).toEqual(across);
    expect(w.turn).toBe(0);
    expect(w.size).toBe('E');
  });
  it('a size picked by hand stays; "Fit the part I picked" follows the part', () => {
    const d0 = setSize(newDesign(greenwaySite), 'C', greenwaySite);
    const small = A(0, 0, 50, 14);
    const d = setPart(d0, { useArea: true, area: small }, greenwaySite);
    expect(d.size).toBe('C');
    expect(setSize(d, 'auto', greenwaySite, { sizeId: 'E' }).size).toBe('A');
  });
  it('the part belongs to its lot: dropped on another lot, kept on the same one', () => {
    const d = setPart(newDesign(doverSite), { useArea: true, area: A(0, 0, 30, 10) }, doverSite);
    const same = adaptToSite(d, doverSite);
    expect(same.useArea).toBe(true);
    expect(same.area).toEqual(A(0, 0, 30, 10));
    const other = adaptToSite({ ...d, sizeAuto: true }, greenwaySite);
    expect(other.useArea).toBeUndefined();
    expect(other.area).toBeUndefined();
    expect(other.size).toBe(autoSizeFor({}, greenwaySite.frame));
  });
  it('a park turned into a part across the lot sits inside it', () => {
    const f = greenwaySite.frame;
    const W = Math.floor(f.widthFt);
    const across = A(4, 0, 18, W);
    const d = setPart(newDesign(greenwaySite), { useArea: true, area: across }, greenwaySite);
    const room = stretchTo(d, across);
    const pl = makePlacement(f, room.lengthFt, room.widthFt, d.turn!, false, [0, 0], across);
    // every corner of the park is in the part
    for (const p of [[0, 0], [room.lengthFt, 0], [room.lengthFt, room.widthFt], [0, room.widthFt]] as Vec2[]) {
      const [a, b, c, dd] = pl.m;
      const sx = a * p[0] + b * p[1] + pl.t[0];
      const sy = c * p[0] + dd * p[1] + pl.t[1];
      expect(sx).toBeGreaterThanOrEqual(across.x0 - 1e-6);
      expect(sx).toBeLessThanOrEqual(across.x0 + across.lengthFt + 1e-6);
      expect(sy).toBeGreaterThanOrEqual(-1e-6);
      expect(sy).toBeLessThanOrEqual(W + 1e-6);
    }
    expect(computeOverhang(pl, f, greenwaySite.parcel).outsideSqFt).toBeLessThan(room.lengthFt * room.widthFt * 0.05);
  });
});

// ---- with the real planner store (the demo lots) ----

async function ready(slug: 'dover' | 'greenway'): Promise<PlannerStore> {
  const st = createPlannerStore('full', slug);
  for (let i = 0; i < 400 && !(st.$status.get() === 'ready' && st.$layout.get()); i++) await new Promise((r) => setTimeout(r, 5));
  expect(st.$layout.get()).toBeTruthy();
  return st;
}
const settle = async (st: PlannerStore) => {
  for (let i = 0; i < 100; i++) {
    await new Promise((r) => setTimeout(r, 5));
    const d = st.$design.get();
    const set = st.$set.get();
    if (d && set && `${d.size}-${d.lotKind}` === `${set.size}-${set.lotKind}`) return;
  }
};

describe('the planner store: the park goes in the part', () => {
  it('$lotFit stays the lot; $fit is the part; the park is stretched to it; undo puts it back', async () => {
    const st = await ready('greenway');
    const lot = st.$lotFit.get()!;
    expect(st.$fit.get()).toBe(lot);
    const before = st.$layout.get()!;
    const open = st.openArea()!;
    expect(open.lengthFt).toBeGreaterThan(0);
    const site = st.$site.get()!;
    const L = Math.min(60, Math.floor(site.frame.lengthFt) - 12);
    const W = Math.floor(site.frame.widthFt) - 2;
    const part = A(10, 1, L, W);
    st.commit(setPart(st.$design.get()!, { useArea: true, area: part }, site));
    await settle(st);
    expect(st.$lotFit.get()).toBe(lot);
    expect(st.$fit.get()).toEqual(part);
    const d = st.$design.get()!;
    // stretched to the part (never smaller than the printed pieces)
    expect(d.lengthFt).toBe(Math.max(L, st.$set.get()!.nominal.lengthFt));
    expect(d.widthFt).toBe(Math.max(W, st.$set.get()!.nominal.widthFt));
    // an edit that doesn't touch the part keeps the same $fit object (nothing downstream works again)
    const fit = st.$fit.get();
    st.commit(setThemes(st.$design.get()!, { front: 'edible' }));
    expect(st.$fit.get()).toBe(fit);
    // the park sits in the part
    const pl = st.$placement.get()!;
    expect(pl.t[0]).toBeCloseTo(10);
    // undo (the theme, then the part)
    st.undo();
    st.undo();
    await settle(st);
    expect(st.$design.get()!.useArea).toBeFalsy();
    expect(st.$fit.get()).toBe(lot);
    expect(st.$layout.get()!.lengthFt).toBe(before.lengthFt);
    st.destroy();
  });

  it('the size follows the part when it is automatic, and the whole lot again after', async () => {
    const st = await ready('greenway');
    const site = st.$site.get()!;
    const lotSize = st.$design.get()!.size;
    st.commit(setPart(st.$design.get()!, { useArea: true, area: A(0, 0, 50, 13) }, site));
    await settle(st);
    expect(st.$design.get()!.size).toBe('A');
    expect(st.$layout.get()!.lengthFt).toBe(50);
    st.commit(setPart(st.$design.get()!, { useArea: false }, site));
    await settle(st);
    expect(st.$design.get()!.size).toBe(lotSize);
    st.destroy();
  });
});
