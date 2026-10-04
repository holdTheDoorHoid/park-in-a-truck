# Usability report — Denise, complete novice, Android phone

Session: `novice-phone` (mobile viewport, 390×844-class). Site under test: http://127.0.0.1:4339/, tested 2026-10-04.

## 1. Who I am

I'm Denise: 64, retired cafeteria worker, 30 years on the 2200 block of N Uber St, Strawberry Mansion. A neighbor
texted me a link saying "you could make that lot a park!" I don't know words like zoning, parcel, RCO, OPA,
gabion, or stewardship, and I get nervous about anything that sounds legal or expensive. I set out to: figure out
if this site is for someone like me, find out who owns the overgrown lot up the block, work out what to do this
week, see what a park could look like there, and check that the site remembers me if I leave and come back.

## 2. My journey

I landed on the homepage and immediately understood it — "Turn a vacant lot into your neighborhood's park" is
almost exactly what my neighbor texted me, so I knew right away this was the right place
(`sessions/novice-phone/shots/01-home.png`). I scrolled through the six numbered steps and found "Have a lot in
mind?" with an address box, plus a "Tools that do the legwork" list further down, including "Find a lot."

I don't know my lot's exact address, just that it's "on my block of N Uber St," so I went to **Find a lot**
(`/lot/`) expecting the map to help me. I typed just "N Uber St" into the first address box I found and pressed
"Look up" — it told me clearly it couldn't find that and to include a house number
(`shots/19-streetonly-buttons0.png`). Fair enough. But right below it was a second box, "Go to an address or
corner," that looked like it existed exactly so I could browse to my street without knowing the number — I tried
the same "N Uber St" there and got nothing at all: no message, no map movement I could point to, nothing
(`shots/23-goto-streetonly-proper.png`, `shots/24-goto-streetonly-wait-more.png`). I also tried "Near me," which
at least told me plainly it couldn't see my location and to search instead
(`shots/14-near-me-result.png`). At that point, as Denise, I'd be stuck — I don't know my house number and the
map didn't help me find it.

