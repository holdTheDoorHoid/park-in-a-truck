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

## For native-speaker review (per language)

### Spanish (es)
- `src/i18n/data/es/plants.json`: US native plants without a Spanish common name are written "Spanish name
  (English name)", e.g. "Árbol agrio (sourwood)".
- `create.mdx` tool lists, Phases 2–7 (Mandarria, Motocultor, Pisón de mano); gabion guides "anillos de engrapar";
  `resources.json` legal.text (disclaimer); `playful.ts` "peregrina (rayuela)" and the five principle names;
  `sustain.mdx` heading "Convivir".

### Chinese, Simplified (zh)
- `start.mdx` "Why a park?" proverb line (每天去一次公园，医生远离我); `acquire.mdx` 实物使用协议;
  `create.mdx` Phase 2 herbicide and weed names + safety notes; `sustain.mdx` 存活 / 茁壮成长 / 社交;
  plants.json common names (Witch Alder → 矮北美瑞香, Wild Pinks → 野石竹, Allen Bush); guide hardware names
  (C形环, 马车螺栓, U形线卡钉); the 6C names in `playful.ts`.

### Vietnamese (vi)
- Step names "Có được đất" (Acquire), "Khảo sát" (Assess); theme names "Vườn ăn được", "Chốn an yên";
  `plants.json` descriptive plant names; guide tool words (vít đầu lục giác, bu-lông đầu tròn cổ vuông, máy bắt vít
  động lực, khoen bấm, kìm cộng lực); resources legal text; `start.mdx` "Nguyên tắc + mục tiêu"; `sustain.mdx` "Gặp gỡ".

### Haitian Creole (ht)
- Build-guide tool and hardware words (machin vis a enpak, bag metal, sèjan, konpaktè a men, mas); `start.mdx`
  "Kisa yon polinizatè ye?" fruit list (pwa = pear or beans); plant-name hints; "Avi legal" + resources legal text;
  the site's safety notes in create/sustain (meaning must stay exact); the 6C names in `playful.ts`.

### Russian (ru)
- Legal notice (`resources.json` legal.text, `start.mdx` «Правовая информация»); `create.mdx` Этап 2 «Гербициды»;
  lumber and site notes in `guides/*.json` (кольца-скобы, глухари); plant common names in `plants.json`.
