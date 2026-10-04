// Park sizes A–E from the Assess workbook summary ("Are you ready?", p.11)
// and the Dream workbook ("Right size your park"). Each size has a range for
// the LONG edge (L) and the SHORT edge (W), in feet.

import type { SizeId } from './types';

export interface SizeRange {
  id: SizeId;
  long: [number, number];
  short: [number, number];
}

export const SIZES: SizeRange[] = [
  { id: 'A', long: [44, 64], short: [12, 16] },
  { id: 'B', long: [64, 76], short: [16, 28] },
  { id: 'C', long: [76, 88], short: [28, 40] },
  { id: 'D', long: [88, 96], short: [32, 48] },
  { id: 'E', long: [80, 120], short: [44, 60] },
];

export interface SizeFit {
  size: SizeId;
  /** true when both edges fall inside the size's ranges */
  exact: boolean;
  /** The lot is smaller than size A: the Park Patch workbook fits better */
  tooSmall: boolean;
  /** The lot is bigger than size E: use E and expand (or split into two parks) */
  tooBig: boolean;
}

function gap(v: number, [lo, hi]: [number, number]) {
  return v < lo ? lo - v : v > hi ? v - hi : 0;
}

/** Pick the park size for a lot. Inputs in feet; order does not matter. */
export function fitSize(a: number, b: number): SizeFit {
  const long = Math.max(a, b);
  const short = Math.min(a, b);
  const tooSmall = long < SIZES[0]!.long[0] || short < SIZES[0]!.short[0];
  const tooBig = long > 120 || short > 60;
  const exact = SIZES.filter((s) => gap(long, s.long) === 0 && gap(short, s.short) === 0);
  if (exact.length) {
    // Several sizes can contain the lot (D and E overlap); the short edge is
    // the tighter constraint, so prefer the size whose short range is centred
    // closest to the lot's width.
    exact.sort(
      (x, y) => Math.abs(short - (x.short[0] + x.short[1]) / 2) - Math.abs(short - (y.short[0] + y.short[1]) / 2),
    );
    return { size: exact[0]!.id, exact: true, tooSmall: false, tooBig: false };
  }
  // Otherwise the nearest size, weighting the short edge double because the
  // pieces can be stretched along their length more easily than across.
  let best = SIZES[0]!;
  let bestScore = Infinity;
  for (const s of SIZES) {
    const score = gap(long, s.long) + 2 * gap(short, s.short);
    if (score < bestScore) {
      bestScore = score;
      best = s;
    }
  }
  return { size: best.id, exact: false, tooSmall, tooBig };
}
