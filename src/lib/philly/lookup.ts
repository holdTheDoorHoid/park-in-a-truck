// lookupLot(): everything atlas.phila.gov would tell you about one property, in
// one call, as a LotRecord (src/lib/types.ts).
//
//   address / OPA number / map click
//     → AIS (address service): OPA account, PWD + DOR parcel ids, zoning,
//       council district, RCO ids, historic flags
//     → Carto opa_properties_public: owners, category, size, value, last sale,
//       owner's mailing address; joined in the same SQL to pwd_parcels for the outline
//     → ArcGIS: Vacant_Indicators_Land (on the City's vacant list?),
//       Zoning_RCO (community organizations), fema_floodplain_2023
//     → ArcGIS: neighbouring PWD_PARCELS + Street_Centerline → lot shape analysis
//     → ArcGIS: LAMAAssets — the Land Bank's own status for public land
//
// Which parcel outline? The City has two:
//   - PWD parcels (Water Department billing parcels) are keyed 1:1 to OPA
//     accounts (pwd_parcels.brt_id = OPA parcel_number) and are what
//     atlas.phila.gov draws for "Property". The owner on the OPA record owns
//     exactly this outline, so it is the one we measure.
//   - DOR parcels (Department of Records deed parcels) follow recorded deeds;
//     a property can span several, and they lag behind consolidations. We use
//     the DOR outline only when the property has no PWD parcel (new
//     subdivisions, some rear lots), matched by AIS's dor_parcel_id or by point.

import type { LngLat, LotRecord, SourceRef } from '../types';
import { aisPoint, aisSearch, bestAddress, type AisFeature, type AisProps } from './ais';
import { queryAttrs, queryGeo, soft } from './arcgis';
import { cartoUrl, LAYERS, links, sqlString } from './endpoints';
import { bboxOf, largestOuterRing } from './geo';
import { getJSON } from './http';
import { analyseLot, type ShapeStreet } from './lotshape';
import { landBankStatus } from './landbank';
import { classifyOwner, isPublic, landBankHandles } from './owner';
import { COUNCIL_MEMBERS, floodPlain, normaliseZoning } from './plain';
import { normaliseAddress, prefixSearch, searchAddresses } from './search';
import { PhillyError, type AddressSuggestion, type LandBankStatus, type LotExtra } from './types';
import { vacantLotsNear } from './vacant';
import { EN, words } from './words';

export type LotQuery = string | { opa: string } | { lngLat: LngLat } | AddressSuggestion;

interface OpaRow {
  parcel_number: string;
  location: string | null;
  owner_1: string | null;
  owner_2: string | null;
  category_code_description: string | null;
  building_code_description: string | null;
  zoning: string | null;
  total_area: number | null;
  frontage: number | null;
  depth: number | null;
  market_value: number | null;
  sale_date: string | null;
  sale_price: number | null;
  mailing_care_of: string | null;
  mailing_address_1: string | null;
  mailing_address_2: string | null;
  mailing_street: string | null;
  mailing_city_state: string | null;
  mailing_zip: string | null;
  zip_code: string | null;
  lng: number | null;
  lat: number | null;
  pwd_geom: string | null;
  pwd_parcel_id: number | null;
}

const OPA_FIELDS = `o.parcel_number, o.location, o.owner_1, o.owner_2, o.category_code_description,
  o.building_code_description, o.zoning, o.total_area, o.frontage, o.depth, o.market_value, o.sale_date,
  o.sale_price, o.mailing_care_of, o.mailing_address_1, o.mailing_address_2, o.mailing_street,
  o.mailing_city_state, o.mailing_zip, o.zip_code, ST_X(o.the_geom) AS lng, ST_Y(o.the_geom) AS lat`;

