// Load MapLibre on demand (it is large) and point it at its web worker.
//
// MapLibre 6 finds its worker next to its own module file, which no longer
// holds once Vite bundles it, so we hand it a Vite-built worker URL. Other
// maps on the site can reuse this loader.

import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';
import { AERIAL_ATTRIBUTION, AERIAL_MAX_ZOOM, aerialTiles, BASEMAP_STYLE } from '../../lib/mapstyle';

type ML = typeof import('maplibre-gl');
let loading: Promise<ML> | null = null;

export function loadMaplibre(): Promise<ML> {
  return (loading ??= import('maplibre-gl').then((ml) => {
    ml.setWorkerUrl(workerUrl);
    return ml;
  }));
}

export const PHILLY_CENTER: [number, number] = [-75.1635, 39.9526];

/** A map with the site basemap. Resolves once the style has loaded. */
export async function createMap(container: HTMLElement, opts: { center?: [number, number]; zoom?: number; interactive?: boolean } = {}) {
  const ml = await loadMaplibre();
  const map = new ml.Map({
    container,
    style: BASEMAP_STYLE,
    center: opts.center ?? PHILLY_CENTER,
    zoom: opts.zoom ?? 12,
    maxZoom: 21,
    interactive: opts.interactive ?? true,
    attributionControl: { compact: true },
    cooperativeGestures: false,
  });
  await new Promise<void>((resolve) => {
    if (map.isStyleLoaded()) resolve();
    else map.once('load', () => resolve());
  });
  return { ml, map };
}

/** Add the City aerial photos under the labels (hidden until shown). */
export function addAerial(map: import('maplibre-gl').Map, visible = false) {
  if (map.getSource('city-aerial')) return;
  map.addSource('city-aerial', {
    type: 'raster',
    tiles: [aerialTiles(2025)],
    tileSize: 256,
    maxzoom: AERIAL_MAX_ZOOM,
    attribution: AERIAL_ATTRIBUTION,
  });
  const firstSymbol = map.getStyle().layers.find((l) => l.type === 'symbol')?.id;
  map.addLayer(
    { id: 'city-aerial', type: 'raster', source: 'city-aerial', layout: { visibility: visible ? 'visible' : 'none' } },
    firstSymbol,
  );
}

export function setAerial(map: import('maplibre-gl').Map, on: boolean) {
  if (map.getLayer('city-aerial')) map.setLayoutProperty('city-aerial', 'visibility', on ? 'visible' : 'none');
}
