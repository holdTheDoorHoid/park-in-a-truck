// Timing checks that hold on a busy machine (several agents building at once made the single-run
// limits fail now and then). Load only ever ADDS time, so the fastest of a few runs is the closest
// to what the code itself costs: run until one run beats `target` (usually the first, on a quiet
// machine), at most `runs` times, and return the fastest. Tests then compare that against a
// generous ceiling — loose enough for a loaded machine, tight enough that a real slowdown (a lost
// cache, an accidental O(n²)) still fails.
//
// PIAT_SKIP_TIMING=1 (the GitHub Pages workflow sets it): the ceilings are not checked — the work
// still runs once and its results are still checked. Shared CI runners are slower and noisier than
// a dev machine, and a deploy must not fail on a slow minute; speed is checked by `npm test` locally.
// (vitest.config.ts also gives each test a longer time limit then.)
import { expect } from 'vitest';

export const CHECK_TIMING = !process.env.PIAT_SKIP_TIMING;

export function fastestMs(run: (i: number) => unknown, target: number, runs = 7): number {
  let best = Infinity;
  for (let i = 0; i < (CHECK_TIMING ? runs : 1) && best >= target; i++) {
    const t0 = performance.now();
    run(i);
    best = Math.min(best, performance.now() - t0);
  }
  return best;
}

/** `expect(ms).toBeLessThan(ceiling)`, unless timing checks are off (PIAT_SKIP_TIMING). */
export function expectUnder(ms: number, ceiling: number): void {
  if (CHECK_TIMING) expect(ms).toBeLessThan(ceiling);
}
