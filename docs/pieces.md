# Park pieces — extraction and assembly

How PiaT's printable **park pieces** (Dream workbook p.21–25, the 15 downloads
`04_Dream_WORKBOOK_p11_<SIZE>__<id>.pdf`) became data, and how the site puts them
together the way the workbook does on paper. Owner: pieces workstream.

| What | Where |
|---|---|
| Extracted sets (one per size × lot kind) | `src/data/pieces/<size>-<lotKind>.json`, loaders `index.ts` (lazy) / `all.ts` (eager, build/tests) |
| Data model | `src/lib/pieces/model.ts` |
| Assembly (themes, seams, edits) → `ParkLayout` | `src/lib/pieces/assemble.ts` |
| Counting → `DesignTally` | `src/lib/pieces/tally.ts` |
| Plan-view SVG | `src/components/pieces/PlanView.tsx` |
| Element vocabulary, theme colours | `src/data/elements.ts`, `src/data/themes.ts` |
| Extraction scripts | `scripts/extract_pieces.py` (+ `pieces_stitch.py`, `pieces_classify.py`, `pieces_analyse.py`) |
| Validation images | `docs/pieces-validation/<set>.png` (`scripts/pieces_validate.py`) |
| Dev gallery | `/dev/pieces/` (every set × theme, plus mixed / stretched / trimmed examples) |

## The sets

The pieces are printed at the **minimum** of each size's range; the seams add up
to the maximum. Park-local feet: x along the length (front at x0 = entrance on
the street), y along the width, y up — standing on x0 looking toward +x, **y1 is on
your left** (DESIGN.md §5).

| Set | Nominal (L × W) | Front + back (x) | Interior (y) | Street edges | Source file (link column on Dream p.11) | Notes |
|---|---|---|---|---|---|---|
| A-interior | 44 × 12 | 0–24 + 24–40, frame = end cap 40–44 | whole width | x0 | `…A__1e3j5d8Z…` (interior) | A has no separate side strips: the front and back carry them |
| A-corner-left | 44 × 12 | 0–28 + 28–40, end cap 40–44 | whole width | x0, y1 | `…A__1LBQG4r2…` (left) | |
| A-corner-right | 44 × 12 | 0–28 + 28–40, end cap 40–44 | whole width | x0, y0 | `…A__1Txw_BMZ…` (right) | |
| B-interior | 64 × 16 | 4–36 + 36–60 | 4–16 (one strip, on y0) | x0 | `…B__1LC6QvBJ…` (interior) | |
| B-corner-left | 64 × 16 | 4–40 + 40–60 | 0–12 (strip on y1) | x0, y1 | `…B__1LQmrAsZ…` (left) | printed mirrored (front on the right); the "street **right**" link `…1LKVUm28…` opens an identical file |
| B-corner-right | 64 × 16 | mirror of B-corner-left | 4–16 | x0, y0 | — | **derived**: no street-right B set was published |
| C-interior | 76 × 28 | 4–48 + 48–72 | 4–24 | x0 | `…C__1LR04NYM…` (interior) | |
| C-corner-left | 76 × 28 | 4–48 + 48–72 | 4–24 | x0, y1 | `…C__1LJCzWBk…` (left) | some pages say "CORNER LOT D" (typo) |
| C-corner-right | 76 × 28 | 4–48 + 48–72 | 4–24 | x0, y0 | `…C__1LSWINYM…` (right) | |
| D-interior | 88 × 32 | 4–52 + 52–84 | 4–28 | x0 | `…D__1LfpisFC…` (interior) | |
| D-corner-left | 88 × 32 | 4–52 + 52–84 | 4–28 | x0, y1 | `…D__1LejWNaZ…` (left) | Nature pages repeat the Sanctuary art → nature taken from D-corner-right, mirrored |
| D-corner-right | 88 × 32 | 4–52 + 52–84 | 4–28 | x0, y0 | `…D__1LSqUwvH…` (right) | the workbook's worked example (Event) |
| E-interior | 80 × 44 | 4–48 + 48–76 | 4–40 | x0 | `…E__1L-pqs-C…` (interior) | the frame's fourth side is printed as a strip on the front/back sheets |
| E-corner-left | 80 × 44 | 4–48 + 48–76 | 4–40 | x0, y1 | `…E__1LiE8uy8…` (left) | the "street **right**" link `…1LlyI3QG…` opens an identical file |
| E-corner-right | 80 × 44 | mirror of E-corner-left | 4–40 | x0, y0 | — | **derived**: no street-right E set was published |

### Lot kind: verified from geometry

Every set draws a 1-ft **gabion wall** (grey stone band) along its street edges, and
the entrance gaps in the frame sit on those edges. The extractor measures the share
of each outer 1-ft band that is gabion (`edgeGabionShare` in each JSON) and decides
the kind from it: street-left sets carry it along y1, street-right along y0, interior
sets only along x0. This agrees with the convention in DESIGN.md and with the
workbook's own "Lot location?" drawings (corner lot – street right: the long side
street is on your right as you enter from the short street edge). Mislabelled
downloads: the **B** and **E** "street right" links open the street-left pieces
(their covers even say STREET LEFT); the two B files and the two E files are
byte-identical. The missing street-right sets are the street-left ones mirrored
across the length axis (`source.derivedFrom`).

