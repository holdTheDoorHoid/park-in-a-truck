/** @jsxImportSource preact */
// LotFinderMap — "walk the neighborhood" on a map: the City's vacant-land list
// coloured by owner and by the Land Bank's own status, your lot and your list
// highlighted. Click a lot (or pick it from the list under the map — the keyboard
// way) for owner and size, then "Use this as my park lot" or "Add to my list".
// A street name with no house number offers that street's blocks.

import { render, type VNode } from 'preact';
import type { Feature, FeatureCollection } from 'geojson';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { Map as MLMap, GeoJSONSource, MapLayerMouseEvent } from 'maplibre-gl';
import type { LotRecord, LngLat } from '../../lib/types';
import { addCandidate } from '../../lib/project';
import { fetchVacantLots } from '../../lib/philly/vacant';
import { lookupLot, type LotQuery } from '../../lib/philly/lookup';
import { chooseLot } from '../../lib/philly/choose';
import { blockLabel, findStreet, looksLikeStreetOnly, type StreetBlock, type StreetMatch } from '../../lib/philly/streets';
import { landBankLine } from '../../lib/philly/landbank';
import { distanceFt } from '../../lib/philly/geo';
import { PhillyError, type AddressSuggestion, type BBox, type VacantLotFeature, type VacantLotProps } from '../../lib/philly/types';
import { agencyName, agencyOf, classifyOwner, ownerTypeLabel } from '../../lib/philly/owner';
import { sqft, titleCase, zoningPlain } from '../../lib/philly/plain';
import { isolate, words, type PhillyKey } from '../../lib/philly/words';
import AddressSearch from './AddressSearch';
import LotCard from './LotCard';
import SaveToggle from './SaveToggle';
import { useNearViewport, useProject } from './hooks';
import { addAerial, createMap, setAerial } from './maplibre';

const MIN_ZOOM = 16;
/** Map colours by VacantLotProps.mapClass (fill, outline). Words in the legend and list say the same. */
const CLASS_STYLE: Record<VacantLotProps['mapClass'], { fill: string; line: string; label: PhillyKey }> = {
  'lb-available': { fill: '#00A8E8', line: '#00709C', label: 'legend.lbAvailable' },
  'lb-other': { fill: '#7D8B95', line: '#3E4A52', label: 'legend.lbOther' },
  agency: { fill: '#0B4A6B', line: '#062B3E', label: 'legend.agency' },
  public: { fill: '#00A8E8', line: '#00709C', label: 'legend.public' },
  private: { fill: '#F05A28', line: '#A63A12', label: 'legend.private' },
};
const LIST_STEP = 10;

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

/** "City of Philadelphia" / "Private owner" for one vacant lot, in a few words. */
function ownerShort(p: VacantLotProps): string {
  const t = words();
  if (!p.isPublic) return t('badge.private');
  if (p.ownerType === 'other-public') {
    const label = classifyOwner([p.owner]).label;
    const id = agencyOf(label);
    // names stay names: "SEPTA", "Amtrak", "Philadelphia Gas Works" without the words in brackets
    if (id === 'septa' || id === 'amtrak' || id === 'pgw') return label.replace(/ \((regional transit|federal railroad|City-owned utility)\)$/, '');
    return agencyName(label);
  }
  if (p.ownerType === 'pha') return t('agency.phaShort');
  if (p.ownerType === 'city' || p.ownerType === 'landbank' || p.ownerType === 'redevelopment') return t(`agency.${p.ownerType}`);
  return ownerTypeLabel(p.ownerType);
}

function centroid(f: VacantLotFeature): LngLat {
  const ring = f.geometry.coordinates[0]!;
  const n = Math.max(1, ring.length - 1);
  let x = 0;
  let y = 0;
  for (let i = 0; i < n; i++) {
    x += ring[i]![0];
    y += ring[i]![1];
  }
  return [x / n, y / n];
}

