# Notes for the Park in a Truck team

*Usability testing, October 2026: five test personas.*

Things found while turning the toolkit into the website (October 2026), and while five people tested the site on
4 October 2026: a first-time phone user, a block captain, a Philadelphia land-access organizer, a carpenter who leads
volunteer build days, and a low-vision keyboard user. Nothing here has been sent; it is for the site owner to share
if and how they choose. Each item says where it is and what we did on the site.

The site keeps Park in a Truck's own words. Where the text could get people into legal or health trouble (opening a
hydrant, lead in soil, street trees, herbicides), the site now adds a short note clearly marked **"Note from this
site, not Park in a Truck"**, linking the official source. The build guides use the same marked notes where the
step text disagrees with the cut list or drawings.

## Broken or moved links

| Where | Problem | What the site does |
|---|---|---|
| Linktree → "STAGE Assembly!" | Google Drive file no longer exists (404) | Uses the copy linked from the Dream workbook p.19 (Drive id 19dSJ1Pv…) |
| Linktree → "07_Planting Patch Workbook!" | Asks for a Google sign-in | Uses the copy linked from the toolkit p.10 (Drive id 1xSUA_yB…) |
| Acquire workbook p.4 and toolkit → phdcphila.org/land/buy-land/property-search-map/ | 404 | Links the Philadelphia Land Bank's Community Use map: phillylandbank.org/community-use-map/ |
| Dream workbook p.19 → "GABION WALL" and "SHADE CANOPY" | Both open the same generic "12-inch gabion basket assembly" document | Gabion wall has no guide page; shade uses the real SHADE assembly from the Linktree |
| Partner list → Empowered CDC | 404 | Shown, marked "link currently dead" |
| Toolkit suppliers and Create (Phase 2) → OK Rental Sales & Service | Site gone (domain no longer resolves) | Marked "link currently dead" on Resources and now in Create too |
| Toolkit acknowledgments → Greenfield Foundation | Link points to an unrelated nonprofit | Shown without a link |
| Create and Sustain → Longwood Gardens plant explorer | Connection refused; the tool looks retired | Marked "link currently dead" in both steps now; Resources says it appears retired |
| Sustain → Greensgrow "about us" page | The site's hosting has expired (404) | Marked "link currently dead" |
| Create and Sustain → Gardens Alive | The site's security certificate has expired, so browsers warn | Linked unmarked in the steps (Resources treats it as live with a warning, not dead, so the steps match that call) |
| Sustain → USDA NRCS "Common weeds" PDF | Fails to load | Marked "link currently dead" |
| Create (tool rental) → Diamond Tool | Every link now redirects to a generic White Cap page | Marked "could not verify automatically" in Create, matching Resources' "unverified"; the cost estimator's order list ("fire hydrant opener" items, `src/lib/cost/orderList.ts`) still links it unmarked — out of this round's scope |
| Sustain → Amazon pre-emergent (B083PKMJTM); order list → Amazon silt fence (B00HL2EABU) | Returned "not found" to an automated check while other Amazon links worked; not confirmed by hand | Linked unmarked |
| Assess, "Site visit" → the Penn State soil-test link | The printed text reads "agsci.psu.edu/aasl/soil-testing", but the link goes to `…/fertility/soil-fertility-submission-forms` (the standard fertility test, not a lead test). This is PiaT's own PDF link, not a web-conversion error — `source/pdf_links.json` shows the Assess workbook's PDF hyperlinks that exact URI to that exact target. | Left as PiaT printed it; the lead-in-soil site note right below it links the correct environmental/lead test form separately |

The jefferson.edu toolkit page still serves the 2022 workbooks; the Linktree versions (2023–2026) are newer.
Links were checked on 4 October 2026.

## Printable park pieces (Dream p.11 downloads)

- Size **B** and size **E** "corner lot street right" downloads are byte-identical copies of the "street left" files
  (their covers say STREET LEFT). The site builds street-right versions by mirroring.
- The size B corner print is mirrored (front on the right) compared with the other sets.
- In the size B corner sets and the size D street-left set, the **Nature** pages repeat the **Sanctuary** layout.

## Assembly guides

