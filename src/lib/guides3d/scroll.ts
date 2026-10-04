// Which build step is "current" for the scroll position. Pure maths over the
// step blocks' viewport rectangles, so it can be tested without a browser.
//
// The reader's eye sits at a "reading line" in the upper-middle of the part of
// the screen they can read (below the sticky header — and on phones below the
// sticky 3D viewer). The current step is the last one whose top has passed
// that line. Above the first step: "before"; once the last step's bottom has
// passed it: "after".

export interface BlockRect {
  n: number;
  top: number;
  bottom: number;
}

export type ScrollStep = { kind: 'before' } | { kind: 'step'; n: number } | { kind: 'after' };

/** The reading line: `frac` of the way down the readable area. */
export function readingLine(areaTop: number, viewportHeight: number, frac = 0.35): number {
  const top = Math.max(0, Math.min(areaTop, viewportHeight));
  return top + (viewportHeight - top) * frac;
}

export interface StepAtOptions {
  /** the previous result, for hysteresis */
  prev?: ScrollStep;
  /** px the line must move past a boundary before the step changes (default 12) */
  hysteresis?: number;
  /** the page is scrolled to its very end */
  atPageEnd?: boolean;
  viewportHeight?: number;
}

function raw(blocks: BlockRect[], line: number): ScrollStep {
  if (!blocks.length || line < blocks[0]!.top) return { kind: 'before' };
  let cur = blocks[0]!;
  for (const b of blocks) if (b.top <= line) cur = b;
  const last = blocks[blocks.length - 1]!;
  if (cur === last && line > last.bottom) return { kind: 'after' };
  return { kind: 'step', n: cur.n };
}

export function stepAtReadingLine(blocks: BlockRect[], line: number, opts: StepAtOptions = {}): ScrollStep {
  const h = opts.hysteresis ?? 12;
  let res = raw(blocks, line);
  // hysteresis: only leave the previous step once the line is clearly past its edge
  const prev = opts.prev;
  if (prev && h > 0 && !same(prev, res)) {
    const lo = raw(blocks, line - h);
    const hi = raw(blocks, line + h);
    if (same(lo, prev) || same(hi, prev)) res = prev;
  }
  // a page too short to bring the last step up to the line: at the very bottom, show it
  if (opts.atPageEnd && blocks.length) {
    const last = blocks[blocks.length - 1]!;
    const vh = opts.viewportHeight ?? Infinity;
    if (res.kind !== 'after' && last.top < vh && !(res.kind === 'step' && res.n === last.n)) res = { kind: 'step', n: last.n };
  }
  return res;
}

export function same(a: ScrollStep, b: ScrollStep): boolean {
  return a.kind === b.kind && (a.kind !== 'step' || (b.kind === 'step' && a.n === b.n));
}
