// nearbyAssets(): the Organize workbook's "Identifying community assets" and
// "Neighborhood assets" lists, pre-filled from City open data around the lot.
//
// Category → City layer (ArcGIS FeatureServer unless noted):
//   Registered Community Organizations → Zoning_RCO (polygons covering the lot)
//   City Council district & member     → AIS council_district_2024 + roster in plain.ts
//   Park friends groups                → PPR_Friends_Groups
//   Schools                            → Schools
//   Libraries                          → library_locations (Free Library branches)
//   Recreation centers & parks         → PPR_Properties
//   Hospitals                          → Hospitals
//   Universities & colleges            → Universities_Colleges (buildings, grouped by school)
//   Community gardens & farms          → Registered_Community_Gardens + PPR_Urban_Agriculture_Projects
//   Murals & public art                → Percent_for_Art_Public + PPR_Art_Monuments_point
//                                        (Mural Arts has no open data feed; we link its map)
//   Historic places                    → Historic_sites_PhilReg + HistoricDistricts_Local
//
// Each category loads on its own; one failing layer leaves an `error` on that group only.

import type { LngLat, LotRecord } from '../types';
import { queryAttrs, queryGeo, type GeoFeature } from './arcgis';
import { LAYERS, links, type LayerName } from './endpoints';
import { distToRing, makeProjector, roundTo, type Projector } from './geo';
import { COUNCIL_AS_OF, COUNCIL_MEMBERS, COUNCIL_PAGES, phone as fmtPhone, titleCase } from './plain';
import type { Asset, AssetCategoryId, AssetGroup } from './types';

type LotLike = Pick<LotRecord, 'lat' | 'lng'> & Partial<Pick<LotRecord, 'polygon' | 'councilDistrict' | 'rcos' | 'address'>>;

export const ASSET_CATEGORIES: { id: AssetCategoryId; label: string; workbookList: AssetGroup['workbookList'] }[] = [
  { id: 'rcos', label: 'Registered Community Organizations', workbookList: 'Citizens associations' },
  { id: 'council', label: 'City Council district', workbookList: 'Citizens associations' },
  { id: 'friends', label: 'Park friends groups', workbookList: 'Citizens associations' },
  { id: 'schools', label: 'Schools', workbookList: 'Local institutions' },
  { id: 'libraries', label: 'Libraries', workbookList: 'Local institutions' },
  { id: 'parks', label: 'Recreation centers & parks', workbookList: 'Local institutions' },
  { id: 'hospitals', label: 'Hospitals', workbookList: 'Local institutions' },
  { id: 'universities', label: 'Universities & colleges', workbookList: 'Local institutions' },
  { id: 'gardens', label: 'Community gardens & farms', workbookList: 'Neighborhood physical assets' },
  { id: 'art', label: 'Murals & public art', workbookList: 'Neighborhood physical assets' },
  { id: 'historic', label: 'Historic places', workbookList: 'Neighborhood physical assets' },
];

/** The field id an asset list is saved under ("organize.assets-schools"). */
export const assetFieldId = (c: AssetCategoryId) => `organize.assets-${c}`;
/** How a chosen asset is written into the saved list (and printed on My park). */
export const assetLine = (a: Asset) => (a.address && !a.name.includes(a.address) ? `${a.name} — ${a.address}` : a.name);

const MAX_PER_GROUP = 25;

function centerOf(lot: LotLike): LngLat {
  const poly = lot.polygon ?? [];
  if (poly.length >= 3) return [poly.reduce((s, p) => s + p[0], 0) / poly.length, poly.reduce((s, p) => s + p[1], 0) / poly.length];
  return [lot.lng, lot.lat];
}

/** Distance (ft) from the lot centre to a point or polygon feature, and a point to put on the map. */
function placeOf(f: GeoFeature, pr: Projector): { lngLat: LngLat | null; distanceFt: number | null } {
  const g = f.geometry as { type: string; coordinates: unknown } | null;
  if (!g) return { lngLat: null, distanceFt: null };
  if (g.type === 'Point') {
    const c = g.coordinates as number[];
    const ll: LngLat = [c[0]!, c[1]!];
    const [x, y] = pr.toXY(ll);
    return { lngLat: ll, distanceFt: roundTo(Math.hypot(x, y), 0) };
  }
  // Multi-part areas (e.g. a thematic historic district made of many streets):
  // distance to the nearest part, marker on that part.
  const polys = g.type === 'Polygon' ? [g.coordinates as number[][][]] : g.type === 'MultiPolygon' ? (g.coordinates as number[][][][]) : [];
  let best: { d: number; ring: LngLat[] } | null = null;
  for (const poly of polys) {
    const ring = (poly[0] ?? []).map((c) => [c[0]!, c[1]!] as LngLat);
    if (ring.length < 3) continue;
    const d = distToRing([0, 0], ring.map(pr.toXY));
    if (!best || d < best.d) best = { d, ring };
  }
  if (!best) return { lngLat: null, distanceFt: null };
  const ring = best.ring;
  const lngLat: LngLat = [ring.reduce((s, p) => s + p[0], 0) / ring.length, ring.reduce((s, p) => s + p[1], 0) / ring.length];
  return { lngLat, distanceFt: roundTo(best.d, 0) };
}

