# Usability report: build-lead (Ray, volunteer build-day lead)

Screenshots are under `/tmp/claude-1000/-home-hoid-Desktop/77b80b24-1852-484f-8c9a-3c0a10b8adef/scratchpad/ux/sessions/` and are cited below as `build-lead/shots/…` or `build-lead-tablet/shots/…`. Downloads are in `build-lead/downloads/` (`my-park-cost-estimate.csv` and `park-build-schedule.ics`), and the printed order list is at `build-lead/orderlist.pdf`.

## 1. Who I am

I tested as Ray, 45, a union carpenter who leads volunteer build days. He knows lumber, cut lists and estimating, but he isn't a "computer person". The organizers gave him the lot at 91 E Wister St. His plan was to:

- lay out a park in the 3D planner;
- take the design to the cost estimate and see whether it is an order he could take to Home Depot;
- check five build guides the way he'd check shop drawings;
- try the guides on a shop tablet;
- judge the build-day schedule.

## 2. Journey

1. **Getting the lot in.** Home page, then "Plan in 3D" in the nav. With no lot saved, the planner offers "Find your lot" or two demo lots. I typed 91 E Wister St and the lookup came back in a few seconds:
   - City-owned, 17.3 × 96.3 ft, Size B, RSA-5, on the vacant list.
   - "Use this as my park lot" worked first time.
   - Going back to Plan in 3D opened the lot in 3D with the park already on it.
   - A notice said **106 sq ft of the park hangs over the lot line**. I tried the slide arrows. Every press made it worse (136, then 205, then 182 sq ft). "Put it back" restored it.
2. **Size & themes.** Fit is Size B and "Stretch to my lot" is on by default. I mixed the themes: frame Sanctuary, front Event, back Edible. It redrew right away. On this step the whole page scrolled about 160 px, leaving a white band under the map (A5).
3. **Arrange.** This was the best part of the site.
   - Clicking an item selects it and shows a size and position card.
   - Dragging moved items cleanly, with 1 ft snap. Dragging off the lot gave "This sticks out past the lot line".
   - The round handle turned items in 90° steps.
   - These all worked: Duplicate (button, Ctrl+D and the right-click menu), Delete key, right-click Remove, Esc.
   - Undo/Redo went back through several steps and restored positions exactly.
   - Dragging a "Stage" chip from the palette onto the park dropped it where I let go. Clicking "24″ planter" put one in the middle.
   - In 3D, dragging an item moved it. Dragging empty ground turned the camera and kept the selection.
   - Final layout:
     - Front: I removed one café-table row (6 tables), added 2 × 24″ planters at the entrance, a 6′ table, an 8′ gabion bench and a 12×8 stage.
     - Back: left as designed.
   - My count from the item list: 9 café sets, 4 benches with back, 3 stools, 2 × 4′ gabion benches, 1 × 8′ gabion bench, 2 planters, 1 shade canopy, 1 stage, 1 × 6′ table, 21 shrubs, 5 small trees, 1 large tree.
4. **Sun & shade.** The date presets, time slider, "Play the day" and "Work out sun hours" all worked. The lot is 100 % full sun, which fits an open lot.
5. **Counts.** The Counts step matched my own tally exactly. "Estimate the cost" took me to the Dream page with every count filled in.
6. **Cost estimate.** I hand-checked about 30 lines and the totals. The arithmetic is right (details in section 4).
   - Entering a price for 4x4x6 ($12.98) correctly gave 4 × 12.98 = $51.92, and the total went from 9,691.56 to 9,743.48, then × 1.35 = $13,153.70.
   - **But the furniture side of the order list doesn't match what I drew or what the guides say to build** (A1, A2, B2). The perennial count also disagrees with the plant picker on the same page (A3).
7. **Build guides.** I checked Bench + Back, 6′ Table, 4′ Wood-Topped Gabion Bench, 24″ Planter Box and Stage in full, and the 8′ Shade materials.
   - For each I did the cut-per-board math, counted pieces in the step text against the cut list, scrolled the 3D model step by step, and used hover labels, Exploded view, Play all and spin.
   - Bench + Back is fully consistent.
   - The planter text, the table text and the stage lumber count are wrong (section B).
