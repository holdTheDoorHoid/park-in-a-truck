# Cost model — Park in a Truck's cost estimator, traced

The Dream workbook (p.18, "Count your pieces") sends people to a Google Sheet:
fill in the orange squares, get a cost and an order list. This document traces that
sheet formula by formula. The site's port is `src/lib/cost/` and reproduces it cell
for cell, **mistakes included** — where the sheet is wrong, the port shows the same
number and says so (a line note or a warning) instead of silently fixing it.

- Source: `source/linked/04_Dream_WORKBOOK_p18_DOWNLOAD_COST_ESTIMATOR__1mRUQ_FwFtU8SxZ8-7fcfmPczAj6o3E4JHtpY_KQhqHk.xlsx`
  (Google Sheets export, kept outside git).
- Port: `model.ts` (inputs, estimate, summary), `orderList.ts` (ORDER LIST tab),
  `prices.ts` (every price and link — the one place to update them), `fromTally.ts`
  (design → inputs), `fields.ts` (questions as asked), `state.ts` (saved answers),
  `csv.ts` (download).
- Evidence: `scripts/analyze_cost_model.py` (see [Testing](#testing)).

Cell references: `IH` = INSERT HERE, `QPI` = QUANTITES PER ITEM (sic), `OL` = ORDER LIST,
`MC` = MATERIAL CALCULATIONS.

## The five tabs

| Tab | What it is |
|---|---|
| INSERT HERE | The questions (orange cells) and the summary: one subtotal per section, totals, contingency, FINAL COST. |
| QUANTITES PER ITEM | One block per section: quantity (C/J), unit (K), unit price (L), cost (M), link (N). The summary cells point here. |
| ORDER LIST | What to buy, merged by material (SUMIF over QPI by item name), with links, delivery times and its own subtotal. |
| MATERIAL CALCULATIONS | Lumber cut lists for gabions, benches, stages, trellises, tables, stools, cold frames, a standing table. Only a handful of constants reach the estimate (listed under oddities). |
| Sheet5 | Empty. |

The functions used are `SUM`, `SUMIF`, `COUNTIF` and `ROUNDUP` (some written in lower
case). None is Google-only; LibreOffice evaluates all 1,505 formula cells to the same
values Google cached (checked by `analyze_cost_model.py verify`).

## Inputs

The orange cells, plus four answer cells the sheet reads but forgot to colour, plus
"other costs" (F145, inside the FINAL COST sum). Names are `CostInputs` keys.

| Key | Cell | Question (sheet's words) | Used? |
|---|---|---|---|
| `longSideFt` | B5 | How many feet is the LONG side of your park? | yes |
| `shortSideFt` | B7 | How many feet is the SHORT side of your park? | yes |
| `plantingSquares` | B9 | How many squares of planting (green squares) do you have? | yes |
| `naturePlaySquares` | B11 | If you have a Nature Play area, how many squares do you have? | yes |
| `gravelEdgeFt` | F19 | Tally your edges around gravel in feet (Hint each square is 4') | yes |
| `gravelEdgeOnHardscapeFt` | F20 | Of the total, how many are on top of hardscape (concrete, asphalt, ect?) | **no** |
| `gravelEdgeOnSoftscapeFt` | F21 | Of the total, how many are on top of softscape (earth, soil) | **no** |
| `outerEdgeFt` | F23 | Tally the outside edges of your park, of gravel or planting, you don't have a building or a gabion edge in feet | yes |
| `outerEdgeOnHardscapeFt` | F24 | (hardscape share) | **no** (copied to QPI C78, never used) |
| `outerEdgeOnSoftscapeFt` | F25 | (softscape share) | **no** (QPI C83, never used) |
| `outerEdgeGabionConnections` | F26 | How many times do these edges connect to a gabion? | **no** (QPI C85, never used) |
| — | C30 | Perennials = B9 × 4 (worked out, not asked) | — |
| `shrubs` | C31 | SHRUBS | yes |
| `smallTrees` | C32 | TREES- SM | yes |
| `largeTrees` | C33 | TREES- LG | yes |
| `gabionBaskets` | B37 | HOW MANY 1' GABION BASKETS DO YOU HAVE? | yes |
| `raisedBedWoodEdgeFt` | F44 | Do you have raised beds? How many feet are your wood edges? | **no** |
| `raisedBedGabionConnections` | F45 | How many connections to gabions do you have? | yes (outer-edge block) |
| `woodToppedGabions` | — | HOW MANY 4' 18" WOOD TOPPED GABIONS DO YOU HAVE? (B51) | **no answer cell**; subtotal F53 = `#REF!` |
| `benchesWithBackAndArms` | B55 | HOW MANY WOOD BENCHES WITH BACKS AND ARMRESTS DO YOU HAVE? | yes (not orange) |
| `benchesWithBack` | B58 | HOW MANY WOOD BENCHES WITH BACKS DO YOU HAVE? | yes |
| `benchesNoBack` | B61 | HOW MANY WOOD BENCHES WITHOUT BACKS DO YOU HAVE? | yes |
| `squareTables` | B64 | HOW MANY SQUARE WOOD TABLES DO YOU HAVE? | yes (not orange; priced as the 2' table) |
| `stools` | B67 | HOW MANY STOOLS DO YOU HAVE? | yes (not orange) |
| `gabionTables` | B70 | HOW MANY WOOD TOPPED GABIONS TABLES DO YOU HAVE | worked out, **left out of the total** |
| `stageSquares` | B73 | HOW MANY SQUARES OF STAGE DO YOU HAVE? | yes, only 2/3/4 squares |
| `trellises` | B77 | HOW MANY 12x8 TRELLIS DO YOU HAVE? | yes |
| `longTables` | B87 | HOW MANY LONG TABLES DO YOU HAVE? | yes |
| `compostBins` | B90 | HOW MANY COMPOST BINS DO YOU HAVE? | yes |
| `keyholeGardensLarge/Medium/Small` | B94/C94/D94 | HOW MANY KEYHOLE GARDENS DO YOU HAVE? LARGE / MEDIUM / SMALL | yes |
| `sheds4x4` | B104 | HOW MANY SQUARES OF SHED DO YOU HAVE? 1 SQUARE (4'x4') | yes |
| `sheds4x8` | D104 | … 2 SQUARES (4'x8') | yes (not orange) |
| `cisterns4x4`, `cisterns4x8` | B108, D108 | HOW MANY CISTERNS DO YOU HAVE? | **no** (F109 is a fixed 0) |
| `rainBarrels` | B111 | HOW MANY RAIN BARRELLS DO YOU HAVE? | **no** — "FREE!" (M268 is a fixed 0) |
| `cafeTableSets` | B114 | HOW MANY CAFE TABLES AND CHAIRS DO YOU HAVE? | **no** (F115 is a fixed 0) |
| `coldFrameSquares` | B117 | HOW MANY SQUARES OF COLD FRAMES DO YOU HAVE? | yes |
| `optCafeTableSets` … `solarLights` | D126–D135 | Optional off-the-shelf: cafe tables + chairs, fountain with solar pump, bird bath, bird house, event tent, Adirondack chair, free-standing hammock, porch swing, trash can, solar lights | yes, except **porch swing** (D133 unused — see oddities) |
| `otherCosts` | F145 | ADD ANY OTHER ADDITIONAL COSTS YOU MIGHT NEED | yes |

H22 is a separate helper ("enter number of 4' sections" × 4 = feet, I22); nothing reads it.

The downloaded file's example answers (`defaultInputs`): long 27, short 56, 7 planting
squares, 0 play, 10 shrubs, 2 small trees, 4 gabion tables, 2 trellises, 5 long tables,
everything else 0 → **FINAL COST $6,482.80**.

## Formulas, in plain words

`area = long × short`, `perimeter = 2·long + 2·short`, `green = planting squares × 16 sq ft`,
`play = play squares × 16 sq ft`. "Round up" is `ROUNDUP(x, 0)`; "not rounded" means the
sheet multiplies a fraction by the price.

### Base design

| Section (IH subtotal) | QPI rows | Item | Quantity | Unit price (cell) | Supplier link |
|---|---|---|---|---|---|
| Layout F14 = M15 | 12 | Erosion control | round up(perimeter / 100) rolls | $50 (L12) | Amazon silt fence |
| | 13 | Stakes | area / 4 / 5 / 25 packages, **not rounded** | $25 (L13) | Amazon |
| | 14 | Marking paint | round up(area / 1000) cans | $8 (L14) | Amazon (OL F7) |
| Soil F15 = M22 | 19 | Soil 6" | round up(green × 0.5 / 27) CY | $35 (L19) | Mulch Express; OL: Underdog Supply |
| | 20 | Mulch 2" | round up(green × 0.18 / 27) CY | $28 (L20) | Lowe's; OL: Delco Mulch |
| | 21 | Delivery | (soil CY + mulch CY) / 18, **not rounded** | $75 (L21) | Mulch Express |
| Gravel F16 = M31 | 26 | 3/8" red tipple, 2" | round up(area × 0.17 / 27 × 1.4) tons | $52.50 (L26) | D&S Supply; alt Mulch Express |
| | 27 | 3/4" clean stone base, 2" | same tons | $35 (L27) | D&S Supply |
| | 28 | Filter fabric | round up(area / 400) rolls | $50 (L28) | Amazon |
| | 29 | 3.5" staples | round up(area × 0.2 / 100) boxes | $20 (L29) | Amazon |
| | 30 | Delivery | round up((red CY + stone CY) / 24) trips | $50 (L30) | D&S Supply |
| Play area F17 = M35 | 35 | Mulch 4" | round up(play × 0.33 / 27) CY | $28 (L35) | Lowe's |
| Gravel edge F22 = M74 | 65 | 1x4x12 | round up(edge/12 + 2x4 count) | $5 (L65) | — |
| | 67 | 2x4x8 | 2x4 count = round up(round up(edge/5/3) / 8) | $5 (L67, literal) | — |
| | 68 | L-brackets | edge / 5, not rounded | $3.50 (L68) | Home Depot corner brace |
| | 69–70 | 2½" self-driving screws, 2" concrete screws | 2 × edge / 5 each | $0.75 (L69, L70) | Home Depot |
| Outer edges F27 = M87 ("RAISED BEDS - TO GABIONS") | 77 | 1x6x12 | round up(outer / 12) | $4 (L77) | Home Depot (a 2x6x12) |
| | 79 | 2x4x8 supports, hardscape | round up(outer / 5 / 2 / 8) | 2x4x8 price via SUMIF on OL (=$5) | Home Depot |
| | 80–82 | L-brackets; 2 screws each kind | outer / 5; 2 × outer / 5 | $3.50; $0.75 | Home Depot |
| | 84 | 2x4x8 supports, softscape | round up(outer / 5 / 1.5 / 8) | $5 (SUMIF) | — |
| | 86 | 2x4x8 edge to gabion | round up(F45 / 4) | $5 (SUMIF) | — |
| Plants F34 = M43 | 39–42 | Perennials (4 per square), shrubs, small trees, large trees | counts | $10, $50, $100, **$75** | — |
| Gabions F42 = M54 | 49 | 1'x1'x4' 5 gauge baskets | count | $70 (L49) | Gabion1 |
| | 50 | 1–3" stone fill | round up(baskets × 4 / 27 × 1.4) tons | $52.50 (L50) | D&S Supply |
| Raised beds F46 | — | = QPI M87 again | | | |

**BASE DESIGN TOTAL F48** = F46 + F42 + F34 + F16 + F15 + F14 + F22 + F17 + F27 + F17 —
the play area (F17) twice, and F27/F46 are the same cell. The port shows both repeats as
lines in a "Counted twice by the spreadsheet" category.

### Furnishings (F80 = F68 + F65 + F59 + F62 + F56 + F74 + F78)

Lumber prices are looked up by name in the ORDER LIST (SUMIF over OL column N):
2x4x8 $5, 2x4x12 $10, 1x6x8 $8, 1x6x12 $10. Any other size finds nothing and costs $0.
Screws are $0.17 each.

| Item (IH) | Per item | Notes |
|---|---|---|
| Bench with back and armrests (F56 = M106) | 7.5 2x4x8 (**no price**), round up(88) screws, 2 backrest brackets $30, 6 lag screws $0.40, 4 carriage bolts + nut + washer $2 | |
| Bench with back (F59 = M127) | 1 4x4x6, ½ 2x10x8, round up(3) 2x4x8, 1 2x6x8, ½ 2x8x8 (counts from MC J75:J79), 36 screws (MC K80), 2 brackets | only the 2x4x8 has a price |
| Bench without back (F62 = M138) | 3 2x4x8 (MC J92), 34 screws (MC K95) | no legs or seat boards |
| 2' table = "square wood table" (F65 = M152) | 6 2x4x8 (hard-coded), 62 screws (MC L192) | |
| Stool (F68 = M165) | round up(3.5 × n) 2x4x8, 80 screws | QPI note: "TO BE UPDATED DESIGN AND MATERIALS" |
| Wood-topped gabion table (F71 = M180 → empty) | 1 welded mesh $120, round up(4) 22"x24" sides, 1 22"x22" bottom, 2 2x4 ($109 listed, not multiplied), round up(8 cu ft / 27 × 1.4) tons stone | worked out (M182) but **not in the total** |
| Stage (F74 = M210) | length = squares × 4; COUNTIF picks one list: 8' — 17 1x6x8, 3 2x4x8, 1 4x4x10 ($0), 24 screws; 12' — 16 1x6x12, 3 2x4x12, 1 4x4x12 ($0), 1 2x4x8, 34 screws, 16 corner braces $5; 16' — see oddities | other lengths cost $0 |
| 12x8 trellis (F78 = M228) | round up(18) 2x4x8, round up(27) 2x4x12, round up(200) screws, plus 20% | |

### Additional, off-the-shelf, optional

| Section | Items |
|---|---|
| Additional F97 = F95 + F91 + F88 | long tables $100 each ("Materials"), compost bins $45 each (chicken wire only), keyhole gardens $120 / $100 / $80 |
| Off-the-shelf F121 = F115 + F112 + F109 + F105 + F118 | 4x4 shed $315 (Wayfair), 4x8 shed $540 (Lowe's), cisterns fixed $0, rain barrels $0 "FREE!" (PWD Rain Check), cafe tables fixed $0, cold frames: squares / 2 × $300 (Gardener's Supply), not rounded |
| Optional F136 = SUM(F126:F135) | cafe set $160 (Overstock); fountain = solar bubbler $17 (Amazon) + bird bath $110; bird bath $110 (Wayfair); bird house $110 (Lowe's); event tent $90 (BannerBuzz); Adirondack chair $80 (Walmart); hammock $180 (Google Shopping); porch swing $300 (Wayfair) × **hammock count**; trash can $360 (Home Depot); solar lights round up(n / 16) packs × $40 (Google Shopping) |

### Totals

- **TOTAL COSTS** F142 = F136 + F121 + F80 + F48 + F97
- **Tool Rental Contingency** F143 = F142 × 15%
- **20% CONTINGENCY** F144 = F142 × 20% **+ F143**
- **FINAL COST** F146 = SUM(F142:F145) = 1.5 × total costs + other costs (F145)

### ORDER LIST

Each row's quantity is `SUMIF(QPI!B…, item name, QPI!J…)` — all QPI rows with that name
(case-insensitive). Rows and what they collect:

| OL row | Item | QPI rows summed | Unit price |
|---|---|---|---|
| 5–7 | erosion control, stakes, marking paint | J12, J13, J14 | none, L13, L14 |
| 10–11 | soil, mulch | J19; J20 + J35 (play mulch) | L19, L20 |
| 15–18 | red tipple, clean stone, filter fabric, staples | J26, J27, J28, **J30** | L26–L29 |
| 20–23 | 1'x1'x4' baskets, 2'x18"x4' basket, gabion 18x24x24, stone fill | J49, J93 (always 0), none, J50 + J94 + J181 | $70, $120, $150, L50 |
| 29 | 2x4x8 | J67, J79, J84, J86, J95, J101, J122, J136, J150, J163, J189, J197, J222 | $5 |
| 30–32 | 2x4x12, 1x6x8, 1x6x12 | J195 + J223; J188; J77 + J194 | $10, $8, $10 |
| 34–42 | wire panels (Darby Wire Mesh) | 22"x22" = J178; 22"x24" = **J176**; the rest 0 | none |
| 46–55 | lag screws (always 0), timber screws, 2.5" screws, carriage bolts/nuts/washers, backrest brackets, 2" screws, corner braces, #12 screws | —, —, J96 J102 J125 J137 J151 J164 J191 J198 J207 J224, J105, J103 + J126, —, J199 + J208, — | $0.40, $0.75, $0.17, none, $30, $0.17, $5, $0.15 |
| 59–68 | solar lights, cafe tables, bubbler, bird bath (J280 + J282), bird house, event tent, Adirondack, hammock, swing, trash can | QPI J296…J294 | 59: $8 a pack; 60–68 copy the QPI row one column over (M = unit price, N = row total, no O) |

Its own total: **P18** = O6:O18 + an unlabelled **$175**; **P23** = P18 + O20:O23 + IH!F34
(plants as one amount); **O71** = P23 + O29:O53. For the example answers that is
**$3,717.60**, against $4,321.87 total costs / $6,482.80 final on INSERT HERE. The widget
shows the INSERT HERE figure as the estimate and the order list for what to buy, with the
order list's own total in a footnote.

The ORDER LIST also has a "PHASE" column (1–6), delivery times, PiaT's tips, a tools list
(impact driver + adaptor, auger bit, nut-driver sizes), "Additional elements" (fire hydrant
opener: hose adapter, gear puller; skid steer for a week) and "PAVERS TBD". The port keeps
the delivery times, phases (data only), tips and the tools list.

## Oddities and bugs (flagged, not fixed)

The port matches the sheet in every case below; the widget shows a line note or a warning
when the case affects the person's estimate.

**Summary (INSERT HERE)**
1. B2's instruction contains a reviewer's comment pasted into the text ("took me a minute to understand what this was - how about 'please answer the following…'").
2. The example's long side (27) is shorter than its short side (56). Harmless: only area and perimeter are used.
3. B55, B64, B67 and D104 are read but not coloured orange; F20, F21, F24, F25, F26, F44, B108, D108, B111, B114 and D133 are orange but unused.
4. "4' 18" wood-topped gabions" (B51) has no answer cell and its subtotal F53 is `#REF!`; it is not in F80. QPI rows 90–97 (2'x18"x4' basket, stone, 5.5 2x4x8, 36 screws) read the empty B92. H48 adds QPI M93 + M94 in a side calculation nothing uses.
5. Gabion tables: QPI works out M182 (= $585 for the example's 4) but F71 points at the empty M180, and F80 leaves F71 out. The example's 4 gabion tables cost $0. QPI L180 lists $109 for "2x4" without multiplying it.
6. BASE DESIGN TOTAL counts the play area twice and the outer-edge block twice (F27 and F46 are both QPI M87).
7. Tool rental is counted twice: F144 adds F143 again, so FINAL COST = 1.5 × TOTAL COSTS.
8. Cisterns (F109), cafe tables (F115) and rain barrels (M268) are fixed zeros.

**Quantities (QUANTITES PER ITEM)**
9. Layout "SQUARES" B11 = area / 4 (a 4'×4' square is 16 sq ft); stakes = one per 20 sq ft; packages and the soil delivery are fractions. The ORDER LIST formats stakes with no decimals (shows 3, costs 3.024 × $25).
10. Gravel is worked out for the whole park area, planting and play squares included. N25 carries a red "UNLINKED!!" note.
11. "2"" mulch is 0.18 ft deep (2.16"); "4"" play mulch 0.33 ft.
12. Gravel edge: the 1x4x12 count adds the 2x4 count; the hardscape/softscape split is collected but unused.
13. Outer edges: both the hardscape and the softscape supports are always counted from the whole length; the split and the gabion-connection count (F26) are unused; the "edge to gabion" 2x4s come from the raised-bed question F45. 1x6x12 is $4 here (L77) and $10 in the ORDER LIST (N32).
14. A large tree ($75) costs less than a small one ($100).
15. Benches: lumber for the bench with arms has no price; the bench with back only prices its 2x4s (4x4x6, 2x10x8, 2x6x8, 2x8x8 find no price); the bench without back lists only 2x4s and screws, though MC lists legs and seat boards for it.
16. Stage: only lengths 8', 12' and 16' (2, 3 or 4 squares) match a COUNTIF. The 8' screws are (MC E123 + E126) × 4 with E123 blank. The 16' list reads its board counts from the bench rows (MC J91:J94 — 1 1x6x16 where the cut list L105 says 6), looks up its lumber prices in the ORDER LIST's **delivery-time** column (always $0), adds screws from the 12' stage rows ((E109 + E111 + E112) × 4 = 124), and its corner-brace COUNTIF tests an empty cell for 15. 4x4x10 and 4x4x12 have no price.
17. Trellis: asked as "12x8", subtotalled as "TOTAL 16x16"; an unlabelled 0.2 adds 20%. D221 = n² (unused); rows 314–318 hold a scratch calculation. MC's 8x8, 8x16 and 16x16 trellis cut lists are not used.
18. Compost bins: only the chicken wire is priced. Cold frames: squares ÷ 2 frames, not rounded (C272 reads the blank D120, unused).
19. Porch swings use the hammock count (C292 = IH D132, not D133).
20. Solar lights: $40 per pack of 16 here, $8 per pack in the ORDER LIST (N59).
21. Two cafe-table questions: B114 (fixed $0) and D126 (priced).

**ORDER LIST**
22. Staples (D18): `SUMIF(B6:B393, …, J7:J393)` — the sum range starts a row lower, so it returns the gravel-delivery trips (J30) instead of the staple boxes (J29).
23. 22"x24" panels (D40): `SUMIF(B11:B414, …, $J$10:$J$410)` — shifted the other way, returns the mesh count (J176) instead of the panels (J177). D37, D38, D41, D42 are misaligned too (no matching items today).
24. Lag screws (D46) look for "1/4" x 1 1/2" Galvanized Lag Screws"; QPI calls them "Lag Screws", so the row is always 0.
25. Erosion control has no price (no O5); corner braces (O54), #12 screws (O55), solar lights (O59) and the off-the-shelf rows 60–68 are outside the O71 sum; N62 (bird bath) and N68 (trash can) point at empty QPI cells.
26. P18 adds an unexplained $175; P23 adds the plants subtotal as one amount; the "Wood Edging" section is empty (1x4x12, L-brackets and screws never reach the list).
27. The ORDER LIST total ($3,717.60 for the example) does not match the INSERT HERE total.
28. Internal notes left in cells: I15 "ASK TEDDY ABOUT WHAT PRODUCT HE ORDERED"; I48 is a Home Depot order-tracking link from someone's email; I7 is placeholder text. None is reproduced.
29. The PHASE numbers do not follow the Create workbook's build phases (e.g. topsoil 4, mulch 5, red tipple 3, clean stone base 2).

**Links**
30. Several links point at a different size than the item: QPI N77 (1x6x12 → 2x6x12), N95 (2x4x8 → 1x6x8), N122 (2x4x8 → 2x4x10), N188 (1x6x8 → 2x6x8), N190 (4x4x10 → 4x4x8), N203–N206 (shifted by one item), N222 (2x4x8 → 2x4x12), N223 (2x4x12 → 2x10x12 via a Google redirect), OL F30 (2x4x12 → 2x4x10). N120 and N163 are `#REF!`. Cells showing "LINK" (N12, N68–N70, N80–N82) are real hyperlinks. The port keeps the sheet's links (tracking parameters stripped) and notes mismatches in `prices.ts`.

**Other**
31. Prices are undated. The links were collected around mid-2022 (an Amazon link in OL F79 carries `qid=1658058072`, 17 July 2022). DESIGN.md §8 already lists "ask PiaT whether the prices are current".
32. Only these MATERIAL CALCULATIONS cells reach the estimate: J75:J79 + K80 (bench with back), J91:J94 + K95 (bench without back, and wrongly the 16' stage), L119:M122 (12' stage), L132:M134 (8' stage), E109, E111, E112, E123, E126 (stage screws), L178, L192, L202. Everything else on that tab is reference only.
33. INSERT HERE rows 39–41 (gabion basket detail) are hidden; Sheet5 is empty.

## From the design (`inputsFromTally`)

`inputsFromTally(tally, lot?)` reads `project.extra.tally` (`DesignTally`, written by the
planner) and returns `{ inputs, derived, manual, notes, unmapped, sizeFrom }`.

| Input | From | Notes |
|---|---|---|
| long / short side | `tally.lengthFt/widthFt` (larger = long); else the lot's (`extra.site`) | badge "From your lot" |
| planting squares, shrubs | sun + shade | |
| nature play squares, small/large trees | as tallied | |
| gravel edge, outer edge (+ hardscape/softscape) | `gravelEdgeFt`, `outerEdgeFt` when the planner measures them | manual otherwise |
| gabion baskets | `gabion-wall` | one piece = one 1'x1'x4' basket |
| wood-topped gabions | `gabion-bench` + 2 × `gabion-bench-8` | the sheet prices them at $0 (#REF!) |
| benches with back / without back | `bench-back` / `bench-4` | |
| square tables | `table-2` | |
| long tables | `table-4` + `table-6` + `communal-table` | the sheet has no 4'/6' table line |
| stools, compost bins, rain barrels, event tents, bird baths, bird houses | `stool`, `compost-bin`, `rain-barrel`, `event-tent`, `birdbath`, `bird-accessories` | |
| trellises | `shade-canopy` | the sheet's shade structure is the 12x8 trellis |
| sheds 4x4 / 4x8 | `shed`, by footprint (≤1 square → 4x4); 4x4 when no footprint | |
| cold-frame squares | `cold-frame` × footprint squares (2 when unknown) | |
| stage squares | `stage` × long side / 4 **only if** `elements.ts` gives the stage a footprint | manual (with a hint) until then |

Always manual: outer-edge gabion connections, raised-bed wood edge and gabion connections,
benches with armrests, gabion tables, keyhole gardens, cisterns, both cafe-table questions,
fountains, Adirondack chairs, hammocks, porch swings, trash cans, solar lights, other costs.
Built elements the sheet has no question for (planters, workbench, raised beds, flexible
seating, outdoor classroom, unknown ids) come back in `unmapped`; the widget lists them and
points to "Anything else". Plants, surfaces and existing conditions are ignored there.

## Saved state and the widget

- `project.extra.costInputs` = `{ v: 1, overrides: Partial<CostInputs>, base?: 'example' | 'zero' }`
  — only the numbers the person typed. Each shown value is: their number, else the design's
  (or lot's), else — with no design — the sheet's example (or zero after "Start from zero").
- `CostEstimator` (`src/components/widgets/CostEstimator.astro`, props `title?`, `focus?: 'order'`)
  is a Preact island (`client:visible`) reading `$project`. Badges: "From your design",
  "From your lot", "Spreadsheet example", "Your number" + per-field reset; output = grand
  total, the sheet's quirks for this estimate, cost by category (qty, unit price, total,
  supplier), the order list (quantities, supplier, delivery time), Print (results only) and
  CSV download.

## Testing

```
~/Desktop/park-in-a-truck/source/.venv/bin/python scripts/analyze_cost_model.py verify fixtures
npm test
```

`verify` recalculates the untouched file in LibreOffice (private profile with "recalculate
on load: always") and compares all 1,505 formula cells with Google's cached values — 0
differ. `fixtures` writes six input sets into the orange cells, recalculates, checks the
recalculation really happened (area and perimeter cells moved), and saves
`src/lib/cost/__tests__/fixtures/*.json`: sheet defaults; a size-A park with zero
furnishings; a size-E park with every item; fractional feet with an 8' stage; a size-B park
with a 16' stage; values on exact rounding boundaries with a 1-square stage. The tests check
every INSERT HERE summary cell, every QPI cell a line reproduces, and every ORDER LIST row
and total to within $0.01. Changing a price in `prices.ts` makes them fail on purpose —
regenerate the fixtures from an updated sheet, or update the expected values, when prices
change.
