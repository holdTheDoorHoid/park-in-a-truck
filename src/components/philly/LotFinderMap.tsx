/** @jsxImportSource preact */
// LotFinderMap — "walk the neighborhood" on a map: the City's vacant-land list
// coloured public vs private, your lot and your list highlighted. Click a lot
// for owner and size, then "Use this as my park lot" or "Add to my list".

import { render, type VNode } from 'preact';
import type { Feature, FeatureCollection } from 'geojson';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { Map as MLMap, GeoJSONSource, MapLayerMouseEvent } from 'maplibre-gl';
import type { LotRecord, LngLat } from '../../lib/types';
import { addCandidate } from '../../lib/project';
import { fetchVacantLots } from '../../lib/philly/vacant';
import { lookupLot, type LotQuery } from '../../lib/philly/lookup';
import { chooseLot } from '../../lib/philly/choose';
import { PhillyError, type AddressSuggestion, type BBox, type VacantLotProps } from '../../lib/philly/types';
import { OWNER_TYPE_LABEL } from '../../lib/philly/owner';
import { sqft, titleCase, zoningPlain } from '../../lib/philly/plain';
import AddressSearch from './AddressSearch';
import LotCard from './LotCard';
import { useNearViewport, useProject } from './hooks';
import { addAerial, createMap, setAerial } from './maplibre';

const MIN_ZOOM = 16;
const PUBLIC = '#00A8E8';
const PRIVATE = '#F05A28';

type FC = FeatureCollection;
const emptyFC: FC = { type: 'FeatureCollection', features: [] };

function myLotsFC(lot: LotRecord | null, candidates: LotRecord[]): FC {
  const feats: Feature[] = [];
  for (const c of candidates) {
    if (lot && c.address === lot.address) continue;
    if (c.polygon.length >= 3)
      feats.push({ type: 'Feature', properties: { kind: 'candidate', address: c.address }, geometry: { type: 'Polygon', coordinates: [[...c.polygon, c.polygon[0]!]] } });
  }
  if (lot && lot.polygon.length >= 3)
    feats.push({ type: 'Feature', properties: { kind: 'chosen', address: lot.address }, geometry: { type: 'Polygon', coordinates: [[...lot.polygon, lot.polygon[0]!]] } });
  return { type: 'FeatureCollection', features: feats };
}