| Guide | Note |
|---|---|
| Stool | Step 2 says "S-4" where the drawing shows S-3; step 3 refers to "BB-6", which does not exist (fixed to S-4 on the site) |
| Shade | Step 5 refers to "SS-5", which does not exist (fixed to SS-1); the cut list's 14 × SS-1 is fewer than the steps use (the site marks this with a note; the 47 boards in the materials list do cover all 32) |
| 8' gabion bench | Final steps call the top boards "GB-2" but the cut list and drawing say GB-1; page 9 labels a mesh panel "BM-3", not in the cut list |
| Workbench | No dimension drawing; the site's sizes come from the cut list |

Stated sizes vs. what the parts build (found while making the 3D models):

| Guide | Stated | Built from the parts | Why |
|---|---|---|---|
| 24" planter | 24 × 24 × 24 | 24 × 24 × 22.5 | Six 3.5" wall boards = 21", plus 1.5" bottom slats |
| Gabion bench (4' and 8') | 18" tall | 19.5" tall | The 2x4 top sits on the frame above the 18" mesh sides |
| Shade | 96 × 96 × 96 | 96 × 99 × 97.5 | Cross beams sit outside the legs; the canopy sits on the beams |
| Bench + back | 48 × 18.5 × 25 | 48 × 20.8 × 33.8 | 25" is the arm height; the backrest (bracket + boards) rises to ~34" and reclines back |
| 2' table | cut list: 11 × T-2 | 9 × T-2 | Steps, cover and drawing use 9 (2 in the end frames, 7 on top); 11 also exceeds the lumber in the materials list |
| 6' table | 7 top boards | 6 or 7 | Cut list and cover say 7; step-5 text and drawing show 6 |
| 8' gabion bench | cut list: 6 × GB-2 | 5 × GB-2 | 2 end caps + 3 braces; the guide's own step-1 drawing shows a pile of 5 |
| Shade | cut list: 14 × SS-1 | 32 × SS-1 | 4 legs, 2 top beams, 4 braces, 2 cross beams, 4 long braces, 1 top support, 15 canopy boards |
| Stage | materials: 16 × 2x4x8' | about 25 × 2x4x8' | The 93" and 86" pieces alone need 23 boards (see below) |

Step-text slips found while modelling (the site follows the cut list and drawings):

- 24" planter: step 2 puts P-2 "on either side" (the drawing needs P-1 stiles with P-2 rails); step 3 calls the slats
  P-2 (they must be the 21" P-1); steps 4–5 mention "P-3", which this guide doesn't have. (The site now adds a marked
  note on steps 3–5; see below.)
- 18" planter: step 3 says "frame created in step three".
- Bench + back: the step-7 tip says "BB-6" where it means BB-2; the step-7 text says "secured in step seven" (step six).
- 8' gabion bench: the step-10 detail's 1/4" gaps don't fit five boards on the 18" frame (1/8" does).
- Workbench: the text says the front brace "will overhang slightly", but 41" + 2 × 1.5" = 44" exactly.

### Checked by a carpenter (usability testing, October 2026)

A union carpenter who leads volunteer build days checked five guides the way he'd check shop drawings: cut-per-board
math, pieces in the step text against the cut list, and the 3D model step by step. The Bench + Back guide is fully
consistent. These are the places where a volunteer crew following the text would go wrong:

| Guide | Problem | What the site does now |
|---|---|---|
| Stage | The materials list says **16** 2x4x8s; the cut list needs **about 25**. Each 93" ST-2 (11) and 86" ST-3 (12) takes a whole 8' board (23 boards), the eight 14.75" ST-4 take 2 more, and the twelve 7.75" ST-5 come from the ST-3 offcuts. The step text agrees with the cut list; only the board count is short (by 9, about a third). | A marked note on the 2x4x8 line of the materials list |
| 24" planter | Steps 3 and 5 say **P-2** (17") and steps 4–5 mention **P-3**; the drawings, the cut list and the 3D model all use **P-1** (21"). Six 21" boards on the 24" frame leave the 1.5" gap the text asks for; P-1 × 33 = 4 in the frames + 12 filling the ends + 12 on the sides + 5 in the bottom. A volunteer following the text grabs the 17" pile. | Marked notes on steps 3, 4 and 5 |
| 6' table | Step 4 places 2 T-1; step 5 says "four more" (6 in all) and its tip "the three middle pieces" (5 in all). The cut list and the cover drawing have **7**, and 7 × 3.5" plus six small gaps is the cover's 26" width. Screws: the steps add up to **104** (30 for each end frame, 12 + 4 in step 4, 28 in step 5) against **92** in the materials list. | Marked notes on step 5 and on the screws line |
| 4' gabion bench | The text builds the basket upside down (frame on the ground, close the "top" in step 7, "rotate 180°" in step 8), while the cut list calls the step-7 panel (18-4a) the "bottom panel". Easy for a carpenter, but a crew will argue about which way is up. | Marked notes on steps 2 and 7 explaining the orientation (and on step 2 of the 8' bench, which is built the same way); the 3D model shows the bench right side up throughout |
| 4' gabion bench | 4.5 × 2x4x8 assumes two 48" pieces from every 8' board, which leaves nothing for the saw cut: the second piece comes out about 1/8" short. The "order 5–10% more" advice doesn't cover it. Full-length pieces need 7 eight-footers (one 48" each) or 4 ten-footers. | A marked note on the 2x4 line of the materials list |

