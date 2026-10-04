// Map sources shared by every map and the 3D planner. No API keys needed.
//
// - Basemap: OpenFreeMap "positron" (free, no key, CORS) — light, quiet, fits the paper look.
// - Aerial: City of Philadelphia orthoimagery, 3-inch, 2025 (CORS). Standard XYZ tiles,
//   URL order is /tile/{z}/{y}/{x}. Older years exist (1996–2024) for "what used to be here".

export const BASEMAP_STYLE = 'https://tiles.openfreemap.org/styles/positron';
export const BASEMAP_ATTRIBUTION = '© OpenStreetMap contributors · OpenFreeMap';

const IMAGERY = 'https://tiles.arcgis.com/tiles/fLeGjb7u4uXqeF9q/arcgis/rest/services';
export const AERIAL_YEARS = [2025, 2024, 2023, 2022, 2020, 2019, 2018, 2017, 2015, 2012, 2010, 2008, 2004, 1996] as const;
const SERVICE: Record<number, string> = {
  2025: 'CityImagery_2025_3in',
  2024: 'CityImagery_2024_3in',
  2023: 'CityImagery_2023',
  2022: 'CityImagery_2022_2in',
  2020: 'CityImagery_2020_3in',
  2019: 'CityImagery_2019_3in',
  2018: 'CityImagery_2018_3in',
  2017: 'CityImagery_2017_3in',
  2015: 'CityImagery_2015_3in',
  2012: 'CityImagery_2012_3in',
  2010: 'CityImagery_2010_3in',
  2008: 'CityImagery_2008_3in',
  2004: 'CityImagery_2004_6in',
  1996: 'CityImagery_1996_6in',
};

/** XYZ template for MapLibre raster sources ({z}/{y}/{x} order is ArcGIS's). */
export function aerialTiles(year: number = 2025): string {
  return `${IMAGERY}/${SERVICE[year] ?? SERVICE[2025]}/MapServer/tile/{z}/{y}/{x}`;
}
export const AERIAL_ATTRIBUTION = 'Imagery © City of Philadelphia';
/** Highest zoom with real imagery for the 3-inch sets */
export const AERIAL_MAX_ZOOM = 21;

/** A single aerial tile URL, for building ground textures in the 3D planner. */
export function aerialTileUrl(z: number, x: number, y: number, year: number = 2025): string {
  return aerialTiles(year).replace('{z}', String(z)).replace('{y}', String(y)).replace('{x}', String(x));
}
