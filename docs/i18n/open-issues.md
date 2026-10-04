# Open translation issues (collected from translator and extraction reports)

Code / English-source problems the translators found but were told not to fix. A polish pass fixes these
after the extraction round. Tick them off here.

- [ ] Translated MDX chapters can't import the localized-data helpers (`localizeRecord` etc.), so `dream.mdx`
      in es/zh repeats theme and element names (THEME_ES / THEME_TEXT, ELEMENT_ES / ELEMENT_NAMES). Allow the
      import in chapters (checker + scaffold), then drop the copies.
- [ ] `datasets.ts` doesn't allow some text that shows on pages: resources `press[].note`,
      `toolkitLibrary…entries[].description`; guide `materials[].size`; the 3D model's `asBuilt.reason`.
- [ ] Resources page shows raw dates ("2026-10-04") — format with `t.date`.
- [ ] Playful Learning tables join items with `', '` — use a locale-aware list join that keeps English unchanged
      (no "and") but uses 、 in Chinese etc. (`src/pages/playful-learning/index.astro:96,110`).
- [ ] Park Patch prints `notes.callout` and `maintenance.sustainNote` as plain text though they contain markdown
      links — readers see `[…](…)`; the Sustain link isn't localized (`src/pages/park-patch/index.astro`).
- [ ] `PdfPage.astro` puts a fixed space before the page note — "简介 （PDF 第4页）" in Chinese.
- [ ] Hard-coded English: `LotAgreementNotice.astro` (x-philly may fix), aria-label + loading text of
      `Planner.astro` and `SunStudy.astro` widget wrappers.
