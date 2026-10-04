// Parks built with Park in a Truck, resolved from the Linktree "PARKS!" group
// (maps.app.goo.gl short links followed with curl, addresses confirmed with
// the Philadelphia AIS/Nominatim) and facts gathered from the toolkit's own
// acknowledgments page and press coverage. See each entry's `source` field.
//
// Owner: resources workstream. Consumed by ParksMap and /parks.

import type { ThemeId } from '../lib/types';
import parksData from './parks.json';

export interface ParkPhoto {
  src: string;
  alt: string;
  caption?: string;
  credit?: string;
}

export interface ParkLink {
  label: string;
  url: string;
}

export interface ParkVideo {
  id: string;
  title: string;
  channel?: string;
}

export interface Park {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  neighborhood?: string;
  year?: number;
  theme?: ThemeId | null;
  description: string;
  photos: ParkPhoto[];
  links: ParkLink[];
  videos: ParkVideo[];
  /** Where these facts came from, for anyone double-checking the entry. */
  source?: string;
}

export const PARKS: Park[] = parksData as Park[];

/** YouTube thumbnail -- no iframe embeds, per DESIGN.md (keeps the page light). */
export function youtubeThumb(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

export function youtubeWatchUrl(id: string): string {
  return `https://www.youtube.com/watch?v=${id}`;
}
