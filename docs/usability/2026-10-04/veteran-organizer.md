# Usability report: veteran-organizer (desktop, 1366 px)

Screenshots are in `/tmp/claude-1000/-home-hoid-Desktop/77b80b24-1852-484f-8c9a-3c0a10b8adef/scratchpad/ux/sessions/veteran-organizer/shots/`, called `shots/` below. Raw City API responses, the link-check table (`linkcheck.tsv`) and page text dumps are in `.../sessions/veteran-organizer/data/`.

## 1. Who I am

I tested as Ana, 52. She has spent 15+ years organizing gardens and land access in Philadelphia, and she is wary of tools that make residents overconfident. She set out to check three things:
- whether the automatic City data is correct, using her main lot 2424 N Mole St (Redevelopment Authority), 2735 N Hicks St (private individuals) and 5743 Woodland Ave (commercially zoned), plus a few extra lots chosen to test edge cases;
- whether the land-access guidance is right for Philadelphia in 2026;
- whether the hard part, getting permission, shows up early enough.

## 2. Journey

1. **Home page.** I typed 2424 N Mole St into "Have a lot in mind?". The card came back in about 2 seconds with owner, size, zoning, vacancy, council district, RCOs, flood zone and an outline. That's faster than atlas. I clicked "Use this as my park lot". Once a lot is set, the home page box turns into the card and the address field disappears. To look up another lot you have to find "Look up a different lot", which I did.
2. **Hicks St and Woodland Ave** lookups. I cross-checked every field of all three lots against AIS, Carto (`opa_properties_public`, `pwd_parcels`) and the ArcGIS layers (Vacant_Indicators_Land, Zoning_BaseDistricts, Zoning_RCO, fema_floodplain_2023, Council_Districts_2024, LI_BUILDING_FOOTPRINTS, ppr_tree_inventory_2025). The core data is very good (table below).
3. **Is this public lot actually available?** For Ana that is the first real question, so I opened the Land Bank's own Community Use map. Its data comes from the City's public `LAMAAssets` layer, in the same ArcGIS organization the site already queries. It shows 2424 N Mole St as agency PRA, **"Owned - Available"**, **side-yard eligible**. Nearby public lots that the site shows as the same blue "public owner" with the same "Potential purchase" path are listed there as **"On Hold for AHD"** (affordable housing), **"Processing Applicant, Not Available"** or **"Not Available"**. The site never shows this status.
4. **Owners that are not the City.** Philadelphia Housing Authority and School District lots get the City / Land Bank purchase path too. Those agencies' land is not in the Land Bank inventory at all.
5. **The steps.** I read Acquire, Organize, Assess and Create closely, and Start, Dream and Sustain more quickly. Acquire comes first and is honest ("no guaranteed outcome"). Several things that would get residents in trouble are missing or arrive late:
   - insurance and a written agreement only show up in Create;
   - councilmember support is never mentioned as a requirement;
   - lead testing is one sentence;
   - a "fire hydrant opener / gear puller" appears in the order list with no permit mentioned;
   - street-tree pruning permits and structure permits are missing.
6. **Assess.** Edge lengths, area, the tallest nearby building and street trees all matched City data to about 0.1 ft. **Plan in 3D** loaded and warned that the park pieces hang over the lot line (good). It also called 2424 N Mole "buildings on both sides", which is wrong: both neighbours are vacant lots.
7. **My park** shows a different lot size (496 sq ft) from every other page (462 sq ft).
8. **Outside links.** I checked 122 links from the step pages plus the City and partner links on Resources. About 10 are dead or stale and not flagged where they appear.

I didn't get stuck anywhere. The only real hesitation was on Find a lot, which has three address boxes that look the same.

### Data cross-check: site vs City sources

