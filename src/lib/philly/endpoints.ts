// City of Philadelphia endpoints (verified 2026-10-04: CORS `*`, no key).
// URLs are built deterministically (fixed parameter order) so the session cache
// and the test fixtures can key on them.

import type { BBox } from './types';
import type { LngLat } from '../types';

export const AIS = 'https://api.phila.gov/ais/v1/search/';
export const CARTO = 'https://phl.carto.com/api/v2/sql';
export const ARCGIS = 'https://services.arcgis.com/fLeGjb7u4uXqeF9q/arcgis/rest/services';

/**
 * ArcGIS feature layers used (all `<name>/FeatureServer/0`):
 * - Vacant_Indicators_Land   City's vacant-land list (owner, opa_id, land_rank)
 * - PWD_PARCELS              property outlines keyed to OPA accounts (brt_id)
 * - DOR_Parcel               deed parcels (fallback outline)
 * - Street_Centerline        street names + classes (lot type, street edges)
 * - LI_BUILDING_FOOTPRINTS   buildings with LiDAR heights (approx_hgt, max_hgt)
 * - ppr_tree_inventory_2025  street & park trees
 * - fema_floodplain_2023     FEMA flood zones
 * - Zoning_RCO               Registered Community Organizations (polygons + contacts)
 * - Schools, library_locations, PPR_Properties, PPR_Friends_Groups,
 *   Registered_Community_Gardens, PPR_Urban_Agriculture_Projects,
 *   Percent_for_Art_Public, PPR_Art_Monuments_point, Historic_sites_PhilReg,
 *   HistoricDistricts_Local, Hospitals, Universities_Colleges   (Organize assets)
 */
export const LAYERS = {
  vacantLand: 'Vacant_Indicators_Land',
  pwdParcels: 'PWD_PARCELS',
  dorParcels: 'DOR_Parcel',
  streets: 'Street_Centerline',
  buildings: 'LI_BUILDING_FOOTPRINTS',
  trees: 'ppr_tree_inventory_2025',
  flood: 'fema_floodplain_2023',
  rcos: 'Zoning_RCO',
  schools: 'Schools',
  libraries: 'library_locations',
  pprProperties: 'PPR_Properties',
  friends: 'PPR_Friends_Groups',
  gardens: 'Registered_Community_Gardens',
  urbanAg: 'PPR_Urban_Agriculture_Projects',
  publicArt: 'Percent_for_Art_Public',
  parkArt: 'PPR_Art_Monuments_point',
  historicSites: 'Historic_sites_PhilReg',
  historicDistricts: 'HistoricDistricts_Local',
  hospitals: 'Hospitals',
  universities: 'Universities_Colleges',
} as const;
export type LayerName = (typeof LAYERS)[keyof typeof LAYERS];

export function aisUrl(q: string, limit = 8): string {
  // AIS takes the query in the path; '/' (as in "1643 1/2 N MARSHALL ST") must be encoded.
  return `${AIS}${encodeURIComponent(q.trim())}?limit=${limit}`;
}

export function cartoUrl(sql: string): string {
  return `${CARTO}?q=${encodeURIComponent(sql.replace(/\s+/g, ' ').trim())}`;
}

/** A SQL string literal. Only ever used with values we've already validated/normalised. */
export function sqlString(s: string): string {
  return `'${s.replace(/'/g, "''")}'`;
}

export interface ArcQuery {
  where?: string;
  /** point or envelope in WGS84 */
  point?: LngLat;
  envelope?: BBox;
  /** buffer around `point`, feet */
  distanceFt?: number;
  outFields?: string[];
  returnGeometry?: boolean;
  /** decimal places for coordinates (7 ≈ 1 cm) */
  precision?: number;
  /** generalise polygons (degrees) — for small map markers only */
  maxAllowableOffset?: number;
  resultRecordCount?: number;
  orderByFields?: string;
  /** 'geojson' (default when returning geometry) or 'json' */
  format?: 'geojson' | 'json';
}

/** Build a FeatureServer query URL. Parameters are emitted in a fixed order. */
export function arcgisUrl(layer: LayerName, q: ArcQuery): string {
  const p: [string, string][] = [];
  p.push(['where', q.where ?? '1=1']);
  if (q.point) {
    p.push(['geometry', `${round(q.point[0])},${round(q.point[1])}`]);
    p.push(['geometryType', 'esriGeometryPoint']);
  } else if (q.envelope) {
    p.push(['geometry', q.envelope.map(round).join(',')]);
    p.push(['geometryType', 'esriGeometryEnvelope']);
  }
  if (q.point || q.envelope) {
    p.push(['inSR', '4326']);
    p.push(['spatialRel', 'esriSpatialRelIntersects']);
  }
  if (q.point && q.distanceFt) {
    p.push(['distance', String(Math.round(q.distanceFt))]);
    p.push(['units', 'esriSRUnit_Foot']);
  }
  p.push(['outFields', (q.outFields ?? ['*']).join(',')]);
  const geom = q.returnGeometry ?? true;
  p.push(['returnGeometry', String(geom)]);
  if (geom) {
    p.push(['outSR', '4326']);
    p.push(['geometryPrecision', String(q.precision ?? 7)]);
    if (q.maxAllowableOffset) p.push(['maxAllowableOffset', String(q.maxAllowableOffset)]);
  }
  if (q.orderByFields) p.push(['orderByFields', q.orderByFields]);
  if (q.resultRecordCount) p.push(['resultRecordCount', String(q.resultRecordCount)]);
  p.push(['f', q.format ?? (geom ? 'geojson' : 'json')]);
  return `${ARCGIS}/${layer}/FeatureServer/0/query?${p.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')}`;
}

/** 7 decimals (~1 cm) keeps URLs stable for caching. */
function round(n: number): string {
  return String(Math.round(n * 1e7) / 1e7);
}

// ---- pages a person can open to check for themselves -----------------------------------

export const links = {
  atlas: (address: string) => `https://atlas.phila.gov/${encodeURIComponent(address)}/property`,
  atlasZoning: (address: string) => `https://atlas.phila.gov/${encodeURIComponent(address)}/zoning`,
  property: (opa: string) => `https://property.phila.gov/?p=${encodeURIComponent(opa)}`,
  landBank: 'https://www.phila.gov/departments/philadelphia-land-bank/',
  /** The Acquire workbook's link. It answered 404 on 2026-10-04; kept because it is PiaT's. */
  phdcSearch: 'https://phdcphila.org/land/buy-land/property-search-map/',
  rcos: 'https://www.phila.gov/programs/registered-community-organizations-rcos/',
  council: 'https://phlcouncil.com/',
  historic: 'https://www.phila.gov/departments/philadelphia-historical-commission/',
  fema: 'https://msc.fema.gov/portal/home',
  parks: 'https://www.phila.gov/departments/philadelphia-parks-recreation/',
  murals: 'https://muralarts.org/artworks/',
  sheriffSales: 'https://www.bid4assets.com/philadelphia',
  openData: 'https://opendataphilly.org/',
};