/** OPA record + its PWD parcel outline, one round trip. */
export function opaSql(opa: string, pwdParcelId?: number | null): string {
  const parcelWhere = pwdParcelId ? `p.parcelid = ${Math.trunc(pwdParcelId)}` : `p.brt_id = ${sqlString(opa)}`;
  return `SELECT ${OPA_FIELDS},
    (SELECT ST_AsGeoJSON(ST_Union(p.the_geom), 7) FROM pwd_parcels p WHERE ${parcelWhere}) AS pwd_geom,
    (SELECT min(p.parcelid) FROM pwd_parcels p WHERE ${parcelWhere}) AS pwd_parcel_id
    FROM opa_properties_public o WHERE o.parcel_number = ${sqlString(opa)} LIMIT 1`;
}

const isOpaNumber = (s: string) => /^\d{9}$/.test(s);

async function aisFirst(q: string, signal?: AbortSignal): Promise<AisFeature | null> {
  const r = await aisSearch(q, { signal, limit: 5 });
  return r ? bestAddress(r) : null;
}

async function intersectionError(label: string, at: LngLat | null, signal?: AbortSignal): Promise<PhillyError> {
  const suggestions = at ? await vacantLotsNear(at, 300, 8, { signal }).catch(() => []) : [];
  return new PhillyError('intersection', words()(suggestions.length ? 'error.cornerPick' : 'error.cornerType', { place: label }), {
    suggestions,
    lngLat: at ?? undefined,
  });
}

/** Find the AIS address record for whatever the person gave us. */
async function resolve(query: LotQuery, signal?: AbortSignal): Promise<{ ais: AisFeature | null; opa: string | null; typed: string }> {
  if (typeof query === 'object' && 'lngLat' in query && !('label' in query)) {
    const typed = `${query.lngLat[1].toFixed(6)}, ${query.lngLat[0].toFixed(6)}`;
    const attrs = await queryAttrs<{ brt_id: string | null; address: string | null; parcelid: number }>(
      LAYERS.pwdParcels,
      { point: query.lngLat, outFields: ['parcelid', 'brt_id', 'address'], resultRecordCount: 1 },
      { signal },
    );
    const hit = attrs[0];
    if (!hit) throw new PhillyError('no-parcel', words()('error.noParcel'));
    const ais = (hit.brt_id ? await aisFirst(hit.brt_id, signal) : null) ?? (hit.address ? await aisFirst(hit.address, signal) : null);
    return { ais, opa: hit.brt_id || ais?.properties.opa_account_num || null, typed };
  }
  if (typeof query === 'object' && 'opa' in query && !('label' in query)) {
    const opa = String(query.opa).trim();
    if (!isOpaNumber(opa)) throw new PhillyError('bad-input', words()('error.opaDigits'));
    return { ais: await aisFirst(opa, signal), opa, typed: opa };
  }
  if (typeof query === 'object' && 'label' in query) {
    if (query.kind === 'intersection') throw await intersectionError(query.label, query.lngLat ?? null, signal);
    if (query.opa) return { ais: await aisFirst(query.opa, signal), opa: query.opa, typed: query.label };
    query = query.label;
  }

  const typed = String(query).trim();
  if (typed.length < 3) throw new PhillyError('bad-input', words()('error.tooShort'));
  if (isOpaNumber(typed.replace(/\s/g, ''))) {
    const opa = typed.replace(/\s/g, '');
    return { ais: await aisFirst(opa, signal), opa, typed };
  }
  const r = await aisSearch(/\s(and|at)\s/i.test(typed) && !/^\d+\s/.test(typed) ? typed.replace(/\s+(and|at)\s+/i, ' & ') : typed, {
    signal,
    limit: 5,
  });
  if (r?.search_type === 'intersection' || (r && !bestAddress(r) && r.features[0]?.ais_feature_type === 'intersection')) {
    throw await intersectionError(r.normalized || typed.toUpperCase(), r.features[0] ? aisPoint(r.features[0]) : null, signal);
  }
  const ais = r ? bestAddress(r) : null;
  if (!ais) {
    const suggestions = await searchAddresses(typed, { signal }).catch(() => []);
    if (suggestions.length === 1 && suggestions[0]!.opa) return resolve(suggestions[0]!, signal);
    throw new PhillyError('not-found', words()(suggestions.length ? 'error.didYouMean' : 'error.notFound', { typed }), { suggestions });
  }
  return { ais, opa: ais.properties.opa_account_num || null, typed };
}