8. **Tablet (820×1180, touch).** I opened Bench + Back and Stage.
   - The 3D strip sticks to the top while you swipe through the steps.
   - Tapping a board shows its part label.
   - The 17 px body text reads fine at arm's length.
   - The model buttons are small: 25 px tall with 12 px text (A9).
   - Landscape (1180×820) gives a side-by-side layout, which is the better shop setup.
9. **Build schedule (Create step).** I entered 04/01/2027.
   - It set 8 consecutive Saturdays, Apr 3 to May 22, with "Skip this weekend" links.
   - The .ics file has 8 two-day events with the lot address as the location.

## 3. Findings

### A. Site bugs and UI problems

**A1 — Major — wrong result — the 12×8 stage from the palette is priced as "6 squares, 24′ long" with "price needed"**
- **Where:** `/steps/dream/` (and the same estimator on `/steps/create/`): Furnishings questions, the "price needed" box, and the "Base furnishings" group.
- **Steps:**
  1. In the planner, drag "+ Stage 12 × 8 ft" onto the park.
  2. Go to Counts, then "Estimate the cost".
- **Expected:** The stage priced from the Stage build guide, which is exactly this 12′×8′ deck. That guide has a cut list, materials and "COST $300–400".
- **Observed:**
  - "How many squares of stage: 6".
  - Line "Stage (6 squares, 24′ long) … price needed — not in the total". The note says the spreadsheet only has cut lists for 2, 3 or 4 squares "in a row".
  - A 12×8 deck is 3 × 2 squares, not 6 in a row. The total is about $300–400 low (about $405–540 after the 35 % add-ons).
- **Screenshots:** `build-lead/shots/51-cost.png`, `build-lead/shots/53-price-entered.png`, `build-lead/orderlist.pdf` p.1. Seen on both the Dream and Create pages.

**A2 — Major — wrong info — the shade canopy is three different sizes in the plan, the estimate and the guide**
- **Where:** planner item card, estimator "12x8 trellis" group, and `/build/shade/`.
- **Observed:**
  - The planner card says "Shade canopy 8 × 4 ft · frame" (the palette chip says 8 × 8).
  - The estimate says "Your 1 shade canopy in 12′x8′ trellises". It orders 18 × 2x4x8, 27 × 2x4x12, 200 screws and +20 % ($472.80).
  - The 8′ Shade Structure guide calls for 47 × 2x4x8, 268 screws, 4 L-brackets, 4 lag screws and 4 J-hooks.
- **Expected:** One size, and the order list taken from the guide that the crew will actually build.
- **Impact:** Ray would order 27 twelve-footers he doesn't need and be 29 eight-footers short (47 − 18).
- **Screenshots:** `build-lead/shots/50-counts.png`, CSV lines "12x8 trellis".

**A3 — Major — wrong result — perennials are 128 in the estimate but 160 in the plant picker, on the same page**
- **Where:** `/steps/dream/`, under "How many plants" and under "Count & choose your plants".
- **Observed:**
  - The estimator says "Perennials: 128 (4 × 32 planting squares)" and prices 128 × $10.
  - The plant picker, with "Use the counts from your design" ticked, says "160 perennials" (5 × 32) and "0 of 160 planned".
  - The Counts step shows 32 green squares.
- **Expected:** The same per-square rule in both places.
- **Impact:** The plant shopping list and the budget differ by 32 plants. Reproduced on two separate loads.
- **Screenshot:** `build-lead/shots/88-plant-picker.png`.

**A4 — Minor — confusing — the estimate buys 8 gabion baskets (+2 t stone, $665) for "31 ft of gabion wall" that I can't find on my plan**
- **Observed:**
  - The note says "31 ft of gabion wall: one 4-ft basket per 4 ft … (as the 3D model draws it)".
  - The Counts step lists no gabion wall, and the item list has none.
  - Clicking along both ends and the sides of the park in Plan view selected nothing.