const s = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
const url = (v: unknown) => {
  const t = s(v);
  if (!t) return undefined;
  const first = t.split(/[\s,;]+/)[0]!;
  return /^https?:\/\//i.test(first) ? first : /^[\w-]+(\.[\w-]+)+/.test(first) ? `https://${first}` : undefined;
};

interface LayerSpec {
  layer: LayerName;
  fields: string[];
  where?: string;
  /**
   * Fetch the whole (small) layer and filter by distance here. Needed for
   * Hospitals: its State Plane features come back empty from any spatial query
   * that also returns geometry (checked 2026-10-04), though counts work.
   */
  wholeLayer?: boolean;
  /** max features to ask for (default 60); campuses have hundreds of buildings */
  limit?: number;
  map: (p: Record<string, unknown>) => Omit<Asset, 'id' | 'lngLat' | 'distanceFt'> | null;
}

async function layerAssets(spec: LayerSpec, center: LngLat, radiusFt: number, pr: Projector, signal?: AbortSignal): Promise<Asset[]> {
  const { features } = await queryGeo(
    spec.layer,
    spec.wholeLayer
      ? { where: spec.where, outFields: spec.fields, precision: 6, resultRecordCount: 300 }
      : {
          where: spec.where,
          point: center,
          distanceFt: radiusFt,
          outFields: spec.fields,
          precision: spec.limit ? 5 : 6,
          maxAllowableOffset: spec.limit ? 0.0002 : 0.00005,
          resultRecordCount: spec.limit ?? 60,
        },
    { signal },
  );
  const out: Asset[] = [];
  features.forEach((f, i) => {
    const base = spec.map(f.properties);
    if (!base) return;
    const place = placeOf(f, pr);
    if (spec.wholeLayer && (place.distanceFt == null || place.distanceFt > radiusFt)) return;
    out.push({ id: `${spec.layer}:${f.id ?? (f.properties.objectid as number | undefined) ?? i}`, ...base, ...place });
  });
  return out;
}

