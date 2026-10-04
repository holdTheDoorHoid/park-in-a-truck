# Usability report — Marcus (block captain), desktop

Session: `block-captain` (desktop), plus a short-lived second session `block-captain-2` (desktop) to play the
co-organizer. Screenshots referenced below live in
`/tmp/claude-1000/-home-hoid-Desktop/77b80b24-1852-484f-8c9a-3c0a10b8adef/scratchpad/ux/sessions/block-captain/shots/`
(second session's in the `block-captain-2` sibling folder). Downloaded files are in each session's `downloads/`.

## 1. Who I am

I'm Marcus, 38, block captain in Germantown for five years — I run block parties, cleanups, and the block group
chat, but I've never dealt with land ownership, the City, or building anything. I have one evening to go through
the whole workbook for the vacant lot at **540 E Bringhurst St** and come out with something to bring to my
neighbors.

## 2. My journey

I started at the homepage, clicked "Start here," and read through the intro (eight sub-steps — the PiaT story,
guiding principles, why parks matter, the six-step overview). Marking things done felt satisfying and the sidebar
counter updated instantly.

In **Acquire**, I typed my address into the big map search box and clicked **Go** — and nothing happened. No pin,
no card, no error. I tried it three separate times from a clean reload, typing like a real person would; the map
just sat there zoomed out at the regional view. I only discovered by accident (pressing Enter instead) that the
lookup actually works — it just isn't wired to the visible button. That's the kind of thing that would make me
assume my lot wasn't in the system and give up. Once I got the lookup working, it was genuinely great: owner,
size, zoning, lot type, council district, even the neighborhood groups (RCOs) to contact, all clearly labeled as
coming from City records and editable. I set 540 E Bringhurst St as my park lot, filled in the ownership-path
notes, and moved on.

**Organize** was smooth — committee table, skills checklist, a "neighborhood assets" map that auto-centered on my
lot and pulled in nearby registered community groups, and a meeting-flyer generator with a live preview that
updated as I typed. I did not mark "Secure your lot" done in Acquire (I genuinely haven't secured it after one
evening) and the site let me move on to Organize anyway without complaint — good, realistic behavior.

**Assess** has a really nice "drop objects on your real lot" 3D tool and a sun-and-shade study with date/time
sliders that actually changed the shadow and the tree's leaf color for winter vs. summer, plus a "sun hours over
the growing season" calculator (100% full sun for my lot). I noticed the "Objects on the site" table below doesn't
pick up the tree I'd already placed in the 3D view above it — I had to re-type "tree" into a second table by hand.

**Dream** is the centerpiece: it auto-sized a park to my lot (Size A), pre-populated a Nature-themed layout I could
drag pieces around in 3D or switch to a flat Plan view, ran a full sun study on the finished design, and produced
an itemized, downloadable cost estimate ($7,851.90, broken into base design / edging / plants / etc., each number
tagged "From your design" and editable). The plant picker correctly knew my design needed 110 perennials and let
me "Fill evenly" across eight native species in one click. But right above that picker, the six number boxes that
are supposed to *show* those counts (Perennials — sun/shade, Shrubs, trees) were all blank, even though the green
text right next to them says "✓ Filled in from your design — 110 perennials...". That contradiction would make me
think the carry-over broke.

**Create** reuses the same cost estimator — and here it says perennials are "4 in every planting square" = 88,
not the 110 the Dream step planned for. Same design, two different numbers for the same plants. The build
schedule was a highlight: pick one start date and it lays out all eight weekend phases automatically, with a
working "Add to my calendar" button that downloaded a correct .ics file.

**Sustain**'s annual workplan (62 tasks across the year, tagged Survive/Thrive/Socialize) also exports a valid,
yearly-recurring .ics reminder file. Nice.

I exported my whole project as a file, opened a second, empty browser session as my co-organizer, and imported
it — everything came across faithfully (3D design, theme, plant quantities, schedule date, all the free-text
notes), though the import created a second project also named "My park" alongside the empty default one already
there, so there were briefly two identically-named entries in "All projects."

I printed the "My park" summary and the Acquire step to PDF. The text printed cleanly and would be legible at a
block meeting, but the interactive map doesn't render at all when printed (just blank space), and the PDF breaks
to a new page after almost every sub-section, so a lot of printed pages are nearly empty.

Finally, I created a second project for a backup lot candidate (5219-25 Germantown Ave) — switching between the
two projects worked perfectly, with no data bleeding either direction, and renaming a project (once I blurred the
field) stuck across a reload.

## 3. Findings

**F1 — "Go" button on address lookup does nothing (it's a dead button)**
Severity: **Major** · Category: bug · Where: `http://127.0.0.1:4339/steps/acquire/`, the "Go to an address or
corner" field at the top of the map (same pattern likely on other address fields using this component)
Steps to reproduce: Load the Acquire step fresh. Type an address (e.g. "540 E Bringhurst St") into the map search
box. Click the **Go** button next to it.
Expected: the map pans/zooms to the address and/or shows the property detail card, same as pressing Enter.
Observed: nothing happens — no map movement, no card, no error message. Reproduced 3 times from clean page loads.
Pressing **Enter** in the exact same field works correctly and shows the full detail card.
Screenshots: `08-map-go-clicked.png`, `14-fresh-go-click.png`, `17-go-click-third-try.png` (all show no change)
vs. `09-map-enter-pressed.png` (Enter works). This is the single most important feature on the site, and the
visible, obvious control for it silently does nothing.

**F2 — Lot size shown differently on "My park" than everywhere else**
Severity: **Major** · Category: wrong info · Where: `http://127.0.0.1:4339/my-park/` "Your lot" card (and its
print/PDF output) vs. `/steps/acquire/` and `/steps/assess/`
Steps: Look up 540 E Bringhurst St and set it as your park lot. Compare "Lot size" on the Acquire detail card /
"Which lot" comparison table / Assess "Measure your lot" panel against the My Park page.
Expected: the same number everywhere for the same lot.
Observed: Acquire and Assess consistently show **16.2 ft × 55.0 ft · 884 sq ft**. My Park (and its printed PDF)
shows **843 sq ft (15 × 55 ft)** — a different width and a different area, and 15×55 isn't even 843 (it's 825).
I reproduced this on an independent second lot (5219-25 Germantown Ave): detail card said "68.4 ft × 295.5 ft ·
19,963 sq ft," My Park said "20,141 sq ft (68 × 296 ft)" — confirms a systematic bug in how My Park computes/
rounds lot size, not a one-off. Screenshots: `20-acquire-top-after-lot.png` / `25-my-park-lot-section.png` (lot 1,
884 vs. 843), `116-project2-myparklot.png` (lot 2, mismatch again), and page 1 of `myparkprint.pdf`. This is
exactly the number Marcus would read off a printout to his neighbors.

**F3 — Perennial plant count disagrees between Dream's plant picker (110) and Create's cost estimator (88) for the same design**
Severity: **Major** · Category: wrong info · Where: `/steps/dream/` "Count & choose your plants" vs.
`/steps/create/` cost estimator, "How many plants do you have?"
Steps: Build a design with 22 planting squares (the site's own auto-count). In Dream, the plant picker shows
"✓ Filled in from your design — 110 perennials..." and requires planning exactly 110 plants (verified: "Fill
evenly" distributed 110 across 8 species). In Create's cost estimator for the same project, the text reads
"Perennials are worked out for you: 4 in every planting square. Perennials: 88 (4 × 22 planting squares)."
Expected: one consistent plants-per-square assumption, so the shopping list and the dollar estimate agree.
Observed: Dream assumes 5/square (110 total), Create assumes 4/square (88 total) — a 25% gap. Screenshots:
`90-fill-evenly.png` (110 of 110 planned) vs. `97-scroll-1700.png` ("Perennials: 88 (4 × 22 planting squares)").
Real-world impact: whatever Marcus budgets for plants with the cost estimator won't match what the plant picker
tells him to actually buy.

**F4 — Plant-count input boxes render blank despite "Filled in from your design" message right next to them**
Severity: **Major** · Category: confusing UI / bug · Where: `/steps/dream/` "Count & choose your plants," the six
fields Perennials—sun, Perennials—shade, Shrubs—sun, Shrubs—shade, Small trees, Large trees
Steps: Complete "Design your park," scroll to "Count & choose your plants" with "Use the counts from your design"
checked.
Expected: the number boxes show the computed values (110 perennials etc., split sun/shade).
Observed: all six boxes are visibly empty — confirmed not just visually but via direct DOM inspection
(`input.value === ""` for `f-dream-perennials-sun` etc.), even though the green confirmation text right below says
"✓ Filled in from your design — 110 perennials, 10 shrubs, 5 small trees, 0 large trees," and the plant picker
immediately below correctly targets 110. Toggling "Use the counts from your design" off and back on doesn't fix
it. Screenshots: `86-plant-picker-section.png`, `87-plant-fields-recheck.png`, `88-toggle-recheck.png`. This isn't
a data-loss bug (the real numbers are used correctly downstream), but it directly contradicts itself on-screen on
the page whose whole pitch is "we do the counting for you."

**F5 — Importing a project file for the first time creates a duplicate "My park" entry**
Severity: Minor · Category: confusing UI · Where: `/my-park/`, second (co-organizer) browser session
Steps: Open the site fresh (it auto-creates an empty default project named "My park"). Use "Open a project file"
to import a `.park.json` file that itself is named "My park."
Expected: either the import replaces/merges into the pre-existing empty project, or the user is asked.
Observed: a second project, also named "My park," appears in "All projects" — two identically named rows,
distinguished only by an "(open)" tag. Re-importing the same file afterward correctly updates the already-imported
copy rather than creating a third duplicate (it's keyed by an internal id), so this only bites on the very first
import into a fresh browser. Screenshot: `block-captain-2/shots/02-after-import.png`.

**F6 — Printed step pages don't render the map; print layout wastes a lot of paper**
Severity: Minor · Category: missing / performance · Where: print output (`page.pdf()`) of `/steps/acquire/`
(any step with the vacant-lots map widget)
Steps: Print the Acquire step.
Expected: the map prints as a static image, or the layout collapses around it.
Observed: the map area is entirely blank — just empty space where the legend/caption sit — and the page layout
puts roughly one page-break per sub-section, so several of the 10 printed pages for just this one step are 80-90%
blank (e.g. page 5 is three empty table rows and nothing else). A full "print everything" across all 7 steps would
run to many dozens of mostly-blank pages. Screenshots: pages 2 and 5 of `acquireprint.pdf` (rendered inline during
testing).

**F7 — Truncated badge labels in Dream's "Assemble" piece gallery**
Severity: Polish · Category: wording · Where: `/steps/dream/`, "Assemble" sub-step, piece picker grid
Observed: small category tags above a couple of thumbnails are cut off mid-word — "PARK ELEM" and "TO GO TO TH"
instead of full text. Screenshot: `91-assemble-section.png`.

**F8 — Raw/unexplained code string shown for non-vacant private lots**
Severity: Minor · Category: wording · Where: `/steps/acquire/` lot detail card, "Vacant?" field, for an address
not on the City's vacant-land list
Observed: for 5219-25 Germantown Ave, "Vacant?" reads "Not on the City's vacant-land list · Off Bld N/Com W/Pkg
Mason" — the second half looks like an un-expanded internal land-use code, not written for a general reader.
Screenshot: `114-second-lot-lookup.png`.

**F9 (unconfirmed) — Project rename might not save if you navigate away before the field loses focus**
My first attempt at renaming a project (type new name, reload immediately without clicking elsewhere) lost the
new name on reload. A second, cleaner attempt (type, press Tab to blur, then reload) saved correctly and the new
name propagated to the page title, nav button, and project list. I can't tell whether my first result was a real
save-on-blur-only bug or just my test script reloading before a debounce timer fired, so I'm flagging this as
**unconfirmed** rather than a finding — worth a human re-check by typing a new name and immediately clicking a nav
link (not Tab) to see if it's retained.

## 4. What worked well

- **City-data auto-fill is genuinely good.** Every field the site says it filled in from City records is clearly
  marked "✓ Filled in from City records — type to change it," and really is editable. Owner, lot size, zoning,
  lot type, council district, flood zone, and nearby registered community groups all showed up correctly for my
  address.
- **Progress tracking is accurate everywhere.** Step counts in the sidebar, the steps-overview page, and "My
  park" all matched exactly, updated instantly when I checked something off, and survived a full page reload.
- **The sun & shade study** (date/time sliders, seasonal tree color change, live % of lot in direct sun, and a
  separate "sun hours over the growing season" calculator) is detailed and actually useful for deciding what to
  plant — and it ran correctly even on this test machine's slow software 3D renderer.
- **The cost estimator** is transparent and trustworthy-feeling: fully itemized, every number tagged "From your
  design" and editable, downloadable as CSV, printable as an order list, and it honestly links to "How this
  differs from Park in a Truck's spreadsheet" rather than pretending to be authoritative.
- **Build schedule → calendar export** and **stewardship workplan → calendar export** both produced valid,
  correctly-dated `.ics` files I could have actually added to a real calendar (verified by reading the downloaded
  files directly).
- **Export/import round-trips real data faithfully.** I verified field-by-field, including the full 3D design
  with a piece I'd personally dragged, that a second browser picked up everything after importing the project
  file.
- **Multiple projects are properly isolated.** A second "Backup lot" project showed zero bleed from "My park" —
  own lot, own zeroed-out progress — and switching back restored the original instantly and completely.
- **The site is honest about what it doesn't do for you.** Phrases like "Walk your block — the City's list misses
  some lots," "Contact the landowner about permanently donating the property," and "Contact Pennsylvania One Call
  at 811" make clear which parts are Marcus's real-world job versus the site's automation.

## 5. Top 3 changes

1. **Fix the "Go" button on every address lookup** (or remove it and lean on Enter with a visible hint). It's a
   dead control on the one feature the whole site is built around.
2. **Compute lot size from one source of truth.** Right now "My Park" — the page and printout Marcus would
   actually show people — displays a different, wrong-looking number than every other page that cites the same
   lot.
3. **Reconcile the plants-per-square assumption between Dream (5/square) and Create (4/square),** and fix the
   blank plant-count boxes in Dream so the "we filled this in for you" message isn't visibly contradicted by
   empty fields right next to it.

## 6. Would I (Marcus) keep using this?

Yes, but I'd want someone to double-check it before I hand anything to my neighbors. The automatic City lookups,
the 3D planner that fits my actual lot, and the auto-generated schedule/cost/calendar exports got me further in
one sitting than I could've managed with the PDF workbook alone, and most of it is genuinely well-built. But the
two numeric inconsistencies I found — lot size and plant counts — are exactly the kind of thing a skeptical
neighbor would catch ("your own site says two different square footages") and use to question the whole effort.
I'd keep using the site to plan, but I'd verify the final lot size against atlas.phila.gov and reconcile the
plant/cost numbers by hand before printing anything for a meeting.

One more honest note on effort: going through all 53 sub-steps and using every helper took me, moving quickly, well
over an hour of continuous work. A first-time user actually reading the multi-paragraph guidance on each
sub-step would reasonably take 3+ hours — more than a single "evening" in the tight sense. Nothing in the UI
tells you up front which sub-steps are essential versus nice-to-have (the site never blocked me from skipping
ahead, which is good, but it also never flagged anything as optional), so there's no way to triage where to spend
a limited evening.
