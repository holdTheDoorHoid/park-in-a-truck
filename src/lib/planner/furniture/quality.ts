// How much furniture detail a device can take (pure, tested).
//
// The 3D view starts with full detail ('high'), or 'low' on phones and small machines.
// While the view is moving, FrameWatch looks at the time between drawn frames; if they
// stay slow, the furniture steps down one level (high → low → blocks) and stays there
// for the session. `?furniture=high|low|blocks` in the address pins a level (testing).

import type { Quality } from './modelparts';

export interface DeviceHints {
  coarsePointer?: boolean;
  /** navigator.deviceMemory (GB), when the browser tells */
  memoryGb?: number;
  /** navigator.hardwareConcurrency */
  cores?: number;
}

export function initialQuality(d: DeviceHints): Quality {
  const small = (d.memoryGb !== undefined && d.memoryGb <= 2) || (d.cores !== undefined && d.cores <= 2);
  const modest = (d.memoryGb !== undefined && d.memoryGb <= 4) || (d.cores !== undefined && d.cores <= 4);
  if (small) return 'low';
  if (d.coarsePointer && modest) return 'low';
  return 'high';
}

/** A pinned level from the address (`?furniture=…`), if any. */
export function pinnedQuality(search: string): Quality | null {
  const m = /[?&]furniture=(high|low|blocks)\b/.exec(search);
  return m ? (m[1] as Quality) : null;
}

export const lower = (q: Quality): Quality => (q === 'high' ? 'low' : 'blocks');

/**
 * Watches frame-to-frame times while the view is drawn continuously (orbiting, dragging):
 * the caller says whether the previous display frame was drawn too, so idle pauses and
 * one-off redraws never count. `note()` returns true when the last `window` continuous
 * frames had a median over `slowMs`.
 */
export class FrameWatch {
  private last = -1;
  private gaps: number[] = [];
  constructor(
    private slowMs = 70,
    private window = 30,
  ) {}

  note(now: number, continuous: boolean): boolean {
    const prev = this.last;
    this.last = now;
    if (prev < 0 || !continuous) return false;
    const dt = now - prev;
    if (!(dt > 0) || dt > 3000) return false;
    this.gaps.push(dt);
    if (this.gaps.length > this.window) this.gaps.shift();
    if (this.gaps.length < this.window) return false;
    const sorted = [...this.gaps].sort((a, b) => a - b);
    const median = sorted[sorted.length >> 1]!;
    if (median > this.slowMs) {
      this.reset();
      return true;
    }
    return false;
  }

  reset() {
    this.gaps = [];
    this.last = -1;
  }
}