- **Expected:** The gabion wall listed in Counts and selectable on the plan, so a lead can check it.
- **Unconfirmed:** whether the wall is drawn somewhere I didn't recognise.
- **Screenshots:** `build-lead/shots/79-plan-back-pan.png`, `build-lead/shots/86-plan-arrange.png`.

**A5 — Minor — layout — the page scrolls on the Size & themes step**
- **Steps:** Planner, then step 2 (Size & themes), then scroll the left panel or click a theme chip near the bottom.
- **Observed:**
  - The whole page moves up 162 px and the header is cut off.
  - A white empty band about 160 px tall appears under the map, and the map no longer fills the screen.
  - Other steps don't do this (document height 900 there, 1,062 here).
- **Reproduced:** twice, by clicking chips and by mouse wheel.
- **Screenshots:** `build-lead/shots/85-themes-wheel.png`, `build-lead/shots/12-themes-mixed.png`.

**A6 — Minor — confusing — the stretched park doesn't fit the lot it was stretched to, and the slide buttons only make it worse**
- **Observed:**
  - "About 106 sq ft of the park hangs over the lot line" on load, with "Stretch the pieces to fill my lot" on.
  - Right ×1 gave 136 sq ft; right ×2 gave 205; left ×3 gave 182. No setting made it fit.
  - The red strip covers the whole left edge of the front half.
- **Expected:** Stretch-to-lot that fits inside a slightly skewed parcel, or a "fit inside the lot" button.
- **Screenshot:** `build-lead/shots/77-planner-reload.png`.

**A7 — Minor — wrong info — furniture footprints get stretched along with the lot**
- **Observed (from the "Or pick from the list" item cards):**
  - 4′ gabion bench: 4 × 1.8 ft (guide: 4′ × 1′-6″).
  - Café sets: 3.5 × 1.8, 3.5 × 2 and 3.5 × 2.3 ft for the same item.
  - One stool: 2 × 2 ft, while the others are 1.5 × 1.5.
  - Bench with back: 4 × 1.5 (chip says 1.54).
- **Expected:** Built furniture keeps its built size; only planting and gravel stretch.
- **Impact:** A builder spacing benches off this card gets the wrong numbers.

**A8 — Minor — accessibility — a pressed model button becomes unreadable while the pointer is on it**
- **Where:** any build guide, model buttons "Exploded view" and "Play all"→"Stop".
- **Observed:** Once pressed, with the mouse still over the button, it shows white text on a light-grey fill and the label nearly disappears. Moving the mouse away shows white on blue, which is fine.
- **Reproduced:** on both buttons.
- **Screenshots:** `build-lead/shots/60-btns-crop.png`, `build-lead/shots/61-btns-crop.png`; mouse away: `build-lead/shots/62-exploded-mouseaway-crop.png`.

**A9 — Minor — tablet — model controls are small, and the "tap a board" hint is hidden on touch**
- **Where:** `/build/bench-back/` and `/build/stage/` at 820×1180 touch.
- **Observed:**
  - Replay, Play all, Exploded view and Reset view are 25 px tall with 12 px text. That's hard with work gloves at arm's length.
  - The hint "Point at a board to see its size" is hidden on tablet, so nothing tells the crew to tap boards. Tapping does work: "BB-5 · 2x4 × 11.5″" and "BB-4 · 2x4 × 18.5″".
  - Two taps on the face of the right-hand frame showed nothing. I'm not sure whether I hit a gap between boards; unconfirmed.
- **Screenshots:** `build-lead-tablet/shots/t07-tap3-crop.png`, `build-lead-tablet/shots/t08-tap5-crop.png`, `build-lead-tablet/shots/t04-tap-board.png`.

**A10 — Minor — wrong info — order-list lines that would send Ray to the wrong shelf**
- "L-brackets 40 ea." merges two different products into one line with one link:
  - 23 for the gravel edge, linked to a 2″ double-wide corner brace;
  - 17 for the outer edge, linked to a 5″ black corner brace.