/** Popup body for a vacant lot (rendered with Preact into the MapLibre popup). */
function VacantPopup({ p, onDetails }: { p: VacantLotProps; onDetails: (opa: string, then?: 'use' | 'list') => Promise<string> }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const act = async (then?: 'use' | 'list') => {
    if (!p.opa) return;
    setBusy(true);
    setMsg(then ? 'Checking City records…' : null);
    try {
      setMsg(await onDetails(p.opa, then));
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div class="ph-popup">
      <strong>{titleCase(p.address)}</strong>
      <span>{p.owner ? titleCase(p.owner) : 'Owner not listed'}</span>
      <br />
      <small>{OWNER_TYPE_LABEL[p.ownerType]}</small>
      <br />
      <small>
        {sqft(p.areaSqFt)}
        {p.zoning ? ` · ${zoningPlain(p.zoning)}` : ''}
      </small>
      <div class="ph-actions">
        <button class="btn btn-small btn-primary" type="button" disabled={busy || !p.opa} onClick={() => act('use')}>
          Use this as my park lot
        </button>
        <button class="btn btn-small" type="button" disabled={busy || !p.opa} onClick={() => act('list')}>
          + Add to my list
        </button>
        <button class="btn btn-small" type="button" disabled={busy || !p.opa} onClick={() => act()}>
          Details
        </button>
      </div>
      {msg && <p class="ph-small" role="status">{msg}</p>}
    </div>
  );
}

function SpotPopup({ onLook }: { onLook: () => void }) {
  return (
    <div class="ph-popup">
      <span>Not on the City's vacant-land list.</span>
      <div class="ph-actions">
        <button class="btn btn-small" type="button" onClick={onLook}>
          Look up this property
        </button>
      </div>
    </div>
  );
}

export default function LotFinderMap({ height }: { height?: string }) {
  const project = useProject();
  const [wrapRef, near] = useNearViewport<HTMLDivElement>();
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const mlRef = useRef<typeof import('maplibre-gl') | null>(null);
  const [ready, setReady] = useState(false);
  const [zoom, setZoom] = useState(12);
  const [aerial, setAerialOn] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [detail, setDetail] = useState<LotRecord | null>(null);
  const [detailBusy, setDetailBusy] = useState(false);
  const [detailError, setDetailError] = useState<PhillyError | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const fetchCtrl = useRef<AbortController | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  // --- create the map when it scrolls into view ---------------------------------------
  useEffect(() => {
    if (!near || mapRef.current || !mapEl.current) return;
    let cancelled = false;
    const lot = project.lot ?? project.candidates[0] ?? null;
    const center: [number, number] | undefined = lot ? [lot.lng, lot.lat] : undefined;
    createMap(mapEl.current, { center, zoom: lot ? 17.5 : 12 })
      .then(({ ml, map }) => {
        if (cancelled) return map.remove();
        mlRef.current = ml;
        mapRef.current = map;
        if (import.meta.env.DEV) (window as unknown as { __phLotFinderMap?: MLMap }).__phLotFinderMap = map;
        map.addControl(new ml.NavigationControl({ showCompass: false }), 'top-right');
        map.addControl(new ml.ScaleControl({ unit: 'imperial' }), 'bottom-left');
        addAerial(map, false);
        map.addSource('vacant', { type: 'geojson', data: emptyFC });
        map.addSource('mylots', { type: 'geojson', data: myLotsFC(project.lot, project.candidates) });
        map.addLayer({
          id: 'vacant-fill',
          type: 'fill',
          source: 'vacant',
          paint: { 'fill-color': ['case', ['get', 'isPublic'], PUBLIC, PRIVATE], 'fill-opacity': 0.45 },
        });
        map.addLayer({
          id: 'vacant-line',
          type: 'line',
          source: 'vacant',
          paint: { 'line-color': ['case', ['get', 'isPublic'], '#00709C', '#A63A12'], 'line-width': 1 },
        });
        map.addLayer({
          id: 'mylots-fill',
          type: 'fill',
          source: 'mylots',
          paint: { 'fill-color': '#111', 'fill-opacity': ['case', ['==', ['get', 'kind'], 'chosen'], 0.25, 0.08] },
        });
        map.addLayer({
          id: 'mylots-line-candidate',
          type: 'line',
          source: 'mylots',
          filter: ['==', ['get', 'kind'], 'candidate'],
          paint: { 'line-color': '#111', 'line-width': 2.5, 'line-dasharray': [2, 1.5] },
        });
        map.addLayer({
          id: 'mylots-line-chosen',
          type: 'line',
          source: 'mylots',
          filter: ['==', ['get', 'kind'], 'chosen'],
          paint: { 'line-color': '#111', 'line-width': 4 },
        });
        map.on('mouseenter', 'vacant-fill', () => (map.getCanvas().style.cursor = 'pointer'));
        map.on('mouseleave', 'vacant-fill', () => (map.getCanvas().style.cursor = ''));
        map.on('click', onClick);
        let t: ReturnType<typeof setTimeout> | undefined;
        map.on('moveend', () => {
          setZoom(map.getZoom());
          clearTimeout(t);
          t = setTimeout(loadVacant, 350);
        });
        setZoom(map.getZoom());
        setReady(true);
        loadVacant();
      })
      .catch(() => setMapError("The map couldn't load (the basemap service may be unreachable). You can still look lots up by address."));
    return () => {
      cancelled = true;
    };
  }, [near]);

  useEffect(() => () => mapRef.current?.remove(), []);

  // --- keep "my lots" in step with the saved project -------------------------------------
  useEffect(() => {
    const src = mapRef.current?.getSource('mylots') as GeoJSONSource | undefined;
    src?.setData(myLotsFC(project.lot, project.candidates));
  }, [ready, project.lot, project.candidates]);

  useEffect(() => {
    if (mapRef.current) setAerial(mapRef.current, aerial);
  }, [aerial, ready]);

  async function loadVacant() {
    const map = mapRef.current;
    if (!map) return;
    if (map.getZoom() < MIN_ZOOM) {
      setNote('Zoom in to see vacant lots');
      return;
    }
    const b = map.getBounds();
    const bbox: BBox = [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()];
    fetchCtrl.current?.abort();
    const ctrl = new AbortController();
    fetchCtrl.current = ctrl;
    setNote('Loading vacant lots…');
    try {
      const fc = await fetchVacantLots(bbox, { signal: ctrl.signal });
      if (ctrl.signal.aborted) return;
      (map.getSource('vacant') as GeoJSONSource).setData(fc as unknown as FC);
      setNote(fc.truncated ? 'Zoom in to see every vacant lot here' : fc.features.length ? null : 'No lots on the City vacant list here');
    } catch (e) {
      if ((e as PhillyError).code === 'aborted' || ctrl.signal.aborted) return;
      setNote("Couldn't load vacant lots — the City map service may be busy");
    }
  }

  // --- details / actions ------------------------------------------------------------------
  async function showDetails(q: LotQuery, then?: 'use' | 'list'): Promise<string> {
    setDetailBusy(true);
    setDetailError(null);
    setFlash(null);
    try {
      const lot = await lookupLot(q);
      setDetail(lot);
      if (then === 'use') {
        chooseLot(lot);
        setFlash(`${titleCase(lot.address)} is now your park lot.`);
        return '✓ Saved as your park lot';
      }
      if (then === 'list') {
        addCandidate(lot);
        setFlash(`Added ${titleCase(lot.address)} to your list.`);
        return '✓ Added to your list';
      }
      setTimeout(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
      return 'Details are below the map.';
    } catch (e) {
      const err = e instanceof PhillyError ? e : new PhillyError('city-down', 'Something went wrong. Try again in a minute.');
      setDetailError(err);
      throw err;
    } finally {
      setDetailBusy(false);
    }
  }

  function popupAt(lngLat: [number, number], node: VNode) {
    const ml = mlRef.current!;
    const div = document.createElement('div');
    render(node, div);
    const pop = new ml.Popup({ maxWidth: '300px', closeButton: true }).setLngLat(lngLat).setDOMContent(div).addTo(mapRef.current!);
    pop.on('close', () => render(null, div));
  }

  function onClick(e: MapLayerMouseEvent) {
    const map = mapRef.current!;
    const hit = map.queryRenderedFeatures(e.point, { layers: ['vacant-fill'] })[0];
    const ll: [number, number] = [e.lngLat.lng, e.lngLat.lat];
    if (hit) {
      popupAt(ll, <VacantPopup p={hit.properties as unknown as VacantLotProps} onDetails={(opa, then) => showDetails({ opa }, then)} />);
    } else if (map.getZoom() >= 17) {
      popupAt(ll, <SpotPopup onLook={() => showDetails({ lngLat: ll as LngLat }).catch(() => undefined)} />);
    }
  }

  function goTo(s: AddressSuggestion | string) {
    const map = mapRef.current;
    if (typeof s !== 'string' && s.lngLat && map) map.flyTo({ center: s.lngLat, zoom: s.kind === 'intersection' ? 17.5 : 18.5 });
    if (typeof s !== 'string' && s.kind === 'intersection') return;
    showDetails(s)
      .then(() => undefined)
      .catch(() => undefined);
  }

  // when a looked-up lot arrives, centre on it
  useEffect(() => {
    if (detail && mapRef.current) mapRef.current.flyTo({ center: [detail.lng, detail.lat], zoom: Math.max(mapRef.current.getZoom(), 18) });
  }, [detail]);

  function nearMe() {
    if (!navigator.geolocation) return setNote('This browser cannot share its location.');
    setNote('Finding you…');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setNote(null);
        mapRef.current?.flyTo({ center: [pos.coords.longitude, pos.coords.latitude], zoom: 17 });
      },
      () => setNote('Location not shared — search for an address instead.'),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  const showNote = note ?? (ready && zoom < MIN_ZOOM ? 'Zoom in to see vacant lots' : null);

  return (
    <div class="ph ph-finder" ref={wrapRef}>
      <div class="ph-map-bar">
        <AddressSearch label="Go to an address or corner" buttonLabel="Go" hint="" busy={detailBusy} onPick={goTo} />
        <button class="btn" type="button" onClick={nearMe} disabled={!ready}>
          📍 Near me
        </button>
        <button class="btn" type="button" aria-pressed={aerial} onClick={() => setAerialOn(!aerial)} disabled={!ready}>
          {aerial ? 'Street map' : 'Aerial photo'}
        </button>
      </div>
      <div class="ph-map-wrap">
        {showNote && <div class="ph-map-note">{showNote}</div>}
        <div
          ref={mapEl}
          class="ph-map"
          style={height ? `height:${height}` : undefined}
          role="region"
          aria-label="Map of vacant land. Click a coloured lot to see its owner and size."
        />
        {mapError && (
          <div class="ph-error" style="position:absolute;inset:auto 10px 10px 10px">
            {mapError}
          </div>
        )}
      </div>
      <div class="ph-legend" aria-label="Map legend">
        <span>
          <span class="ph-swatch" style={`background:${PUBLIC};opacity:.7`} />
          Vacant — public owner
        </span>
        <span>
          <span class="ph-swatch" style={`background:${PRIVATE};opacity:.7`} />
          Vacant — private owner
        </span>
        <span>
          <span class="ph-swatch" style="border-color:#111;border-width:3px" />
          Your park lot
        </span>
        <span>
          <span class="ph-swatch" style="border:2px dashed #111" />
          Your list
        </span>
        <span class="ph-small">Vacant lots appear when you zoom in close. Source: City of Philadelphia vacant-land list.</span>
      </div>

      <div ref={detailRef} aria-live="polite">
        {detailBusy && (
          <p class="ph-status">
            <span class="ph-spinner" aria-hidden="true" />
            Checking City records…
          </p>
        )}
        {flash && <p class="ph-status ph-saved">✓ {flash}</p>}
        {detailError && (
          <div class="ph-error" role="alert">
            <p>{detailError.message}</p>
            {detailError.suggestions.length > 0 && (
              <div class="ph-chips">
                {detailError.suggestions.map((s) => (
                  <button class="ph-chip" type="button" onClick={() => goTo(s)}>
                    {titleCase(s.label)}
                    {s.owner ? <small> · {titleCase(s.owner)}</small> : null}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {detail && !detailBusy && (
          <LotCard
            lot={detail}
            actions={
              <>
                {project.lot?.address === detail.address ? (
                  <span class="ph-saved">✓ This is your park lot</span>
                ) : (
                  <button
                    class="btn btn-primary"
                    type="button"
                    onClick={() => {
                      chooseLot(detail);
                      setFlash(`${titleCase(detail.address)} is now your park lot.`);
                    }}
                  >
                    Use this as my park lot
                  </button>
                )}
                {project.candidates.some((c) => c.address === detail.address) ? (
                  <span class="ph-saved">✓ On your list</span>
                ) : (
                  <button
                    class="btn"
                    type="button"
                    onClick={() => {
                      addCandidate(detail);
                      setFlash(`Added ${titleCase(detail.address)} to your list.`);
                    }}
                  >
                    + Add to my list
                  </button>
                )}
              </>
            }
          />
        )}
      </div>
    </div>
  );
}
