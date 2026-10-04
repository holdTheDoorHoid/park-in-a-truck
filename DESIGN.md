# Park in a Truck — interactive toolkit site

Authoritative design doc. If code and this file disagree, fix one of them in the same change.

## 1. What this is

Park in a Truck (PiaT) is a do-it-yourself toolkit for neighborhood parks from Thomas Jefferson University's
Landscape Architecture Program and Lab for Social and Urban Innovation (Philadelphia). Today it is a 36-page
toolkit PDF, six step workbooks (Acquire, Organize, Assess, Dream, Create, Sustain), a Park Patch workbook,
thirteen furniture assembly guides, printable "park pieces", a cost spreadsheet and four plant-list spreadsheets,
scattered across Google Drive links on linktr.ee/parkinatruck.

This site turns all of it into one guided, interactive workbook:

- **Everything, in order.** The toolkit introduction, then the six steps. Every step's sub-steps can be marked done;
  progress shows everywhere.
- **Blanks become fields.** Anything the workbook asks you to write down is a field saved in the browser.
- **The site does the legwork.** Wherever a workbook says "go to atlas.phila.gov / Google Maps and look up…",
  the site does it from City of Philadelphia open data (owner, lot size and outline, zoning, vacancy, nearby
  buildings and their heights, trees, community organizations…). See §6.
- **A 3D planner** fits PiaT's own park-piece designs to the real parcel, shows real sun and shade from the
  neighboring buildings, and counts everything for the cost estimate and plant lists.
- **Themed like the PDFs** (§4).

The owner has permission from PiaT to use all of their content.

## 2. Decisions (interview, 2026-10-04 — do not relitigate)

| Question | Decision |
|---|---|
| Hosting | **Private repo, local preview only** for now. Must stay deployable to GitHub Pages later (`SITE_BASE`). |
| Saving | **Browser only** (localStorage) + export/import a project file + print. No accounts, no server. |
| Wording | **PiaT's own words, made web-friendly**: split into steps, blanks → fields, typos fixed, each step links to the original PDF page. Not a rewrite. No new advice. |
| Tech | **TypeScript + Astro + Three.js** (chosen over Rust/WASM for ecosystem and maintainability by Jefferson). |

Also: the user wants every lookup automated "as much as possible… a streamline for activists to get the
information they need to get something done."

## 3. Architecture

Static site, Astro 7 (+ MDX, Preact islands), no backend. City data is fetched from the browser (CORS-enabled
public APIs, no keys).

```
src/
  content/steps/<slug>.mdx   chapters: start, acquire, organize, assess, dream, create, sustain
  content.config.ts          the `steps` collection
  data/                      steps.ts, themes.ts, elements.ts, guides/*.json, plants.json, parks.json,
                             resources.json, pieces/*.json
  lib/
    types.ts                 SHARED CONTRACTS (additive changes only)
    project.ts               saved projects (nanostores + localStorage), export/import
    autofill.ts              `auto="lot.owners|join"` resolution for fields
    sizing.ts                lot -> park size A–E
    rehype-substeps.mjs      every `##` in a chapter -> trackable sub-step section
    outline.ts               build-time list of sub-steps (progress everywhere)
    philly/                  City data client            (philly-data workstream)
    pieces/                  park-piece model + assembly (pieces workstream)
    planner/                 3D scene, sun, placement    (planner workstream)
    cost/                    cost model                  (cost workstream)
  components/
    workbook/                Field, ListField, Checklist, Choice, Callout, Figure, PdfPage, Download
    widgets/                 interactive widgets placed in chapters (stubs until their owner lands them)
    site/                    Header, Footer, StepPath
  layouts/Base.astro
  pages/                     index, steps/, steps/[slug], my-park/, lot/, planner/, build/, plants/, parks/, resources/
  scripts/bind.ts            binds data-field / data-done markup to the project store
public/
  img/<doc>/…                images extracted from the PDFs (webp)
  downloads/                 original PDFs and templates, compressed copies
