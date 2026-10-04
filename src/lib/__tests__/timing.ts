// Timing checks that hold on a busy machine (several agents building at once made the single-run
// limits fail now and then). Load only ever ADDS time, so the fastest of a few runs is the closest
// to what the code itself costs: run until one run beats `target` (usually the first, on a quiet
// machine), at most `runs` times, and return the fastest. Tests then compare that against a
// generous ceiling — loose enough for a loaded machine, tight enough that a real slowdown (a lost
// cache, an accidental O(n²)) still fails.

export function fastestMs(run: (i: number) => unknown, target: number, runs = 7): number {
  let best = Infinity;
  for (let i = 0; i < runs && best >= target; i++) {
    const t0 = performance.now();
    run(i);
    best = Math.min(best, performance.now() - t0);
  }
  return best;
}
