// Running the shade calendar for the planner (main thread): the inputs from the lot (the same
// ones the spot chart and the maps use), a Web Worker, a cache per spot, and cancelling when the
// spot changes. The maths is in shadecal.ts, the words in shadewords.ts.

import type { ExistingItem } from '../types';
import type { LocalSite } from './localsite';
import type { Vec2 } from './geo';
import { crownsKey, lotGrid, shadeBuildings, shadeCrowns, spotInputFor } from './sunstudy';
import { coarseGrid, lotCalendar, spotCalendar, type ShadeCal } from './shadecal';
import type { ShadeCalJob } from './shadecal.worker';

export type CalKind = ShadeCal['kind'];

/** The job for one spot or for the whole lot, as plain data that can go to the worker. */
export function shadeCalJob(site: LocalSite, existing: ExistingItem[] | undefined, kind: CalKind, point: Vec2): ShadeCalJob {
  if (kind === 'spot') {
    const input = spotInputFor(site, existing, point);
    return { kind, input: { ...input, buildings: plain(input.buildings) } };
  }
  return {
    kind,
    input: { grid: lotCalGrid(site), buildings: plain(shadeBuildings(site)), crowns: shadeCrowns(site, existing), lat: site.lf.origin[1], lng: site.lf.origin[0] },
  };
}

/** the whole-lot calendar's grid: the maps' grid, in cells of 2 ft or more */
export function lotCalGrid(site: LocalSite) {
  const g = lotGrid(site);
  return coarseGrid(g, g.cellFt >= 2 ? 1 : 2);
}

const plain = (bs: ReturnType<typeof shadeBuildings>) => bs.map((b) => ({ ring: b.ring, heightFt: b.heightFt, ...(b.baseFt ? { baseFt: b.baseFt } : {}) }));

// ---- cache: per lot (the LocalSite object: a new lot or its ground arriving makes a new one) ----

const cache = new WeakMap<LocalSite, Map<string, ShadeCal>>();

/** What a calendar depends on besides the lot: which one, the trees, and (for a spot) where. */
export function shadeCalKey(site: LocalSite, existing: ExistingItem[] | undefined, kind: CalKind, point: Vec2 | null): string {
  const trees = crownsKey(shadeCrowns(site, existing));
  return kind === 'lot' || !point ? `${kind}|${trees}` : `${kind}|${trees}|${point[0].toFixed(1)},${point[1].toFixed(1)}`;
}

export function cachedShadeCal(site: LocalSite, key: string): ShadeCal | undefined {
  return cache.get(site)?.get(key);
}

export function keepShadeCal(site: LocalSite, key: string, cal: ShadeCal): void {
  let m = cache.get(site);
  if (!m) cache.set(site, (m = new Map()));
  m.delete(key);
  m.set(key, cal);
  if (m.size > 24) m.delete(m.keys().next().value!);
}

// ---- the worker ----

interface Pending {
  id: number;
  kind: CalKind;
  resolve: (c: ShadeCal) => void;
  reject: (e: Error) => void;
  onProgress?: (f: number) => void;
}

/**
 * One calendar at a time: a newer request replaces an older one. A replaced spot job (a moment's
 * work) just finishes and is ignored; a replaced whole-lot job stops the worker, and the next job
 * starts a fresh one.
 */
export class ShadeCalRunner {
  private worker: Worker | null = null;
  private seq = 0;
  private current: Pending | null = null;

  run(job: ShadeCalJob, onProgress?: (f: number) => void): Promise<ShadeCal> {
    this.cancel();
    const id = ++this.seq;
    return new Promise<ShadeCal>((resolve, reject) => {
      const p: Pending = { id, kind: job.kind, resolve, reject, onProgress };
      this.current = p;
      const w = this.ensureWorker();
      if (!w) {
        // no workers (tests, very old browsers): work it out here, a moment later
        setTimeout(() => {
          if (this.current !== p) return;
          this.current = null;
          try {
            resolve(job.kind === 'spot' ? spotCalendar(job.input) : lotCalendar(job.input, onProgress));
          } catch (e) {
            reject(e as Error);
          }
        }, 0);
        return;
      }
      w.postMessage({ id, job });
    });
  }

  /** Stop waiting for the current calendar (its promise rejects with "cancelled"). */
  cancel(): void {
    const p = this.current;
    if (!p) return;
    this.current = null;
    if (p.kind === 'lot') this.stopWorker();
    p.reject(new Error('cancelled'));
  }

  destroy(): void {
    this.cancel();
    this.stopWorker();
  }

  private ensureWorker(): Worker | null {
    if (this.worker) return this.worker;
    if (typeof Worker === 'undefined') return null;
    try {
      const w = new Worker(new URL('./shadecal.worker.ts', import.meta.url), { type: 'module' });
      w.onmessage = (e: MessageEvent<{ id: number; type: string; f?: number; cal?: ShadeCal; message?: string }>) => {
        const p = this.current;
        if (!p || e.data.id !== p.id) return; // an older job's answer
        if (e.data.type === 'progress') p.onProgress?.(e.data.f ?? 0);
        else {
          this.current = null;
          if (e.data.type === 'done') p.resolve(e.data.cal!);
          else p.reject(new Error(e.data.message ?? 'failed'));
        }
      };
      w.onerror = (err) => {
        const p = this.current;
        this.current = null;
        this.stopWorker();
        p?.reject(new Error(err.message || 'worker failed'));
      };
      this.worker = w;
      return w;
    } catch {
      return null;
    }
  }

  private stopWorker(): void {
    this.worker?.terminate();
    this.worker = null;
  }
}
