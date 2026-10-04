// City of Philadelphia data client — public API.
//
//   searchAddresses(q)                 type-ahead suggestions (AIS + OPA prefix)
//   lookupLot(query)                   → LotRecord (owner, size, outline, zoning, vacancy, RCOs, flood…)
//   chooseLot(record)                  save as the project's lot + write project.extra.site
//   fetchSurroundings(lot, radiusFt)   buildings w/ heights, parcels, trees, streets (3D planner)
//   fetchTallBuildings / selectFarShade  taller buildings farther out whose shadow can reach the lot
//   fetchVacantLots(bbox)              vacant land GeoJSON for the map, with owner type
//   nearbyAssets(lot, radiusFt)        Organize workbook asset lists
//   analyseLot(...)                    geometry → lengths, edges, lot type, street edges
//
// All network calls are cached per session and fail with PhillyError (friendly message).

export { searchAddresses, normaliseAddress } from './search';
export { lookupLot, fetchNeighbourRings, fetchStreetLines, type LotQuery } from './lookup';
export { chooseLot, clearLot, siteFactsFromLot, mergeSiteFacts, lotGeometry } from './choose';
export {
  fetchSurroundings,
  DEFAULT_BUILDING_HEIGHT_FT,
  fetchTallBuildings,
  selectFarShade,
  farQueryMinHeight,
  reachPerFoot,
  FAR_SHADE_MAX_FT,
  FAR_SHADE_MIN_SUN_DEG,
} from './surroundings';
export { fetchVacantLots, vacantLotsNear } from './vacant';
export { nearbyAssets, ASSET_CATEGORIES, assetFieldId, assetLine } from './assets';
export { analyseLot } from './lotshape';
export { classifyOwner, isPublic, acquirePaths, OWNER_TYPE_LABEL } from './owner';
export { zoningPlain, normaliseZoning, floodPlain, titleCase, COUNCIL_MEMBERS } from './plain';
export { setFetch } from './http';
export * from './types';