- Two separate 2.5″ screw lines are priced $0.75 and $0.17 each.
- "1x4x12" has no supplier or link.
- In the CSV, "1x6x12 boards" links to a Home Depot **2x6**x12 product, and "2x4x12" links to a **2x4x10** product.
- The links probably come from PiaT's spreadsheet, but the merged L-bracket line is the site's own.

**A11 — Minor — missing — items the site has full materials for are left unpriced**
- 24″ planters: "The PiaT estimator has no line for them — add the cost under 'Anything else'". The planter guide has the full list: 9 × 2x4x8, 132 screws, fabric.
- The 6′ table is priced as a lump "Long tables (materials) $100". The guide has 10 × 2x4x8 and 92 screws.

**A12 — Minor — missing — the schedule doesn't help a build lead plan crew or lead times**
- It's one phase per Saturday for 8 weeks, starting with "Phase 1: Organize" as a build Saturday.
- There are no order-by dates, even though gabion baskets are 2–3 weeks and lumber is 1–3 weeks.
- All furniture lands in Phase 8, one weekend. With untrained volunteers that's too much for one day: 4 benches, 3 stools, a stage with 588 screws, the shade (268 screws), gabion benches and tables.
- The text itself says elements can be built "ahead of time or off site". The schedule could offer an off-site furniture track running from Phase 2 on.

**A13 — Polish — wording — "ft in" labels**
- The item list reads "Café table + chairs — 29 ft in" and "Shrub — 93 ft in". To a carpenter "ft in" reads as feet-and-inches.
- Identical entries can't be told apart (two "Wood-topped gabion bench — 5 ft in", two "Stool — 79 ft in").
- Suggest "29 ft from entrance, left side".

**A14 — Polish — the first total is 1¢ off its lines**
- The lines are $9,691.56 + $1,453.73 + $1,938.31 = $13,083.60, but the page shows $13,083.61. It rounds 9,691.56 × 1.35 instead of adding the rounded lines.

### B. Construction accuracy in Park in a Truck's published guides and spreadsheet (as the site presents them)

**B1 — Major — Stage: the materials list is about 9 eight-footers short**
- **Where:** `/build/stage/` cut list.
- **Cut list:** ST-2 ×11 @ 93″ and ST-3 ×12 @ 86″. Only one of either fits on a 96″ board, so these alone need 23 boards.
- **The rest:**
  - ST-4 ×8 @ 14.75″ is 118″ plus kerf, so 2 more boards (6 per board).
  - ST-5 ×12 @ 7.75″ comes from the ST-3 offcuts (96 − 86 = 10″).
- **Total:** about 25 × 2x4x8 needed. The materials list says **16**, so it is 9 short (36 %).
- **Step text agrees with the cut list:** ST-1: 8 face + 26 deck = 34 ✓. ST-2: 8 + 3 = 11 ✓. ST-3: 8 + 4 = 12 ✓. ST-4: 8 ✓. ST-5: 8 + 4 = 12 ✓. Only the board count is wrong.
- The site flags the same kind of shortage on the shade's SS-1 line but not here.

**B2 — Major — Bench with back: the estimate's materials don't match the guide**
- **Source:** the estimator's "4′ bench with back" group, presumably from the PiaT spreadsheet.
- **Estimate for 4 benches:** 4 × 4x4x6, 2 × 2x10x8, 4 × 2x6x8, 2 × 2x8x8, 12 × 2x4x8, 144 screws, 8 brackets.
- **Guide per bench:** 7.5 × 2x4x8, 112 screws, 6 lag screws, 4 carriage bolts, 2 brackets. For 4 benches that's 30 × 2x4x8, 448 screws, 24 lags, 16 bolts and 8 brackets.
- **Result:**
  - The 4x4, 2x10, 2x6 and 2x8 never appear in the all-2x4 guide, yet 4 of the 5 "price needed" prompts ask Ray to price that wood.
  - 2x4s are 18 short (30 − 12). Screws are 304 short (448 − 144). Lags and bolts are missing.
