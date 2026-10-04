// Types for the City of Philadelphia data client (src/lib/philly/).
// Owner: philly-data workstream. LotRecord itself lives in src/lib/types.ts
// (shared contract); everything here is specific to this client and is safe
// for other workstreams to import.

import type { LngLat, LotKind, SizeId, SourceRef } from '../types';

export type OwnerType =
  | 'city'
  | 'landbank'
  | 'pha'
  | 'redevelopment'
  | 'other-public'
  | 'private'
  | 'unknown';

export type LotType = 'mid-block' | 'corner' | 'alley' | 'unknown';
export type EdgeId = 'x0' | 'x1' | 'y0' | 'y1';

/** [west, south, east, north] in degrees */
export type BBox = [number, number, number, number];

/** One row in the address type-ahead. */
export interface AddressSuggestion {
  /** What to show, e.g. "1322 N DOVER ST" or "GREENWAY AVE & S 60TH ST" */
  label: string;
  kind: 'address' | 'intersection';
  /** OPA account number when the City has one for this address */
  opa?: string | null;
  lngLat?: LngLat | null;
  /** First owner on record, for a hint under the address */
  owner?: string | null;
  /** Where the suggestion came from (AIS exact match, OPA prefix search…) */
  source: 'ais' | 'opa';
}

/** One measured side of the parcel polygon. */
export interface ParcelEdge {
  from: LngLat;
  to: LngLat;
  lengthFt: number;
  /** compass bearing from `from` to `to`, degrees clockwise from north */
  bearingDeg: number;
  /** Which side of the oriented rectangle this edge lies along, if any */
  side?: EdgeId | null;
  /** Street this edge faces, if it is a street edge */
  street?: string | null;
}

export interface StreetSide {
  side: EdgeId;
  /** Street name from the City's centerlines, e.g. "N DOVER ST" */
  name: string;
  /** From the rectangle side to the street centerline, feet */
  distanceFt: number;
}

/**
 * What the geometry says about a parcel. Stored on LotRecord.extra.geometry.
 * Park-local frame (DESIGN.md §6): x along the long edge, x0 = the short edge on
 * the street the lot is addressed to (the entrance), y1 on your LEFT standing at
 * x0 looking toward +x.
 */
export interface LotGeometry {
  /** Long and short edge of the oriented minimum-area rectangle, feet */
  lengthFt: number;
  widthFt: number;
  /** Area of the actual polygon, square feet */
  areaSqFt: number;
  /** Rectangle centre and bearing of +x (clockwise from north) */
  rect: { center: LngLat; bearingDeg: number };
  /** Rectangle corners in order: (x0,y0) (x1,y0) (x1,y1) (x0,y1) */
  rectCorners: LngLat[];
  /** How much of the rectangle the parcel fills (1 = a true rectangle) */
  rectangularity: number;
  /** rectangularity < 0.8: lengths and size describe the rectangle around an odd shape */
  irregular: boolean;
  /** Measured sides of the simplified polygon, counter-clockwise from the start corner */
  edges: ParcelEdge[];
  streetEdges: EdgeId[];
  streets: StreetSide[];
  lotKind: LotKind;
  lotType: LotType;
  /** Why we guessed that lot type, in plain words */
  lotTypeReason: string;
  size: { id: SizeId; exact: boolean; tooSmall: boolean; tooBig: boolean };
  /** Corner to start measuring from (workbook "project starting point"): x0 on the street */
  startCorner: LngLat;
}

/** How the Land Bank's status reads at a glance (map colour, badge). */
export type LandBankTone = 'available' | 'hold' | 'unavailable' | 'unknown';

/** One property in the Philadelphia Land Bank's inventory (LAMAAssets). */
export interface LandBankStatus {
  /** PUB (City), PLB (Land Bank), PRA (Redevelopment Authority) or PHDC */
  agency: string | null;
  /** As the Land Bank writes it, e.g. "Owned - On Hold for AHD" */
  status: string;
  /** In plain words, e.g. "On hold for affordable housing" */
  label: string;
  tone: LandBankTone;
  /** A next-door homeowner can apply to buy it as a side yard */
  sideYard: boolean | null;
}

/** The friendlier bits kept on LotRecord.extra (all optional). */
export interface LotExtra {
  geometry?: LotGeometry;
  /** Agency or owner description, e.g. "Philadelphia Land Bank" */
  ownerLabel?: string;
  /** Mailing address the City has on file for the owner (OPA) */
  ownerMailing?: string | null;
  /** Vacant_Indicators_Land score 0–1 (share of vacancy signals) */
  vacancyScore?: number | null;
  councilMember?: string | null;
  historicSite?: boolean;
  historicDistrict?: string | null;
  floodZoneLabel?: string | null;
  /** The parcel outline came from PWD (water-billing) or DOR (deeds) */
  parcelSource?: 'pwd' | 'dor' | null;
  zip?: string | null;
  /**
   * Older saves only: AIS's PhillyRising area or planning district. PhillyRising
   * areas are named after playgrounds ("Penrose" in North Philadelphia), so this is
   * no longer shown; see planningDistrict.
   */
  neighborhood?: string | null;
  /** City planning district from AIS, e.g. "Lower North" */
  planningDistrict?: string | null;
  /**
   * The Land Bank's status for this property (LAMAAssets). null = checked, not in the
   * Land Bank's inventory; missing = not checked (older saves, or the layer failed).
   */
  landBank?: LandBankStatus | null;
  /** Lot area on the City's property assessment (OPA total_area), sq ft — LotRecord.areaSqFt is the parcel outline's */
  assessedAreaSqFt?: number | null;
  /** Problems we hit while looking things up (one per failed layer) */
  warnings?: string[];
}