| Field | 2424 N Mole St | 2735 N Hicks St | 5743 Woodland Ave |
|---|---|---|---|
| Owner (site) | "REDEVELOPMENT AUTHORITY **&** OF PHILADELPHIA", PRA (public) | "HERBERT MITCHELL & VICTORIA", private | "KELSEY THERESA M", private |
| Owner (OPA/AIS) | owner_1 REDEVELOPMENT AUTHORITY, owner_2 OF PHILADELPHIA | HERBERT MITCHELL / VICTORIA | KELSEY THERESA M ✓ |
| Lot size (site cards) | 15.3 × 30.8 ft, 462 sq ft | 13.1 × 48.4 ft, 626 sq ft | 16.6 × 82.2 ft, 1,310 sq ft |
| PWD parcel | gross 461; my edges 15.3 / 30.6 / 15.0 / 30.6, area 462 ✓ | gross 625; edges 48.2 / 12.9 / 48.0 / 13.1 ✓ | gross 1,310; edges 16.6 / 82.2 / 15.3 / 82.3 ✓ |
| OPA (used on My park) | 496 sq ft, 16 × 32 | 672 sq ft, 14 × 48 | 1,360 sq ft, 16 × 85 |
| Zoning | RSA-5 ✓ | RSA-5 ✓ | CMX-2 ✓ |
| Vacancy | Yes ✓ (land_rank 1) | Yes ✓ | Yes ✓ |
| Lot type | Mid-block ✓ (planner says "buildings on both sides" ✗) | Mid-block ✓ | Mid-block |
| Council district | 5, Jeffery Young Jr. ✓ | 8, Cindy Bass ✓ | 2, Kenyatta Johnson ✓ |
| RCOs | 3 names ✓ (lni 105/261/365) | 6 names ✓ | 4 names ✓ |
| Flood | X ✓ | X ✓ | X ✓ (separately, AE shown correctly for 3502 S 86th St) |
| Trees (Assess) | 0 on lot, 1 within 30 ft (Japanese tree lilac) ✓ | 0 / 0 ✓ | not checked |
| Buildings (Assess) | none touching ✓; tallest 27 ft within 150 ft ✓ (approx_hgt; 2410 N 16th, 28 ft, sits right at 150 ft) | 1 touching, 24 ft (2733 N Hicks) ✓; tallest 38 ft ✓ | not checked |
| Size class A–E | under A ✓ | A ✓ | B (closest fit) ✓, fits with length seams |
| Land Bank status (not shown by site) | PRA, Owned - Available, side-yard eligible | not in inventory (private) | n/a |

## 3. Findings

### A. Site errors (data or automation wrong, bugs, misleading presentation; the site's own fault and fixable now)

**S1. Major, wrong info.** Public owners that are not the City or Land Bank get the Land Bank purchase path.
- Where: any lookup card ("PUBLIC OWNER — YOUR PATH"), on `/`, `/lot/` and `/steps/acquire/`.
- Steps: look up **2537 N 11th St** (owner PHILADELPHIA HOUSING AUTH) or **1721-35 W Sedgley Ave** (SCHOOL DISTRICT OF PHILA).
- Expected: the workbook's 4A path is written for "Owner is… City of Philadelphia". PHA and School District land is not sold through PHDC or the Land Bank. The City's `LAMAAssets` inventory behind the Land Bank map has only four agencies: PUB, PLB, PRA and PHDC. Neither lot appears in it.
- Observed: both cards say "Potential purchase. Publicly owned land in Philadelphia is sold or leased through PHDC and the Philadelphia Land Bank… Land Bank Community Use map". The site even labels the second one "Another public agency — School District of Philadelphia" and still attaches the City path.
- Effect: a resident is sent to an agency that cannot help them.
- Screenshots: `shots/33-pha-penrose.png`, `shots/32b-schooldistrict-path-bottom.png`.

**S2. Major, wrong result.** "Park size … (closest fit)" can recommend a piece set that is bigger than the lot.
- Steps:
  - Look up **3502 S 86th St**: 40.6 × 61.4 ft gets "Size C (closest fit)". Size C needs a long edge of 76–88 ft, and this lot is 61 ft long.
  - Look up **2400 N 15th St**: 14.7 × 69 ft gets "Size B". B needs a short edge of 16–28 ft. The planner then shows "Fit my lot (B)" and "Stretch the pieces to fill my lot (69 × 14 ft)", which actually squeezes them below B's printed minimum width.
- Expected: by the workbook's own rule ("if there's extra room, expand by adding seams"), seams only add feet. The right answer is the largest size that fits in both directions, then seams: size A for both lots.
- Observed: the site states the wrong size with confidence ("the Park in a Truck piece set for this lot"), and the cost estimate is built on it.
- Screenshots: `shots/31-86th-sizeC.png`, `shots/28-planner-size.png`.

**S3. Minor, wrong info.** My park shows a different lot size from every other page.
- Steps: set 2424 N Mole St as the park lot, then open `/my-park/`.
- Observed: My park says "496 sq ft (16 × 32 ft)", which is OPA's assessment frontage and depth. The cards, compare table, Assess and planner all say 462 sq ft (15.3 × 30.8), from the PWD parcel. Reproduced with Hicks St: My park says 672 sq ft (14 × 48), everywhere else says 626.
- Expected: one number, with its source named.
- Screenshot: `shots/35-mypark-lotsize.png`.