### Source defects carried in `issues`

- **B corner** (both files): the NATURE pages reuse the SANCTUARY images. There is no
  other B corner nature art, so B-corner nature repeats the sanctuary layout
  (coloured as Nature). B-interior has real nature pieces.
- **D corner-left**: the NATURE pages reuse the SANCTUARY images; the nature pieces
  are D-corner-right's, mirrored.
- The KEY pages are generic (one D-size layout for every set, drawn street-on-the-
  bottom) — used only to identify the symbols, never as geometry.

## Extraction

1. **Stitch** (`pieces_stitch.py`). Each piece is cut across letter pages; every page
   places a JPEG tile with a clip rectangle. Tiles are rendered at 32 px/ft (text
   removed), laid left to right in page order with their page offsets, and the frame's
   white "PIECE GOES HERE" window is found; the front and back go into it (front on
   the side its label names). A sets are three tiles on one page (front, back, 4-ft
   end cap). E prints the frame's fourth side as a strip on the front/back sheets.
2. **Classify** (`pieces_classify.py`). The art is flat colour, so each pixel is matched
   to a palette of fills sampled from the pieces (theme grounds and greens, wood
   tones, furniture colours, gabion grey…).
3. **Analyse** (`pieces_analyse.py`), at 16 px/ft, per piece:
   - **surfaces** on a half-foot grid (majority material per cell, furniture cells
     filled from the nearest surface), then merged into rectangles;
   - **items** by connected components with rules for colour, size and shape (below).
4. **Assemble the JSON** (`extract_pieces.py`): page space → park space (rotating the
   mirrored B prints by 180°), joins elements drawn across a piece boundary (a
   table or canopy split between frame and back becomes one item owned by the piece
   holding most of it), sets the materials under stage / shed / raised beds, checks
   the lot kind, records source page + tile box for every piece.

Rerun: `~/Desktop/park-in-a-truck/source/.venv/bin/python scripts/extract_pieces.py [A B …]`
(needs pymupdf, numpy, scipy, pillow; ~10 min for all). Validation images:
`PIECES_SVG_DIR=/tmp/svg npx vitest run scripts/pieces-svg.test.mjs` then
`…/.venv/bin/python scripts/pieces_validate.py /tmp/svg`.

### Colour → material

| Fill on the pieces | Material | Why |
|---|---|---|
| theme-tinted stippled ground (Edible `#FFF1E6`, Sanctuary `#E0EBEF`, Nature `#F0F9F6`, Event `#F2E7EF`) | `gravel` | Create workbook: "spread gravel 2" deep in all areas except plant beds" |
| textured green (Edible `#83CD62`, size-D corner Edible `#5BC777`, Sanctuary `#4CBD91`, Nature `#84CBA8`, Event `#67C57B`) | `planting` | "Everywhere there is green, is your planting area" (Count your plants) |
| grey stippled 1-ft band (`#A49D97`, `#879193`) | `gabion` | the KEY's GABION WALL callout; 12" gabion baskets (assembly guide) |
| salmon field `#F1AA7E` (Nature front) | `nature-play` | NATURE PLAY callout |
| dark wood deck with white boards in the Event frame | `wood-deck` | STAGE callout |
| tree canopies (darker green; olive over nature play; mint over gravel; brown over benches; grey-green over gabions) | the surface beneath | canopies are drawn semi-transparent over the ground |
| under sheds and raised beds | `gravel` | they sit on the gravel base; bed soil is not a "green square" |

### Symbol → element (matched to the KEY pages' callouts)