scripts/                     python tooling (extraction, fetching); run with source/.venv/bin/python
source/                      raw downloads (git-ignored except manifests and text/); see source/MANIFEST.md
```

### Saving model (`src/lib/project.ts`)

`Project` (types.ts): `fields` (workbook answers, id `"<step>.<kebab-name>"`, ids are permanent), `done`
(`"<step>/<substep-id>"` → date), `lot` (chosen LotRecord), `candidates`, `design`, `extra` (per-widget state).
Several projects per browser; one active. Export = `<name>.park.json`; importing never overwrites (becomes a copy).
Islands read/write via the exported functions and the `$project` store; never touch localStorage directly.

### Chapters and sub-steps

- One MDX file per step. Every `##` heading is a sub-step: the rehype plugin wraps it in
  `<section class="substep" data-substep="<step>/<id>">` and appends a "Mark this step done" toggle. The sidebar
  TOC and all progress bars come from these. Aim for 4–9 sub-steps per chapter, each a real task.
- `###` for structure inside a sub-step.
- End each sub-step with `<PdfPage doc="downloads/workbooks/0N-<slug>.pdf" page={N} />` pointing at the source
  page (PDF page index, 1-based).
- Content not from PiaT is allowed only as **tracking helpers** (a field to record an outcome) and is marked
  `{/* site-added: … */}` in the MDX.

### Fields (components/workbook)

`<Field id label type? hint? options? unit? auto? />`, `<ListField id label columns min rowName />`,
`<Checklist id items />`, `<Choice id label options />`, `<Callout kind="tip|note|warning|contact|auto">`,
`<Figure src alt caption? credit? duo? />`, `<PdfPage doc page />`, `<Download href label note? />`.
`auto` shows a looked-up value with a "Filled in from City records" badge until the person types their own
(paths & formats: src/lib/autofill.ts). Widgets that render fields later dispatch `piat:bind` on their root.

### Widgets

Placed in chapters as Astro components from `src/components/widgets/`. Each starts as a stub; its owner replaces
the file (usually an Astro wrapper around a Preact island with `client:visible` or `client:only="preact"`).
Props stay optional so chapters never break.

| Widget | Where | Owner |
|---|---|---|
| `LotLookup mode="primary\|candidates"` | Acquire, home, /lot | philly-data |
| `LotFinderMap` | Acquire, /lot | philly-data |
| `SiteReport` | Assess, /lot | philly-data |
| `NeighborhoodAssets` | Organize | philly-data |
| `BaseMap` (printable grid diagram with edge lengths) | Assess | philly-data |
| `Planner mode="site\|design"` | Assess (site: existing conditions + sun), Dream, /planner | planner |
| `SunStudy` | Assess | planner |
| `CostEstimator` | Dream, Create | cost |
| `PlantPicker theme?` | Dream, /plants | resources |
| `ParksMap` | Start, /parks | resources |
| `MeetingFlyer` | Organize | content-a |
| `BuildSchedule` (phases → weekends, .ics) | Create | content-b |
| `StewardshipCalendar` (seasonal tasks, .ics) | Sustain | content-b |

## 4. Look and feel

Matched to the PDFs: white paper; black heavy slab titles with a **6px black rule** underneath and a big cyan step
number ("ASSESS ——— 03"); section heads in heavy uppercase Work Sans ("FIND A LOT"); photos in **cyan duotone**
(`.duo`); isometric line illustrations with cyan fills; one colour per park theme.

