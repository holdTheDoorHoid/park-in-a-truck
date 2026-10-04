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
| Furniture order list (2026-10-04) | **From each build guide's own materials list**, priced with the spreadsheet's prices ("price needed" where none). The spreadsheet's furniture lines disagree with the guides; its faithful "sheet" mode stays for tests. |
| Safety notes (2026-10-04) | Where PiaT's text could get people into **legal or health trouble** (hydrant without a permit, lead testing, street-tree pruning, herbicides), add a **short note clearly marked as from this site**, linking the official source. Everything else goes to the PiaT notes. |
| Languages (2026-10-04) | **English + 11**: Spanish, Chinese (Simplified), Vietnamese, Russian, Arabic (right-to-left), Haitian Creole, French, Portuguese, Swahili (phila.gov's nine) + Korean and Tagalog. **Translated into the site** ahead of time (no live Google Translate), with a shared glossary; every translated page says it was machine-translated and links the English. A language box in the header (top right); on a first visit in another browser language the site **offers** that language in one line, never switches by itself; the choice is remembered. The meeting flyer can print in any site language **or two side by side**. PiaT's original PDFs stay English. |

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
`<Checklist id items />`, `<Choice id label options />`, `<Callout kind="tip|note|warning|contact|auto|site">`,
`<Figure src alt caption? credit? duo? />`, `<PdfPage doc page />`, `<Download href label note? />`.
`auto` shows a looked-up value with a "Filled in from City records" badge until the person types their own
(paths & formats: src/lib/autofill.ts). Widgets that render fields later dispatch `piat:bind` on their root.
`kind="site"` is the dashed "Note from this site, not Park in a Truck" box for the §2 safety notes (each 1–3
sentences, linking the official source, marked `{/* site-added: … */}`). Build guides use the same box through
`siteNote` on a step, a materials line or a cut-list line (`src/data/guides/index.ts`) where PiaT's text disagrees with
its own cut list or drawings.

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
  Park Patch workbook; bigger than E → E + expansion. A lot between ranges gets the *biggest set whose printed pieces
  fit inside it in both directions* (seams only ever add feet — never a set bigger than the lot; fixed 2026-10-04,
  saved projects are re-fitted on load in `project.ts`).
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
  *Built size (fix round 2026-10-04, `pieces/builtsize.ts`):* furniture built to a fixed size (guide furniture,
  café sets, rain barrels) takes its TRUE size from `elements.ts`, turned the way the drawing runs — not the size
  it happens to be drawn at (a 4' gabion bench is drawn 4×1.75, 3.75×2, 5×1.75…). Stages are whole 4'×4' squares and
  shade canopies whole 8'×8' modules (a canopy drawn 8'×4' is one 8'×8' module). Surfaces stretch; sized-to-fit
  things (raised beds, keyhole gardens, sheds, communal tables, compost bins) keep their drawn size. Item cards, the
  tally and the 3D view all read the same footprint.
- **Planner** (`src/lib/planner/`, `Planner` widget): Three.js. Parcel outline + neighboring buildings extruded to
  their City heights + aerial ground image; the park layout placed in the parcel's oriented rectangle (street edge
  detected, flip/rotate by hand); plan view (orthographic, looks like the paper pieces) and 3D view; drag, add,
  remove, rotate items (mouse: drag any item on any step, round handle to turn, drag from the palette to drop,
  right-click/long-press menu, Ctrl+D duplicates — copies keep the original's footprint); existing conditions (trees, downspouts, wet areas, hydrants, utility lines); **sun study**
  for any date/time and growing-season sun-hours on a 1-ft grid (2-ft on lots over 8,000 sq ft); each 4×4 ft square takes
  the class at its centre → sun/shade classes that feed the tally.
  Sun classes: ≥6 h direct sun = sun, 3–6 h = part, <3 h = shade; the workbook's two-way count treats part as shade
  unless the plant list says otherwise.
  *Trees and seasons (2026-10-04):* a crown blocks 60% of the sun in leaf, 30% bare; deciduous leaves come out
  Apr 1 – May 1 and fall Oct 25 – Nov 20 (`treemodel.ts`); evergreens (from the City inventory's species name, or
  the person's choice for trees on the lot) block 60% all year. The 3D view draws the same thing: dappled crown
  shadows (a leaf-clump pattern whose kept share = the blocking share), bare limbs in winter, cones for needle
  trees. Ground heights (`ground.ts`) are used for every grid cell, crown and building base. The map can show any
  period (a day, a month, a season, the growing season, the year); only the growing season is saved and counted.
  Clicking a spot charts its direct sun month by month.
  *Furniture in 3D (2026-10-04, `src/lib/planner/furniture/`):* the 3D view draws items as the real thing; plan
  view keeps the flat paper-pieces blocks. Pieces with a build guide use the guide's own model JSON at TRUE built
  size, centred on the footprint and never stretched: repeated in modules along the item the way PiaT counts them
  (4' benches/workbenches, stage as 4'×4' squares unless the whole 12'×8' stage fits, shade canopies as 8'×8'
  modules); since built items take their true size in the assembly (above), every guide-built piece of every
  printed set fits; a footprint no whole number of modules fits would keep its block. Gabion walls (bands and items) are 12"×12"×48"
  baskets of stone, one course, plus one shorter end basket. Items without a guide get simple shapes (`procedural.ts`);
  planted trees share the City trees' drawing. Furniture is built level on the lowest ground under it; surfaces,
  grid, outlines and the selection ring follow the ground. The plain blocks stay underneath, invisible, as what the
  mouse picks. Detail steps down (high → low → blocks) when frames stay slow; `?furniture=high|low|blocks` pins it.
  *Ground and slope (terrain, 2026-10-04):* ground heights come from USGS 3DEP lidar (Philadelphia: flown 2015,
  1 m grid, NAVD88) — one `exportImage` request per lot for a ±310 ft square (raw floats, ≈140 KB), cached for the
  session; demo lots use recorded fixtures (`fixtures/<slug>.elevation.json`, `capture_elevation.py`). The service
  is slow for a new area (5–15 s), so the lot shows flat first and the ground fills in; if it fails the lot stays
  flat with a one-line note. Datum = the lot's average elevation (`ground.ts`); the ground between lidar cells is
  bilinear. Buildings stand on the LOWEST ground along their outline — the City's `base_elevation` matches that
  (median 0.15–0.37 ft on 230 buildings around four lots, vs 1–2 ft for the mean ground), so City heights are
  measured from it; walls reach down to it and roofs stay where the City puts them. The aerial ground, lot line,
  markers and selection lie on the ground (one draping helper for everything: `furniture/drape.ts`; one ground-picking
  path for drags, drawing and spot clicks); the plain ground beyond the photo sits below its lowest point; no vertical exaggeration (contour lines show subtle slopes instead).
  Slope summary (`terrain/slope.ts`): fall, average slope (fitted plane), steepest 8-ft stretch, which way rain
  runs (front = entrance edge on the street; left/right as you stand there looking in), any dip lower than the
  lot's whole edge, and the City zoning map's Steep Slope Protection Area; plan-view overlay with contour lines,
  arrows downhill and High/Low marks. Saved for other pages as `extra.site.slope` (`SiteSlopeFacts`).
  Wet areas are drawn as outlines (click/tap round the area; close on the first point, double-click or Enter; Esc
  cancels; drag corners or the + between them); older circle wet areas keep working (`ExistingItem.outline`).
  *Fix round 2026-10-04 (after usability testing):*
  - **Fitting the lot** (`lotfit.ts`): "Stretch the pieces to fill my lot" stretches to the largest rectangle, lined
    up with the site frame, that fits INSIDE the parcel (not the rectangle round it), and the park is placed in it;
    a size whose printed pieces can't fit says so and offers the size that does. Slide buttons with no room are
    greyed; "Slide it to fit the lot as well as it can" searches for the least overhang.
  - **Camera** (`camera.ts`, `scene/xray.ts`): the 3D camera never goes inside a building (it rides over roofs) or
    below eye height, tilts no lower than ~14° above the horizon, turns round a point near the lot and can't pull
    back past the aerial. Any part of a building between the camera and the lot (a box round the lot's rectangle,
    ground to 14 ft up) is drawn as a faint ghost; shadows and sun maths still see every wall.
  - **Planted trees** in 3D: crown radius = a third of the height (`treemodel.plantedCrownR`), so the crown starts a
    third of the way up; plan view keeps the drawn canopy. Not in the sun study (City/existing trees unchanged).
  - **Gabion wall**: Counts lists it in feet; plan view draws the band over the lot line with its basket joints;
    a click on it says what it is.
  - **Words**: items say "29 ft from the entrance, 4 ft from the left side"; mid-block lots say whether City
    buildings actually stand on each side (`neighbours.ts`); touch screens get touch wording.
  - **Keyboard**: shortcuts work whenever something is picked and focus is in the planner (or on the page right
    after using it), and R / Delete / Ctrl+D from the item list; after Remove focus goes to the item list (or the 3D
    view) and a status message says what was removed.
- **Build-guide 3D models** (`src/data/guides/models/<slug>.json`, format `src/lib/guides3d/schema.ts`, checked by
  `validate.ts`): on `/build/<slug>/` a 3D model sits beside the steps (sticky column ≥ 1000 px, collapsible sticky
  strip above the steps below that) and builds itself as you scroll — the step at the upper-middle of the readable
  area is current; its parts fly in and glow cyan; step 1 ("mark, label and cut") lays every board out flat and
  labelled. Replay / play all / exploded / reset buttons; drag to spin, zoom only once the model is clicked.
  Pure logic in `src/lib/guides3d/{scroll,timeline,layout,framing,labels}.ts` (tested); three.js drawing in
  `viewer.ts` (`buildModelGroup(model)` is reusable, e.g. by the planner), loaded lazily; island
  `src/components/guides3d/`. No model, no WebGL or no JS → the page is the plain step list. Modellers check their
  work at `/dev/model-check/?slug=&step=`.

## 6. Automation map (what the workbooks ask → what the site does)

| Workbook asks | Site does | Data |
|---|---|---|
| Acquire: walk the neighborhood, list possible lots | Vacant-land map around an address or a street's block (street name alone → its blocks); click a lot, or pick it from the list of lots in view (keyboard way), to add as candidate | ArcGIS `Vacant_Indicators_Land`, `Street_Centerline` |
| Acquire: which lot type? | Guess mid-block / corner / alley from parcel geometry + streets | parcels, street centerlines |
| Acquire: atlas.phila.gov → owner | Address search → owner, public/private, purchase paths (City / Land Bank / PRA / PHDC land → the workbook's PHDC–Land Bank path; PHA, School District and other separate agencies → "contact that agency") | AIS, Carto `opa_properties_public` |
| Acquire: "do a property search to find out if public land is available" | The Land Bank's own status on cards, compare table and map (available / on hold / applicant in process / not available, side-yard eligible) | ArcGIS `LAMAAssets` (agencies PUB, PLB, PRA, PHDC; `status_1`, `sideyardeligible`, keyed by `opabrt`) |
| Organize: list neighborhood assets & associations | Nearby RCOs, council district, schools, libraries, rec centers, parks, community gardens, murals, historic sites | ArcGIS/Carto layers |
| Assess: measure the lot in Google Maps | Edge lengths and area from the parcel polygon | `pwd_parcels` / `DOR_Parcel` |
| Assess: draw the lot on grid paper | Printable base map on a 1-ft/4-ft grid with dimensions and starting point | parcel polygon |
| Assess: note sun/shade, adjacent buildings | Sun study from real building heights | `LI_BUILDING_FOOTPRINTS` (`approx_hgt`, `max_hgt`) |
| Assess: record existing trees/objects | Street & park trees pre-placed from City inventory; click to add others | `ppr_tree_inventory_2025` |
| Assess: flooding / wet areas | FEMA flood zone flag | `fema_floodplain_2023` |
| Assess: sloping terrain, where water collects | Slope summary, contour lines and arrows downhill; wet areas drawn as outlines | USGS 3DEP lidar (2015), `Zoning_SteepSlopeProtectArea_r` |
| Assess summary: trees, sun, lot location, size A–E | Filled in automatically | all of the above |
| Dream: print pieces, cut seams, tape, count squares | Planner does it on the real lot; counts automatic | pieces JSON |
| Dream: cost-estimator spreadsheet | Live estimate + order list from the design; furniture from the build guides | ported spreadsheet + guides |
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
| `extra.site.slope` (SiteSlopeFacts) | planner (terrain) | any page (no workbook field asks for it yet) |
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
