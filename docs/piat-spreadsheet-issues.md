# Notes on the Park in a Truck cost estimator spreadsheet

*For the Park in a Truck team at Thomas Jefferson University — prepared while building the Park in a Truck
website, October 2026. Not sent; the site owner may share it.*

Thank you for the cost estimator — it is the most detailed part of the toolkit, and porting it showed how much
work went into it. While turning it into a live web calculator we checked every formula: we recalculated the
original file in LibreOffice (all 1,505 formula cells agree with the values Google Sheets saved) and compared
the results line by line. Along the way we found a handful of formula and reference slips. None of them is
hard to fix, and several change the final cost, so we have listed them here in case they are useful.

The file we used is the one linked from the Dream workbook, page 18 ("DOWNLOAD COST ESTIMATOR"). Cell
references are to its tabs: **INSERT HERE**, **QUANTITES PER ITEM** (QPI), **ORDER LIST** and **MATERIAL
CALCULATIONS** (MC).

## The sample park

"Effect on the sample park" means the example answers already in the orange cells: a 27 × 56 ft park,
7 planting squares, 10 shrubs, 2 small trees, 4 wood-topped gabion tables, 2 trellises and 5 long tables.

| | Spreadsheet | With the fixes below |
|---|---|---|
| TOTAL COSTS (F142) | $4,321.87 | $5,029.60 |
| FINAL COST (F146) | **$6,482.80** | **$6,789.96** |
| ORDER LIST total (O71) | $3,717.60 | $5,029.60 (= total costs) |

The difference for the sample park is: tool rental counted once (−$648.28), the gabion tables included
(+$789.75), their 2x4s priced (+$54.00), and whole packages and deliveries (+$111.69). The other issues don't
affect the sample park but do affect parks with play areas, edges, stages, benches and so on.

The website's estimate also counts 5 perennials per planting square, as your plant lists do (section 6.1): for the
sample park that adds 7 × $10, so its final cost is **$6,884.46**. And it prices furniture from your build guides
rather than from this spreadsheet's furniture rows (section 6.3); the sample park has none of those pieces.

## 1. Issues that change the total

### 1.1 Tool rental is counted twice
- **Where:** INSERT HERE F144 `=F142*0.2+F143`, and F146 `=SUM(F142:F145)`.
- **What happens:** the 20% contingency line also adds the 15% tool rental (F143), and the final sum adds F143
  again. The final cost is 1.5 × total costs instead of 1.35 ×.
- **Sample park:** $648.28 too high.
- **Suggested fix:** F144 `=F142*0.2`.

### 1.2 The play area is counted twice in the base design total
- **Where:** INSERT HERE F48 `=F46+F42+F34+F16+F15+F14+F22+F17+F27+F17` — F17 appears twice.
- **What happens:** the nature-play mulch is added twice.
- **Sample park:** no play area, so no effect. A park with 5 play squares pays $28 twice.
- **Suggested fix:** remove the second `+F17`.

### 1.3 The outer edges are counted twice ("raised beds" repeats them)
- **Where:** INSERT HERE F27 and F46 both read `='QUANTITES PER ITEM'!M87`, and F48 adds both.
- **What happens:** the outer-edge lumber (QPI rows 76–87) is counted twice. The raised-bed questions (F44, F45)
  have no calculation of their own; F46 just repeats the outer-edge block.
- **Sample park:** no edges, so no effect. A 40 ft outer edge costs $78 twice.
- **Suggested fix:** remove F46 from F48, or give the raised beds their own block that uses F44 (feet of wood edge)
  and F45.

### 1.4 The 4' 18" wood-topped gabions are broken (#REF!)
- **Where:** INSERT HERE B51 has no answer cell, F53 is `=#REF!`, and F80 leaves F53 out. QPI rows 90–97 (the
  2'x18"x4' basket, stone fill, 5.5 2x4x8s and 36 screws per gabion) read B92, which is empty.
- **What happens:** wood-topped gabions cost $0 however many there are.
- **Sample park:** none, so no effect. Three of them should add $568.36.
- **Suggested fix:** add an orange answer cell (e.g. B52), point QPI B92 at it, set F53 `='QUANTITES PER ITEM'!M97`,
  and add F53 to F80.

