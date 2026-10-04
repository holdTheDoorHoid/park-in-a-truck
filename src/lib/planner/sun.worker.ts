// Web Worker: the growing-season sun-hours study, off the main thread.
import { seasonSamples, type SeasonOptions } from './sun';
import { computeSunHours, type Crown, type GridSpec, type Prism } from './sunhours';

export interface SunJob {
  grid: GridSpec;
  buildings: Prism[];
  crowns: Crown[];
  lat: number;
  lng: number;
  season: SeasonOptions;
}

self.onmessage = (e: MessageEvent<SunJob>) => {
  const job = e.data;
  const { samples, days } = seasonSamples(job.lat, job.lng, job.season);
  const hours = computeSunHours({ grid: job.grid, buildings: job.buildings, crowns: job.crowns, samples, days }, (f) =>
    (self as unknown as Worker).postMessage({ type: 'progress', f }),
  );
  (self as unknown as Worker).postMessage({ type: 'done', hours }, [hours.buffer]);
};