- **Smaller mismatches of the same kind:**
  - Stool: the estimate has 80 screws each (240 / 3); the guide has 88.
  - 4′ gabion bench: the estimate has 5.5 × 2x4x8 each; the guide has 4.5.
  - The 8′ gabion bench is priced as two 4′ modules (11 boards, 72 screws, two 2′×18″×4′ baskets). The 8′ guide has 8 boards and 36 screws.
- The site's "How this differs" panel doesn't mention any of this.

**B3 — Major — 24″ planter: the step text names the wrong part, and the 3D model is the one that's right**
- **Text:**
  - Step 3: "Place **six P-2** pieces on top of the frame".
  - Step 4: "Secure the P-2 or **P-3** lumber".
  - Step 5: "Place **five P-2** pieces (or five **P-3**…)".
- **Cut list:** only 4 × P-2 (17″) and no P-3 at all.
- **Model:** hovering those boards shows **"P-1 (24″x24″ box) · 2x4 × 21″"**, in step 3 and step 5.
- **P-1 count:** 4 (frames) + 12 (end fill, 6 × 2) + 12 (sides, 6 × 2) + 5 (bottom) = 33, which matches the cut list's P-1 ×33.
- **Impact:** A volunteer following the text grabs the 17″ pile.
- **Screenshots:** `build-lead/shots/70-pl-s3-hover-crop.png`, `build-lead/shots/70-pl-s5-rotated.png`.

**B4 — Minor — 6′ table: the tabletop board count in the steps disagrees with the cut list and the model**
- Step 4 places 2 T-1. Step 5 says "Place **four more** T-1", which makes 6. Its tip says "the **three** middle pieces", which makes 5.
- The cut list has T-1 ×7, and the model shows 2 edge boards + 5 blue boards = 7.
- Width check: 7 × 3.5″ + 6 × ¼″ = 26″ = 2′-2″, so 7 is right.
- Screws in the steps: 30 × 2 legs + 12 + 4 + 28 = 104, against 92 in the materials list.
- **Screenshot:** `build-lead/shots/65-crop.png`.

**B5 — Minor — 4′ gabion bench: the model is drawn right-way-up while the text builds it upside down**
- The text builds frame-down: staple the mesh to a frame on the ground, close the "top" in step 7, then "Rotate the basket 180°" in step 8.
- The model shows the wood frame on top from step 3 on. In step 7 ("Place the 18-4a top piece on top") it highlights a panel at the **bottom**. Step 8 shows no rotation.
- The cut list calls 18-4a the "bottom panel", but step 7 calls it the "top piece".
- Ray can sort that out; a volunteer crew will argue about it.
- **Screenshot:** `build-lead/shots/67-gb-sheet.png`.

**B6 — Minor — 4′ gabion bench: the lumber count assumes a zero-kerf cut**
- The parts are 7 × 48″ + 3 × 15″ = 381″, about 3.97 boards. The materials list says 4.5.
- That only works if two 48″ pieces come out of each 96″ board. With a ⅛″ kerf the second piece is 47⅞″, unless the stock runs long.
- Suggest a note: "one 48″ per board, or buy 2x4x10s".

**B7 — Minor — mulch depth: the Create text and the estimate disagree**
- Phase 6 says "install **4″** of mulch". The estimate buys "Mulch, **2″**", 4 CY.
- 32 squares × 16 sq ft = 512 sq ft. At 2″ that's 85 cu ft, or 3.2 CY, so 4 CY is right for 2″. At 4″ it would be 6.3 CY, so 7 CY.