function mailing(o: OpaRow): string | null {
  const parts = [o.mailing_care_of, o.mailing_address_1, o.mailing_address_2, o.mailing_street, [o.mailing_city_state, o.mailing_zip].filter(Boolean).join(' ')]
    .map((s) => (s ?? '').trim())
    .filter(Boolean);
  return parts.length ? parts.join(', ') : null;
}

export interface LookupOpts {
  signal?: AbortSignal;
}

/**
 * Look up one Philadelphia property.
 * @param query an address ("1322 N Dover St"), an OPA account ({ opa }), a map
 *   click ({ lngLat }) or a suggestion from searchAddresses().
 * @throws PhillyError — 'not-found' (with .suggestions), 'intersection' (with
 *   nearby vacant lots in .suggestions), 'no-parcel', 'bad-input', 'city-down'.
 */
export async function lookupLot(query: LotQuery, opts: LookupOpts = {}): Promise<LotRecord> {
  const { signal } = opts;
  const warnings: string[] = [];
  let { ais, opa, typed } = await resolve(query, signal);
  let p: AisProps | null = ais?.properties ?? null;

  // AIS sometimes knows a "1/2" or rear address without its OPA account; OPA's own list does.
  if (!opa && p?.street_address) {
    const hits = await prefixSearch(normaliseAddress(p.street_address), 2, signal).catch(() => []);
    const exact = hits.find((h) => h.label === p!.street_address) ?? (hits.length === 1 ? hits[0] : undefined);
    if (exact?.opa) {
      opa = exact.opa;
      const better = await aisFirst(opa, signal).catch(() => null);
      if (better) {
        ais = better;
        p = better.properties;
      }
    }
  }
  if (!opa && !ais) throw new PhillyError('not-found', words()('error.notInRecords', { typed }));

  const point: LngLat | null = ais ? aisPoint(ais) : null;
  const pwdId = p?.pwd_parcel_id ? Number(p.pwd_parcel_id) : null;

  // --- property record + outline, and the layers that only need a point ---------------
  const opaRowP = opa
    ? getJSON<{ rows: OpaRow[] }>(cartoUrl(opaSql(opa, pwdId)), { signal }).then((r) => r.rows?.[0] ?? null)
    : Promise.resolve(null);
  const vacantP = opa
    ? soft(
        queryAttrs<{ land_rank: number | null }>(LAYERS.vacantLand, { where: `opa_id=${sqlString(opa)}`, outFields: ['land_rank'] }, { signal }),
        [],
        warnings,
        'warn.vacantList',
      )
    : Promise.resolve([]);
  const rcoP = point
    ? soft(
        queryAttrs<{
          organization_name: string;
          primary_name: string | null;
          primary_email: string | null;
          primary_phone: string | null;
          websites: string | null;
          lni_id: number | null;
        }>(
          LAYERS.rcos,
          { point, outFields: ['organization_name', 'primary_name', 'primary_email', 'primary_phone', 'websites', 'lni_id'] },
          { signal },
        ),
        [],
        warnings,
        'warn.rcos',
      )
    : Promise.resolve([]);
  const landBankP = opa
    ? soft<LandBankStatus | null | undefined>(landBankStatus(opa, { signal }), undefined, warnings, 'warn.landBank')
    : Promise.resolve(undefined);
  const floodP = point
    ? soft(
        queryAttrs<{ fld_zone: string | null; zone_subty: string | null }>(LAYERS.flood, { point, outFields: ['fld_zone', 'zone_subty'] }, { signal }),
        [],
        warnings,
        'warn.flood',
      )
    : Promise.resolve([]);

  let row: OpaRow | null;
  try {
    row = await opaRowP;
  } catch (e) {
    if ((e as PhillyError).code === 'aborted') throw e;
    row = null;
    warnings.push(EN('warn.record'));
  }

  let polygon: LngLat[] = row?.pwd_geom ? largestOuterRing(JSON.parse(row.pwd_geom)) : [];
  let parcelSource: LotExtra['parcelSource'] = polygon.length ? 'pwd' : null;
  if (!polygon.length) {
    const dor = p?.dor_parcel_id
      ? await soft(queryGeo(LAYERS.dorParcels, { where: `mapreg=${sqlString(p.dor_parcel_id)}`, outFields: ['mapreg'] }, { signal }), { features: [], truncated: false }, warnings, 'warn.deedOutline')
      : point
        ? await soft(queryGeo(LAYERS.dorParcels, { point, outFields: ['mapreg'], resultRecordCount: 1 }, { signal }), { features: [], truncated: false }, warnings, 'warn.deedOutline')
        : { features: [] };
    polygon = largestOuterRing(dor.features[0]?.geometry as never);
    if (polygon.length) parcelSource = 'dor';
  }

  const center: LngLat | null =
    point ??
    (row?.lng != null && row?.lat != null ? [row.lng, row.lat] : null) ??
    (polygon.length ? [polygon.reduce((s, q) => s + q[0], 0) / polygon.length, polygon.reduce((s, q) => s + q[1], 0) / polygon.length] : null);
  if (!center) throw new PhillyError('not-found', words()('error.noLocation', { typed }));

  // --- shape: neighbours + street centerlines around the parcel ----------------------------
  let geometry = null;
  if (polygon.length >= 3) {
    const [neighbours, streets] = await Promise.all([
      soft(fetchNeighbourRings(polygon, { signal }), null, warnings, 'warn.neighbours'),
      soft(fetchStreetLines(polygon, { signal }), [] as ShapeStreet[], warnings, 'warn.streets'),
    ]);
    const own = neighbours?.filter((n) => !(n.opa && n.opa === opa)).map((n) => n.ring) ?? null;
    geometry = analyseLot({
      polygon,
      addressStreet: p?.street_full ?? streetOf(row?.location ?? p?.street_address ?? ''),
      streets,
      neighbours: own,
      buildingDesc: row?.building_code_description ?? null,
    });
  }

  const [vacant, rcos, flood, landBank] = await Promise.all([vacantP, rcoP, floodP, landBankP]);

  const owners = row ? [row.owner_1, row.owner_2].filter((o): o is string => Boolean(o && o.trim())) : (p?.opa_owners ?? []);
  const cls = classifyOwner(owners);
  const address = row?.location || p?.street_address || typed.toUpperCase();
  const district = p?.council_district_2024 || null;
  const zoneRow = flood.find((f) => f.fld_zone && f.fld_zone !== 'X') ?? flood[0];

  const extra: LotExtra = {
    geometry: geometry ?? undefined,
    ownerLabel: cls.label,
    ownerMailing: row ? mailing(row) : null,
    vacancyScore: vacant[0]?.land_rank ?? null,
    councilMember: district ? COUNCIL_MEMBERS[district] ?? null : null,
    historicSite: p?.historic_site ? /^y/i.test(String(p.historic_site)) : undefined,
    historicDistrict: p?.historic_district || null,
    // saved in English, shown translated (floodText)
    floodZoneLabel: floodPlain(zoneRow?.fld_zone ?? null, zoneRow?.zone_subty ?? null, 'en'),
    parcelSource,
    zip: row?.zip_code ?? p?.zip_code ?? null,
    // Not AIS's philly_rising_area: those areas are named after playgrounds (2537 N 11th St
    // is in "Penrose", after Penrose Playground — not the Penrose neighbourhood by the airport).
    planningDistrict: (p?.planning_district as string) || null,
    ...(landBank !== undefined ? { landBank } : {}),
    assessedAreaSqFt: row?.total_area ?? null,
    warnings: warnings.length ? warnings : undefined,
  };

  // saved in English, shown translated (sourceLabel)
  const sources: SourceRef[] = [
    { label: EN('source.atlas'), url: links.atlas(address) },
    ...(opa ? [{ label: EN('source.property'), url: links.property(opa) }] : []),
    { label: EN('source.zoning'), url: links.atlasZoning(address) },
    ...(landBank || (isPublic(cls.type) && landBankHandles(cls.type, cls.label)) ? [{ label: EN('source.landBank'), url: links.landBankMap }] : []),
    ...(rcos.length ? [{ label: EN('source.rcos'), url: links.rcos }] : []),
  ];

  return {
    query: typed,
    address,
    opa,
    pwdParcelId: row?.pwd_parcel_id ?? pwdId ?? null,
    dorParcelId: p?.dor_parcel_id || null,
    lat: center[1],
    lng: center[0],
    owners,
    ownerType: cls.type,
    category: row?.category_code_description ?? null,
    buildingDescription: row?.building_code_description ?? null,
    zoning: normaliseZoning(p?.zoning || row?.zoning),
    // One lot size everywhere: the parcel outline's area (what every page measures);
    // the assessment's figure is kept in extra.assessedAreaSqFt.
    areaSqFt: geometry?.areaSqFt || row?.total_area || null,
    frontageFt: row?.frontage ?? null,
    depthFt: row?.depth ?? null,
    marketValue: row?.market_value ?? null,
    lastSale: row?.sale_date ? { date: row.sale_date, price: row.sale_price ?? 0 } : null,
    vacantLand: opa ? vacant.length > 0 : null,
    polygon,
    lotType: geometry?.lotType ?? 'unknown',
    councilDistrict: district,
    rcos: rcos.map((r) => ({
      name: r.organization_name,
      contact: r.primary_name ?? undefined,
      email: r.primary_email ?? undefined,
      phone: r.primary_phone ?? undefined,
      website: r.websites ?? undefined,
    })),
    floodZone: zoneRow?.fld_zone ?? null,
    fetchedAt: new Date().toISOString(),
    sources,
    extra: extra as Record<string, unknown>,
  };
}