const SPECS: Partial<Record<AssetCategoryId, LayerSpec[]>> = {
  friends: [
    {
      layer: LAYERS.friends,
      fields: ['objectid', 'friends_group_name', 'public_name', 'address', 'contact_email', 'contact_website'],
      map: (p) => ({
        name: s(p.friends_group_name) ?? 'Friends group',
        detail: s(p.public_name) && s(p.public_name) !== s(p.friends_group_name) ? `Cares for ${s(p.public_name)}` : 'Park friends group',
        address: s(p.address),
        email: s(p.contact_email),
        url: url(p.contact_website),
      }),
    },
  ],
  schools: [
    {
      layer: LAYERS.schools,
      fields: ['objectid', 'school_name_label', 'school_name', 'street_address', 'grade_level', 'type_specific', 'phone_number'],
      map: (p) => ({
        name: titleCase(s(p.school_name_label) ?? s(p.school_name) ?? 'School'),
        detail: [s(p.type_specific) && titleCase(s(p.type_specific)), s(p.grade_level) && titleCase(s(p.grade_level))].filter(Boolean).join(' · ') || undefined,
        address: s(p.street_address) && titleCase(s(p.street_address)),
        phone: fmtPhone(s(p.phone_number)) || undefined,
      }),
    },
  ],
  libraries: [
    {
      layer: LAYERS.libraries,
      fields: ['objectid', 'building', 'address', 'phone_number', 'library_url'],
      map: (p) => ({
        name: s(p.building) ?? 'Library',
        detail: 'Free Library of Philadelphia',
        address: s(p.address),
        phone: fmtPhone(s(p.phone_number)) || undefined,
        url: url(p.library_url),
      }),
    },
  ],
  parks: [
    {
      layer: LAYERS.pprProperties,
      fields: ['objectid', 'label', 'official_name', 'park_name', 'address_911', 'ppr_use', 'property_classification'],
      where: "property_classification NOT IN ('TRAFFIC_ISLAND_MEDIAN','OPERATIONAL_INTERNAL')",
      map: (p) => ({
        name: s(p.official_name) ?? s(p.park_name) ?? s(p.label) ?? 'Park',
        detail: s(p.ppr_use) ? titleCase(String(p.ppr_use).replace(/_/g, ' ')) : undefined,
        address: s(p.address_911) && titleCase(s(p.address_911)),
      }),
    },
  ],
  hospitals: [
    {
      layer: LAYERS.hospitals,
      wholeLayer: true,
      fields: ['objectid', 'hospital_name', 'street_address', 'hospital_type', 'phone_number'],
      map: (p) => ({
        name: s(p.hospital_name) ?? 'Hospital',
        detail: s(p.hospital_type),
        address: s(p.street_address),
        phone: fmtPhone(s(p.phone_number)) || undefined,
      }),
    },
  ],
  universities: [
    {
      layer: LAYERS.universities,
      limit: 1000,
      fields: ['objectid', 'university_name', 'building_name', 'address', 'type'],
      map: (p) => ({
        name: s(p.university_name) ?? 'College',
        detail: s(p.building_name),
        address: s(p.address) && titleCase(s(p.address)),
      }),
    },
  ],
  gardens: [
    {
      layer: LAYERS.gardens,
      fields: ['objectid', 'garden_name', 'address', 'contact_email', 'contact_website', 'garden_status'],
      map: (p) => ({
        name: s(p.garden_name) ?? 'Community garden',
        detail: 'Registered community garden',
        address: s(p.address),
        email: s(p.contact_email),
        url: url(p.contact_website),
      }),
    },
    {
      layer: LAYERS.urbanAg,
      fields: ['objectid', 'project_name', 'address', 'contact_email', 'contact_website', 'program', 'project_status'],
      map: (p) => ({
        name: s(p.project_name) ?? 'Urban farm',
        detail: s(p.program) ? `Parks & Rec urban agriculture · ${titleCase(s(p.program))}` : 'Parks & Rec urban agriculture',
        address: s(p.address),
        email: s(p.contact_email),
        url: url(p.contact_website),
      }),
    },
  ],
  art: [
    {
      layer: LAYERS.publicArt,
      fields: ['objectid', 'title', 'artist', 'location_name', 'address', 'medium', 'status'],
      map: (p) => ({
        name: s(p.title) ?? 'Public artwork',
        detail: [s(p.artist), s(p.medium)].filter(Boolean).join(' · ') || undefined,
        address: s(p.address) ?? s(p.location_name),
      }),
    },
    {
      layer: LAYERS.parkArt,
      fields: ['objectid', 'name', 'address', 'type', 'firstnamea', 'lastname'],
      map: (p) => ({
        name: s(p.name) ?? 'Monument',
        detail: [s(p.type) && titleCase(s(p.type)), [s(p.firstnamea), s(p.lastname)].filter(Boolean).join(' ')].filter(Boolean).join(' · ') || 'In a City park',
        address: s(p.address),
      }),
    },
  ],
  historic: [
    {
      layer: LAYERS.historicSites,
      fields: ['objectid', 'loc', 'idesigdate1', 'district'],
      map: (p) => ({
        name: titleCase(s(p.loc) ?? 'Historic building'),
        detail: `Philadelphia Register of Historic Places${/\d{4}/.test(String(p.idesigdate1 ?? '')) ? ` · listed ${String(p.idesigdate1).match(/\d{4}/)![0]}` : ''}`,
      }),
    },
    {
      layer: LAYERS.historicDistricts,
      fields: ['objectid', 'name', 'designated'],
      map: (p) => ({
        name: `${s(p.name) ?? 'Historic district'}`,
        detail: 'Local historic district',
      }),
    },
  ],
};

const SOURCES: Record<AssetCategoryId, { label: string; url: string }> = {
  rcos: { label: 'City of Philadelphia — RCOs', url: links.rcos },
  council: { label: 'Philadelphia City Council', url: links.council },
  friends: { label: 'Philadelphia Parks & Recreation', url: links.parks },
  schools: { label: 'OpenDataPhilly — Schools', url: links.openData },
  libraries: { label: 'Free Library of Philadelphia', url: 'https://www.freelibrary.org/' },
  parks: { label: 'Philadelphia Parks & Recreation', url: links.parks },
  hospitals: { label: 'OpenDataPhilly — Hospitals', url: links.openData },
  universities: { label: 'OpenDataPhilly — Universities & colleges', url: links.openData },
  gardens: { label: 'Philadelphia Parks & Recreation', url: links.parks },
  art: { label: 'Mural Arts Philadelphia — mural map', url: links.murals },
  historic: { label: 'Philadelphia Historical Commission', url: links.historic },
};