/** Popup body for a vacant lot (rendered with Preact into the MapLibre popup). */
function VacantPopup({ p, onDetails }: { p: VacantLotProps; onDetails: (opa: string, then?: 'use' | 'list') => Promise<string> }) {
  const t = words();
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const act = async (then?: 'use' | 'list') => {
    if (!p.opa) return;
    setBusy(true);
    setMsg(then ? t('popup.checking') : null);
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
      <strong>{isolate(titleCase(p.address), t)}</strong>
      <span>{p.owner ? isolate(titleCase(p.owner), t) : t('popup.ownerMissing')}</span>
      <br />
      <small>{ownerTypeLabel(p.ownerType)}</small>
      {p.landBank && (
        <>
          <br />
          <small>
            {t('landBank.prefix')} <span class={`ph-lb ph-lb-${p.landBank.tone}`}>{landBankLine(p.landBank)}</span>
          </small>
        </>
      )}
      <br />
      <small>
        {sqft(p.areaSqFt)}
        {p.zoning ? ` · ${zoningPlain(p.zoning)}` : ''}
      </small>
      <div class="ph-actions">
        <button class="btn btn-small btn-primary" type="button" disabled={busy || !p.opa} onClick={() => act('use')}>
          {t('action.use')}
        </button>
        <button class="btn btn-small" type="button" disabled={busy || !p.opa} onClick={() => act('list')}>
          {t('action.add')}
        </button>
        <button class="btn btn-small" type="button" disabled={busy || !p.opa} onClick={() => act()}>
          {t('popup.details')}
        </button>
      </div>
      {msg && <p class="ph-small" role="status">{msg}</p>}
    </div>
  );
}

function SpotPopup({ onLook }: { onLook: () => void }) {
  const t = words();
  return (
    <div class="ph-popup">
      <span>{t('popup.notVacant')}</span>
      <div class="ph-actions">
        <button class="btn btn-small" type="button" onClick={onLook}>
          {t('popup.lookUp')}
        </button>
      </div>
    </div>
  );
}

