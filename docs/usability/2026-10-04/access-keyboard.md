# Usability report — Gloria (low vision, keyboard-only) — zoom200

**Session:** access-keyboard · **Mode:** zoom200 (laptop browser at 200%) · **Date tested:** 2026-10-04
**Site:** http://127.0.0.1:4339/ · **Target lot:** 5324 Wakefield St

## 1. Who I am

I'm Gloria, 70, I run my neighborhood association in Germantown. My eyes aren't what they used to be, so I keep my
browser zoomed to 200%, and my hands don't love the mouse much anymore — I get around with Tab, Shift+Tab, Enter,
Space, arrows and Escape. I came to this site to see if I could find my lot at 5324 Wakefield St, get it into the
system, set up my committee, and get a flyer ready for a meeting — all without touching a mouse.

## 2. My journey

I started on the home page and immediately hit Tab to see what was there. The very first stop was a "Skip to
content" link — good instinct by whoever built this — but nothing appeared on my screen when it was focused. I
pressed Enter anyway on faith, and it turned out to actually work (it jumped me past the header), I just never
got to **see** that happen, which was unsettling the first time.

Tabbing down through the home page was easy and made sense — logo, menu, "Start here," the six step cards, then
my address box. I typed "5324 Wakefield" and a dropdown appeared with my address in it; arrow-down highlighted it
and Enter both picked it **and** ran the lookup in one go, which I liked a lot. My lot came up with the owner, size,
zoning, flood zone, all of it, plus a little outline drawing of the lot shape. I tabbed to "Use this as my park lot"
and hit Enter — it saved, but my cursor/focus just disappeared. I had to feel around with Tab again to find my
place. That same thing happened to me several more times today, every time I added or removed something.

I read through "Start here," marked a sub-step done (that one worked great — a nice green pill appeared and my
focus stayed put), and poked at the "network of parks" map — the pins were tabbable but I genuinely could not tell
which one was focused just by looking.

On "Acquire" I found the big vacant-lots map. I could tab to it, pan it with the arrow keys, zoom with +/-, but I
could not find any way to actually pick one of the colored lots on the map with the keyboard — Enter and Space did
nothing useful. Lucky for me I already knew my address, so I just used the "Add a possible lot by address" box
instead, which worked well (and even correctly refused to add a second blank row until I'd filled in the first
one). I added a second lot, removed it again to test, filled in my neighborhood-walk notes, added and removed rows
there too — all of it worked, other than that same "my focus just vanished" feeling every time something got
removed.

"Organize" was the nicest surprise. I filled in a meeting date, time, place and purpose, added myself to the
committee table, and watched a real flyer build itself live on the page as I typed. "Print flyer" gave me a clean,
single flyer with everything on it — genuinely easy, all from the keyboard.

The 3D planner is where I expected to be completely stuck, and I wasn't. Moving, flipping and turning the whole
park footprint on the lot is just buttons — no dragging needed. Picking an individual bench from a plain list and
nudging it with "Move toward the entrance" / "Move left" buttons, with the distance updating in text right in
front of me, was the best thing on the whole site. The "R turns, arrows move, Delete removes" keyboard shortcuts
printed on screen didn't seem to do anything when I tried them directly (I wasn't hovering the 3D view, so maybe
that's why), but the buttons for the same things worked perfectly.

The build guide for the bench was thorough even with the 3D model hidden — the written steps don't depend on
seeing the picture. The "Play all" animation for the 3D assembly ran the same whether or not I asked my browser to
reduce motion; I couldn't be completely sure how much true "motion" there was to reduce in the first place, so I'm
not fully confident about that one.

## 3. Findings

### F1 — Skip-to-content link is never visible, even when focused
**Severity:** Major · **Category:** accessibility · **WCAG:** 2.4.7 Focus Visible (AA); touches 2.4.1 Bypass Blocks (A)
**Where:** http://127.0.0.1:4339/ — first Tab stop on any page
**Steps:** Load any page, press Tab once.
**Expected:** A visible "Skip to content" box appears with a visible focus ring.
**Observed:** The link receives focus and genuinely works — confirmed twice: pressing Enter then Tab again lands
correctly on "Start here →," skipping the header nav. But `getComputedStyle` shows it stays `clip: rect(0,0,0,0)`,
1×1px, even while focused — there's no CSS rule that un-clips it on `:focus`. A sighted keyboard user never sees it
appear, so the first thing that happens on every page is keyboard focus going... nowhere visible.
**Screenshot:** `sessions/access-keyboard/shots/02-tab1.png`

