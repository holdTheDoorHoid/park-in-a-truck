import { describe, expect, it } from 'vitest';
import {
  evenSplit,
  PLANTS,
  plantCounts,
  plantsForBucket,
  selectionCost,
  selectionTotal,
  type TallyForPlants,
} from '../plants';

// Fixtures below are the *cached formula results* (openpyxl data_only=True)
// read straight out of each theme's "INSERT HERE" sheet -- the Dream
// workbook's own worked example, before porting any logic by hand. See
// scripts/extract_plants.py for how they were read.
function tally(input: Partial<TallyForPlants>): TallyForPlants {
  return {
    plantingSquares: { sun: 0, shade: 0 },
    shrubs: { sun: 0, shade: 0 },
    smallTrees: 0,
    largeTrees: 0,
    ...input,
  };
}

describe('plantCounts (ported from each theme workbook\'s INSERT HERE calculator)', () => {
  it('Edible: 20 combined squares -> 100 plants (C4=20, G4=100)', () => {
    // Edible's own sheet asks for ONE combined sun+shade square count; feeding
    // the whole number in as "sun" (shade 0) reproduces its cached total.
    const t = tally({ plantingSquares: { sun: 20, shade: 0 }, shrubs: { sun: 12, shade: 0 }, smallTrees: 4, largeTrees: 0 });
    expect(plantCounts(t).perennial.sun).toBe(100);
    expect(plantCounts(t).shrub.sun).toBe(12); // C5=12, no multiplier (shrubs are a direct plant count)
    expect(plantCounts(t).smallTree).toBe(4); // C6=4, direct
    expect(plantCounts(t).largeTree).toBe(0); // C7=0, direct
  });

  it('Sanctuary: sun/shade squares each x5 (C4=8->G4=40, C5=15->G5=75)', () => {
    const t = tally({
      plantingSquares: { sun: 8, shade: 15 },
      shrubs: { sun: 6, shade: 8 }, // C6, C7 -- direct counts, no multiplier
      smallTrees: 6, // Sanctuary's sheet actually splits sun(2)+shade(4); DesignTally doesn't, so we pass the combined total
      largeTrees: 0, // C10
    });
    const out = plantCounts(t);
    expect(out.perennial).toEqual({ sun: 40, shade: 75 });
    expect(out.shrub).toEqual({ sun: 6, shade: 8 });
    expect(out.smallTree).toBe(6);
    expect(out.largeTree).toBe(0);
  });

  it('Nature: same x5 rule (C4=8->E4=40, C5=15->E5=75), shrubs/trees pass through', () => {
    const t = tally({ plantingSquares: { sun: 8, shade: 15 }, shrubs: { sun: 6, shade: 8 }, smallTrees: 4, largeTrees: 0 });
    const out = plantCounts(t);
    expect(out.perennial).toEqual({ sun: 40, shade: 75 });
    expect(out.shrub).toEqual({ sun: 6, shade: 8 });
    expect(out.smallTree).toBe(4); // C8=4, direct (Nature doesn't split small trees by light)
    expect(out.largeTree).toBe(0); // C9=0
  });

  it('Event: same x5 rule (C4=8->F4=40, C5=15->F5=75); no shrubs in this theme', () => {
    const t = tally({ plantingSquares: { sun: 8, shade: 15 }, shrubs: { sun: 0, shade: 0 }, smallTrees: 4, largeTrees: 1 });
    const out = plantCounts(t);
    expect(out.perennial).toEqual({ sun: 40, shade: 75 });
    expect(out.smallTree).toBe(4); // C6=4
    expect(out.largeTree).toBe(1); // C7=1
  });

  it('is a pure multiply-and-pass-through -- zero squares/plants in, zero out', () => {
    expect(plantCounts(tally({}))).toEqual({
      perennial: { sun: 0, shade: 0 },
      shrub: { sun: 0, shade: 0 },
      smallTree: 0,
      largeTree: 0,
    });
  });
});

describe('evenSplit', () => {
  it('splits evenly when it divides exactly', () => {
    const out = evenSplit(12, ['a', 'b', 'c', 'd']);
    expect(out).toEqual([
      { plantId: 'a', qty: 3 },
      { plantId: 'b', qty: 3 },
      { plantId: 'c', qty: 3 },
      { plantId: 'd', qty: 3 },
    ]);
  });

  it('gives the remainder to the first plants so the total always matches exactly', () => {
    const out = evenSplit(10, ['a', 'b', 'c']);
    expect(selectionTotal(out)).toBe(10);
    expect(out.map((s) => s.qty)).toEqual([4, 3, 3]);
  });

  it('returns zeros (not empty) for a zero or negative target', () => {
    expect(evenSplit(0, ['a', 'b'])).toEqual([
      { plantId: 'a', qty: 0 },
      { plantId: 'b', qty: 0 },
    ]);
  });

  it('returns nothing for an empty plant list, even with a positive target', () => {
    expect(evenSplit(10, [])).toEqual([]);
  });
});

describe('selectionCost', () => {
  it('prices a selection using each plant\'s real unit cost', () => {
    const anyPlant = PLANTS[0]!;
    const selections = [{ plantId: anyPlant.id, qty: 3 }];
    expect(selectionCost(selections)).toBeCloseTo((anyPlant.unitCost ?? 0) * 3, 5);
  });

  it('treats an unknown plant id as zero cost rather than throwing', () => {
    expect(selectionCost([{ plantId: 'not-a-real-id', qty: 5 }])).toBe(0);
  });
});

describe('plant data, extracted from the four theme spreadsheets\' BACK-END sheets', () => {
  it('has entries for all four themes', () => {
    const themes = new Set(PLANTS.map((p) => p.theme));
    expect(themes).toEqual(new Set(['edible', 'sanctuary', 'nature', 'event']));
  });

  it('every plant has a positive cost and a botanical + common name', () => {
    for (const p of PLANTS) {
      expect(p.botanical.length).toBeGreaterThan(0);
      expect(p.common.length).toBeGreaterThan(0);
      expect(p.unitCost).not.toBeNull();
      expect(p.unitCost!).toBeGreaterThan(0);
    }
  });

  it('Edible has no large trees (confirmed absent from its own plant list + calculator)', () => {
    expect(plantsForBucket(['edible'], 'large-tree', 'sun')).toHaveLength(0);
  });

  it('Event has no shrubs (confirmed absent from its own plant list + calculator)', () => {
    expect(plantsForBucket(['event'], 'shrub', 'sun')).toHaveLength(0);
    expect(plantsForBucket(['event'], 'shrub', 'shade')).toHaveLength(0);
  });

  it('mixing two themes pools their plant lists for a bucket (workbook allows mixing)', () => {
    const edibleOnly = plantsForBucket(['edible'], 'perennial', 'sun');
    const mixed = plantsForBucket(['edible', 'nature'], 'perennial', 'sun');
    expect(mixed.length).toBeGreaterThan(edibleOnly.length);
  });

  it('ids are unique', () => {
    expect(new Set(PLANTS.map((p) => p.id)).size).toBe(PLANTS.length);
  });
});
