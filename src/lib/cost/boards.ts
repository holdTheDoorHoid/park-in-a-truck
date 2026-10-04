// How many boards a cut list really needs, counted honestly: every saw cut
// takes 1/8" (the kerf), so two 48" pieces do not come out of one 96" board,
// and each 93" or 86" piece takes a whole 8' board. Used by guides.ts to check
// each build guide's own materials list against its cut list.
//
// Pure arithmetic, no data. Exact search for small cut lists (one piece of
// furniture), the best of three standard heuristics for big ones, and
// "n pieces never need more than k pieces + (n − k) pieces" to keep the
// count for several pieces at least as good as building them one at a time.

/** Saw kerf, inches */
export const KERF = 0.125;

const EPS = 1e-9;

/** Boards of length `L` (inches) holding `pieces`, if they fit: `n` pieces need Σ lengths + (n − 1) kerfs. */
function fits(used: number, piece: number, L: number): boolean {
  return (used === 0 ? piece : used + KERF + piece) <= L + EPS;
}

function firstFit(pieces: number[], L: number, best: boolean): number {
  const bins: number[] = [];
  for (const p of pieces) {
    let at = -1;
    for (let k = 0; k < bins.length; k++) {
      if (!fits(bins[k]!, p, L)) continue;
      if (!best) {
        at = k;
        break;
      }
      if (at < 0 || bins[k]! > bins[at]!) at = k; // fullest board it still fits on
    }
    if (at < 0) bins.push(p);
    else bins[at] = bins[at]! + KERF + p;
  }
  return bins.length;
}

/**
 * Sequential pattern heuristic: repeatedly cut the board pattern that wastes
 * least, as often as the remaining pieces allow. Good when there are few
 * different lengths in large numbers (several benches at once).
 */
function patterns(pieces: number[], L: number): number {
  const lengths = [...new Set(pieces)].sort((a, b) => b - a);
  const need = lengths.map((x) => pieces.filter((p) => p === x).length);
  let boards = 0;
  while (need.some((c) => c > 0)) {
    // best single-board pattern from what is left (bounded knapsack by DFS; few lengths)
    let bestUse = -1;
    let bestPat: number[] = [];
    const pat = lengths.map(() => 0);
    const dfs = (k: number, used: number, count: number) => {
      if (k === lengths.length) {
        if (count > 0 && used > bestUse + EPS) {
          bestUse = used;
          bestPat = [...pat];
        }
        return;
      }
      const len = lengths[k]!;
      // capacity trick: L + kerf holds pieces of (length + kerf)
      const room = Math.floor((L + KERF - (used + count * KERF) + EPS) / (len + KERF));
      for (let c = Math.min(need[k]!, Math.max(0, room)); c >= 0; c--) {
        pat[k] = c;
        dfs(k + 1, used + c * len, count + c);
      }
      pat[k] = 0;
    };
    dfs(0, 0, 0);
    if (bestUse < 0) throw new Error('A piece is longer than the board.');
    const times = Math.min(...bestPat.map((c, k) => (c > 0 ? Math.floor(need[k]! / c) : Infinity)));
    bestPat.forEach((c, k) => (need[k] = need[k]! - c * times));
    boards += times;
  }
  return boards;
}

