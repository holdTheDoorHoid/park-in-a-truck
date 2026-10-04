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