// ---- surroundings for the 3D planner -----------------------------------------

export interface SurroundingBuilding {
  /** outer ring, [lng,lat] */
  polygon: LngLat[];
  /** Height above ground, feet (City LiDAR "approx_hgt"); estimated when missing */
  heightFt: number;
  /** Highest point incl. chimneys etc., feet, when known */
  maxHeightFt?: number | null;
  /** True when the City had no height and we assumed a 2-storey rowhouse (25 ft) */
  heightEstimated?: boolean;
  /** Ground elevation at the building, feet above sea level (City data) */
  baseElevationFt?: number | null;
  address?: string;
}

export interface SurroundingParcel {
  polygon: LngLat[];
  address: string;
  opa: string | null;
}

export interface SurroundingTree {
  lngLat: LngLat;
  /** e.g. "MAACKIA AMURENSIS - AMUR MAACKIA" */
  species?: string;
  /** trunk diameter at breast height, inches */
  dbhIn?: number;
  heightFt?: number;
}

export interface SurroundingStreet {
  line: LngLat[];
  name: string;
  /** City functional class: 1 expressway … 5 local, 12 small "place" street */
  class?: number;
}

/**
 * Everything around a lot the 3D planner needs: neighbouring buildings with
 * heights (for shade), parcels, City-inventoried trees, street centerlines.
 * Returned by fetchSurroundings(lot, radiusFt).
 */
export interface Surroundings {
  center: LngLat;
  radiusFt: number;
  fetchedAt: string;
  buildings: SurroundingBuilding[];
  parcels: SurroundingParcel[];
  trees: SurroundingTree[];
  streets: SurroundingStreet[];
  /** layers that failed, if any (the rest is still usable) */
  warnings?: string[];
}

// ---- vacant land map -------------------------------------------------------------

export interface VacantLotProps {
  opa: string | null;
  address: string;
  owner: string;
  ownerType: OwnerType;
  /** true for any public owner type */
  isPublic: boolean;
  areaSqFt: number | null;
  zoning: string | null;
  buildingDesc: string | null;
  /** City vacancy score 0–1 */
  vacancyScore: number | null;
  /** The Land Bank's status, when the lot is in its inventory and the status could be loaded */
  landBank?: LandBankStatus | null;
  /**
   * Map colour group: Land Bank lists it as available / Land Bank lists it with another
   * status / public but not in the Land Bank's list / private. 'public' = status not loaded.
   */
  mapClass: 'lb-available' | 'lb-other' | 'agency' | 'public' | 'private';
}

export interface VacantLotFeature {
  type: 'Feature';
  id?: string | number;
  geometry: { type: 'Polygon'; coordinates: LngLat[][] };
  properties: VacantLotProps;
}

export interface VacantLotCollection {
  type: 'FeatureCollection';
  features: VacantLotFeature[];
  /** true when the City capped the answer; zoom in to see everything */
  truncated: boolean;
  /** false when the Land Bank's statuses couldn't be loaded (public lots then show as plain "public") */
  landBankLoaded?: boolean;
}

// ---- neighbourhood assets (Organize) ------------------------------------------------

export type AssetCategoryId =
  | 'rcos'
  | 'council'
  | 'schools'
  | 'libraries'
  | 'parks'
  | 'friends'
  | 'gardens'
  | 'art'
  | 'historic'
  | 'hospitals'
  | 'universities';

export interface Asset {
  /** stable id within its category (used for "add to our list") */
  id: string;
  name: string;
  /** one line of detail: type, contact, designation… */
  detail?: string;
  address?: string;
  lngLat?: LngLat | null;
  /** straight-line distance from the lot, feet (0 = the lot is inside it) */
  distanceFt?: number | null;
  url?: string;
  email?: string;
  phone?: string;
}

export interface AssetGroup {
  id: AssetCategoryId;
  /** heading, e.g. "Registered Community Organizations" */
  label: string;
  /** the Organize workbook list this belongs to */
  workbookList: 'Citizens associations' | 'Local institutions' | 'Neighborhood physical assets';
  items: Asset[];
  /** search radius used, feet */
  radiusFt: number;
  source: SourceRef;
  /** a sentence shown under the heading (e.g. what's not covered) */
  note?: string;
  /** set when this layer could not be loaded */
  error?: string;
  /** set when one of the group's layers could not be loaded (the rest is shown) */
  warning?: string;
}

// ---- errors ------------------------------------------------------------------------------

export type PhillyErrorCode =
  | 'not-found'
  | 'intersection'
  | 'no-parcel'
  | 'city-down'
  | 'bad-input'
  | 'aborted';

export class PhillyError extends Error {
  code: PhillyErrorCode;
  /** Other addresses the person might have meant */
  suggestions: AddressSuggestion[];
  /** For 'intersection': where it is */
  lngLat?: LngLat;
  constructor(code: PhillyErrorCode, message: string, opts: { suggestions?: AddressSuggestion[]; lngLat?: LngLat; cause?: unknown } = {}) {
    super(message);
    this.name = 'PhillyError';
    this.code = code;
    this.suggestions = opts.suggestions ?? [];
    if (opts.lngLat) this.lngLat = opts.lngLat;
    if (opts.cause) (this as { cause?: unknown }).cause = opts.cause;
  }
}
