// Web Worker: a sun-hours study (the growing season, or any period), off the main thread.
import { DEFAULT_SEASON, seasonSamples, type SeasonOptions } from './sun';
import { periodSamples, type SunPeriod } from './sunperiod';
import { computeSunHours, type Crown, type GridSpec, type Prism } from './sunhours';

export interface SunJob {
  grid: GridSpec;
  buildings: Prism[];
  crowns: Crown[];
  lat: number;
  lng: number;
  /** the growing season (or another span of days) … */
  season?: SeasonOptions;
  /** … or a named period (sunperiod.ts); wins over `season` */
  period?: SunPeriod;
}

self.onmessage = (e: MessageEvent<SunJob>) => {
  const job = e.data;
  const { samples, days } = job.period ? periodSamples(job.lat, job.lng, job.period) : seasonSamples(job.lat, job.lng, job.season ?? DEFAULT_SEASON);
  const hours = computeSunHours({ grid: job.grid, buildings: job.buildings, crowns: job.crowns, samples, days }, (f) =>
    (self as unknown as Worker).postMessage({ type: 'progress', f }),
  );
  (self as unknown as Worker).postMessage({ type: 'done', hours }, [hours.buffer]);
};