| Symbol | Element | KEY callout |
|---|---|---|
| bumpy green disc, canopy < 6 ft | `small-tree` | tree icons on the frame strips |
| canopy ≥ 6 ft (translucent, Sanctuary/Nature islands, nature play) | `large-tree` | |
| yellow dot (lime `#BFE35D` in size-D corner Edible) | `shrub` | "Count your plants": SHRUB |
| dark-orange bar with white lines `#DE7935` | `gabion-bench`, 4-ft modules | WOOD TOPPED GABION |
| mid-orange bar with a dark back line `#EB974E` | `bench-back`, 4-ft modules | BENCH |
| light-orange bar `#F5A96B` (Edible) | `workbench`, 4-ft modules | WORKBENCH / STANDING TABLE |
| ~1.5-ft solid square in the theme's seat colour; striped squares at bench ends | `stool` | the slatted-cube icon |
| ~2-ft striped salmon square `#E8B088`, free-standing | `table-2` | TABLE + STOOLS |
| small dark table with a chair each side | `cafe-table` | TABLES + CHAIRS (optional) |
| long table with chairs | `communal-table` | COMMUNAL TABLE |
| slatted lattice (Edible yellow, Sanctuary orange) | `shade-canopy` (one item per drawn canopy; `area` in ft²) | SHADE CANOPY |
| solid block in a frame corner (Edible red-orange, Event purple/lilac, Sanctuary mauve) | `shed` | SHED |
| wood deck ≥ 4 ft deep in the Event frame | `stage`, 4×4-ft squares | STAGE |
| dark-red outlined squares | `compost-bin` | COMPOST BINS |
| orange-outlined open boxes with a back rail (Edible frame) | `cold-frame` | COLD FRAMES |
| green striped bed with an orange rim | `raised-bed` (`shape: 'rect'`) | RAISED BEDS |
| green ring with a grey rim and a centre hole | `keyhole-garden` | RAISED BEDS ("keyhole-style self-composting vegetable bed") |
| solid round green bed | `raised-bed` (`shape: 'round'`) | RAISED BEDS ("…or planters") |
| teal disc with an orange rim | `rain-barrel` | RAIN BARREL |
| ignored | 4-ft grid ticks, cyan align symbols, shed door swings, cut lines | |

## Assembly and seams (`assemble`)

`assemble(set, {frame, front, back}, lengthFt?, widthFt?, edits?) → ParkLayout`

- **Mix and match.** Each piece comes from its own theme; within a set every theme's
  front ends at the same x and every frame has the same window, so any combination
  tiles the park exactly ("All pieces are interchangeable").
- **Length seam** (`seams.length.x`, between front and back, across the whole width):
  extra length is inserted there. Surfaces touching or crossing the seam stretch
  (the front's boundary column and the frame strips grow); everything at or beyond
  the seam moves by the extra length; items keep their size.
- **Width seam** (`seams.width.y`, along the length, between the interior and the
  frame strip on the street side — y0 for interior and street-right sets, y1 for
  street-left): the interior side stretches, the strip with its trees keeps its depth.
  This follows "Add your width seam" (Dream p.31 cuts the street-right example along
  the bottom strip — the street side). For interior lots either side would do; y0 is used.
- The workbook's printed seam strips are neutral gravel; stretching instead extends
  whatever touches the seam, which gives gravel through the interior (as printed)
  and keeps the frame's planting and gabion wall continuous.
- **Smaller lots:** a strip is cut out instead, inside the interior span, at the
  position that clips the fewest items (ties: nearest the seam). Items more than half
  inside the removed strip are dropped and listed in `clipped`.
- **Ids** are `<piece>-<theme>-<n>` (n = order in the set file), so `DesignState.removed`
  / `moved` survive re-assembly at another size and are never applied to another
  theme's piece. `added` items get their footprint and height from `elements.ts`.
- `countGrid` carries the pieces' 4-ft grid through the seams (the seam strip gets its
  own 4-ft marks); `pieces` gives each piece's outline and theme.

## Counting (`tally`)

Counts the way "Count your pieces / Count your plants" do: 4×4 squares on the
`countGrid` that are at least half planting (seam-strip squares narrower than 4 ft
count for their share), sun/shade at each square's centre with *part* counted as
shade, nature-play squares likewise, shrubs by sun/shade, small and large trees,
furnishings by element. Additive extras on `DesignTally`: `gabionWallFt` (gabion area
/ 1 ft) and `raisedBedEdgeFt` (bed perimeters — "how many feet are your wood edges?").
Edging: `gravelEdgeFt` = boundary between gravel and planting / nature play;
`outerEdgeFt` = park perimeter without gabion wall or shed. Hardscape vs softscape is
unknown here, so both go to `softscape`.

**Worked example check:** the "Count your pieces" page numbers the green squares of a
size-D corner (street right) Event park 1–42 — left strip 1–5, top strip 6–18, bottom
strips 19–27 and 28–36, right strip 37–42. `tally(assemble(D-corner-right, Event))` at
88 × 32 gives **42**, the same squares (`src/lib/pieces/__tests__/tally.test.ts`). The page
leaves the furniture and plant counts blank; at 90 × 35 (the workbook's lot) the seams
add one more strip square (43).

## Known deviations

- Raster source: positions and sizes are measured at 16 px/ft (≈ ±0.1 ft); surfaces
  snap to a half-foot grid. Furniture runs are split into 4-ft modules.
- Bench-end squares are read as stools (the KEY points the slatted-cube icon at them);
  they could also be read as 18" planters.
- Light-orange wood in Edible is the workbench (KEY: frame and back); other themes'
  light benches are benches with backs.
- Overlapping tree canopies are split by shape; a canopy cut by a piece edge counts
  once, sized by its visible chord.
- A few stray symbols in the art (yellow shrub dots on gravel in Edible) are kept as
  drawn.
- When mixing themes, an element drawn across the frame/interior boundary belongs to
  one piece only, so it may overhang a different theme's piece.
- B-corner Nature repeats the Sanctuary layout (source defect, see above).