### F2 — Keyboard focus is dropped to `<body>` after almost any "remove/replace" action
**Severity:** Major · **Category:** accessibility · **WCAG:** 2.4.3 Focus Order (A); related to 4.1.3 Status Messages (AA)
**Where:** reproduced in 5 separate places:
- Home page: "Use this as my park lot" button (`/`)
- Acquire: "+ Add to my list" button (`/steps/acquire/`)
- Acquire: "Remove 5301 Wakefield St from the list" (`/steps/acquire/`)
- Acquire: notes table "Remove row" × button (`/steps/acquire/`)
- 3D planner: "✕ Remove" on a picked item (`/planner/`)

**Steps:** Tab to any of the above, press Enter.
**Expected:** Focus moves somewhere sensible (next control, a heading, a confirmation message).
**Observed:** The activated control is removed/replaced in the DOM and `document.activeElement` becomes `<body>`
every single time (verified with JS after each of the 5 actions). In practice, Chrome's *next* Tab press recovers
to a nearby control rather than resetting to the top of the page, so you're not totally lost — but there is a
moment where no focus ring is visible anywhere on screen and nothing is announced. At 200% zoom, where only a
sliver of the page is visible at once, that moment is genuinely disorienting — I kept thinking something had
broken.
**Screenshots:** `11-after-use-lot.png`, `42-after-add-to-list.png`, `45-after-remove.png`,
`52-after-remove-note-row.png`, `83-after-remove-item.png`

### F3 — The site's cyan brand colour fails contrast on white, site-wide
**Severity:** Major · **Category:** accessibility · **WCAG:** 1.4.3 Contrast (Minimum) (AA)
**Where:** Home, Acquire, Organize, Planner — "Look up," "Go," "Next: Step 2 — Organize →" buttons (white text on
cyan fill) and every "00"–"06" step-number badge (cyan text on white).
**Steps:** Measured with `getComputedStyle` + the standard relative-luminance contrast formula.
**Expected:** ≥4.5:1 for normal text, ≥3:1 for large text (≥24px, or ≥18.66px bold).
**Observed:** `rgb(0,168,232)` against white measures **2.70:1** everywhere I found it — on the homepage, Acquire,
and reused as both text-on-white (step numbers, up to 55px) and white-text-on-cyan (primary buttons, 15px bold).
2.70:1 fails even the relaxed large-text threshold, and badly fails the normal-text threshold for the button
labels. This is the exact color pair the brief asked me to check, and it's used on several primary calls to
action, which matters most for someone like me who already zooms to 200%.
**Screenshot:** `01-home.png`, `03-focus-input.png` (Look Up button)

### F4 — Map-pin focus ring is the same colour as the pin, so it's invisible
**Severity:** Major · **Category:** accessibility · **WCAG:** 2.4.7 Focus Visible (AA), 1.4.11 Non-text Contrast (AA)
**Where:** `/steps/start/` — "A network of parks" map, the 7 location markers
**Steps:** Tab from the page content until focus reaches a marker (e.g. "Cecil Street Garden").
**Expected:** A focus indicator visually distinguishable from the marker itself.
**Observed:** Computed outline is `rgb(0,168,232) solid 3px` — I cropped and pixel-sampled the screenshot and
confirmed it's the *exact same* colour as the marker pin's own fill. There is zero visible difference between a
focused and unfocused pin, especially in the cluster of 3 overlapping pins I landed on first.
**Screenshots:** `16b-map-focus.png`, `16c-marker-zoom.png` (4× crop with pixel sampling)

