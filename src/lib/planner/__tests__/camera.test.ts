import { describe, expect, it } from 'vitest';
import { EYE_FT, ROOF_CLEAR_FT, cameraFloor, cameraLimits } from '../camera';
import { hidesBox, lotBox } from '../scene/xray';
import type { Prism } from '../sunhours';

// a 14 x 50 ft lot between two rowhouses (x east, y north), 30 ft tall
const lot = { center: [0, 0] as [number, number], u: [0, 1] as [number, number], lengthFt: 50, widthFt: 14 };
const house = (x0: number, x1: number): Prism => ({ ring: [[x0, -25], [x1, -25], [x1, 25], [x0, 25]], heightFt: 30 });
const houses = [house(-27, -7), house(7, 27)];

describe('the camera stays out of buildings and above the ground (novice-phone F3)', () => {
  const floor = cameraFloor(() => 0, houses);
  it('over open ground: eye height', () => {
    expect(floor.at([0, 0])).toBe(EYE_FT);
    expect(floor.at([0, -80])).toBe(EYE_FT);
  });
  it('over a house, or right against its wall: above the roof', () => {
    expect(floor.at([-15, 0])).toBe(30 + ROOF_CLEAR_FT);
    expect(floor.at([-6, 0])).toBe(30 + ROOF_CLEAR_FT);
    expect(floor.at([-4, 0])).toBe(EYE_FT);
  });
  it('follows the ground and the building base on a slope', () => {
    const sloped = cameraFloor((x) => x * 0.1, [{ ...houses[1]!, baseFt: 1 }]);
    expect(sloped.at([-20, 0])).toBeCloseTo(-2 + EYE_FT);
    expect(sloped.at([15, 0])).toBe(1 + 30 + ROOF_CLEAR_FT);
  });
  it('keeps the view near the lot', () => {
    const lim = cameraLimits(200, lot);
    expect(lim.maxDistance).toBeGreaterThanOrEqual(220);
    expect(lim.maxDistance).toBeLessThanOrEqual(700);
    expect(lim.maxTargetRadius).toBeGreaterThan(25);
  });
});

describe('see-through neighbours: what hides the lot', () => {
  const box = lotBox(lot, () => 0);
  it('a wall between a low camera and the lot hides it; the far wall does not', () => {
    const cam: [number, number, number] = [-120, 0, 10];
    // the near house's west wall (x = -27) and its roof
    expect(hidesBox(cam, [-27, 0, 10], box)).toBe(true);
    expect(hidesBox(cam, [-12, 0, 30], box)).toBe(false);
    // the far house, behind the lot
    expect(hidesBox(cam, [20, 0, 10], box)).toBe(false);
  });
  it('nothing hides the lot from above, and a wall off to the side never does', () => {
    expect(hidesBox([0, -40, 200], [-15, -20, 30], box)).toBe(false);
    expect(hidesBox([-120, 0, 10], [-27, 80, 10], box)).toBe(false);
  });
  it('a camera standing in the lot sees everything solid', () => {
    expect(hidesBox([0, 0, 5], [-20, 0, 10], box)).toBe(false);
  });
});

describe('planted trees look like trees (not lollipops)', async () => {
  const { plantedCrownR, crownCenterFt } = await import('../treemodel');
  it('the crown starts about a third of the way up and spreads in proportion to the height', () => {
    for (const [H, drawnR] of [
      [15, 1.9],
      [35, 4.5],
    ]) {
      const r = plantedCrownR(H, drawnR, '3d');
      const base = crownCenterFt(H, r) - r;
      expect(base / H).toBeCloseTo(1 / 3, 2);
      expect((2 * r) / H).toBeCloseTo(2 / 3, 2);
    }
    // plan view keeps the canopy drawn on the paper pieces
    expect(plantedCrownR(35, 4.5, 'plan')).toBe(4.5);
  });
});