**B8 — Polish — Bench + Back size note says "wide" where a builder says "deep"**
- "Built from these parts it comes out about 20¾″ wide" is the front-to-back depth (18.5″ + 2.3″ bracket).
- The other size notes ("19½″ tall" on the gabion bench, "22½″ tall" on the planter, the shade's 8′-3″) are clear, with the reasoning shown.

## 4. What worked well (keep these)

- **The planner's mouse handling is solid.** Drag, rotate handle with step snap (Shift for free), Duplicate three ways, Delete key, right-click menu, Esc, palette drag-and-drop to a chosen spot, and multi-level Undo/Redo that restores exact positions. Nothing jumped and nothing got lost. Orbiting in 3D kept the selection, and the "sticks out past the lot line" warning shows up right away.
- **The Counts step matched my own count of the plan exactly** and carried straight into the estimator, with the conversions spelled out ("an 8′ gabion bench is two").
- **Every estimate line I checked is right.** Examples:
  - Erosion fence: 226 ft perimeter → 3 rolls.
  - Stakes: 1,632 sq ft ÷ 20 = 82 → 4 packs of 25.
  - Soil: 512 sq ft × 0.5 ft = 256 cu ft = 9.5 → 10 CY.
  - Filter fabric: 1,632 ÷ 400 → 5 rolls.
  - Staples: 327 → 4 boxes.
  - 1x6x12: 226 ÷ 12 → 19.
  - L-brackets: 113 ÷ 5 → 23 and 83 ÷ 5 → 17.
  - Gabion stone: 48 cu ft = 1.78 CY × 1.4 → 3 t.
  - Base furnishings sum $1,665.06 ✓; base design $6,486.50 ✓; total $9,691.56 ✓.
  - Merged order list: 2x4x8 = 1 + 2 + 3 + 22 + 12 + 11 + 18 = 69 ✓; screws 144 + 144 + 240 + 200 = 728 ✓. The CSV matches the screen.
- **"Price needed" works.** Each item has a clear box, "not in the total" until filled, and then the line, the totals, both contingencies and "Prices you added +$70.09" (51.92 × 1.35) all update.
- **"How this differs from Park in a Truck's spreadsheet"** is honest and specific.
- **The 3D build models are the best thing on the site for a crew.**
  - The model follows the steps as you scroll, with the new pieces highlighted in blue.
  - Hover or tap labels give the part, the size and the name.
  - Exploded view shows each piece separately.
  - The step 1 "lumber piles" with counts double as a cut-list check.
  - The Bench + Back model, text and cut list agree piece for piece. I checked every part: BB-1 3+3, BB-2 3, BB-3 2/frame, BB-4 2/frame, BB-5 2/frame, BB-6 4/frame, BB-7 2/frame, and 112 screws = (30 + 14) × 2 + 12 + 12.
- **The "Built from these parts it comes out about…" notes** explain why the built size differs from the cover. The shade's SS-1 shortage warning is exactly the kind of note a lead wants.
- **On the tablet,** the sticky 3D strip with "Hide 3D", readable 17 px text, no sideways scrolling and the landscape side-by-side layout all work well.
- **The schedule** snaps to Saturdays, has "Skip this weekend" links, and exports an .ics with the lot address. The 811 One Call step has the address pre-filled.

## 5. Top 3 changes

1. **Build the furniture part of the order list from the build guides, or flag every mismatch.** That means the bench with back, shade, stage (price the 12×8 stage; stop calling it "6 squares, 24′ long"), planters, tables and stools. Right now the bulk-materials half of the order list is ready for the yard, but the lumber half isn't (A1, A2, A11, B2).
2. **Fix the guide errors where the text disagrees with the cut list or model, with site notes like the shade one.** That's the planter P-2/P-3 vs P-1, the table's T-1 count, the stage's 2x4x8 count (16 → about 25), and the gabion-bench orientation (B1, B3, B4, B5).
3. **Make every count agree everywhere and stop stretching furniture.** That means one perennial rule (128 vs 160), the gabion wall visible in Counts and on the plan, and fixed footprints for built items (A3, A4, A7).

## 6. Would Ray keep using it?

Yes, for laying out the park and for the build guides. He'd walk the committee through the planner, and he'd put the 3D guides on a tablet at each station on build day, because the tap-a-board labels and exploded view answer the questions volunteers keep asking.

No, not yet, for ordering. He'd use the order list for stone, soil, gravel, fabric and plants. He'd write the lumber and hardware list himself from the guides, after finding the stage 9 boards short and the bench order full of 2x10s and 4x4s the bench never uses.
