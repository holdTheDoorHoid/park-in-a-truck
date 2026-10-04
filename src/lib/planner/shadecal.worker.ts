// Web Worker: the shade calendar (one spot, or the whole lot), off the main thread. It stays
// alive between jobs so the sun positions for the place are worked out once (shadecal.ts caches
// them); ShadeCalRunner ends it when a slow whole-lot job is no longer wanted.
import { lotCalendar, spotCalendar, type LotCalInput } from './shadecal';
import type { SpotInput } from './sunperiod';

export type ShadeCalJob = { kind: 'spot'; input: SpotInput } | { kind: 'lot'; input: LotCalInput };

self.onmessage = (e: MessageEvent<{ id: number; job: ShadeCalJob }>) => {
  const { id, job } = e.data;
  const post = (msg: object) => (self as unknown as Worker).postMessage({ id, ...msg });
  try {
    const cal = job.kind === 'spot' ? spotCalendar(job.input) : lotCalendar(job.input, (f) => post({ type: 'progress', f }));
    post({ type: 'done', cal });
  } catch (err) {
    post({ type: 'error', message: String((err as Error)?.message ?? err) });
  }
};