/** Exact minimum for small cut lists (branch and bound); undefined if it gives up. */
function exact(pieces: number[], L: number, upper: number): number | undefined {
  const lower = Math.ceil(pieces.reduce((a, p) => a + p + KERF, 0) / (L + KERF) - EPS);
  let best = upper;
  if (best <= Math.max(1, lower)) return best;
  let nodes = 0;
  const bins: number[] = [];
  let aborted = false;
  const dfs = (k: number) => {
    if (aborted) return;
    if (++nodes > 200_000) {
      aborted = true;
      return;
    }
    if (bins.length >= best) return;
    if (k === pieces.length) {
      best = bins.length;
      return;
    }
    // bound: boards so far + what the rest needs at least
    let rest = 0;
    for (let j = k; j < pieces.length; j++) rest += pieces[j]! + KERF;
    const free = bins.reduce((a, b) => a + (L + KERF - (b + KERF)), 0);
    if (bins.length + Math.max(0, Math.ceil((rest - free - EPS) / (L + KERF))) >= best) return;
    const p = pieces[k]!;
    const tried = new Set<number>();
    for (let b = 0; b < bins.length; b++) {
      const u = bins[b]!;
      if (tried.has(u) || !fits(u, p, L)) continue;
      tried.add(u);
      bins[b] = u + KERF + p;
      dfs(k + 1);
      bins[b] = u;
    }
    bins.push(p);
    dfs(k + 1);
    bins.pop();
  };
  dfs(0);
  return aborted ? undefined : best;
}

/** The fewest boards of length `L` (inches) that `pieces` can be cut from, allowing 1/8" per cut. */
export function boardsFor(pieces: number[], L: number): number {
  if (!pieces.length) return 0;
  if (pieces.some((p) => p > L + EPS)) throw new Error(`A ${Math.max(...pieces)}" piece does not fit on a ${L}" board.`);
  const sorted = [...pieces].sort((a, b) => b - a);
  let best = Math.min(firstFit(sorted, L, false), firstFit(sorted, L, true), patterns(sorted, L));
  if (sorted.length <= 40) best = exact(sorted, L, best) ?? best;
  return best;
}

const memo = new Map<string, number>();

/**
 * Boards for `n` copies of one cut list (`pieces` is one copy). Never more than
 * building them in two batches, so a count for 4 benches is at most twice the
 * count for 2.
 */
export function boardsForCopies(pieces: number[], L: number, n: number): number {
  if (n <= 0 || !pieces.length) return 0;
  const key = `${L}|${[...pieces].sort((a, b) => b - a).join(',')}|${n}`;
  const hit = memo.get(key);
  if (hit !== undefined) return hit;
  const all: number[] = [];
  for (let k = 0; k < n; k++) all.push(...pieces);
  let best = boardsFor(all, L);
  for (let k = 1; k <= n / 2; k++) best = Math.min(best, boardsForCopies(pieces, L, k) + boardsForCopies(pieces, L, n - k));
  memo.set(key, best);
  return best;
}

/**
 * Cut pieces from a given stock of boards of mixed lengths (a guide that lists,
 * say, three 8' and two 10' boards of the same lumber). Returns how many more
 * boards of each length are needed beyond `stock` (all zero when the stock is
 * enough). Pieces go longest first onto the fullest board they fit; a new board
 * is the shortest one left in stock that fits, else an extra of the shortest
 * listed length that fits.
 */
export function extraBoards(pieces: number[], stock: Record<number, number>): Record<number, number> {
  const lengths = Object.keys(stock)
    .map(Number)
    .sort((a, b) => a - b);
  const left: Record<number, number> = { ...stock };
  const extra: Record<number, number> = Object.fromEntries(lengths.map((l) => [l, 0]));
  const open: { L: number; used: number }[] = [];
  for (const p of [...pieces].sort((a, b) => b - a)) {
    let at = -1;
    for (let k = 0; k < open.length; k++) {
      const b = open[k]!;
      if (!fits(b.used, p, b.L)) continue;
      if (at < 0 || b.L - b.used < open[at]!.L - open[at]!.used) at = k;
    }
    if (at >= 0) {
      open[at]!.used += KERF + p;
      continue;
    }
    const fromStock = lengths.find((l) => l + EPS >= p && left[l]! > 0);
    if (fromStock !== undefined) {
      left[fromStock] = left[fromStock]! - 1;
      open.push({ L: fromStock, used: p });
      continue;
    }
    const L = lengths.find((l) => l + EPS >= p);
    if (L === undefined) throw new Error(`A ${p}" piece is longer than any board listed.`);
    extra[L] = extra[L]! + 1;
    open.push({ L, used: p });
  }
  return extra;
}