To keep testing (and because I happen to know the lot is 2233 N Uber St), I typed the full address into the first
box and got a rich result: owner is the City of Philadelphia, lot size, a little shape diagram, zoning explained
in plain words, flood zone, council district, and a "Public owner — your path" box
(`shots/25-result-scrolled1.png`, `shots/26-result-scrolled2.png`, `shots/27-result-scrolled3.png`). I tapped
"Use this as my park lot" and got a clear green confirmation. I went to the **Acquire** step page and my lot was
already filled in there too, with a concrete two-item checklist ("Searched for the lot on the PHDC property
search map," "Contacted PHDC / the Land Bank") and an "Ask for help" email if I get stuck
(`shots/32-scroll9800.png`). That's a real, doable "what do I do this week" answer.

Next I tried **Plan in 3D**. It loaded my real narrow lot automatically, with the neighbor's building and street
trees already in place, and even warned me the default park size was bigger than my lot
(`shots/33-planner-initial.png`). Dragging with one finger on the ground, like the on-screen tip said ("drag
empty ground to look around"), worked fine for small drags, but an ordinary bigger swipe — the kind I'd actually
make on my phone — swung the view into the side of the neighbor's building, filling the whole screen with a flat
gray wall and no trees, no lot, nothing to tell me what happened (`shots/45-clean-empty-drag.png`,
`shots/46-drag-other-direction.png`). It looked exactly like the site had crashed. I only got back by trying every
button in the toolbar until "Reset view" fixed it. Two-finger pinch zoom worked fine. I also found the flat
"Plan" (2D) view, which was much easier to read on my phone than the 3D view
(`shots/41-plan-2d-view.png`), and a "Sun and shade" tool that told me, in plain English, "The sun is 67° up, in
the southwest" and "about 100% of the lot is in direct sun" for a date I picked with a slider
(`shots/51-sun-shade-more.png`) — genuinely useful and not scary at all.

Finally, I closed the browser tab, opened the site again in a new tab, and reloaded. My lot (2233 N Uber St) was
still there — on the homepage, on the Acquire page, in "My park," and in the planner. Good news: nothing was
lost. Less good: on the homepage I had to scroll past the entire six-step card grid before I found my saved lot
again (`shots/59-reload-scrolled-to-lot.png`); there was no "welcome back" message up top. The only hint was a
small blue dot on "My park" in the menu (`shots/63-menu-open.png`), which I would not have known to look for.

## 3. Findings

**F1 — "Go to an address or corner" map box silently does nothing for a street name with no house number**
Severity: **Major** · Category: bug / confusing UI
Where: http://127.0.0.1:4339/lot/ — the second address box, under "Vacant land near you"
Steps: Load `/lot/`. In the "Go to an address or corner" box, type `N Uber St` (no house number). Tap "Go."
Expected: Either an error message (like the box above it gives) or the map visibly centers/zooms on N Uber St.
Observed: No message appears, and no clearly-attributable map movement happens. Reproduced twice cleanly, with
direct element references (not an ambiguous text-locator) both times: `shots/13-go-result.png` and
`shots/23-goto-streetonly-proper.png` / `shots/24-goto-streetonly-wait-more.png`. The network request
(`GET https://api.phila.gov/ais/v1/search/N%20Uber%20St` → 404) fires each time but nothing on screen reflects it.
This is the exact scenario the site's own copy invites ("browse the map... walk the block too") but a user who
only knows their street, not their house number, gets no feedback at all from the one control meant for exactly
that.

**F2 — Address lookup error doesn't point to the map right below it**
Severity: Minor · Category: confusing UI
Where: http://127.0.0.1:4339/lot/ — "Look up an address" box
Steps: Type `N Uber St` (no number) into "Address of the lot," tap "Look up."
Expected/Observed: A clear, well-written error appears: "We couldn't find 'N Uber St' in the City's address list.
Check the house number and street name (for example '1322 N Dover St')" (`shots/19-streetonly-buttons0.png`).
That's good, but it never suggests the obvious fallback that's one scroll away — the vacant-land map. A first-time
user who doesn't know their house number is left to discover the map on their own (she probably will, since it's
visually close, but a one-line nudge — "or browse the map below" — would remove the doubt).

**F3 — 3D planner: an ordinary one-finger "look around" drag can swing the camera into/behind a neighboring
building, filling the screen with a flat gray wall, with no on-screen explanation of what happened**
Severity: Major · Category: bug / mobile
Where: http://127.0.0.1:4339/planner/ — the 3D canvas, step 1 "Your lot" (and reproduced from "Arrange")
Steps: On the 3D view, touch-drag from a point clearly on the aerial photo (not on a park piece) — e.g. start at
roughly (40, 500) in a 390-wide viewport — and drag up/across about 150–200px in one continuous motion. Release.
Expected: The camera orbits smoothly to a new angle but keeps the lot and some context in view, or stops before
entering solid geometry.
Observed: The camera went past/through the neighbor-building mass; the screen filled almost entirely with a flat
gray/off-white surface with no lot, trees, or horizon visible — indistinguishable from a broken page. Reproduced
4 times with different drag vectors and starting points on a freshly reloaded planner:
`shots/34-after-drag-rotate.png`, `shots/37-drag-repro2.png`, `shots/45-clean-empty-drag.png`,
`shots/46-drag-other-direction.png`. Every time, tapping "⟲ Reset view" in the toolbar (`shots/36-click-reset-coord.png`)
restored the normal view. I could not find any other on-screen cue (no "stuck? tap here" hint) pointing at Reset
view as the fix. A *small* drag from empty ground, by contrast, produced a legitimate and useful street-level
view (`shots/40-small-drag.png`) — so the control itself is good, it just has no limit stopping it from going
too far.
Guessed cause (unconfirmed): camera orbit/zoom has no collision or distance clamp against the neighbor-building
blocks, so a normal-sized swipe is enough to put the camera inside or flush against one.

**F4 — Lot square footage is reported differently on two pages for the same lot**
Severity: Minor · Category: wrong info
Where: compare http://127.0.0.1:4339/lot/ (and `/steps/acquire/`) vs. http://127.0.0.1:4339/my-park/
Steps: Look up 2233 N Uber St and save it as your park lot. Compare the "Lot size" field on the Find-a-lot result
card to the "Lot size" field on the My Park summary page.
Expected: The same number in both places.
Observed: `/lot/` and `/steps/acquire/` both show "15.2 ft × 96.0 ft · 1,419 sq ft" (`shots/26-result-scrolled2.png`).
"My park" shows "1,440 sq ft (15 × 96 ft)" for the same lot (`shots/62-my-park-lot-size2.png`). Guessed cause
(unconfirmed): My Park likely recomputes area from the rounded display dimensions (15 × 96 = 1,440) instead of
reusing the more precise parcel-geometry figure (1,419) the other pages use. Low real-world impact — Denise is
unlikely to compare the two pages side by side — but it's a real inconsistency a careful reader could notice.

**F5 — Returning to the homepage after closing/reopening the tab doesn't surface that progress was saved**
Severity: Major · Category: confusing UI / missing
Where: http://127.0.0.1:4339/ after closing the tab, opening a new one, and reloading
Steps: Save a lot, close the tab, open a new tab to the homepage, reload.
Expected: Some clear, early signal that previous work is still there (a "continue where you left off" banner, or
similar), since the brief's own test asks "does she know where she left off?"
Observed: The data genuinely persists (good — see "what worked well"), but the homepage looks identical to a
first-time visit at the top: same hero text, same six step cards all reading "0 of X sub-steps done"
(`shots/55-reopened-home.png`). The saved lot card only appears after scrolling past the full step grid
(`shots/59-reload-scrolled-to-lot.png`) — on a phone that's two-plus screens of scrolling. The only earlier
indicator is a small plain blue dot on "My park" in the hamburger menu (`shots/63-menu-open.png`), which doesn't
read as "your progress is saved here" without already knowing to look for it.

**F6 — 3D "Arrange" instructions are written for a desktop keyboard/mouse, not a touchscreen**
Severity: Minor · Category: wording / mobile
Where: http://127.0.0.1:4339/planner/ → Arrange tab, after picking a park piece (`shots/68-drag-piece-result.png`)
Observed text: "Drag it to move it, or drag the round handle to turn it (it turns in steps; hold Shift to turn
freely). Keys: arrows move, R turns, Ctrl+D duplicates, Delete removes, Esc lets go." On a phone there is no
Shift key and no keyboard at all. Elsewhere on the same page the "right-click" tip does include a touch
equivalent ("hold your finger on it"), so the pattern exists — it's just missing here for "turn freely."

