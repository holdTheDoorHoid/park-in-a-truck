/** @jsxImportSource preact */
// NeighborhoodAssets (Organize) — the workbook's asset lists, pre-filled from
// City data around the lot: community organizations, council district, schools,
// libraries, parks and rec centers, gardens, public art, historic places,
// hospitals, colleges. Tick "add to our list" to save an item; the lists are
// saved as fields organize.assets-<category> and print on My park.

import { useEffect, useRef, useState } from 'preact/hooks';
import type { GeoJSONSource, Map as MLMap } from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';
import { getField, setField } from '../../lib/project';
import { nearbyAssets, assetFieldId, assetLine } from '../../lib/philly/assets';
import type { Asset, AssetCategoryId, AssetGroup } from '../../lib/philly/types';
import { distance, titleCase } from '../../lib/philly/plain';
import { u } from '../../lib/url';
import LotLookup from './LotLookup';
import { useNearViewport, useProject } from './hooks';
import { createMap } from './maplibre';

const COLORS: Record<AssetCategoryId, string> = {
  rcos: '#111111',
  council: '#111111',
  friends: '#006B35',
  schools: '#8E1F6B',
  libraries: '#0B4A6B',
  parks: '#006B35',
  hospitals: '#B3261E',
  universities: '#5B3E96',
  gardens: '#4C9A2A',
  art: '#F05A28',
  historic: '#9A5B00',
};

const LISTS: AssetGroup['workbookList'][] = ['Citizens associations', 'Local institutions', 'Neighborhood physical assets'];

function AssetsMap({ lot, groups, radiusFt }: { lot: { lng: number; lat: number; polygon: [number, number][] }; groups: AssetGroup[]; radiusFt: number }) {
  const [ref, near] = useNearViewport<HTMLDivElement>();
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<MLMap | null>(null);
  const [failed, setFailed] = useState(false);
  const data = (): FeatureCollection => ({
    type: 'FeatureCollection',
    features: groups.flatMap((g) =>
      g.items
        .filter((a) => a.lngLat && (a.distanceFt ?? 0) > 0)
        .map((a) => ({ type: 'Feature' as const, properties: { color: COLORS[g.id], name: a.name }, geometry: { type: 'Point' as const, coordinates: a.lngLat! } })),
    ),
  });
  useEffect(() => {
    if (!near || map.current || !el.current) return;
    createMap(el.current, { center: [lot.lng, lot.lat], zoom: 15 })
      .then(({ ml, map: m }) => {
        map.current = m;
        m.addControl(new ml.NavigationControl({ showCompass: false }), 'top-right');
        if (lot.polygon.length >= 3)
          m.addSource('lot', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[...lot.polygon, lot.polygon[0]!]] } } });
        m.addSource('assets', { type: 'geojson', data: data() });
        if (lot.polygon.length >= 3) {
          m.addLayer({ id: 'lot-fill', type: 'fill', source: 'lot', paint: { 'fill-color': '#00A8E8', 'fill-opacity': 0.6 } });
          m.addLayer({ id: 'lot-line', type: 'line', source: 'lot', paint: { 'line-color': '#111', 'line-width': 3 } });
        }
        m.addLayer({
          id: 'assets',
          type: 'circle',
          source: 'assets',
          paint: { 'circle-color': ['get', 'color'], 'circle-radius': 6, 'circle-stroke-color': '#fff', 'circle-stroke-width': 2 },
        });
        m.addSource('lot-pt', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [lot.lng, lot.lat] } } });
        m.addLayer({
          id: 'lot-pt',
          type: 'circle',
          source: 'lot-pt',
          paint: { 'circle-color': '#00A8E8', 'circle-radius': 9, 'circle-stroke-color': '#111', 'circle-stroke-width': 3 },
        });
        // Show the lot and everything within the search radius (far-off hospitals/colleges may sit outside).
        const b = new ml.LngLatBounds([lot.lng, lot.lat], [lot.lng, lot.lat]);
        for (const g of groups) for (const a of g.items) if (a.lngLat && (a.distanceFt ?? 0) <= radiusFt) b.extend(a.lngLat);
        m.fitBounds(b, { padding: 40, maxZoom: 17, duration: 0 });
        m.on('click', 'assets', (e) => {
          const f = e.features?.[0];
          if (f) new ml.Popup({ closeButton: false }).setLngLat(e.lngLat).setText(String(f.properties.name)).addTo(m);
        });
      })
      .catch(() => setFailed(true));
  }, [near]);
  useEffect(() => {
    (map.current?.getSource('assets') as GeoJSONSource | undefined)?.setData(data());
  }, [groups]);
  useEffect(() => () => map.current?.remove(), []);
  return (
    <div ref={ref} class="ph-map-wrap">
      <div ref={el} class="ph-map ph-map-small" role="region" aria-label="Map of the assets listed below; your lot is the blue dot" />
      {failed && <p class="ph-small" style="padding:8px">The map couldn't load; the lists below still work.</p>}
    </div>
  );
}