### F5 — No keyboard way to pick an individual lot from the "Find a lot" map
**Severity:** Blocker (for map-based lot discovery specifically — did not block my own task since I already had
an address) · **Category:** accessibility · **WCAG:** 2.1.1 Keyboard (A)
**Where:** `/steps/acquire/`, "LET THE MAP DO THE WALKING" map (same map component likely used on `/lot/`)
**Steps:** Tab to the map (a `canvas` with `tabindex="0" role="region" aria-label="Map"`). Confirmed arrow keys pan
and `+`/`-` zoom the map. Pressed Enter, then Space, on the focused canvas.
**Expected:** Some keyboard-operable way to select one of the colored vacant-lot shapes, matching the page's own
instructions: "Click one to see its owner, size and zoning, and add it to your list."
**Observed:** Enter does nothing. Space just scrolls the page (confirming the canvas isn't capturing it for its
own use). No lot gets selected, no card opens, nothing is added to my list. The only way to add a lot is to
already know its address and type it into the separate search box. If I didn't already know my lot's address and
wanted to "let the map do the walking" the way the page invites me to, I would be completely stuck — this is the
one true wall I hit all day.
**Screenshots:** `19-acquire-map2.png`, `32-after-plus-key.png`, `33-after-enter-key.png`, `34-after-space-key.png`

### F6 — The vacant-lots map sometimes isn't in the tab order yet when you reach it
**Severity:** Minor · **Category:** performance/accessibility
**Where:** `/steps/acquire/`
**Steps:** Load the page and Tab through quickly without pausing or scrolling.
**Observed:** The map widget hydrates lazily (confirmed: querying the DOM right after `networkidle` sometimes
finds zero `canvas` elements at all; scrolling it into view and waiting ~2–4s makes the canvas and its Zoom
in/out buttons appear correctly in the tab order). A keyboard user tabbing at normal speed can tab straight past
where the map should be with no cue anything was skipped. For me specifically this mostly self-corrects because I
can see the gray placeholder box and pause — but it's a real gap for anyone tabbing quickly. Unconfirmed how
often this happens on a real network connection vs. this local preview.

### F7 — "Added to your list" isn't announced consistently
**Severity:** Minor · **Category:** accessibility · **WCAG:** 4.1.3 Status Messages (AA)
**Where:** Home-page lookup widget vs. Acquire page's "Add a possible lot" card
**Observed:** The home page's "This is your park lot" confirmation text sits inside a `div[aria-live="polite"]`
(confirmed in the DOM). But on the Acquire page, the "✓ On your list" confirmation has **no** `aria-live` ancestor
at all (checked 6 parent levels up, twice). A screen-reader user would hear the home-page confirmation but not the
same action on Acquire. I could see the checkmark appear myself since I'm sighted, so this didn't block me
personally, but it's an inconsistency worth fixing. I also polled the live region for 2 seconds during a fresh
"Checking City records…" lookup and it stayed empty the whole time — marking that half **unconfirmed** since the
lookup can resolve faster than I could sample it.

### F8 — "+ Add lot" silently does nothing if the last row is already blank
**Severity:** Minor/Polish · **Category:** confusing UI
**Where:** `/steps/acquire/`, "Notes from your neighborhood walk" table
**Steps:** Tab to "+ Add lot," press Enter twice without filling in the existing blank row.
**Expected:** Either a new row each time, or an explanation of why nothing happened.
**Observed:** Nothing happens until the last row has data in it; then it correctly adds a new row and moves focus
straight into it (that part is genuinely well done). No feedback is given for the no-op clicks in between.
**Screenshots:** `48-after-add-note-row.png`, `49-after-second-add-row.png`, `51-after-add-with-data.png`

### F9 — Heading levels skip and jump around
**Severity:** Polish · **Category:** accessibility
**Where:** `/steps/start/` (H1 → six H2s → H4 footer headings, no H3); `/planner/` (H1 → H3 → H4 → H3)
**Observed:** Not a hard failure, but makes "jump by heading level" screen-reader navigation less predictable.

### F10 — Printed flyer PDF has 2 blank trailing pages
**Severity:** Polish · **Category:** bug
**Where:** `/steps/organize/`, "Print flyer"
**Observed:** `page.pdf()` after clicking Print flyer produced a 3-page PDF; only page 1 has content, pages 2–3 are
blank. Likely a missing print page-size/page-break rule. Doesn't affect the flyer's own content.
**Screenshot (PDF):** `sessions/access-keyboard/flyer-print.pdf`

### F11 — One address lookup returned a "couldn't load" partial-data warning
**Severity:** Minor, **unconfirmed** (not reproduced a second time, on purpose, to avoid hammering City APIs per
test rules) · **Category:** bug/wrong info
**Where:** Acquire, "Add a possible lot by address," test address 5301 Wakefield St
**Observed:** Card showed "Some details are missing: Couldn't load the City's vacant-land list right now.
Couldn't load FEMA flood zones right now." The rest of the card (owner, size, zoning) loaded fine, and the error
message itself was honest and legible — I'm flagging this as a data point, not a confirmed recurring bug.
**Screenshot:** `40-add-lot-card-scroll3.png`