/** "1322 N DOVER ST" → "N DOVER ST" */
function streetOf(address: string): string {
  return address.replace(/^\s*[\d/ -]+[A-Z]?(-\d+)?\s+/i, '').trim();
}

/** Parcels around a lot, for "is there a neighbour behind this side?" and the base map. */
export async function fetchNeighbourRings(
  polygon: LngLat[],
  opts: { signal?: AbortSignal; padFt?: number } = {},
): Promise<{ ring: LngLat[]; opa: string | null; address: string | null }[]> {
  const { features } = await queryGeo<{ brt_id: string | null; address: string | null }>(
    LAYERS.pwdParcels,
    { envelope: bboxOf(polygon, opts.padFt ?? 95), outFields: ['brt_id', 'address'], resultRecordCount: 400 },
    opts,
  );
  return features
    .map((f) => ({ ring: largestOuterRing(f.geometry as never), opa: f.properties.brt_id, address: f.properties.address }))
    .filter((n) => n.ring.length >= 3);
}

/** Street centerlines around a lot. */
export async function fetchStreetLines(polygon: LngLat[], opts: { signal?: AbortSignal; padFt?: number } = {}): Promise<ShapeStreet[]> {
  const { features } = await queryGeo<{ stname: string | null; class: number | null }>(
    LAYERS.streets,
    { envelope: bboxOf(polygon, opts.padFt ?? 120), outFields: ['stname', 'class'], resultRecordCount: 200 },
    opts,
  );
  const out: ShapeStreet[] = [];
  for (const f of features) {
    const g = f.geometry as { type: string; coordinates: number[][] | number[][][] } | null;
    if (!g) continue;
    const lines = g.type === 'LineString' ? [g.coordinates as number[][]] : g.type === 'MultiLineString' ? (g.coordinates as number[][][]) : [];
    for (const l of lines) out.push({ line: l.map((c) => [c[0]!, c[1]!] as LngLat), name: (f.properties.stname ?? '').trim(), class: f.properties.class ?? undefined });
  }
  return out;
}
