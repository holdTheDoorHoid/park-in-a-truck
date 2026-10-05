/** @jsxImportSource preact */
import { useStore } from '@nanostores/preact';
import type { PlannerStore } from '../../lib/planner/store';
import type { LotKind, SizeId, ThemeId } from '../../lib/types';
import { SIZES, fitSize } from '../../lib/sizing';
import { THEMES, THEME_ORDER } from '../../data/themes';
import { parkDims, setLotKind, setSize, setThemes } from '../../lib/planner/design';
import { getExtra } from '../../lib/project';
import type { SiteFacts } from '../../lib/types';
import { localizeRecord } from '../../i18n/data';
import { pt, type PlannerKey } from '../../lib/planner/words';
import { partOf, stretchTo } from '../../lib/planner/area';
import { PartPicker } from './PartPicker';

const PIECES: { key: 'frame' | 'front' | 'back'; label: PlannerKey; hint: PlannerKey }[] = [
  { key: 'frame', label: 'size.frame', hint: 'size.frameHint' },
  { key: 'front', label: 'size.front', hint: 'size.frontHint' },
  { key: 'back', label: 'size.back', hint: 'size.backHint' },
];

const KINDS: [LotKind, PlannerKey][] = [
  ['interior', 'size.kindMid'],
  ['corner-left', 'size.kindLeft'],
  ['corner-right', 'size.kindRight'],
];

export function SizePanel({ store }: { store: PlannerStore }) {
  const site = useStore(store.$site);
  const d = useStore(store.$design);
  const set = useStore(store.$set);
  const fitArea = useStore(store.$fit);
  if (!site || !d) return null;
  const t = pt();
  // theme names and blurbs in the page's language (the theme ids stay as they are)
  const themes = localizeRecord(THEMES, 'themes', t.locale);
  // the largest rectangle that fits inside the lot (build-lead A6), or the part of the lot the park uses
  const part = partOf(d);
  const stretch = parkDims(true, { lengthFt: 0, widthFt: 0 }, stretchTo(d, fitArea ?? site.frame));
  const facts = store.$demo.get() ? undefined : getExtra<SiteFacts>('site');
  // (a part: its own size, never the whole lot's)
  const fit = part ? fitSize(part.lengthFt, part.widthFt) : fitSize(site.frame.lengthFt, site.frame.widthFt);
  const one = d.frame === d.front && d.front === d.back ? d.frame : null;
  const pickTheme = (patch: Partial<Record<'frame' | 'front' | 'back', ThemeId>>) => store.commit(setThemes(d, patch));
  const cur = SIZES.find((s) => s.id === d.size)!;
  const lotDims = part
    ? { length: Math.round(Math.max(part.lengthFt, part.widthFt)), width: Math.round(Math.min(part.lengthFt, part.widthFt)), size: fit.size }
    : { length: Math.round(site.frame.lengthFt), width: Math.round(site.frame.widthFt), size: fit.size };
  const intro: PlannerKey = part
    ? fit.tooBig
      ? 'size.introPartTooBig'
      : 'size.introPart'
    : fit.tooSmall
      ? 'size.introTooSmall'
      : fit.tooBig
        ? 'size.introTooBig'
        : 'size.intro';

  return (
    <section class="pl-section">
      <h3 class="pl-h">{t('size.title')}</h3>
      {/* part of the lot (2026-10-04): first, because the size depends on it */}
      <PartPicker store={store} />
      <p class="pl-small" dangerouslySetInnerHTML={{ __html: t.html(intro, lotDims) }} />
      <div class="pl-chips" role="radiogroup" aria-label={t('size.title')}>
        <button type="button" role="radio" aria-checked={Boolean(d.sizeAuto)} class="pl-chip" onClick={() => store.commit(setSize(d, 'auto', site, facts))}>
          {t(part ? 'size.fitPart' : 'size.fitMine', { size: fit.size })}
        </button>
        {SIZES.map((s) => (
          <button
            type="button"
            role="radio"
            aria-checked={!d.sizeAuto && d.size === s.id}
            class="pl-chip"
            title={t('size.range', { longMin: s.long[0], longMax: s.long[1], shortMin: s.short[0], shortMax: s.short[1] })}
            onClick={() => store.commit(setSize(d, s.id as SizeId, site, facts))}
          >
            {s.id}
          </button>
        ))}
      </div>
      <p class="pl-small muted">
        {t('size.note', { size: d.size, longMin: cur.long[0], longMax: cur.long[1], shortMin: cur.short[0], shortMax: cur.short[1] })}
      </p>

      <fieldset class="pl-fieldset">
        <legend>{t(part ? 'size.stretchLegendPart' : 'size.stretchLegend')}</legend>
        <label class="pl-radio">
          <input type="radio" name="pl-fit" checked={d.fitToLot !== false} onChange={() => store.commit({ ...d, fitToLot: true, updatedAt: new Date().toISOString() })} />
          {t(part ? 'size.stretchPart' : 'size.stretch', { length: stretch.lengthFt, width: stretch.widthFt })}
        </label>
        <label class="pl-radio">
          <input type="radio" name="pl-fit" checked={d.fitToLot === false} onChange={() => store.commit({ ...d, fitToLot: false, updatedAt: new Date().toISOString() })} />
          {set ? t('size.keepWith', { length: set.nominal.lengthFt, width: set.nominal.widthFt }) : t('size.keep')}
        </label>
      </fieldset>

      <fieldset class="pl-fieldset">
        <legend>{t('lot.kind')}</legend>
        {(
          [['auto', t(site.frame.lotKind === 'interior' ? 'size.kindAutoMid' : 'size.kindAutoCorner')], ...KINDS.map(([k, key]) => [k, t(key)])] as [
            LotKind | 'auto',
            string,
          ][]
        ).map(([k, label]) => (
          <label class="pl-radio">
            <input
              type="radio"
              name="pl-kind"
              checked={k === 'auto' ? Boolean(d.lotKindAuto) : !d.lotKindAuto && d.lotKind === k}
              onChange={() => store.commit(setLotKind(d, k, site))}
            />
            {label}
          </label>
        ))}
      </fieldset>

      <h3 class="pl-h">{t('size.themes')}</h3>
      <p class="pl-small">{t('size.themesHelp')}</p>
      <div class="pl-onetheme" role="group" aria-label={t('size.oneTheme')}>
        {THEME_ORDER.map((th) => (
          <button
            type="button"
            class="pl-theme-btn"
            aria-pressed={one === th}
            style={{ '--c1': THEMES[th].frame, '--c2': THEMES[th].front, '--c3': THEMES[th].back }}
            onClick={() => pickTheme({ frame: th, front: th, back: th })}
          >
            <span class="pl-swatch" aria-hidden="true" />
            {themes[th].name}
          </button>
        ))}
      </div>
      {PIECES.map((p) => (
        <fieldset class="pl-fieldset pl-piece">
          <legend>
            {t(p.label)} <span class="muted">{t(p.hint)}</span>
          </legend>
          <div class="pl-chips">
            {THEME_ORDER.map((th) => (
              <label class="pl-theme-chip" style={{ '--c': THEMES[th][p.key] }}>
                <input type="radio" name={`pl-theme-${p.key}`} checked={d[p.key] === th} onChange={() => pickTheme({ [p.key]: th })} />
                <span class="pl-dot" aria-hidden="true" />
                {themes[th].name}
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      <p class="pl-small muted">{themes[d.front].blurb}</p>
    </section>
  );
}