export default function NeighborhoodAssets() {
  const project = useProject();
  const lot = project.lot;
  const [radius, setRadius] = useState(1320);
  const [groups, setGroups] = useState<AssetGroup[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setGroups(null);
    setError(null);
    if (!lot) return;
    const ctrl = new AbortController();
    nearbyAssets(lot, radius, { signal: ctrl.signal })
      .then(setGroups)
      .catch((e) => e?.code !== 'aborted' && setError(e?.message ?? "Couldn't load the City's lists right now."));
    return () => ctrl.abort();
  }, [lot?.address, radius, tick]);

  if (!lot)
    return (
      <div class="ph ph-assets-empty">
        <p>
          Look up your lot first — then this lists the community organizations, schools, libraries, parks, gardens, public art and
          historic places around it.
        </p>
        <LotLookup mode="primary" />
      </div>
    );

  const saved = (id: AssetCategoryId) => {
    const v = project.fields[assetFieldId(id)];
    return Array.isArray(v) ? (v as string[]) : [];
  };
  const toggle = (id: AssetCategoryId, a: Asset, on: boolean) => {
    const line = assetLine(a);
    const cur = (getField(assetFieldId(id)) as string[] | undefined) ?? [];
    setField(assetFieldId(id), on ? [...cur.filter((x) => x !== line), line] : cur.filter((x) => x !== line));
  };

  return (
    <div class="ph ph-assets-widget" ref={rootRef}>
      <div class="ph-basemap-controls">
        <label>
          Search within{' '}
          <select value={String(radius)} onChange={(e) => setRadius(Number((e.target as HTMLSelectElement).value))}>
            <option value="1320">¼ mile (a 5-minute walk)</option>
            <option value="2640">½ mile (a 10-minute walk)</option>
          </select>
        </label>
        <span class="ph-small">
          Around <strong>{titleCase(lot.address)}</strong> · <a href={u('lot/')}>change lot</a>
        </span>
      </div>

      {error && (
        <div class="ph-error" role="alert">
          <p>{error}</p>
          <button class="btn btn-small" type="button" onClick={() => setTick(tick + 1)}>
            Try again
          </button>
        </div>
      )}
      {!groups && !error && (
        <p class="ph-status">
          <span class="ph-spinner" aria-hidden="true" />
          Looking up what's around your lot…
        </p>
      )}

      {groups && (
        <>
          <AssetsMap lot={lot} groups={groups} radiusFt={radius} />
          {LISTS.map((list) => (
            <section aria-label={list}>
              <p class="ph-workbook-list">{list}</p>
              <div class="ph-assets" style="margin-top:12px">
                {groups
                  .filter((g) => g.workbookList === list)
                  .map((g) => {
                    const chosen = saved(g.id);
                    return (
                      <div class="ph-asset-group">
                        <h4>
                          <span class="ph-dot" style={`background:${COLORS[g.id]}`} aria-hidden="true" />
                          {g.label}
                          {chosen.length > 0 && <span class="ph-small" style="margin-left:auto;text-transform:none;letter-spacing:0">{chosen.length} on your list</span>}
                        </h4>
                        {g.note && <p class="ph-small" style="margin:0 0 6px">{g.note}</p>}
                        {g.error ? (
                          <p class="ph-small">{g.error}</p>
                        ) : g.items.length === 0 ? (
                          <p class="ph-small">None found nearby in City data.</p>
                        ) : (
                          <ul>
                            {g.items.map((a) => {
                              const on = chosen.includes(assetLine(a));
                              return (
                                <li>
                                  <label>
                                    <input type="checkbox" checked={on} onChange={(e) => toggle(g.id, a, (e.target as HTMLInputElement).checked)} />
                                    <span>
                                      <strong>{a.name}</strong>
                                      {a.address ? ` — ${a.address}` : ''}
                                      {a.detail && (
                                        <>
                                          <br />
                                          <small class="ph-small">{a.detail}</small>
                                        </>
                                      )}
                                      {(a.email || a.phone || a.url) && (
                                        <>
                                          <br />
                                          <small class="ph-small">
                                            {a.email && <a href={`mailto:${a.email}`}>{a.email}</a>}
                                            {a.email && (a.phone || a.url) ? ' · ' : ''}
                                            {a.phone && <a href={`tel:${a.phone.replace(/[^\d+]/g, '')}`}>{a.phone}</a>}
                                            {a.phone && a.url ? ' · ' : ''}
                                            {a.url && (
                                              <a href={a.url} target="_blank" rel="noopener">
                                                website ↗
                                              </a>
                                            )}
                                          </small>
                                        </>
                                      )}
                                    </span>
                                    <span class="ph-asset-dist">{a.distanceFt === 0 ? (g.id === 'rcos' || g.id === 'council' ? '' : 'here') : distance(a.distanceFt)}</span>
                                  </label>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                        <p class="ph-small" style="margin:4px 0 0">
                          Source:{' '}
                          <a href={g.source.url} target="_blank" rel="noopener">
                            {g.source.label} ↗
                          </a>
                        </p>
                      </div>
                    );
                  })}
              </div>
            </section>
          ))}
          <p class="ph-small">
            The workbook also asks about churches, block captains, cultural groups, businesses and the places people like to meet — the
            City's data doesn't list those, so add them yourself.
          </p>
        </>
      )}
    </div>
  );
}