- Fonts: Work Sans (the workbooks' face) + Alfa Slab One (stand-in for Rockwell Extra Bold), self-hosted via fontsource.
- Colours (`src/styles/global.css`): cyan `#00A8E8` for fills/big numbers, `#00709C` for text/links (contrast);
  themes: Edible `#F05A28`, Sanctuary `#0B4A6B`, Nature `#006B35`, Event `#8E1F6B` (frame/front/back shades in
  `src/data/themes.ts`).
- Light only (paper look). Mobile first: 16px gutters, no horizontal scroll at 360px.
- Print: `@media print` produces a filled-in workbook (fields print with their values).

## 5. Park pieces, sizes, planner

- **Sizes A–E** (`src/lib/sizing.ts`): long/short edge ranges from Assess p.11. Lots smaller than A → suggest the
  Park Patch workbook; bigger than E → E + expansion.
- **Piece sets**: `source/linked/04_Dream_WORKBOOK_p11_<SIZE>__*.pdf`, one per size × lot kind
  (interior / corner street-left / corner street-right), drawn at **1/4" = 1'-0" (18 pt per foot)** on a 4-ft grid.
  Each theme has a FRAME, FRONT and BACK piece plus length/width SEAM strips. Extracted to
  `src/data/pieces/<size>-<lotKind>.json` (pieces workstream). The pieces are printed at the *minimum* of each size's
  range (A 44×12, B 64×16, C 76×28, D 88×32, E 80×44 ft); the seams add up to the range maximum. Data model:
  `src/lib/pieces/model.ts`; extraction and its known deviations: `docs/pieces.md`.
- **Assembly** (`src/lib/pieces/assemble.ts`): choose frame/front/back themes (mix and match), stretch from the
  set's nominal size to the real lot with seams exactly as the Dream workbook does (length seam between front and
  back; width seam along the length), apply the person's edits → `ParkLayout` (types.ts). `tally(layout, sun)` →
  `DesignTally` (counts the way "Count your pieces / Count your plants" do).