## 4. What worked well

- **The address combobox is a real, correctly-wired combobox** — proper `role="combobox"`, `aria-expanded`,
  `aria-autocomplete="list"`, and `aria-activedescendant` that updates as you arrow through options. Arrow-down +
  Enter both picks the suggestion **and** runs the lookup in one step. (`05`, `06`, `07`)
- **"Mark this step done" toggle buttons** keep keyboard focus on themselves and flip `aria-pressed` plus their
  visible label/colour correctly — a clean, simple pattern that just works. (`14`, `15`)
- **The 3D planner's "Arrange" step has a full non-drag alternative for every item.** A native `<select>` lets you
  "pick from the list" of every placed object; once picked, explicit buttons — "Move toward the entrance," "Move
  left," "Turn," "Duplicate," "Remove" — do everything dragging would, and a plain-text readout ("3 ft from the
  entrance") updates live as you move things, wrapped in an `aria-live="polite"` region. This is genuinely one of
  the best-built accessible 3D interactions I've tested anywhere. (`68`–`81`)
- **Positioning the whole park on the lot (planner step 1) is pure buttons too** — "Entrance at the other end,"
  "Flip left–right," "Turn 90°," and slide buttons in all four directions. No dragging required to get started.
- **The meeting flyer is fully keyboard-buildable**, and "Print flyer" produces a clean, print-only single page
  with just the flyer (verified by rendering to PDF) — a genuinely satisfying, achievable deliverable. (`64`–`67`,
  `flyer-print.pdf`)
- **No unnamed icon-only buttons anywhere I scanned** (home, Acquire, Organize, Planner) — every control has a
  real accessible name, down to per-row labels like "Remove 5324 Wakefield St from the list" instead of a bare
  "Remove" repeated with no context.
- **Nothing ever needed sideways scrolling at 200% zoom** across all 6 pages I measured (`scrollWidth` ==
  `clientWidth` everywhere), and the wide lot-comparison table collapses into a readable stacked-card layout
  instead of overflowing. (`97-lots-table-zoom.png`)
- **The hamburger "Menu" is a native `<details>`/`<summary>` element** — keyboard-operable for free, no custom JS
  needed, no trap. (`98-menu-open.png`)
- **Image alt text is well-judged**: the lot-outline diagram and hero illustration have genuinely descriptive
  text ("Outline of the lot, about 23 by 87 feet. North is up..."), while purely decorative step-card icons
  correctly use `alt=""`.

## 5. Top 3 changes

1. **Fix the focus-loss-to-`<body>` pattern** (F2) — every time an action removes the control that had focus
   (adding/removing a lot, a note row, or a 3D item), move focus to a sensible neighbor and announce what
   happened through the `aria-live` region that's already on the page. This is the single most disorienting thing
   that happened to me today, and it happened five separate times.
2. **Give the "Find a lot" map a keyboard equivalent for picking a lot** (F5), and make the skip-link actually
   visible when focused (F1) — it already works, it's just invisible. The map is a real wall for anyone without a
   known address; the skip link is a small fix with an outsized trust impact (it's the very first thing a keyboard
   user touches on the site).
3. **Raise the contrast of the brand cyan** (F3 and F4) — right now it's used for primary button text, step
   numbers, and focus rings, and at 2.70:1 it fails AA everywhere it appears. A darker cyan (or pairing it with a
   dark outline) would fix both the contrast finding and the invisible-focus-ring-on-map-pins finding at once.

## 6. Would I keep using it?

Yes. I got from the home page all the way through Start, Acquire, and Organize, found my actual lot, built my
committee list, and printed a real flyer — entirely from the keyboard, and the 3D planner surprised me by being
far more usable without a mouse than I expected going in. What would stop me from recommending it to the rest of
my committee without a caveat is the map: "let the map do the walking" simply doesn't work for me unless I already
know the address I'm looking for, and losing my place every time I add or remove something made me doubt myself
more than once. I'd keep using it for everything except browsing for a lot on the map — for that one step I'd ask
someone to drive the mouse for me.