- [ ] `elements` `countAs` holds developer notes nothing displays — drop it from the translatable dataset.
- [ ] plants.json: "Plains Coreopsis" listed against *Coreopsis verticillata* 'Moonbeam' (mismatch — check the
      PiaT plant list; note for PiaT if it's theirs).
- [ ] `Intl.ListFormat` has no Haitian Creole (and check sw, tl): lists read "a, b, and c" inside Creole sentences
      (`src/i18n/format.ts:68`) — add per-language fallbacks ("ak"/"epi") like months/weekdays.
- [ ] Planner English grammar slips kept by extraction: "1 thing stick out", "The 1 street tree nearby come" — make
      them proper plurals in `src/i18n/messages/en/planner.ts`.
- [ ] `start.mdx` "Fight climate change" bullet: "increase property," looks cut short (line ~86) — check PiaT's PDF;
      fix as a typo if the PDF has "property values", else note for PiaT.
- [ ] Plant data typos/mismatches (PiaT's lists?): "Celadine Poppy", "Huechera", "Aquilegia candensis", "Washington
      Hawthorne", "Jacobs Ladder"; Plains Coreopsis vs *C. verticillata* 'Moonbeam'; Prairie Onion vs *Allium
      cernuum*; Shorts Aster vs *S. cordifolium* — check against PiaT's plant spreadsheets; fix typos, list the rest
      for PiaT.
- [ ] Header menu wraps to two lines at ~1000–1150 px in es/vi (layout, not wording) — make the header degrade
      gracefully (smaller gap, or switch to the menu button earlier).
- [ ] Park Patch and Playful Learning "original PDF" buttons don't add "in English" like chapter PDF links.
- [ ] Overlays for themes/elements/plants/parks are not read by /plants/ and /parks/ yet (x-cost extraction may fix).
- [ ] /playful-learning/ scrolls sideways at 360 px in every language (elements table: 406 px in English).
- [ ] 3D guide viewer at 360 px: control buttons wrap and cover the help text (English too).
- [ ] Clock style differs: the shade calendar shows "3:30 PM" (locale format) while the planner's clock shows
      "3:30 pm" — pick one (probably the locale format everywhere).
- [ ] New area `shade` (shade calendar, 73 keys) needs translating in every language's second pass.
- [ ] Timing tests are flaky on a loaded machine ("is quick enough to run on a click" in shadows.test.ts,
      shadecal.test.ts 300 ms limit) — measure the median of several runs, or skip the time limit when
      `process.env.CI_SLOW`/load is high; keep a generous ceiling that still catches real regressions.
- [ ] My park answers summary shows field labels built from saved ids ("Assets rcos") — build a field-label list from
      the chapters (English will change too — make it read like the chapter labels).
- [ ] Organize at 360 px scrolls sideways on Arabic (asset map + flyer area).
- [ ] **Right-to-left: English values inside Arabic text come out reversed** — guide sizes `1'-6.5"` → `"6.5-'1`,
      material sizes `("2.5)`, cut lengths `"45`, footer handle `parkinatruck@`, address placeholders
      "N Uber St 2233". Fix in `t()`: on RTL pages wrap every inserted value in Unicode isolates (FSI…PDI), and
      `dir="ltr"` on size cells, handles, phone numbers.
- [ ] The checker counts `<bdi>`/`<span>` in a translated chapter as a changed component, so translators can't mark
      phone numbers LTR as HOW-TO says — add `bdi` to the INLINE list in `src/i18n/mdx.ts`.
- [ ] Money in Arabic shows "$US 6,884.46" — use `currencyDisplay: 'narrowSymbol'` (or an LTR run).
- [ ] `datasets.ts` doesn't allow `cutList[].stock` (e.g. "2x2 welded-wire mesh" stays English).
- [ ] English `dream.mdx` inline CSS uses `left` — change to `border-inline-start` / `text-align: start`.
- [ ] `en/planner.ts` comment tells translators to use `{hour24}` in `time.am`/`time.pm`, but `check.ts` rejects it
      as an invented placeholder (French shows "3:30 PM") — allow it or change the comment (ties to the clock-style item).
- [ ] Planner step labels wrap to three lines in French on desktop ("Taille et thèmes", "Soleil et ombre").
- [ ] Shade calendar times: leading zero on whole hours but not half hours in vi ("08 giờ … 9:30") — use one
      consistent locale time format.
- [ ] Month names capitalised mid-sentence in vi ("vào Tháng 6 và Tháng 7"; Vietnamese writes "tháng 6") — month
      names used inside sentences need a per-locale "in a sentence" form (lowercase where the language does).
- [ ] Parks cards: the source line ("Park in a Truck toolkit p.69 acknowledgments") and photo-credit wording
      ("via the … toolkit") can't be translated — make the wording a catalog message around the names.
- [ ] Plant picker shows the pot size in English ("Al comprarla: Quart") — `containerSize` not translatable in
      datasets.ts (phase B, or map the few sizes to catalog words).
- [ ] Organize scrolls sideways at 360 px in English too (393 px; step-contents box + text column), not only Arabic.
- [ ] Planner month chart labels columns with each month's first letter — in Creole August (out) and October
      (oktòb) both show "O"; use a per-locale short/narrow month that stays distinct (or two letters where needed).
- [ ] Build schedule (Create) at 360 px: big empty gap between each phase title and its date box (English too).
- [ ] Code joins translated sentences with a space — Chinese shows "。 在那之前" (shade summary, planner slope and
      existing-items text, lot card "可以考虑购买。 费城…"). Use a per-locale sentence joiner (no space for zh, and
      check ko/ar).
- [ ] (phase B — key shape changes) Lengths in feet are plain strings without plural forms (`where.fromLeft`,
      `common.ft`, philly `unit.ft`…) → "a 1 pés" in Portuguese; make them `{count}` plurals and update every language.
- [ ] (phase B) Planner sentences slot bare phrases into others (`slope.place*` after from/to/near, `spot.thing {name}`,
      `view.picked`) — Romance languages need articles/gender; give translators whole-sentence variants per place.

## For native-speaker review (per language)

### Spanish (es)
- `src/i18n/data/es/plants.json`: US native plants without a Spanish common name are written "Spanish name
  (English name)", e.g. "Árbol agrio (sourwood)".
- `create.mdx` tool lists, Phases 2–7 (Mandarria, Motocultor, Pisón de mano); gabion guides "anillos de engrapar";
  `resources.json` legal.text (disclaimer); `playful.ts` "peregrina (rayuela)" and the five principle names;
  `sustain.mdx` heading "Convivir".

### Spanish (es) — second pass
- `cost.ts` fix.* and note.* explanations; "Tipple rojo (red tipple)"; "Minicargadora (skid steer)"; `philly.ts`
  zoning descriptions ("casas unifamiliares pegadas") and Land Bank statuses; `planner.ts` slope sentences and the
  step name "Ubicar"; `shade.ts` summary sentences.

### Chinese, Simplified (zh)
- `start.mdx` "Why a park?" proverb line (每天去一次公园，医生远离我); `acquire.mdx` 实物使用协议;
  `create.mdx` Phase 2 herbicide and weed names + safety notes; `sustain.mdx` 存活 / 茁壮成长 / 社交;
  plants.json common names (Witch Alder → 矮北美瑞香, Wild Pinks → 野石竹, Allen Bush); guide hardware names
  (C形环, 马车螺栓, U形线卡钉); the 6C names in `playful.ts`.

### Russian (ru) — second pass
- `cost.ts` fix.* / kept.* explanations and `order.tool.hydrantNote` (safety note — exact meaning); `philly.ts`
  zoning.*, flood zones, `paths.otherAgency.text`; `planner.ts` slope.* (case endings); `shade.ts` sum.* lines.

### Chinese (zh) — second pass
- `cost.ts` fix.* / kept.* and guide.note.short* / guide.reason.* (assembled from pieces); `philly.ts` zoning.* and
  landBank.*; `planner.ts` slope.falls / slope.dip and sun.assume*; `shade.ts` sum.* (joined by code).

### Vietnamese (vi)
- Step names "Có được đất" (Acquire), "Khảo sát" (Assess); theme names "Vườn ăn được", "Chốn an yên";
  `plants.json` descriptive plant names; guide tool words (vít đầu lục giác, bu-lông đầu tròn cổ vuông, máy bắt vít
  động lực, khoen bấm, kìm cộng lực); resources legal text; `start.mdx` "Nguyên tắc + mục tiêu"; `sustain.mdx` "Gặp gỡ".

### Vietnamese (vi) — second pass
- `cost.ts` `fix.*` and `guide.reason.*` sentences; `philly.ts` zoning meanings and `landBank.*` statuses;
  `planner.ts` "Nắng & bóng" and the `slope.*` sentences; `shade.ts` summary sentences.

### Haitian Creole (ht)
- Build-guide tool and hardware words (machin vis a enpak, bag metal, sèjan, konpaktè a men, mas); `start.mdx`
  "Kisa yon polinizatè ye?" fruit list (pwa = pear or beans); plant-name hints; "Avi legal" + resources legal text;
  the site's safety notes in create/sustain (meaning must stay exact); the 6C names in `playful.ts`.

### Haitian Creole (ht) — second pass
- `cost.ts` fix.* / note.* / warn.* sentences and hardware names (ekè metal an L, rale angrenaj, chajè konpak);
  `philly.ts` zoning.* meanings and Land Bank statuses; `planner.ts` slope.* and sun.assume* small print; `shade.ts`
  summaries ("bilding ki {dir} yo"); `schedule.ts` task lines.

### Russian (ru)
- Legal notice (`resources.json` legal.text, `start.mdx` «Правовая информация»); `create.mdx` Этап 2 «Гербициды»;
  lumber and site notes in `guides/*.json` (кольца-скобы, глухари); plant common names in `plants.json`.

### Arabic (ar)
- `plants.json` common names (many descriptive/transliterated: أملانشير, كاربينوس أمريكي, فوذرجيلا); `start.mdx`
  "Why a park?" (proverb; "barn-raising" as يدًا بيد); `create.mdx` Phase 2 herbicide and weed names; resources legal
  text; `sustain.mdx` Halloween/Thanksgiving explained as end of October/November; guide hardware words (حلقات التثبيت,
  مسامير ملولبة مستديرة الرأس); the 6C names in `playful.ts`; style: و attached to Latin names (وPhiladelphia Land Bank).
- Decision to confirm: sizes like 2.5" and 4'x4' are written with Arabic unit words (2.5 بوصة, 4 × 4 أقدام) because
  ″/′ marks land on the wrong side in right-to-left text; lumber sizes and part labels unchanged.

### French (fr)
- `plants.json` names written "French (English)" (Sporobole (prairie dropseed), Oxydendron (sourwood)); hardware words
  in guides and `cost.ts` (agrafes à anneau, cavaliers, boulons de carrosserie, vis autoforeuses, tire-fonds, visseuse
  à percussion); `create.mdx` Phase 2 herbicide/weed names and safety notes; `sustain.mdx` Survivre / S'épanouir /
  Se retrouver; `start.mdx` barn-raising line and "Un parc par jour…"; `acquire.mdx` "accord d'usage en nature";
  resources legal text; principle and 6C names in `playful.ts`.

### Portuguese (pt)
- `cost.ts`: hardscape/softscape as "pavimento/terra", "reserva para imprevistos", "brita vermelha (red tipple)";
  guides hardware words (parafusos autoatarraxantes, parafusos sextavados, parafusos tipo francês, argolas de fixação,
  alicate corta-vergalhão), "com nós", "tratada em autoclave"; `plants.json` descriptive names with English in
  brackets; `create.mdx` Phase 2 herbicide/weed names and safety notes; `start.mdx` "Why a park?" closing line,
  "Aviso legal" + resources legal text; `playful.ts` "Aprender Brincando" and the 6Cs ("Pensamento crítico").