**S4. Minor, wrong info.** Owner names are joined with "&" even when the second line just continues the first name.
- Observed: "REDEVELOPMENT AUTHORITY & OF PHILADELPHIA", "PHILADELPHIA HOUSING & DEVELOPMENT CORPORATION", "CITY OF PHILA & DEPT OF PUBLIC PROP".
- The "&" is correct for two people ("HERBERT MITCHELL & VICTORIA"). It also gets copied into the "Owner name" field that is "filled in from City records".
- Related: "Hope Street Developers Ll". The City data is truncated to "LL", and title-casing makes it look like a typo.
- Screenshots: `shots/06-mole-card.png`, `shots/16-map-click1.png`.

**S5. Minor, wrong info.** Wrong neighbourhood name on 2537 N 11th St.
- Observed: the card subtitle says "**Penrose** · Philadelphia 19133". Seen twice: once on a fresh lookup, once from cache.
- Expected: AIS says planning district "Lower North". Penrose is a Southwest Philadelphia neighbourhood by the airport, about 7 miles away. Other lots show sensible names ("Lower North", "Brewerytown").
- The source of this label is unknown: no network request contained "Penrose".
- Screenshot: `shots/33-pha-penrose.png`.

**S6. Minor, wrong info.** The planner says "Kind of lot: Mid-block (buildings on both sides)" for 2424 N Mole St.
- Expected: both neighbours (2422 and 2426 N Mole) are vacant lots. Assess says "Buildings next door: None touching the lot", and the planner's own 3D view shows no adjacent buildings.
- Screenshots: `shots/23-plan3d.png`, `shots/18b-assess-measured2.png`.

**S7. Minor, bug.** Organize's "found for you" lists fail intermittently.
- Steps: open `/steps/organize/` with a park lot set. I loaded it 4 times.
- Observed: "Couldn't load this list from the City right now" on 6, then 2, then 1, then 0 sections (Park friends, Libraries, Hospitals, Universities, Community gardens, Murals). On loads 1–3, `Universities_Colleges/FeatureServer` returned HTTP 400 ("Invalid URL"). On load 4 it worked, so it may have been fixed during my session.
- On load 2, Community gardens showed "couldn't load" even though its request returned 200 with an empty list.
- Screenshot: `shots/20-organize-assets.png`.

**S8. Minor, wrong info.** Dead or stale outside links appear in the steps without any warning.
- Resources even says "2 links on this page are currently dead".
- Dead (checked with `curl -sIL` plus GET, 2026-10-04):

| Link | Problem |
|---|---|
| OK Rental `okrentalsaleservice.com` (Create) | domain doesn't resolve; flagged on Resources, not in Create |
| Longwood plant explorer (Create, Sustain, Resources) | connection refused |
| Greensgrow `greensgrow.org/about-us/` (Sustain, Resources) | Squarespace "Website Expired", 404 |
| Gardens Alive (Create) | TLS certificate expired |
| USDA NRCS "Common weeds" PDF (Sustain) | fails |
| Diamond Tool links (Create, and the two "fire hydrant opener" items in the Dream order list) | redirect to a generic White Cap page |
| Empowered CDC | 404; flagged on Resources |

- Unconfirmed, because Amazon blocks scripted requests: two Amazon products (silt fence `B00HL2EABU`, pre-emergent `B083PKMJTM`) returned 404 while other Amazon links returned 200.
- Evidence: `data/linkcheck.tsv`.

**S9. Minor, wrong info.** The lead-test link goes to a form that doesn't include lead.
- Where: Assess, "Site visit".
- Observed: the text shows `agsci.psu.edu/aasl/soil-testing`, but the link actually goes to `…/fertility/soil-fertility-submission-forms`. That fertility test does not include lead. At Penn State's lab, lead is a separate $30 "environmental" add-on, sold "results only, no interpretations or recommendations".
- Effect: a resident who follows the link to get "a simple test for lead" will order a test without lead.
- Screenshot: `shots/17-assess-top.png` (text in `data/step-assess.txt`).

**S10. Minor, confusing UI.** Find a lot has three address boxes that look the same but do different things.
- "Look up an address" (which disappears once a park lot is set), the map's "Go to an address or corner", and "Add a possible lot by address" all use the placeholder "e.g. 1322 N Dover St".
- Looking up an address in the compare box shows a full card but doesn't add the lot to the comparison table until you also press "+ Add to my list".
- Screenshot: `shots/13-findlot.png`.

