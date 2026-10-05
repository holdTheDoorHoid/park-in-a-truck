/** @jsxImportSource preact */
// Part of the lot (2026-10-04): "How much of the lot will the park use?" at the top of the Size
// step — the whole lot, or just part of it (a side yard, the open ground beside a building).
// The part is dragged on the view (cyan sides, corners and a middle handle: mouse and touch);
// the number boxes and slide arrows here reach the same part from the keyboard and screen
// readers. Size, stretch and the park's turn follow the part (design.ts setPart).
import { useMemo } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import type { PlannerStore } from '../../lib/planner/store';
import type { SiteFacts, SizeId } from '../../lib/types';
import { fitSize, SIZES } from '../../lib/sizing';
import { getExtra } from '../../lib/project';
import { urlFor } from '../../i18n/url';
import { setPart, setSize } from '../../lib/planner/design';
import { canSlide, clampArea, homeTurn, partOf, resizeArea, runsAcross, slideArea, stretchTo, turnedAgainst } from '../../lib/planner/area';
import { fitFeet, SLIDE, type SlideDir } from '../../lib/planner/lotfit';
import type { FitArea } from '../../lib/planner/lotfit';
import { pt, type PlannerKey } from '../../lib/planner/words';

const ARROWS: [SlideDir, string, PlannerKey][] = [
  ['front', '←', 'area.slideFront'],
  ['back', '→', 'area.slideBack'],
  ['left', '↑', 'area.slideLeft'],
  ['right', '↓', 'area.slideRight'],
];

export function PartPicker({ store }: { store: PlannerStore }) {
  const site = useStore(store.$site);
  const d = useStore(store.$design);
  const layout = useStore(store.$layout);
  const fit = useStore(store.$fit);
  const coarse = useMemo(() => typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches, []);
  if (!site || !d) return null;
  const t = pt();
  const u = urlFor(t.locale);
  const f = site.frame;
  const facts = store.$demo.get() ? undefined : getExtra<SiteFacts>('site');
  const part = partOf(d);
  const commitPart = (patch: { useArea?: boolean; area?: FitArea }) => store.commit(setPart(d, patch, site, facts));
  const choose = (on: boolean) => {
    if (on === Boolean(part)) return;
    if (!on) return commitPart({ useArea: false });
    // the part they had before, or the biggest stretch of open ground
    const area = d.area ? clampArea(d.area, f) : store.openArea();
    if (area) commitPart({ useArea: true, area });
  };

  const a = part && fit ? fit : null;
  let body = null;
  if (a) {
    const along = Math.round(a.lengthFt);
    const across = Math.round(a.widthFt);
    const sz = fitSize(a.lengthFt, a.widthFt);
    const sizeA = SIZES[0]!;
    // what the park can fill in this part, along its own length and width
    const room = stretchTo(d, a);
    const against = turnedAgainst(d);
    const past = Boolean(layout && (layout.lengthFt > fitFeet(room.lengthFt) + 0.01 || layout.widthFt > fitFeet(room.widthFt) + 0.01));
    const better = !d.sizeAuto && !sz.tooSmall && sz.size !== d.size ? (sz.size as SizeId) : null;
    const num = (key: 'lengthFt' | 'widthFt', label: PlannerKey, value: number, max: number) => (
      <label class="pl-area-num">
        <span>{t(label)}</span>
        <input
          type="number"
          inputMode="numeric"
          min={4}
          max={max}
          step={1}
          value={value}
          onChange={(e) => {
            const el = e.currentTarget;
            const v = Number(el.value);
            if (el.value.trim() === '' || !Number.isFinite(v)) {
              el.value = String(value);
              return;
            }
            const next = resizeArea(a, { [key]: v }, f);
            // (the box shows what was kept: at least 4 ft, no more than the lot)
            el.value = String(Math.round(next[key]));
            commitPart({ area: next });
          }}
        />
      </label>
    );
    body = (
      <div class="pl-area">
        <p class="pl-small">{t(coarse ? 'area.hintTouch' : 'area.hintMouse')}</p>
        <p class="pl-small pl-area-dims">
          <strong>{t('area.dims', { length: Math.max(along, across), width: Math.min(along, across), area: Math.round(a.lengthFt * a.widthFt) })}</strong>
        </p>
        <div class="pl-area-nums">
          {num('lengthFt', 'area.along', along, Math.floor(f.lengthFt + 0.5))}
          {num('widthFt', 'area.across', across, Math.floor(f.widthFt + 0.5))}
        </div>
        <div class="pl-nudge" role="group" aria-label={t('area.slideGroup')}>
          <span class="pl-small">{t('area.slideLabel')}</span>
          {/* like the Lot step's pad: the arrows point the way the part moves on a plan with the lot's entrance on the left, so they stay left to right in every language */}
          <span class="pl-pad" dir="ltr">
            {ARROWS.map(([k, arrow, label]) => {
              const ok = canSlide(a, SLIDE[k], f);
              return (
                <button
                  type="button"
                  class="pl-tool"
                  aria-label={t(label)}
                  disabled={!ok}
                  title={ok ? t(label) : t('area.noRoom')}
                  onClick={() => commitPart({ area: slideArea(a, SLIDE[k], f) })}
                >
                  {arrow}
                </button>
              );
            })}
          </span>
        </div>
        {runsAcross(a) === true && (d.turn ?? 0) % 2 === 1 && <p class="pl-small muted">{t('area.turned')}</p>}
        {sz.tooSmall ? (
          <p
            class="pl-warn"
            dangerouslySetInnerHTML={{ __html: t.html('area.tooSmall', { minLength: sizeA.long[0], minWidth: sizeA.short[0], href: u('park-patch/') }) }}
          />
        ) : (
          past &&
          layout && (
            <>
              <p class="pl-warn">{t('area.past', { length: layout.lengthFt, width: layout.widthFt })}</p>
              {(against || better) && (
                <p class="pl-row">
                  {against && (
                    <button type="button" class="btn btn-small btn-primary" onClick={() => store.commit({ ...d, turn: homeTurn(d), shiftFt: [0, 0], updatedAt: new Date().toISOString() })}>
                      {t('area.turnAlong')}
                    </button>
                  )}
                  {!against && better && (
                    <button type="button" class="btn btn-small btn-primary" onClick={() => store.commit(setSize(d, better, site, facts))}>
                      {t('area.useSize', { size: better })}
                    </button>
                  )}
                </p>
              )}
            </>
          )
        )}
        <p class="pl-row">
          <button
            type="button"
            class="btn btn-small"
            onClick={() => {
              const open = store.openArea();
              if (open) commitPart({ area: open });
            }}
          >
            {t('area.reset')}
          </button>
        </p>
      </div>
    );
  }

  return (
    <>
      <fieldset class="pl-fieldset">
        <legend>{t('area.legend')}</legend>
        <label class="pl-radio">
          <input type="radio" name="pl-area" checked={!part} onChange={() => choose(false)} />
          {t('area.whole')}
        </label>
        <label class="pl-radio">
          <input type="radio" name="pl-area" checked={Boolean(part)} onChange={() => choose(true)} />
          {t('area.part')}
        </label>
      </fieldset>
      {body}
    </>
  );
}