### 1.5 The wood-topped gabion tables are left out of the total
- **Where:** INSERT HERE F71 `='QUANTITES PER ITEM'!M180` (an empty cell; the block's total is M182), and F80
  does not include F71.
- **What happens:** QPI works the tables out (mesh $120 + stone), but the summary never sees it.
- **Sample park:** the 4 example tables come to $585 (mesh $480 + 2 tons of stone $105) that are missing from
  total costs.
- **Suggested fix:** F71 `='QUANTITES PER ITEM'!M182`, and add F71 to F80. QPI L180 also holds a stray `109` for the
  "2x4" row (two per table) without a total; MATERIAL CALCULATIONS lists them as 2x4x8s, which the sheet prices at
  $5 elsewhere (+$40 for the sample park).

### 1.6 Porch swings use the hammock count
- **Where:** QPI C292 `='INSERT HERE'!D132` (the hammock answer); the porch-swing answer is D133.
- **What happens:** porch swings are priced as (number of hammocks) × $300.
- **Sample park:** none, so no effect.
- **Suggested fix:** C292 `='INSERT HERE'!D133`.

### 1.7 The 16' stage (and the 8' stage's screws) read the wrong rows
- **Where:** QPI rows 203–208.
  - The board counts E203:E206 read MC J91:J94 (the bench-without-back rows), so the 16' stage gets 1 1x6x16
    instead of the 6 its cut list (MC L105) asks for, and 1 4x4x8 instead of 2.
  - The price lookups L203:L206 sum ORDER LIST column **G** (delivery times), so they are always $0.
  - The screws E207 `=SUM(MC!E109+E111+E112)*4` add rows from the 12' stage (= 124).
  - The corner braces C208 `=COUNTIF(C187,D208)` test an empty cell (C187) against 15, so there are never any.
  - For the 8' stage, the screws E191 `=SUM(MC!E123+MC!E126)*4` use E123, which is blank (= 24).
- **Sample park:** no stage, so no effect. A 16' stage misses $120 of corner braces and has no lumber prices.
- **Suggested fix:** E203:E206 `=MC!L105:L108`; L203:L206 sum ORDER LIST column N; C208
  `=COUNTIF(C186,16)*E208`. For the screws we used (top boards + long-side boards) × 4, the pattern the existing
  formulas seem to follow: 92 for 8', 164 for 16'. Please check this against the stage instructions. The 12'
  stage's fixed 34 screws (E198) is the same number as the bench without back (MC K95), so it may be worth
  checking too.

### 1.8 Outer-edge supports are counted for both hardscape and softscape
- **Where:** QPI D79 `=C76/5` and D84 `=D79` both use the whole outer edge (C76), although C78 (hardscape feet)
  and C83 (softscape feet) are set up right beside them.
- **What happens:** every foot of outer edge gets both the hardscape supports (2x4s, L-brackets, self-driving and
  concrete screws) and the softscape supports.
- **Sample park:** no edges. A 40 ft edge (10 ft hard, 30 ft soft) pays $39 too much.
- **Suggested fix:** D79 `=C78/5`, D84 `=C83/5`.

### 1.9 One of the two "connections to gabions" questions is never used
- **Where:** INSERT HERE F26 ("How many times do these edges connect to a gabion?") is copied to QPI C85, but the
  2x4x8 row beneath it (D86) reads F45 (the raised-bed question) instead.
- **Suggested fix:** D86 `=C85+'INSERT HERE'!F45` (or C85 alone, if the raised beds get their own block).

### 1.10 Some purchases are fractions
- **Where:** stakes (QPI D13 = 3.024 packages for the sample park), soil and mulch delivery (C21 = 0.22 of a
  delivery), L-brackets and screws (C68–C70, C80–C82 = edge ÷ 5), cold frames (C273 = squares ÷ 2), and the bench
  lumber (C101 = 7.5 per bench, C121 and C124 = ½ board).
- **What happens:** the cost uses the fraction, though everything else is rounded up to whole units.
- **Sample park:** stakes 3.024 → 4 packages (+$24.40) and delivery 0.22 → 1 (+$58.33).
- **Suggested fix:** wrap them in `ROUNDUP(…,0)` as the other rows are.

### 1.11 Some items have no price
- 2x4x8s for benches with armrests (QPI row 101) have no price, although 2x4x8s are $5 everywhere else.
- Bench-with-back lumber (4x4x6, 2x10x8, 2x6x8, 2x8x8), the stages' 4x4x10, 4x4x12, 1x6x16, 2x4x16, 4x4x8 and
  2x4x10 are looked up in the ORDER LIST, which has no price for those sizes, so they cost $0.
- Cisterns (INSERT HERE F109) and the off-the-shelf "cafe tables and chairs" (F115) are a fixed 0. The optional
  list prices cafe tables and chairs at $160 (D126).
- Stages that aren't 2, 3 or 4 squares long come out at $0 with no message.
- **Suggested fix:** add those sizes to the ORDER LIST prices; price cisterns; point F115 at the same $160.
  The website asks people to type a price for these items and leaves them out of the total until they do.

## 2. The ORDER LIST

The ORDER LIST is very useful: delivery times, suppliers and tips in one place. Its quantities are SUMIFs over
QPI, and a few of the ranges have slipped:

| ORDER LIST cell | What happens | Sample park | Suggested fix |
|---|---|---|---|
| D18 (3.5" staples) | `SUMIF(B6:B393, …, J7:J393)` — the sum range starts one row lower, so it returns the gravel-delivery trips (J30) | 1 box instead of 4 | `J6:J393` |
| D40 (22"x24" panels) | `SUMIF(B11:B414, …, $J$10:$J$410)` — shifted the other way, returns the mesh count (J176) | 4 panels instead of 16 | `J11:J414` (D37, D38, D41 and D42 have the same shift) |
| D46 (lag screws) | looks for "1/4" x 1 1/2" **Galvanized** Lag Screws"; QPI calls them "1/4" x 1 1/2" Lag Screws" | always 0 | use the same name |
| O5 | erosion control has no unit price or total | $100 missing | add N5/O5 |
| P18 | `=sum(O6:O18)+175` — an unlabelled $175 | +$175 | label it, or move it to the estimate |
| O71 | `=P23+SUM(O29:O53)` stops before corner braces (O54), #12 screws (O55) and solar lights (O59); the off-the-shelf rows 60–68 have no O column | | extend the sum |
| N59 | solar lights $8 a pack, where QPI uses $40 per pack of 16 | | one price |
| N62, N68 | point at QPI M282 and M294, which are empty (the totals are in M283 and M295) | | point at M283/M295 |
| "Wood Edging" (row 24) | empty: the 1x4x12 boards, L-brackets and screws for edges never reach the list | | add rows |

Altogether the sample park's order list totals $3,717.60, while the estimate's total costs are $4,321.87.
On the website the order list is built from the same lines as the estimate, so the two always agree.

## 3. Questions that aren't used

- INSERT HERE F20 and F21 (gravel edge on hardscape/softscape): collected, never used. The gravel-edge supports
  (QPI rows 67–70) are worked out for the whole edge, and there are no rows under "SOFTSCAPE SUPPORT" (C71).
- F44 (raised beds: feet of wood edges): not used anywhere (see 1.3).
- B108/D108 (cisterns), B111 (rain barrels — "FREE!", which makes sense) and B114 (cafe tables): fixed 0.
- D133 (porch swings): see 1.6.
- B55, B64, B67 and D104 are read but not coloured orange, so people may not know to fill them in.

## 4. Assumptions we kept but you may want to check

These might be intentional, so the website keeps them and says so:

- Gravel (red tipple and the stone base) is worked out for the whole park area (QPI C25 = long × short side),
  planting squares included. Next to it, N25 has a red "UNLINKED!!" note.
- Layout "SQUARES" (QPI B11) is area ÷ 4, while the gravel block's squares (B25) are area ÷ 16. Stakes are B11 ÷ 5,
  i.e. one per 20 sq ft. With 4' squares it would be one per 80 sq ft.
- The gravel-edge 1x4x12 count (J65) adds the 2x4 count (C67) to the board count.
- A large tree ($75, L42) costs less than a small one ($100, L41).
- 1x6x12 boards are $4 for the outer edges (QPI L77) but $10 in the ORDER LIST (N32). The L77 link is for a 2x6x12.
- The trellis gets 20% extra (A225 = 0.2, unlabelled); "12x8 TRELLIS" is totalled as "TOTAL 16x16".
- Compost bins are priced by their chicken wire only ($45); the other materials have no quantities.
- The bench without back lists only 2x4s and screws, while MATERIAL CALCULATIONS also lists legs and seat boards.
- Stools are marked "TO BE UPDATED DESIGN AND MATERIALS" (N160).
- "2"" mulch is 0.18 ft (2.16") and "4"" play mulch is 0.33 ft.
- The ORDER LIST "PHASE" numbers (e.g. topsoil 4, mulch 5, red tipple 3, clean stone base 2) don't follow the
  Create workbook's phases (gravel base 3, topsoil 5, gravel surface 7).

## 5. Small things

- INSERT HERE B2 still contains a reviewer's comment inside the instructions ("took me a minute to understand what
  this was - how about 'please answer the following - put your answer in the orange box").
- The example's long side (B5 = 27) is shorter than its short side (B7 = 56).
- ORDER LIST I15 has an internal note ("ASK TEDDY ABOUT WHAT PRODUCT HE ORDERED"), and I48 is a Home Depot
  order-tracking link that looks as if it came from someone's email. You may want to remove both before sharing.
- Some links point at a different size than their row: QPI N77 (1x6x12 → a 2x6x12), N95 (2x4x8 → a 1x6x8),
  N122 (2x4x8 → a 2x4x10), N188 (1x6x8 → a 2x6x8), N190 (4x4x10 → a 4x4x8), N203–N206 (shifted by one row),
  N222 (2x4x8 → a 2x4x12), N223 (2x4x12 → a 2x10x12) and ORDER LIST F30 (2x4x12 → a 2x4x10). QPI N120 and N163 are
  `#REF!`. The website keeps your links and says on the line when one opens a different size (for the 1x6x12 edge
  boards and the 2x4x12s, the two a person orders from).
- The prices aren't dated. The links suggest about mid-2022; a "prices checked on…" cell would help people judge
  how far to trust them.
- Sheet5 is empty, and INSERT HERE rows 39–41 are hidden.

## 6. Found in usability testing (October 2026)

A carpenter who leads volunteer build days and a block captain tested the website's version of the estimator with
their own park designs. These came up.

### 6.1 Perennials: 4 per planting square here, 5 in the plant lists
- **Where:** INSERT HERE C30 `=B9*4`. The four theme plant-list spreadsheets (Dream workbook p.20) work out
  perennials as `=C4*5` (and `C5*5`) from the same "green squares". The Dream workbook itself gives no number.
- **What happens:** the same design gets two plant counts: for 32 planting squares, 128 perennials in the budget and
  160 on the plant list ($320 apart before contingency).
- **Suggested fix:** use one number in both. The website uses 5 in both places, the plant lists' number, so the
  budget matches what people pick. Please tell us if 4 is the right one.

### 6.2 Mulch depth: 2" here, 4" in the Create workbook
- **Where:** QPI row 20 ("2"" mulch, 0.18 ft deep) for the planting squares; the Create workbook, Phase 6 (Plant),
  says "Install mulch 4"" and its planting detail says "4" of mulch".
- **What happens:** a group that follows Create needs about twice the mulch: for 32 planting squares, 7 CY instead of
  4 (at the play area's 4" = 0.33 ft).
- **Suggested fix:** pick one depth for both. The website keeps the spreadsheet's 2" and notes on the mulch line what
  4" would need.

### 6.3 The furniture rows don't match the build guides
- **Where:** QPI rows 100–228 (benches, tables, stools, wood-topped gabions, stages, trellis) against the thirteen
  assembly guides linked from the Dream workbook p.19.
- **What happens:** the spreadsheet's bench with back (rows 119–127) is a different design from the Bench + Back
  guide: a 4x4x6, half a 2x10x8, a 2x6x8, half a 2x8x8 and three 2x4x8s with 36 screws, where the guide is all 2x4
  (7.5 × 2x4x8, 112 screws, 6 lag screws, 4 carriage bolts, 2 brackets). The stool is 80 screws against the guide's 88,
  the 4' wood-topped gabion 5.5 2x4x8s against 4.5, the 12' stage a 1x6-deck design against the Stage guide's 12'×8'
  stage of 2x4s, and the "12x8 trellis" against the Shade guide's 8'×8' structure. There is no row for the 4' and 6'
  tables, the planters, the workbench or the 8' gabion bench.
- **What the website does:** prices each piece from its guide's own materials and hardware lists at this
  spreadsheet's prices, and asks for a price where there is none. Checked against the cut lists, three guides' lists
  are short (see the notes for the PiaT team): the stage (16 2x4x8s; its cut list needs 25), the 4' gabion bench (4.5;
  7 once each 48" piece gets its own board) and the workbench.

### 6.4 Two different L-brackets and two different 2.5" screws under one name
- **Where:** QPI B68 and B80 are both "L-BRACKET" at $3.50, but N68 links a 2" double-wide corner brace (sold as a
  2-pack) and N80 a 5" black corner brace. QPI B69/B81 "2 1/2" Self Driving screw" ($0.75, a SPAX washer-head cabinet
  screw) and the furniture rows' "2.5" wood screws" ($0.17, a GRK wood screw) are different screws.
- **Suggested fix:** name each one by what it is and where it goes. The website lists the two L-brackets separately
  and says which screw is which.

### 6.5 The 1x4x12 edge board has no supplier
- **Where:** QPI row 65 has a price ($5) but no link, and it never reaches the ORDER LIST (issue 26).

Thanks again for making all of this freely available. We're happy to share the test files we used (six sets of
answers, recalculated in LibreOffice) if they would help.