**S11. Polish.** "Long edge 30.8 ft / Short edge 15.3 ft" sits directly under measured edges whose longest side is 30.6 ft. Hicks: 48.4 vs 48.3. It looks like a bounding box; label it or use the real edges. Screenshot: `shots/18-assess-measured.png`.

**S12. Polish.** A hospital distance reads "**1. mi**" (Temple University Hospital) on Organize. Screenshot: `shots/29-organize-hospitals.png`.

**S13. Polish.** After "Use this as my park lot" on the home page: "The owner and address fields on this page are filled in from City records". There are no such fields on that page.

**S14. Polish, three link labels.**
- Councilmember "website ↗" goes to the phlcouncil.com homepage, not his own page.
- Resources "Green City, Clean Waters — stormwater/rain-garden grant" goes to a 10-year anniversary story, not a grant.
- Resources calls Clean & Green Philly a "City tool". I believe it is a Code for Philly civic-tech project (unconfirmed).

### B. Content gaps to pass to Park in a Truck (their own guidance is outdated, incomplete or risky in Philadelphia, 2026)

**C1. Major. Councilmember support is never named as a requirement.**
- In practice, the district councilmember's support decides whether City, Land Bank or PRA land goes to a group (councilmanic prerogative). Start Here even presents "approach your councilperson" as the slow alternative to doing it yourself.
- The site already shows the councilmember on every card. PiaT's text should say that this is the person whose support the application needs, and that it is worth getting early.

**C2. Major. Insurance, a written agreement, and an organization to hold them first appear in Create** ("consult your organization's … insurance carrier before starting construction").
- Public agencies and most private owners will ask for a written license or lease and proof of liability insurance before anyone sets foot on the lot. That needs an entity (nonprofit or fiscal sponsor) to sign.
- This belongs in Acquire, next to "In-kind agreement". Today that option reads like a handshake ("discuss the mutual benefits").

**C3. Major (safety). Lead in soil gets one sentence.**
- Many North Philadelphia lots are former rowhouse sites with lead paint debris. The workbook offers an Edible theme and Nature Play areas for children.
- Missing:
  - test before the Dream step, and say what results mean;
  - cover bare soil (fabric plus clean fill or mulch);
  - use raised beds with clean soil for anything edible;
  - Penn State's standard test does not include lead (see S9).

**C4. Major (legal). Water access.** Sustain says "water weekly for the first two years", but a vacant lot has no water supply. The Dream order list suggests buying a "Fire hydrant opener — gear puller to open". Opening a hydrant without a Philadelphia Water Department permit (and a backflow device) is illegal. Point to PWD's hydrant permit, rain barrels and neighbour hose agreements instead.

**C5. Minor. Public land is presented only as "potential purchase".**
- The Land Bank has a Community Garden application and garden/community-use agreements. Its own map has a status "Available (Garden Agreement)".
- Side-yard eligibility means the next-door owner may have a competing claim. 2424 N Mole is side-yard eligible.

**C6. Minor. Private lots: the realities are missing.**
- tangled titles and heirs (2735 N Hicks last sold in **1952**; the mailing address may be decades out of date);
- tax delinquency, and the Land Bank acquiring tax-delinquent lots that gardeners already use;
- sheriff sale risks: deposit, payment within days, title problems;
- with an "in-kind" agreement, the owner can sell at any time.

**C7. Minor. Permits.**
- Create tells volunteers to "prune existing trees … to at least 6 ft". Street trees need a Parks & Recreation permit before pruning or removal.
- Sheds, stages, pergolas, trellises and some fences can need L&I zoning or building permits. L&I is never mentioned.
- 811 is there (good) but without the lead time (a few business days before digging).

**C8. Minor. Chemicals.**
- Picloram for stump treatment is persistent and moves through soil. It is hazardous next to street trees and food beds and not something to hand to volunteers.
- "Spray weeds with 20% vinegar": horticultural vinegar at that strength causes skin and eye burns and needs eye and hand protection.

**C9. Minor. Step order and the long term.**
- In Philadelphia, Organize (a group, an entity, neighbour and RCO support) usually comes before or alongside Acquire, because applications need it. The site's "Work through them in order — each one builds on the last" reinforces strict ordering.
- Nothing covers keeping the park long term: licenses end and lots get sold. Neighborhood Gardens Trust is only a resource link. PHS Garden Tenders and LandCare aren't mentioned in the steps.

### C. Design suggestions

