import { describe, expect, it } from 'vitest';
import { readingLine, stepAtReadingLine, same, type BlockRect } from '../scroll';

// three steps, 400px tall each, the first starting 1000px down the page
const at = (scrollY: number): BlockRect[] =>
  [0, 1, 2].map((k) => ({ n: k + 1, top: 1000 + k * 400 - scrollY, bottom: 1400 + k * 400 - scrollY }));

describe('readingLine', () => {
  it('sits 35% down the readable area below the header', () => {
    expect(readingLine(64, 864)).toBeCloseTo(64 + 800 * 0.35);
  });
  it('moves down when a sticky viewer takes the top of the screen', () => {
    expect(readingLine(64 + 300, 800)).toBeGreaterThan(readingLine(64, 800));
  });
  it('clamps an area top below the viewport', () => {
    expect(readingLine(2000, 800)).toBe(800);
  });
});

describe('stepAtReadingLine', () => {
  const line = 300;
  it('is "before" until the first step reaches the line', () => {
    expect(stepAtReadingLine(at(0), line)).toEqual({ kind: 'before' });
    expect(stepAtReadingLine(at(699), line)).toEqual({ kind: 'before' });
  });
  it('picks the last step whose top has passed the line', () => {
    expect(stepAtReadingLine(at(700), line)).toEqual({ kind: 'step', n: 1 });
    expect(stepAtReadingLine(at(1099), line)).toEqual({ kind: 'step', n: 1 });
    expect(stepAtReadingLine(at(1100), line)).toEqual({ kind: 'step', n: 2 });
    expect(stepAtReadingLine(at(1500), line)).toEqual({ kind: 'step', n: 3 });
  });
  it('is "after" once the last step has scrolled past the line', () => {
    expect(stepAtReadingLine(at(1899), line)).toEqual({ kind: 'step', n: 3 });
    expect(stepAtReadingLine(at(1901), line)).toEqual({ kind: 'after' });
  });
  it('holds the previous step within the hysteresis band', () => {
    const prev = { kind: 'step', n: 1 } as const;
    // the line is 5px into step 2: still step 1 with 12px hysteresis
    expect(stepAtReadingLine(at(1105), line, { prev })).toEqual(prev);
    expect(stepAtReadingLine(at(1105), line, { prev, hysteresis: 0 })).toEqual({ kind: 'step', n: 2 });
    // clearly past: changes
    expect(stepAtReadingLine(at(1120), line, { prev })).toEqual({ kind: 'step', n: 2 });
    // and scrolling back up, step 2 holds until clearly above its top
    expect(stepAtReadingLine(at(1095), line, { prev: { kind: 'step', n: 2 } })).toEqual({ kind: 'step', n: 2 });
    expect(stepAtReadingLine(at(1080), line, { prev: { kind: 'step', n: 2 } })).toEqual({ kind: 'step', n: 1 });
  });
  it('shows the last step at the very end of a short page', () => {
    // step 3's top never reaches the line, but the page can't scroll further
    expect(stepAtReadingLine(at(1300), line, { atPageEnd: true, viewportHeight: 800 })).toEqual({ kind: 'step', n: 3 });
    expect(stepAtReadingLine(at(1300), line)).toEqual({ kind: 'step', n: 2 });
  });
  it('handles no steps', () => {
    expect(stepAtReadingLine([], 300)).toEqual({ kind: 'before' });
  });
  it('compares results', () => {
    expect(same({ kind: 'step', n: 2 }, { kind: 'step', n: 2 })).toBe(true);
    expect(same({ kind: 'step', n: 2 }, { kind: 'step', n: 3 })).toBe(false);
    expect(same({ kind: 'after' }, { kind: 'after' })).toBe(true);
  });
});
