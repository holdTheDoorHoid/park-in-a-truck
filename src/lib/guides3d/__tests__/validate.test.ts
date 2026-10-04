import { describe, expect, it } from 'vitest';
import { overlapDepth, rotationMatrix, validateModel } from '../validate';
import type { GuideModel, ModelPart } from '../schema';

const board = (id: string, position: [number, number, number], rotation?: [number, number, number]): ModelPart => ({
  id,
  ref: 'X-1',
  kind: 'lumber',
  size: [10, 1.5, 3.5],
  position,
  rotation,
  step: 2,
});

describe('rotationMatrix', () => {
  it('turns +x to +z for a -90° turn about y (three.js convention)', () => {
    const R = rotationMatrix([0, -90, 0]);
    const v = [R[0]![0]!, R[1]![0]!, R[2]![0]!];
    expect(v.map((x) => Math.round(x))).toEqual([0, 0, 1]);
  });
});

describe('overlapDepth', () => {
  it('is 0 for boards that only touch', () => {
    expect(overlapDepth(board('a', [0, 0.75, 0]), board('b', [0, 2.25, 0]))).toBe(0);
  });
  it('measures boards passing through each other', () => {
    expect(overlapDepth(board('a', [0, 0.75, 0]), board('b', [0, 1.25, 0]))).toBeCloseTo(1, 5);
  });
  it('handles rotated boards (a cross)', () => {
    expect(overlapDepth(board('a', [0, 0.75, 0]), board('b', [0, 0.75, 0], [0, 90, 0]))).toBeGreaterThan(1);
  });
});

describe('validateModel', () => {
  const guide = {
    slug: 't',
    dimensionsIn: { length: 10, width: 3.5, height: 3 },
    cutList: [{ part: 'X-1', qty: 2, stock: '2x4', lengthIn: 10 }],
    steps: [{ n: 1 }, { n: 2 }],
  };
  const model: GuideModel = {
    slug: 't',
    units: 'in',
    bounds: { length: 10, width: 3.5, height: 3 },
    parts: [board('X-1#1', [0, 0.75, 0]), board('X-1#2', [0, 2.25, 0])],
  };
  it('accepts a correct model', () => {
    expect(validateModel(model, guide)).toEqual([]);
  });
  it('catches a wrong count, a wrong size and a bad step', () => {
    const bad: GuideModel = {
      ...model,
      parts: [{ ...board('X-1#1', [0, 0.75, 0]), size: [9, 1.5, 3.5], step: 7 }],
    };
    const p = validateModel(bad, guide).join('\n');
    expect(p).toMatch(/1 parts in the model, cut list says 2/);
    expect(p).toMatch(/cut to 10/);
    expect(p).toMatch(/step 7/);
  });
  it('uses asBuilt (with a reason) instead of the stated size', () => {
    const taller: GuideModel = { ...model, parts: [board('X-1#1', [0, 0.75, 0]), board('X-1#2', [0, 3.75, 0])], bounds: { length: 10, width: 3.5, height: 4.5 } };
    expect(validateModel(taller, guide).join('\n')).toMatch(/height \(y\) is 4.50/);
    expect(validateModel({ ...taller, asBuilt: { length: 10, width: 3.5, height: 4.5, reason: 'second board sits on spacers' } }, guide)).toEqual([]);
    expect(validateModel({ ...taller, asBuilt: { length: 10, width: 3.5, height: 4.5, reason: ' ' } }, guide).join()).toMatch(/needs a reason/);
  });
});