**D1. Major. Show the Land Bank availability status on every public lot.**
- The `LAMAAssets` layer (status_1, agency, sideyardeligible) is public, in the same ArcGIS organization the site already queries.
- Examples:
  - 2424 N Mole St: PRA, "Owned - Available", side-yard eligible;
  - 2336 N 16th St (City): "**On Hold for AHD**";
  - 2400 N 15th St (City): "**Processing Applicant, Not Available**";
  - 2426 N Mole St (PHDC): "Not Available".
- Today all four get the same blue map colour and "YOUR PATH: Potential purchase". This is the single biggest source of false confidence.
- Screenshot: `shots/34-onhold-AHD.png`.

**D2. Major. Make permission visible downstream.** If "Secure your lot" has no agreement recorded, show a banner on Assess (site visit and soil sampling), Dream and Create. Create currently lets you pick build weekends and print an order list with nothing recorded in Acquire.

**D3. Minor. Show adjacent vacant lots and their owners.** 2424 N Mole is 462 sq ft. 2416 (PRA), 2418 (City), 2426 and 2430 (PHDC) are all nearby public lots. Putting lots together is how organizers make tiny lots work.

**D4. Minor. For private lots, show the last sale date** (and, if it can be reached, tax delinquency). Add a short note that a 1952 sale probably means heirs, and that the mailing address may be stale.

**D5. Minor. Flag zoning where a park is unlikely to be allowed.** SP-AIR (airport) on 3502 S 86th St and industrial districts should get a "check the zoning use table" note. CMX-2 and RSA-5 cards say nothing about park or garden use, even though "is a park allowed here?" is what the resident actually wants to know.

**D6. Minor. Link "Council district" to what to do about it** (see C1), and link to the councilmember's own page.

**D7. Polish. Make the lot diagram match the aerial photo next to it.** On Assess the diagram is drawn "as you stand at the entrance", with north pointing down, beside a north-up aerial. They look mirrored. Add a "street on this side" label or rotate one of them.

## 4. What worked well (keep these)

- **Core City data is accurate**: owner, OPA number, zoning, vacancy, council district and member, every RCO name, FEMA zone (X and AE both worded correctly), PWD parcel edges to about 0.1 ft, building heights and street trees. It matched every source I checked on 3 lots, and on 6 more for spot fields.
- **Honest caveats**:
  - "field measurements win";
  - "the City's list misses some lots and includes some that are already in use";
  - "(as the City has it on file)" on mailing addresses;
  - "irregular shape — size of the rectangle around it";
  - "Lot type: Not sure — we couldn't find a street right next to this lot";
  - "Couldn't load this list" instead of pretending a list is empty.
- **Check-it-yourself links** on every card (atlas, property, zoning, Land Bank, RCO). The PRA path does lead to the right place: PRA land is in the Land Bank inventory, and the note that the old PHDC search page has moved to the Land Bank map is current and correct.
- **Acquire is step 1 and doesn't oversell.** "No such thing as a perfect process… no guaranteed outcome". "Secure your lot" says you need the agreement "before anyone breaks ground".
- **811 is in Create**, with the lot address filled in for the PA One Call request.
- **Organize pulls RCO contacts and the councilmember automatically.** That alone saves a resident an afternoon.
- **The planner warns** when park pieces hang over the lot line, and the Park Patch fallback for tiny lots is sensible.
- **Resources honestly marks** some dead or unverifiable links rather than hiding them. Extend this to the step pages (S8).

## 5. Top 3 changes

1. **Show Land Bank availability status and side-yard eligibility on every public lot, and stop giving PHA, School District and other non-City owners the Land Bank purchase path** (D1, S1).
2. **Move permission up front and keep it visible.** Pass C1–C2 (councilmember support, insurance, a written agreement, an organization to hold it) to Park in a Truck for Acquire. On the site, add the "no agreement recorded yet" banner on Assess, Dream and Create (D2).
3. **Fix the safety gaps.** Fix the lead-test link now (S9). Pass the lead guidance, the hydrant permit, the street-tree permit and the herbicide cautions to Park in a Truck (C3, C4, C7, C8). Fix the size-class rule so it never recommends pieces bigger than the lot (S2).

## 6. Would Ana keep using it?

**For her own work, yes.** The lookup card, measured edges, building heights and RCO and councilmember pull are accurate and much faster than atlas plus three other City sites. She would use it as a first pass on every lot.

**She would not hand it to residents yet.** A resident who looks up a City lot that is on hold for affordable housing, or a PHA lot, gets "YOUR PATH: Potential purchase" and a blue "public owner" tag. They then get a soil, design and build workflow with no prompt that they still need the councilmember, insurance and a signed agreement. That is exactly the false confidence she has spent years cleaning up after. With D1, D2 and S1 fixed, she would recommend it.