- **Planner** (`src/lib/planner/`, `Planner` widget): Three.js. Parcel outline + neighboring buildings extruded to
  their City heights + aerial ground image; the park layout placed in the parcel's oriented rectangle (street edge
  detected, flip/rotate by hand); plan view (orthographic, looks like the paper pieces) and 3D view; drag, add,
  remove, rotate items (mouse: drag any item on any step, round handle to turn, drag from the palette to drop,
  right-click/long-press menu, Ctrl+D duplicates — copies keep the original's footprint); existing conditions (trees, downspouts, wet areas, hydrants, utility lines); **sun study**
  for any date/time and growing-season sun-hours per 4×4 ft square → sun/shade classes that feed the tally.
  Sun classes: ≥6 h direct sun = sun, 3–6 h = part, <3 h = shade; the workbook's two-way count treats part as shade
  unless the plant list says otherwise.

## 6. Automation map (what the workbooks ask → what the site does)

| Workbook asks | Site does | Data |
|---|---|---|
| Acquire: walk the neighborhood, list possible lots | Vacant-land map around an address; click to add as candidate | ArcGIS `Vacant_Indicators_Land` |
| Acquire: which lot type? | Guess mid-block / corner / alley from parcel geometry + streets | parcels, street centerlines |
| Acquire: atlas.phila.gov → owner | Address search → owner, public/private, purchase paths | AIS, Carto `opa_properties_public` |
| Organize: list neighborhood assets & associations | Nearby RCOs, council district, schools, libraries, rec centers, parks, community gardens, murals, historic sites | ArcGIS/Carto layers |
| Assess: measure the lot in Google Maps | Edge lengths and area from the parcel polygon | `pwd_parcels` / `DOR_Parcel` |
| Assess: draw the lot on grid paper | Printable base map on a 1-ft/4-ft grid with dimensions and starting point | parcel polygon |
| Assess: note sun/shade, adjacent buildings | Sun study from real building heights | `LI_BUILDING_FOOTPRINTS` (`approx_hgt`, `max_hgt`) |
| Assess: record existing trees/objects | Street & park trees pre-placed from City inventory; click to add others | `ppr_tree_inventory_2025` |
| Assess: flooding / wet areas | FEMA flood zone flag | `fema_floodplain_2023` |
| Assess summary: trees, sun, lot location, size A–E | Filled in automatically | all of the above |
| Dream: print pieces, cut seams, tape, count squares | Planner does it on the real lot; counts automatic | pieces JSON |
| Dream: cost-estimator spreadsheet | Live estimate + order list from the design | ported spreadsheet |
| Dream: plant-list spreadsheets | Plant picker sized to sun/shade counts | plant lists |
| Create: calendar template | Build schedule from a start date, .ics export | phases |
| Create: temporary no-parking permit, PA One Call 811 | Linked at the right phase with the lot address filled in | links |
| Sustain: annual workplan | Seasonal task calendar, .ics export | Sustain workbook |

City endpoints verified 2026-10-04 (CORS `*`, no key): `https://phl.carto.com/api/v2/sql?q=…`
(`opa_properties_public`, `pwd_parcels` with `the_geom`), `https://api.phila.gov/ais/v1/search/<address>`,
`https://services.arcgis.com/fLeGjb7u4uXqeF9q/arcgis/rest/services/<layer>/FeatureServer/0/query`.
Be polite: debounce, cache per session, never bulk-crawl.

### Shared `project.extra` keys (one writer each; see `SiteFacts` in types.ts)

| Key | Writer | Readers |
|---|---|---|
| `extra.site` (size A–E, edges, oriented rect, street edges, lot kind) | philly-data (on choosing a lot) | planner, Assess summary, pieces |
| `extra.site.sunClass`, `extra.site.treesKept` | planner | Assess summary |
| `extra.tally` (DesignTally) | planner | cost, plants, Dream counts |
| `extra.sunGrid` | planner | plants |
| `extra.costInputs` | cost | — |
| `extra.plants` | resources | Create (ordering) |
| `extra.buildSchedule`, `extra.stewardship` | content-b | My park |

Lot kind convention: stand on the entrance edge (x=0) looking into the park (+x). **corner-left** = the side
street runs along your left (edge y1); **corner-right** = along your right (y0). The pieces workstream checks this
against the printed pieces and corrects it here if the PDFs say otherwise.
*Verified 2026-10-04 (pieces workstream):* the printed pieces agree. Every set draws a 1-ft gabion wall along its street
edges; the street-left sets carry it along the long edge on your left (y1) when you enter at the front piece, the
street-right sets along your right (y0), and the Dream workbook's "Lot location?" drawings show the same. Two of the
fifteen downloads are mislabelled (the B and E "street right" links open street-left pieces); see `docs/pieces.md`.

Maps: `src/lib/mapstyle.ts` — OpenFreeMap positron basemap (no key) and City of Philadelphia 3-inch aerial
tiles (2025; years back to 1996 — useful for "what once stood where your park is?").

## 7. Workstreams (parallel agents, one worktree each)

| Name | Model | Owns |
|---|---|---|
| content-a | Sonnet | `start`, `acquire`, `organize`, `assess` chapters; their images & downloads; `MeetingFlyer` |
| content-b | Sonnet | `dream`, `create`, `sustain` chapters; Park Patch + Playful Learning pages; `BuildSchedule`, `StewardshipCalendar` |
| guides | Sonnet | `src/data/guides/`, `/build/` pages, guide images & PDFs |
| resources | Sonnet | `plants.json` + `PlantPicker` + `/plants/`; `parks.json` + `ParksMap` + `/parks/`; `resources.json` + `/resources/` |
| philly-data | Opus | `src/lib/philly/`, `LotLookup`, `LotFinderMap`, `SiteReport`, `NeighborhoodAssets`, `BaseMap`, `/lot/` |
| pieces | Opus | `src/data/pieces/`, `src/lib/pieces/`, `src/data/elements.ts`, `src/data/themes.ts` colours, plan SVG renderer |
| planner | Opus | `src/lib/planner/`, `Planner`, `SunStudy`, `/planner/` |
| cost | Opus | `src/lib/cost/`, `CostEstimator` |

Rules: work only in your own files; shared files (`types.ts`, `global.css`, `Base.astro`, `package.json`) get
**additive** changes only, called out in your final report. Worktrees: `~/Desktop/park-in-a-truck-wt/<name>` on
branch `agent/<name>`; the orchestrator merges to `main`. Tests: `npm test` (vitest); build: `npm run build`.

## 8. Open items

- Findings for the PiaT team (broken links, mislabeled piece files, guide typos, spreadsheet issues):
  `docs/notes-for-piat-team.md` and `docs/piat-spreadsheet-issues.md`. Owner decides whether/how to send.
- Ask PiaT: logo files, photo permissions, current prices, gabion wall height (site assumes one course).
- Hosting: still private / local. To publish on GitHub Pages later: make the repo public (owner's call), build with
  `SITE_BASE=/park-in-a-truck/`, deploy `dist/`.