Mulch depth: Create Phase 6 says "install **4"** of mulch", but the cost estimator buys "Mulch, **2"**" for the planting
areas (and Sustain says to keep mulch at 2–3"). At 4" the sample order roughly doubles (for 32 planting squares, about
7 CY instead of 4). The site's estimate follows the spreadsheet (2"); nothing else.

## Cost-estimator spreadsheet

33 issues, with cells, effects on the sample park and suggested formula fixes: see
[`piat-spreadsheet-issues.md`](piat-spreadsheet-issues.md). The biggest: tool rental counted twice in the final
cost; play area and outer edges counted twice in the base design; the 4' wood-topped gabion subtotal is `#REF!`;
gabion tables are calculated but left out of the total; several lumber sizes have no price. The site corrects the
math (keeping PiaT's prices) and asks people for any missing price. Also: cell B2 contains a reviewer's comment, a
cell says "ASK TEDDY…", and one cell holds a personal Home Depot order-tracking link.

Assumption the site made that PiaT should confirm: gabion walls are one course of 12"×12"×4' baskets (nothing says
to stack them).

Found in testing (October 2026):

- **Furniture lines don't match the build guides.** The spreadsheet's 4' bench with back calls for a 4x4x6, half a
  2x10x8, a 2x6x8, half a 2x8x8, three 2x4x8s, 36 screws and 2 brackets per bench; the Bench + Back guide is all 2x4:
  7.5 × 2x4x8, 112 screws, 6 lag screws, 4 carriage bolts and 2 brackets. For four benches that is 18 boards and 304
  screws short, plus wood the bench never uses. Smaller gaps of the same kind: stools (80 screws each vs. the guide's
  88), the 4' gabion bench (5.5 × 2x4x8 vs. 4.5), and the 8' gabion bench, which is priced as two 4' modules (11 boards,
  72 screws, two 4' baskets) where the 8' guide uses 8 boards and 36 screws. *Site:* the owner decided on 4 October
  2026 that the furniture order list comes from each guide's own materials list, priced with the spreadsheet's prices.
- **Perennials per planting square.** The cost estimator counts **4** perennials per green square (INSERT HERE C30 =
  B9 × 4); the four plant-list spreadsheets count **5**. The same design gets two different plant counts (for 32
  squares, 128 in the budget and 160 on the shopping list). *Site:* the estimate follows the cost spreadsheet and the
  plant picker follows the plant lists, so the Dream page shows both numbers.
- **Order-list links and lines.** "1x4x12" (QPI L65) has a price but no supplier link. There are two different 2.5"
  screw lines at $0.75 and $0.17 each (a SPAX cabinet-screw link and a GRK wood-screw link); it would help to say which
  goes where. The ORDER LIST's 2x4x12 link opens a 2x4x10 and the 1x6x12 edge-board link (QPI N77) opens a 2x6x12
  (both also in the spreadsheet notes). The Diamond Tool links, including the two "fire hydrant opener" items, now
  redirect to a generic White Cap page. *Site:* uses the same links for now.
- **"Fire hydrant opener — gear puller to open".** See *Philadelphia guidance* below: opening a hydrant needs a
  Philadelphia Water Department permit.

## Philadelphia guidance (from a land-access organizer)

One tester has organized gardens and land access in Philadelphia for over fifteen years. She found the site's City
data accurate (owners, lot sizes, zoning, council districts, RCOs, flood zones, building heights, street trees), but
flagged places where the workbooks' guidance is missing, out of date or could get residents into trouble in
Philadelphia in 2026. Her main worry is false confidence: a resident following the steps in order can reach Create
without the permissions that decide whether a park can happen at all.

| | What's missing or risky | What the site does |
|---|---|---|
| Councilmember support | In practice, the district councilmember's support decides whether City, Land Bank or Redevelopment Authority land goes to a group. The workbooks never name it as a requirement, and Start Here presents "approach your councilperson" as the slow alternative to doing it yourself. Worth saying it is needed, and early. | Nothing new; every lot lookup already shows the district councilmember |
| Insurance, a written agreement, and an organization to hold them | These first appear in Create ("consult your organization's … insurance carrier before starting construction"). Public agencies and most private owners ask for a written license or lease and proof of liability insurance before anyone works on the lot, which needs a nonprofit or fiscal sponsor to sign. This belongs in Acquire, next to "In-kind agreement", which today reads like a handshake. | Nothing |
| Lead in soil | One sentence in Assess. Many lots are former rowhouse sites with lead-paint debris, and the toolkit offers an Edible theme and nature play for children. Missing: test before Dream and what results mean; cover bare soil; raised beds with clean soil for food. The workbook's Penn State link opens the standard fertility-test forms, and that test doesn't include lead; lead is a separate environmental test. | A marked note in Assess: the standard test has no lead, how to get a lead test (Penn State's environmental test or an EPA-recognized lab), and the City's lead guide on garden soil |
| Water and fire hydrants | Sustain says to water weekly for two years, but a vacant lot usually has no water, and the Dream order list suggests a "fire hydrant opener — gear puller to open". Opening a hydrant needs a Philadelphia Water Department permit and an approved backflow preventer (community gardens are exempt from the fee). PWD's urban garden guide lists the legal options. | Marked notes in Dream (by the order list) and Sustain (watering), linking PWD's hydrant permit page and urban garden guide |
| Public land is more than "purchase" | The Land Bank also offers community garden licenses (up to five years). Side-yard-eligible lots can be bought by the next-door owner, a competing claim residents should know about. | Nothing new; lookups link the Land Bank's map |
| Private lots | Missing: tangled titles and heirs (one test lot last sold in 1952, so the mailing address may be decades old); tax delinquency, and the Land Bank acquiring tax-delinquent lots that gardeners already use; sheriff-sale risks (deposit, quick payment, title problems); and that an owner with an in-kind agreement can sell at any time. | Nothing |
| Permits | Create says to "prune existing trees"; pruning or removing a street tree needs a Philadelphia Parks & Recreation permit. Sheds, stages, pergolas, trellises and some fences can need an L&I zoning or building permit; L&I is never mentioned. PA One Call 811 is there, but not its lead time: call three to ten business days before you dig. | Marked notes on street trees in Create and Sustain; nothing on L&I or the 811 lead time |
| Chemicals | Picloram for stumps is persistent and moves through soil, a risk next to street trees and food beds; many picloram products are restricted-use (certified applicators only). Horticultural vinegar at 20% can burn skin and permanently damage eyes. | Marked notes in Create (label is the law, restricted-use picloram, eye and hand protection for vinegar) and Sustain (vinegar) |
| Step order and the long term | In Philadelphia, Organize (a group, an entity, neighbor and RCO support) usually comes before or alongside Acquire, because applications need it; "Work through them in order" reinforces strict ordering. Nothing covers keeping the park: licenses end and lots get sold. Neighborhood Gardens Trust is only a resource link; PHS Garden Tenders and LandCare aren't mentioned. | Nothing |

Official sources the site links (checked 4 October 2026): PWD hydrant permits
(water.phila.gov/development/connections/hydrant-permits/), PWD urban garden guide (water.phila.gov/urban-garden-guide/),
Penn State environmental soil testing (agsci.psu.edu/aasl/soil-testing/environmental), the City's lead guide
(phila.gov/guides/lead-guide/where-is-lead/), Parks & Recreation street tree questions
(phila.gov/departments/philadelphia-parks-recreation/street-tree-frequently-asked-questions/), EPA pesticide labels and
restricted-use products, and the National Pesticide Information Center on vinegar (npic.orst.edu/faq/vinegar.html).

## Parks list

- Press spells the Southwest Philly park "Glenda **Ann Christopher**"; Linktree says "Glenda Anne Memorial Park".
- Dover Street Pocket Park and the Brewerytown streetscape have map pins but no public write-up; a sentence and a
  photo for each would help.
- Is "S 60th St & Greenway Ave" its own park or part of Glenda Anne Memorial Park?

## Things we would love to have

- Logo files (the site uses the wordmark as text).
- Permission notes for volunteer photos.
- Current prices for the cost estimator, and the date the spreadsheet prices are from.