const NOTES: Partial<Record<AssetCategoryId, string>> = {
  rcos: 'Groups registered with the City for this address. Developers must notify them about zoning changes — good partners to know.',
  art: "City-commissioned art and park monuments. Mural Arts' murals aren't in the City's open data — check their map too.",
  universities: 'Within two miles.',
  hospitals: 'Within two miles.',
  libraries: 'Within a mile.',
};

/** Larger search areas for things that are sparse. */
function radiusFor(id: AssetCategoryId, r: number): number {
  if (id === 'hospitals' || id === 'universities') return Math.max(r, 10560);
  if (id === 'libraries') return Math.max(r, 5280);
  return r;
}

async function groupItems(
  id: AssetCategoryId,
  lot: LotLike,
  center: LngLat,
  radiusFt: number,
  pr: Projector,
  signal?: AbortSignal,
  partial?: () => void,
): Promise<Asset[]> {
  if (id === 'council') {
    const d = lot.councilDistrict;
    if (!d) return [];
    const who = COUNCIL_MEMBERS[d];
    return [
      {
        id: `council:${d}`,
        name: `Council District ${d}${who ? ` — Councilmember ${who}` : ''}`,
        detail: who ? `Council member for the ${COUNCIL_AS_OF}` : undefined,
        url: COUNCIL_PAGES[d] ?? links.council,
        distanceFt: 0,
      },
    ];
  }
  if (id === 'rcos') {
    let rcos = lot.rcos;
    if (!rcos) {
      const rows = await queryAttrs<{ organization_name: string; primary_email: string | null; primary_phone: string | null; websites: string | null }>(
        LAYERS.rcos,
        { point: center, outFields: ['organization_name', 'primary_email', 'primary_phone', 'websites'] },
        { signal },
      );
      rcos = rows.map((r) => ({ name: r.organization_name, email: r.primary_email ?? undefined, phone: r.primary_phone ?? undefined, website: r.websites ?? undefined }));
    }
    return rcos.map((r) => ({
      id: `rco:${r.name}`,
      name: r.name,
      email: r.email,
      phone: fmtPhone(r.phone) || undefined,
      url: url(r.website),
      distanceFt: 0,
      detail: 'Covers your lot',
    }));
  }
  const specs = SPECS[id] ?? [];
  // Groups made of two City layers (gardens, art, historic) show what loaded even if
  // one layer didn't, and say the list may be incomplete.
  const settled = await Promise.allSettled(specs.map((sp) => layerAssets(sp, center, radiusFt, pr, signal)));
  const failed = settled.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
  if (failed.length && failed.length === settled.length) throw failed[0]!.reason;
  if (failed.some((f) => (f.reason as { code?: string })?.code === 'aborted')) throw failed.find((f) => (f.reason as { code?: string })?.code === 'aborted')!.reason;
  if (failed.length) partial?.();
  let items = settled.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
  if (id === 'universities') {
    // many buildings per school: keep the nearest building of each
    const best = new Map<string, Asset>();
    for (const a of items) {
      const k = a.name;
      const cur = best.get(k);
      if (!cur || (a.distanceFt ?? Infinity) < (cur.distanceFt ?? Infinity)) best.set(k, { ...a, detail: a.detail ? `Nearest building: ${a.detail}` : undefined });
    }
    items = [...best.values()];
  }
  // de-duplicate by name+address
  const seen = new Set<string>();
  items = items.filter((a) => {
    const k = `${a.name}|${a.address ?? ''}`.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  return items.sort((a, b) => (a.distanceFt ?? Infinity) - (b.distanceFt ?? Infinity)).slice(0, MAX_PER_GROUP);
}

/**
 * Community assets around a lot, grouped like the Organize workbook.
 * @param radiusFt search radius (default a quarter mile, 1,320 ft); hospitals and
 *   universities use at least two miles, libraries at least one.
 */
export async function nearbyAssets(lot: LotLike, radiusFt = 1320, opts: { signal?: AbortSignal; only?: AssetCategoryId[] } = {}): Promise<AssetGroup[]> {
  const center = centerOf(lot);
  const pr = makeProjector(center);
  const cats = ASSET_CATEGORIES.filter((c) => !opts.only || opts.only.includes(c.id));
  return Promise.all(
    cats.map(async (c) => {
      const r = radiusFor(c.id, radiusFt);
      const group: AssetGroup = { ...c, items: [], radiusFt: r, source: SOURCES[c.id], ...(NOTES[c.id] ? { note: NOTES[c.id] } : {}) };
      try {
        group.items = await groupItems(c.id, lot, center, r, pr, opts.signal, () => {
          group.warning = "Part of this list couldn't load from the City right now, so it may be missing some places.";
        });
      } catch (e) {
        if ((e as { code?: string })?.code === 'aborted') throw e;
        group.error = "Couldn't load this list from the City right now.";
      }
      return group;
    }),
  );
}
