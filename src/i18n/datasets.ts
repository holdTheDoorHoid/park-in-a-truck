// Data with prose that gets per-language overlay files. English (src/data/…) stays the source of
// truth; an overlay carries ONLY translated text, in the same shape, and is merged on top
// (src/i18n/data.ts). Numbers, ids, prices, URLs, sizes, scientific names never appear in overlays.
//
//   src/i18n/data/<locale>/<name>.json            e.g. es/steps.json, es/plants.json
//   src/i18n/data/<locale>/guides/<slug>.json      one per build guide
//
// `keyBy`: the overlay is an object keyed by that field of each English item (order-proof),
//          e.g. plants.json overlay = { "<plant id>": { "common": "…" } }.
// Without keyBy, arrays line up by position (guide steps, materials, tools…).
// A name ending in "/*" is one overlay per English file: "guides/*" ↔ src/data/guides/<slug>.json,
// "models/*" ↔ src/data/guides/models/<slug>.json.
// `fields`: the only paths an overlay may set. "a[]" = every item of array a; "a[].b" = field b
//          of every item. The checker (src/i18n/check.ts) rejects anything else.
//
// No imports: the Node checker loads this file directly.

export interface DatasetSpec {
  /** Overlay file name under src/i18n/data/<locale>/ ("guides/*" = one file per guide). */
  name: string;
  /** English source, relative to the repo root. `*` is replaced by the guide slug. */
  source: string;
  /** For .ts sources: the export holding the data. */
  exportName?: string;
  keyBy?: string;
  fields: string[];
  /** Also shipped to the browser in /i18n/<locale>.js (islands use it). */
  client: boolean;
}

export const DATASETS: DatasetSpec[] = [
  {
    name: 'steps',
    source: 'src/data/steps.ts',
    exportName: 'STEPS',
    keyBy: 'slug',
    fields: ['title', 'tagline', 'assumes'],
    client: true,
  },
  {
    name: 'guides/*',
    source: 'src/data/guides/*.json',
    fields: [
      'title',
      'summary',
      'time',
      'people',
      'skill',
      'cost',
      'materials[].item',
      /** only sizes with words ("8' long, cut to size"); plain sizes like 2x4x8' stay as they are */
      'materials[].size',
      'materials[].notes',
      'materials[].siteNote',
      'hardware[].item',
      'hardware[].size',
      'hardware[].notes',
      'hardware[].siteNote',
      /** only stock with words ("2x2 welded-wire mesh"); lumber like 2x4 stays as it is */
      'cutList[].stock',
      'cutList[].notes',
      'cutList[].siteNote',
      'tools[]',
      'steps[].title',
      'steps[].text',
      'steps[].imageAlts[]',
      'steps[].tips[]',
      'steps[].siteNote',
      'finishing',
      'safety[]',
      'links[].label',
      'sourcePages',
    ],
    client: false,
  },
  {
    // the 3D models' note on why the built size differs from the guide's (src/data/guides/models/)
    name: 'models/*',
    source: 'src/data/guides/models/*.json',
    fields: ['asBuilt.reason'],
    client: false,
  },
  {
    name: 'themes',
    source: 'src/data/themes.ts',
    exportName: 'THEMES',
    fields: ['*.name', '*.blurb'],
    client: true,
  },
  {
    name: 'elements',
    source: 'src/data/elements.ts',
    exportName: 'ELEMENTS',
    // (countAs is a developer note nothing displays: not translated)
    fields: ['*.name'],
    client: true,
  },
  {
    name: 'plants',
    source: 'src/data/plants.json',
    keyBy: 'id',
    // botanical (scientific) names stay as they are in every language
    fields: ['common', 'notes', 'matureSize'],
    client: true,
  },
  {
    name: 'parks',
    source: 'src/data/parks.json',
    keyBy: 'id',
    // park names and addresses are proper nouns and stay as they are (photo credits are names too)
    fields: ['description', 'neighborhood', 'links[].label', 'photos[].alt', 'photos[].caption'],
    client: true,
  },
  {
    name: 'resources',
    source: 'src/data/resources.json',
    fields: [
      'partners[].description',
      'press[].title',
      'press[].note',
      'supplierGroups[].label',
      'supplierGroups[].items[].title',
      'supplierGroups[].items[].note',
      'toolkitLibrary.intro',
      'toolkitLibrary.sections[].title',
      'toolkitLibrary.sections[].entries[].title',
      'toolkitLibrary.sections[].entries[].description',
      'acknowledgments.lead',
      'acknowledgments.note',
      'legal.title',
      'legal.text',
    ],
    client: false,
  },
];