**F7 — "Start here" (step 00) is one very long scrolling page**
Severity: Polish · Category: wording / mobile
Where: http://127.0.0.1:4339/steps/start/ (`shots/05-start-page.png`)
The content itself reads fine and isn't jargon-heavy, but it's roughly 8 sections and several thousand words on
one page with no sub-navigation beyond the in-page "In this step" list. For someone who "reads carefully but
slowly," this is a lot of scrolling before reaching the first actionable step.

**F8 — Three near-identical address boxes on one page**
Severity: Polish · Category: confusing UI
Where: http://127.0.0.1:4339/lot/ — all three address inputs on this page share the exact placeholder text
"e.g. 1322 N Dover St" (confirmed via DOM query). Each does have a distinct heading above it ("Look up an
address," "Go to an address or corner," "Add a possible lot by address"), so it's workable, but a user who has
scrolled past the heading and is looking only at the box could easily use the wrong one (as I initially did when
scripting this test).

**Unconfirmed / not counted as a site bug:** My very first attempts to reproduce F1 and test the full-address
lookup appeared to fail silently (`shots/09`–`11`, `15`–`17`). On investigation this was my own scripting error —
an ambiguous text-based click locator matched the wrong of two identically-labeled "Look up" buttons on the page.
Once I targeted the correct button directly, both the error message (F2) and the successful lookup
(`shots/18-retry-lookup.png`) appeared normally. I'm noting this so it's clear I didn't double-count it as a
separate bug.

## 4. What worked well

- **Instant self-recognition.** The homepage headline ("Turn a vacant lot into your neighborhood's park") matches
  almost word-for-word what a neighbor would text about this site — I knew in two seconds this was the right
  place (`shots/01-home.png`).
- **The automatic City lookup is genuinely impressive and explained in plain words.** Typing the address returned
  owner, size, a little lot-shape diagram, and — importantly — zoning spelled out in English right next to the
  code ("RSA-5 · Residential — single-family attached houses (rowhouses and twins)"), not just a bare code
  (`shots/25-result-scrolled1.png`, `shots/26-result-scrolled2.png`).
- **Cross-page continuity.** Once I picked 2233 N Uber St as my lot, it followed me automatically into the
  Acquire step's "who owns it" comparison table, into the 3D planner, and into "My park" — I never had to re-enter
  it.
- **The Acquire step turns a scary bureaucratic question into two checkboxes and an email address.** "If the City
  owns it" gives a concrete this-week to-do list and an explicit "stuck? email us" escape hatch
  (`shots/32-scroll9800.png`) — exactly what a nervous first-timer needs.
- **The 2D "Plan" view is a great, simpler alternative to the 3D view** for a small screen — same data, far easier
  to read at a glance (`shots/41-plan-2d-view.png`).
- **Sun & Shade is plain-English and fast.** "The sun is 67° up, in the southwest," date presets like "Longest
  day" instead of "solstice," and a sun-hours calculation that finished in a few seconds with no hang
  (`shots/49-sun-shade-tab.png`, `shots/54-sunhours-t7000.png`).
- **Undo/Redo plus arrow-nudge buttons** on moved park pieces are a smart mobile accommodation — finger drags are
  imprecise, but the directional buttons and instant "this sticks out past the lot line" warning let me fix it
  without fighting the touchscreen (`shots/68-drag-piece-result.png`, `shots/69-after-undo.png`).
- **Data really does persist.** Closing the tab, opening a new one, and reloading never lost my saved lot, across
  four different pages.
- **The relatable "Ikea-like" analogy** in Build Guides, and defining an unfamiliar word like "gabion" in the very
  next few words ("a wire gabion basket filled with stone") rather than leaving it undefined (`shots/64-build-guides.png`).

## 5. My top 3 changes

1. Fix the "Go to an address or corner" map box so it gives feedback on a street-only search (F1) — either show
   the same clear error the main box shows, or actually pan/zoom the map to that street. This is the single
   biggest gap for someone who only knows their block, not their house number.
2. Stop the 3D "look around" drag from swinging the camera inside neighboring buildings (F3), or at least detect
   it and show a small "View blocked — tap to reset" hint instead of a silent gray wall. On a phone, an ordinary
   swipe triggers this.
3. Give returning visitors a clear, early "Welcome back — continue with [your lot]" callout near the top of the
   homepage (F5), instead of making them scroll past the full six-step grid or rely on a small blue dot in the
   menu to realize their work was saved.

## 6. Would I keep using it?

Yes. The address lookup alone — telling me in plain English who owns the lot, that it's zoned for houses, that
it's really on the City's vacant list, and exactly what to click first — is exactly what would get me to actually
do something this week instead of feeling overwhelmed and giving up. The "ask for help" email when I'm stuck on
the ownership paperwork is reassuring rather than scary. I would want a grandkid or neighbor sitting with me the
first time I open the 3D planner, though, since one wrong swipe made it look broken, and I'd want to double back
to the map on "Find a lot" myself since typing just my street name there didn't do anything.
