import { describe, expect, it } from 'vitest';
import dover from '../fixtures/dover.json';
import greenway from '../fixtures/greenway.json';
import { buildLocalSite } from '../localsite';
import { newDesign, moveItem, removeItem, addItem, resetTemplate, adaptToSite, treesKept, addExisting, deleteExisting, parkDims, syncExistingXY } from '../design';
import { getPieceSet, buildLayout, tallyLayout, nominalOf } from '../park';
import { makePlacement } from '../placement';
import { $project, setDesign, exportProject, importProject, setExtra, getExtra } from '../../project';
import type { SiteContext } from '../site';

const ctx = (f: any): SiteContext => ({ lot: f.lot, ...f.surroundings, source: 'fixture' });
const doverSite = buildLocalSite(ctx(dover));

describe('DesignState', () => {
  it('starts from the lot: size A, interior, stretched to the lot', async () => {
    const d = newDesign(doverSite);
    expect(d.size).toBe('A');
    expect(d.lotKind).toBe('interior');
    const set = await getPieceSet(d.size, d.lotKind);
    const dims = parkDims(true, nominalOf(set), doverSite.frame);
    expect(dims.lengthFt).toBe(50);
    expect(dims.widthFt).toBe(14);
    expect(parkDims(false, nominalOf(set), doverSite.frame)).toEqual(nominalOf(set));
  });

  it('survives saving to the project and a project-file round trip', async () => {
    let d = newDesign(doverSite);
    d = moveItem(d, 'front:bench-4:1', 10, 5, 90);
    d = removeItem(d, 'frame:shrub:2');
    d = addItem(d, 'rain-barrel', 20, 3, 'edible').design;
    d = addExisting(d, 'wet-area', [-75.1825, 39.97675]).design;
    setDesign(d);
    expect($project.get().design).toEqual(d);
    setExtra('site', { ...(getExtra('site') ?? {}), treesKept: treesKept(d) });
    const { blob } = exportProject();
    const copy = importProject(await blob.text());
    expect(copy.design).toEqual(d);
    expect(JSON.parse(JSON.stringify(copy.design))).toEqual(d);
    expect((copy.extra.site as any).treesKept).toBe(0);
  });

  it('applies edits to the layout and counts the way the workbook does', async () => {
    const d0 = newDesign(doverSite);
    const set = await getPieceSet(d0.size, d0.lotKind);
    const base = buildLayout(set, { ...d0, lengthFt: 50, widthFt: 14 });
    expect(base.items.length).toBeGreaterThan(5);
    const first = base.items[0]!;
    let d = moveItem({ ...d0, lengthFt: 50, widthFt: 14 }, first.id, 1, 2, 90);
    d = removeItem(d, base.items[1]!.id);
    const added = addItem(d, 'table-6', 25, 7);
    d = added.design;
    const edited = buildLayout(set, d);
    expect(edited.items.find((i) => i.id === first.id)).toMatchObject({ x: 1, y: 2, rotationDeg: 90 });
    expect(edited.items.find((i) => i.id === base.items[1]!.id)).toBeUndefined();
    expect(edited.items.find((i) => i.id === added.id)).toMatchObject({ element: 'table-6', w: 6, source: 'added' });
    const t = tallyLayout(edited);
    expect(t.lengthFt).toBe(50);
    expect(t.items['table-6']).toBeGreaterThanOrEqual(1);
    expect(t.plantingSquares.sun).toBeGreaterThan(0);
    expect(t.plantingSquares.shade).toBe(0);
    const shady = tallyLayout(edited, () => 'part');
    expect(shady.plantingSquares.sun).toBe(0);
    expect(shady.plantingSquares.shade).toBe(t.plantingSquares.sun);
    expect(buildLayout(set, resetTemplate(d)).items.length).toBe(base.items.length);
  });

  it('keeps choices but drops lot-specific things when the lot changes', () => {
    let d = newDesign(doverSite);
    d = { ...d, frame: 'edible', sizeAuto: true };
    d = addExisting(d, 'hydrant', [-75.1825, 39.97675]).design;
    const g = buildLocalSite(ctx(greenway));
    const moved = adaptToSite(d, g);
    expect(moved.frame).toBe('edible');
    expect(moved.existing).toEqual([]);
    expect(moved.lotRef).not.toBe(d.lotRef);
  });

  it('City trees are only marked removed, people-added things are deleted, park x/y follow the park', () => {
    let d = newDesign(doverSite);
    d = { ...d, existing: [{ id: 'city:t', element: 'existing-tree', x: 0, y: 0, rotationDeg: 0, origin: 'city', keep: true, lngLat: [-75.18245, 39.97676] }] };
    expect(treesKept(d)).toBe(1);
    d = deleteExisting(d, 'city:t');
    expect(d.existing).toHaveLength(1);
    expect(treesKept(d)).toBe(0);
    const pl = makePlacement(doverSite.frame, 50, 14);
    const synced = syncExistingXY(d, doverSite, pl);
    expect(synced.existing![0]!.x).toBeGreaterThan(-1);
    expect(synced.existing![0]!.x).toBeLessThan(3);
  });
});

describe('edge lengths for the cost estimate', () => {
  it('splits the outer edge and the gravel edging by what is next to them', async () => {
    const { measureEdges } = await import('../edges');
    type V = [number, number];
    const rect = (x0: number, y0: number, x1: number, y1: number): V[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
    const layout = {
      lengthFt: 20,
      widthFt: 10,
      streetEdges: ['x0' as const],
      surfaces: [
        { id: 'g', material: 'gravel' as const, polygon: rect(0, 0, 10, 10) },
        { id: 'p', material: 'planting' as const, polygon: rect(10, 0, 20, 10) },
      ],
      items: [],
    };
    const e = measureEdges(layout, {
      toLocal: (p) => p,
      buildings: [rect(-5, -30, 25, 0)], // a building along y0
      parcels: [rect(0, 0, 20, 10), rect(0, 10, 20, 40), rect(20, -30, 50, 40), rect(-5, -30, 25, 0)], // street beyond x0
    });
    expect(e.outerEdgeFt).toEqual({ hardscape: 10, softscape: 30 });
    expect(e.gravelEdgeFt).toEqual({ hardscape: 10, softscape: 20 });
  });
});
