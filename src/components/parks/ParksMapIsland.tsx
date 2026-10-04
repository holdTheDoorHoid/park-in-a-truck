/** @jsxImportSource preact */
// MapLibre GL map of built Park in a Truck parks. No project/localStorage
// dependency, so plain client:visible (no SSR/hydration mismatch risk) and a
// dynamic import keeps the ~200kb maplibre-gl bundle out of every other page.
import { useEffect, useRef, useState } from 'preact/hooks';
import 'maplibre-gl/dist/maplibre-gl.css';
import { loadMaplibre } from '../philly/maplibre';
import { BASEMAP_ATTRIBUTION, BASEMAP_STYLE } from '../../lib/mapstyle';
import { u } from '../../lib/url';
import type { Park } from '../../data/parks';

interface Props {
  parks: Park[];
}

export default function ParksMapIsland({ parks }: Props) {
  const mapEl = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    let map: import('maplibre-gl').Map | undefined;
    let cancelled = false;

    (async () => {
      // Shared loader: points MapLibre at a Vite-built worker (needed in production builds).
      const maplibre = await loadMaplibre();
      if (cancelled || !mapEl.current) return;

      map = new maplibre.Map({
        container: mapEl.current,
        style: BASEMAP_STYLE,
        center: [-75.21, 39.95],
        zoom: 11.5,
        attributionControl: false,
      });
      map.addControl(new maplibre.AttributionControl({ customAttribution: BASEMAP_ATTRIBUTION }));
      map.addControl(new maplibre.NavigationControl({ showCompass: false }), 'top-right');

      const bounds = new maplibre.LngLatBounds();
      for (const park of parks) {
        const el = document.createElement('button');
        el.type = 'button';
        el.className = 'parks-marker';
        el.setAttribute('aria-label', park.name);
        el.addEventListener('click', () => {
          setActiveId(park.id);
          document.getElementById(`park-${park.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
        new maplibre.Marker({ element: el, anchor: 'bottom' }).setLngLat([park.lng, park.lat]).addTo(map!);
        bounds.extend([park.lng, park.lat]);
      }
      if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 48, maxZoom: 14, duration: 0 });
    })();

    return () => {
      cancelled = true;
      map?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const active = parks.find((p) => p.id === activeId);

  return (
    <div class="parks-map-wrap">
      <div class="parks-map" ref={mapEl} role="application" aria-label="Map of parks built with Park in a Truck"></div>
      {active && (
        <div class="parks-map-card">
          {active.photos[0] && <img src={u(active.photos[0].src)} alt={active.photos[0].alt} loading="lazy" />}
          <div class="parks-map-card-body">
            <p class="parks-map-card-name">{active.name}</p>
            <p class="parks-map-card-addr">{active.address}</p>
            <a class="btn btn-small" href={`#park-${active.id}`}>
              View details
            </a>
          </div>
          <button type="button" class="parks-map-card-close" aria-label="Close" onClick={() => setActiveId(null)}>
            ×
          </button>
        </div>
      )}
    </div>
  );
}