export default function LotFinderMap({ height }: { height?: string }) {
  const t = words();
  const project = useProject();
  const [wrapRef, near] = useNearViewport<HTMLDivElement>();
  const [forced, setForced] = useState(false);
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
  const [found, setFound] = useState<string | null>(null);
  const [street, setStreet] = useState<{ q: string; matches: StreetMatch[] } | null>(null);
  const [streetMsg, setStreetMsg] = useState<string | null>(null);
  const [lbLoaded, setLbLoaded] = useState(true);
  const [inView, setInView] = useState<VacantLotFeature[] | null>(null);
  const [listMax, setListMax] = useState(LIST_STEP);
  const fetchCtrl = useRef<AbortController | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const loaded = useRef(new Map<string, VacantLotFeature>());
  const lastFC = useRef<VacantLotFeature[]>([]);

  // --- create the map when it scrolls into view (or gets keyboard focus) ----------------
  useEffect(() => {
    if (!(near || forced) || mapRef.current || !mapEl.current) return;
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
        map.getCanvas().setAttribute('aria-label', t('map.canvas'));
        addAerial(map, false);
        map.addSource('vacant', { type: 'geojson', data: emptyFC });
        map.addSource('mylots', { type: 'geojson', data: myLotsFC(project.lot, project.candidates) });
        const byClass = (k: 'fill' | 'line') =>
          ['match', ['get', 'mapClass'], ...Object.entries(CLASS_STYLE).flatMap(([c, s]) => [c, s[k]]), CLASS_STYLE.private[k]] as never;
        map.addLayer({ id: 'vacant-fill', type: 'fill', source: 'vacant', paint: { 'fill-color': byClass('fill'), 'fill-opacity': 0.5 } });
        map.addLayer({
          id: 'vacant-line',
          type: 'line',
          source: 'vacant',
          filter: ['!=', ['get', 'mapClass'], 'lb-other'],
          paint: { 'line-color': byClass('line'), 'line-width': 1 },
        });
        // on hold / in process / not available: a dashed edge, so it isn't told apart by colour alone
        map.addLayer({
          id: 'vacant-line-dash',
          type: 'line',
          source: 'vacant',
          filter: ['==', ['get', 'mapClass'], 'lb-other'],
          paint: { 'line-color': CLASS_STYLE['lb-other'].line, 'line-width': 1.5, 'line-dasharray': [2, 1.5] },
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
        let timer: ReturnType<typeof setTimeout> | undefined;
        map.on('moveend', () => {
          setZoom(map.getZoom());
          clearTimeout(timer);
          timer = setTimeout(loadVacant, 350);
        });
        setZoom(map.getZoom());
        setReady(true);
        // keyboard focus was on the placeholder: hand it to the map itself
        if (document.activeElement === mapEl.current) map.getCanvas().focus();
        loadVacant();
      })
      .catch(() => setMapError(t('map.failed')));
    return () => {
      cancelled = true;
    };
  }, [near, forced]);

  useEffect(() => () => mapRef.current?.remove(), []);

  // --- keep "my lots" in step with the saved project -------------------------------------
  useEffect(() => {
    const src = mapRef.current?.getSource('mylots') as GeoJSONSource | undefined;
    src?.setData(myLotsFC(project.lot, project.candidates));
  }, [ready, project.lot, project.candidates]);

  useEffect(() => {
    if (mapRef.current) setAerial(mapRef.current, aerial);
  }, [aerial, ready]);

  /** The loaded lots inside the current view, nearest the middle first. */
  function refreshList() {
    const map = mapRef.current;
    if (!map) return;
    if (map.getZoom() < MIN_ZOOM) {
      setInView(null);
      return;
    }
    const b = map.getBounds();
    const c = map.getCenter();
    const mid: LngLat = [c.lng, c.lat];
    const rows = lastFC.current
      .map((f) => ({ f, at: centroid(f) }))
      .filter(({ at }) => at[0] >= b.getWest() && at[0] <= b.getEast() && at[1] >= b.getSouth() && at[1] <= b.getNorth())
      .map(({ f, at }) => ({ f, d: distanceFt(mid, at) }))
      .sort((a, z) => a.d - z.d)
      .map(({ f }) => f);
    setInView(rows);
    setListMax(LIST_STEP);
  }

  async function loadVacant() {
    const map = mapRef.current;
    if (!map) return;
    if (map.getZoom() < MIN_ZOOM) {
      setNote(t('map.zoomIn'));
      setInView(null);
      return;
    }
    const b = map.getBounds();
    const bbox: BBox = [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()];
    fetchCtrl.current?.abort();
    const ctrl = new AbortController();
    fetchCtrl.current = ctrl;
    setNote(t('map.loading'));
    try {
      const fc = await fetchVacantLots(bbox, { signal: ctrl.signal });
      if (ctrl.signal.aborted) return;
      lastFC.current = fc.features;
      for (const f of fc.features) if (f.properties.opa) loaded.current.set(f.properties.opa, f);
      // MapLibre keeps flat properties only; the full record stays in `loaded` for popups and the list
      const flat: FC = {
        type: 'FeatureCollection',
        features: fc.features.map((f) => ({ ...f, properties: { ...f.properties, landBank: null } })) as unknown as Feature[],
      };
      (map.getSource('vacant') as GeoJSONSource).setData(flat);
      setLbLoaded(fc.landBankLoaded !== false);
      setNote(fc.truncated ? t('map.zoomInAll') : fc.features.length ? null : t('map.noneHere'));
      refreshList();
    } catch (e) {
      if ((e as PhillyError).code === 'aborted' || ctrl.signal.aborted) return;
      setNote(t('map.loadError'));
    }
  }

  // --- details / actions ------------------------------------------------------------------
  async function showDetails(q: LotQuery, then?: 'use' | 'list', opts: { focus?: boolean } = {}): Promise<string> {
    setDetailBusy(true);
    setDetailError(null);
    setFlash(null);
    setFound(null);
    try {
      const lot = await lookupLot(q);
      setDetail(lot);
      if (then === 'use') {
        chooseLot(lot);
        setFlash(t('lookup.nowYourLot', { address: isolate(titleCase(lot.address), t) }));
        return t('popup.saved');
      }
      if (then === 'list') {
        addCandidate(lot);
        setFlash(t('finder.added', { address: isolate(titleCase(lot.address), t) }));
        return t('popup.added');
      }
      setFound(isolate(titleCase(lot.address), t));
      setTimeout(() => {
        detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        if (opts.focus) detailRef.current?.querySelector<HTMLElement>('.ph-card-title')?.focus();
      }, 50);
      return t('popup.below');
    } catch (e) {
      const err = e instanceof PhillyError ? e : new PhillyError('city-down', t('error.genericShort'));
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
      const flat = hit.properties as unknown as VacantLotProps;
      const p = (flat.opa && loaded.current.get(String(flat.opa))?.properties) || { ...flat, landBank: null };
      popupAt(ll, <VacantPopup p={p} onDetails={(opa, then) => showDetails({ opa }, then)} />);
    } else if (map.getZoom() >= 17) {
      popupAt(ll, <SpotPopup onLook={() => showDetails({ lngLat: ll as LngLat }).catch(() => undefined)} />);
    }
  }

  function flyToBox(b: BBox, minZoom = MIN_ZOOM + 0.5) {
    const map = mapRef.current;
    if (!map) return;
    const cam = map.cameraForBounds(
      [
        [b[0], b[1]],
        [b[2], b[3]],
      ],
      { padding: 50, maxZoom: 18.5 },
    );
    const center = cam?.center ?? [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2];
    map.flyTo({ center: center as [number, number], zoom: Math.max(minZoom, cam?.zoom ?? 17.5) });
  }

  function goBlock(name: string, block: StreetBlock) {
    flyToBox(block.bbox);
    setStreetMsg(
      block.hundred === 0
        ? t('street.showingFirst', { street: isolate(titleCase(name), t) })
        : t('street.showingBlock', { hundred: String(block.hundred), street: isolate(titleCase(name), t) }),
    );
  }

  async function goStreet(q: string) {
    setStreet(null);
    setStreetMsg(null);
    setDetailError(null);
    setFlash(null);
    setFound(null);
    setDetailBusy(true);
    try {
      const matches = await findStreet(q);
      if (!matches.length) {
        setDetailError(new PhillyError('not-found', t('street.notFound', { street: isolate(q, t) })));
        return;
      }
      const one = matches.length === 1 ? matches[0]! : null;
      if (one && one.blocks.length === 1) {
        setStreet({ q, matches });
        goBlock(one.name, one.blocks[0]!);
        return;
      }
      setStreet({ q, matches });
    } catch (e) {
      setDetailError(e instanceof PhillyError ? e : new PhillyError('city-down', t('error.genericShort')));
    } finally {
      setDetailBusy(false);
    }
  }

  async function pickStreetName(name: string) {
    await goStreet(name);
  }

  function goTo(s: AddressSuggestion | string) {
    const map = mapRef.current;
    setStreet(null);
    setStreetMsg(null);
    if (typeof s === 'string' && looksLikeStreetOnly(s)) {
      void goStreet(s);
      return;
    }
    if (typeof s !== 'string' && s.lngLat && map) map.flyTo({ center: s.lngLat, zoom: s.kind === 'intersection' ? 17.5 : 18.5 });
    if (typeof s !== 'string' && s.kind === 'intersection') {
      setFound(null);
      setStreetMsg(t('street.showingCorner', { corner: isolate(titleCase(s.label), t) }));
      return;
    }
    showDetails(s)
      .then(() => undefined)
      .catch(() => undefined);
  }

  // when a looked-up lot arrives, centre on it — unless it is already in view up close
  // (picked from the map or the list: moving would reshuffle the list under the person)
  useEffect(() => {
    const map = mapRef.current;
    if (!detail || !map) return;
    const b = map.getBounds();
    const inside = detail.lng > b.getWest() && detail.lng < b.getEast() && detail.lat > b.getSouth() && detail.lat < b.getNorth();
    if (inside && map.getZoom() >= 17) return;
    map.flyTo({ center: [detail.lng, detail.lat], zoom: Math.max(map.getZoom(), 18) });
  }, [detail]);

  function nearMe() {
    if (!navigator.geolocation) return setNote(t('map.noGeo'));
    setNote(t('map.finding'));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setNote(null);
        mapRef.current?.flyTo({ center: [pos.coords.longitude, pos.coords.latitude], zoom: 17 });
      },
      () => setNote(t('map.noLocation')),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  const showNote = note ?? (ready && zoom < MIN_ZOOM ? t('map.zoomIn') : null);
  const one = street?.matches.length === 1 ? street.matches[0]! : null;
  const isListed = (opa: string | null) => Boolean(opa && project.candidates.some((c) => c.opa === opa));
  const legend = lbLoaded ? (['lb-available', 'lb-other', 'agency', 'private'] as const) : (['public', 'private'] as const);

  return (
    <div class="ph ph-finder" ref={wrapRef} id="vacant-map">
      <div class="ph-map-bar">
        <AddressSearch
          label={t('finder.label')}
          placeholder={t('finder.placeholder')}
          hint={t('finder.hint')}
          formLabel={t('finder.form')}
          buttonLabel={t('finder.go')}
          busy={detailBusy}
          onPick={goTo}
        />
        <button class="btn" type="button" onClick={nearMe} disabled={!ready}>
          {t('finder.nearMe')}
        </button>
        <button class="btn" type="button" aria-pressed={aerial} onClick={() => setAerialOn(!aerial)} disabled={!ready}>
          {t(aerial ? 'finder.streetMap' : 'finder.aerial')}
        </button>
      </div>

      {/* Feedback right under the box, where people are looking (novice-phone F1, block-captain F1) */}
      <div class="ph-map-status" aria-live="polite">
        {detailBusy && (
          <p class="ph-status">
            <span class="ph-spinner" aria-hidden="true" />
            {t('finder.checking')}
          </p>
        )}
        {flash && <p class="ph-status ph-saved">✓ {flash}</p>}
        {found && !detailBusy && (
          <p
            class="ph-status"
            dangerouslySetInnerHTML={{ __html: t.html('finder.found', { address: found, href: '#ph-finder-detail' }) }}
            onClick={(e) => {
              if (!(e.target as Element).closest?.('a')) return;
              e.preventDefault();
              detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              detailRef.current?.querySelector<HTMLElement>('.ph-card-title')?.focus();
            }}
          />
        )}
        {street && street.matches.length > 1 && (
          <div class="ph-street-pick">
            <p class="ph-status">{t('street.which', { q: isolate(street.q, t) })}</p>
            <div class="ph-chips">
              {street.matches.map((m) => (
                <button class="ph-chip" type="button" onClick={() => pickStreetName(m.name)}>
                  {isolate(titleCase(m.name), t)}
                </button>
              ))}
            </div>
          </div>
        )}
        {one && one.blocks.length > 1 && (
          <div class="ph-street-pick">
            <p class="ph-status">{t('street.blocks', { street: isolate(titleCase(one.name), t), count: one.blocks.length })}</p>
            <div class="ph-chips ph-chips-scroll" role="group" aria-label={t('street.blocksLabel', { street: titleCase(one.name) })}>
              {one.blocks.map((b) => (
                <button class="ph-chip" type="button" onClick={() => goBlock(one.name, b)}>
                  {blockLabel(b.hundred)}
                </button>
              ))}
            </div>
          </div>
        )}
        {streetMsg && <p class="ph-status">{streetMsg}</p>}
        {detailError && (
          <div class="ph-error" role="alert">
            <p>{detailError.message}</p>
            {detailError.code === 'not-found' && !street && (
              <p class="ph-small">{t('finder.onlyStreet')}</p>
            )}
            {detailError.suggestions.length > 0 && (
              <div class="ph-chips">
                {detailError.suggestions.map((s) => (
                  <button class="ph-chip" type="button" onClick={() => goTo(s)}>
                    {isolate(titleCase(s.label), t)}
                    {s.owner ? <small> · {isolate(titleCase(s.owner), t)}</small> : null}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div class="ph-map-wrap">
        {showNote && <div class="ph-map-note">{showNote}</div>}
        <div
          ref={mapEl}
          class="ph-map"
          style={height ? `height:${height}` : undefined}
          role="region"
          aria-label={t('map.region')}
          // Until the map has loaded, this box holds its place in the tab order (access-keyboard F6);
          // focusing it loads the map and hands focus on to it.
          tabIndex={ready ? -1 : 0}
          onFocus={() => !ready && setForced(true)}
        />
        {!ready && !mapError && (near || forced) && (
          <p class="ph-map-loading" aria-hidden="true">
            {t('map.loadingMap')}
          </p>
        )}
        {mapError && (
          <div class="ph-error" style="position:absolute;inset:auto 10px 10px 10px">
            {mapError}
          </div>
        )}
      </div>
      <div class="ph-legend" aria-label={t('legend.label')}>
        {legend.map((c) => (
          <span>
            <span
              class="ph-swatch"
              style={`background:${CLASS_STYLE[c].fill};opacity:.75;${c === 'lb-other' ? `border:2px dashed ${CLASS_STYLE[c].line}` : ''}`}
            />
            {t(CLASS_STYLE[c].label)}
          </span>
        ))}
        <span>
          <span class="ph-swatch" style="border-color:#111;border-width:3px" />
          {t('badge.yourLot')}
        </span>
        <span>
          <span class="ph-swatch" style="border:2px dashed #111" />
          {t('legend.yourList')}
        </span>
        <span class="ph-small">{t(lbLoaded ? 'legend.note' : 'legend.noteNoLb')}</span>
      </div>

      <div ref={detailRef} id="ph-finder-detail">
        {detail && !detailBusy && (
          <LotCard
            lot={detail}
            titleFocusable
            actions={
              <>
                <SaveToggle
                  primary
                  done={project.lot?.address === detail.address}
                  doneText={t('action.isYourLot')}
                  onClick={() => {
                    chooseLot(detail);
                    setFlash(t('lookup.nowYourLot', { address: isolate(titleCase(detail.address), t) }));
                  }}
                >
                  {t('action.use')}
                </SaveToggle>
                <SaveToggle
                  done={project.candidates.some((c) => c.address === detail.address)}
                  doneText={t('action.onList')}
                  onClick={() => {
                    addCandidate(detail);
                    setFlash(t('finder.added', { address: isolate(titleCase(detail.address), t) }));
                  }}
                >
                  {t('action.add')}
                </SaveToggle>
              </>
            }
          />
        )}
      </div>

      {/* The keyboard (and small-screen) way to pick a lot: the lots on the map, as a list (access-keyboard F5) */}
      <section class="ph-inview" aria-labelledby="ph-inview-h">
        <h3 id="ph-inview-h" class="ph-inview-h">
          {inView ? t('inView.titleCount', { count: inView.length }) : t('inView.title')}
        </h3>
        {!ready ? (
          <p class="ph-small">{t('inView.notReady')}</p>
        ) : !inView ? (
          <p class="ph-small">{t('inView.zoom')}</p>
        ) : inView.length === 0 ? (
          <p class="ph-small">{t('inView.none')}</p>
        ) : (
          <>
            <p class="ph-small">{t('inView.order')}</p>
            <ul class="ph-inview-list">
              {inView.slice(0, listMax).map((f) => {
                const p = f.properties;
                const name = isolate(titleCase(p.address), t) || t('inView.noAddress');
                return (
                  <li key={p.opa ?? String(f.id)}>
                    <span class="ph-swatch" aria-hidden="true" style={`background:${CLASS_STYLE[p.mapClass].fill};opacity:.75`} />
                    <span class="ph-inview-text">
                      <strong>{name}</strong>
                      <br />
                      <small>
                        {ownerShort(p)}
                        {p.landBank ? (
                          <>
                            {` · ${t('landBank.prefix')} `}
                            <span class={`ph-lb ph-lb-${p.landBank.tone}`}>{landBankLine(p.landBank)}</span>
                          </>
                        ) : p.mapClass === 'agency' ? (
                          ` · ${t('inView.notLandBank')}`
                        ) : null}
                        {p.areaSqFt ? ` · ${sqft(p.areaSqFt)}` : ''}
                      </small>
                    </span>
                    <span class="ph-row-actions">
                      <button
                        class="btn btn-small"
                        type="button"
                        disabled={!p.opa || detailBusy}
                        aria-label={t('inView.detailsFor', { name })}
                        onClick={() => p.opa && showDetails({ opa: p.opa }, undefined, { focus: true }).catch(() => undefined)}
                      >
                        {t('popup.details')}
                      </button>
                      <SaveToggle
                        small
                        done={isListed(p.opa)}
                        doneText={t('action.onList')}
                        disabled={!p.opa || detailBusy}
                        label={t('inView.addLabel', { name })}
                        onClick={() => p.opa && showDetails({ opa: p.opa }, 'list').catch(() => undefined)}
                      >
                        {t('action.add')}
                      </SaveToggle>
                    </span>
                  </li>
                );
              })}
            </ul>
            {inView.length > listMax && (
              <button class="btn btn-small" type="button" onClick={() => setListMax(listMax + LIST_STEP)}>
                {t('inView.more', { count: Math.min(LIST_STEP, inView.length - listMax) })}
              </button>
            )}
          </>
        )}
      </section>
    </div>
  );
}
